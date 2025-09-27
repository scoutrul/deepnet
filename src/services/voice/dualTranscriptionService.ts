import { transcribeBlobWithDeepgram } from './batchTranscriptionService'
import { VoiceActivityDetector } from './voiceActivityDetector'
import { appConfig } from '@/config/appConfig'

export interface TranscriptionChunk {
  id: string
  text: string
  confidence: number
  timestamp: number
  duration: number
  type: 'quick' | 'quality'
  isReplaced?: boolean
}

export interface DualTranscriptionConfig {
  quickPauseDuration: number  // Пауза для быстрых батчей (мс)
  qualityInterval: number     // Интервал для качественных батчей (мс)
  enabled: boolean
}

export class DualTranscriptionService {
  private mediaStream: MediaStream | null = null
  private quickRecorder: MediaRecorder | null = null
  private qualityRecorder: MediaRecorder | null = null
  
  private quickChunks: Blob[] = []
  private qualityChunks: Blob[] = []
  
  private quickTimer: number | null = null
  private qualityTimer: number | null = null
  
  private vad: VoiceActivityDetector | null = null
  private vadUnsubscribe: (() => void) | null = null
  
  private config: DualTranscriptionConfig
  private listeners: ((chunk: TranscriptionChunk) => void)[] = []
  
  private transcriptionHistory: TranscriptionChunk[] = []
  private chunkCounter = 0
  
  private qualityStartTime = 0
  private quickStartTime = 0

  constructor(config: Partial<DualTranscriptionConfig> = {}) {
    this.config = {
      quickPauseDuration: 300,    // 300мс для быстрых батчей
      qualityInterval: 30000,     // 30 секунд для качественных батчей  
      enabled: true,
      ...config
    }
  }

  async start(mediaStream: MediaStream): Promise<void> {
    if (!this.config.enabled) {
      console.log('🎭 [DualTranscription] Сервис отключен')
      return
    }

    this.mediaStream = mediaStream
    this.transcriptionHistory = []
    this.chunkCounter = 0

    console.log('🎭 [DualTranscription] Запуск двухуровневого распознавания')
    console.log(`⚡ Быстрые батчи: каждые ${this.config.quickPauseDuration}мс паузы`)
    console.log(`🎯 Качественные батчи: каждые ${this.config.qualityInterval/1000}с`)

    // Запускаем быстрое распознавание с VAD
    await this.startQuickTranscription()
    
    // Запускаем качественное распознавание по таймеру
    await this.startQualityTranscription()
  }

  private async startQuickTranscription(): Promise<void> {
    if (!this.mediaStream) return

    this.quickRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: 'audio/webm;codecs=opus'
    })

    this.quickRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.quickChunks.push(event.data)
      }
    }

    this.quickRecorder.onstop = async () => {
      if (this.quickChunks.length > 0) {
        const blob = new Blob(this.quickChunks, { type: 'audio/webm;codecs=opus' })
        this.quickChunks = []
        
        const duration = Date.now() - this.quickStartTime
        console.log(`⚡ [DualTranscription] Отправляем быстрый батч: ${Math.round(duration)}мс, ${Math.round(blob.size/1024)}KB`)
        
        await this.processQuickBatch(blob, duration)
      }
      
      // Сразу начинаем новую запись
      if (this.quickRecorder && this.quickRecorder.state === 'inactive') {
        this.startQuickRecording()
      }
    }

    // Настраиваем VAD для быстрых батчей
    this.vad = new VoiceActivityDetector({
      volumeThreshold: appConfig.voice.vad?.volumeThreshold || 0.015,
      silenceDuration: this.config.quickPauseDuration,
      quickSilenceDuration: this.config.quickPauseDuration,
      minBatchDuration: 0,
      maxBatchDuration: 8000,
      analysisInterval: 25
    })

    await this.vad.connect(this.mediaStream)
    
    this.vadUnsubscribe = this.vad.onStateChange((state) => {
      if (state.shouldFlushBatch && this.quickRecorder?.state === 'recording') {
        this.quickRecorder.stop()
      }
    })

    this.startQuickRecording()
  }

  private async startQualityTranscription(): Promise<void> {
    if (!this.mediaStream) return

    this.qualityRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: 'audio/webm;codecs=opus'
    })

    this.qualityRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.qualityChunks.push(event.data)
      }
    }

    this.qualityRecorder.onstop = async () => {
      if (this.qualityChunks.length > 0) {
        const blob = new Blob(this.qualityChunks, { type: 'audio/webm;codecs=opus' })
        this.qualityChunks = []
        
        const duration = Date.now() - this.qualityStartTime
        console.log(`🎯 [DualTranscription] Отправляем качественный батч: ${Math.round(duration/1000)}с, ${Math.round(blob.size/1024)}KB`)
        
        await this.processQualityBatch(blob, duration)
      }
      
      // Начинаем новую качественную запись
      if (this.qualityRecorder && this.qualityRecorder.state === 'inactive') {
        this.startQualityRecording()
      }
    }

    this.startQualityRecording()
  }

  private startQuickRecording(): void {
    if (!this.quickRecorder || this.quickRecorder.state !== 'inactive') return
    
    this.quickStartTime = Date.now()
    this.quickRecorder.start()
    
    if (this.vad) {
      this.vad.resetBatch()
    }
  }

  private startQualityRecording(): void {
    if (!this.qualityRecorder || this.qualityRecorder.state !== 'inactive') return
    
    this.qualityStartTime = Date.now()
    this.qualityRecorder.start()
    
    // Таймер для остановки качественной записи
    this.qualityTimer = window.setTimeout(() => {
      if (this.qualityRecorder?.state === 'recording') {
        this.qualityRecorder.stop()
      }
    }, this.config.qualityInterval)
  }

  private async processQuickBatch(blob: Blob, duration: number): Promise<void> {
    try {
      const result = await transcribeBlobWithDeepgram(blob, {
        model: appConfig.deepgram.model,
        language: appConfig.deepgram.language,
        punctuate: appConfig.deepgram.punctuate,
        smart_format: appConfig.deepgram.smart_format
      })

      if (result.transcript) {
        const chunk: TranscriptionChunk = {
          id: `quick_${++this.chunkCounter}`,
          text: result.transcript,
          confidence: result.confidence,
          timestamp: Date.now() - duration,
          duration,
          type: 'quick'
        }

        this.transcriptionHistory.push(chunk)
        this.notifyListeners(chunk)
        
        console.log(`⚡ [DualTranscription] Быстрое распознавание: "${result.transcript}" (${result.confidence.toFixed(2)})`)
      }
    } catch (error) {
      console.error('❌ [DualTranscription] Ошибка быстрого распознавания:', error)
    }
  }

  private async processQualityBatch(blob: Blob, duration: number): Promise<void> {
    try {
      const result = await transcribeBlobWithDeepgram(blob, {
        model: appConfig.deepgram.model,
        language: appConfig.deepgram.language,
        punctuate: appConfig.deepgram.punctuate,
        smart_format: appConfig.deepgram.smart_format,
        diarize: true  // Включаем диаризацию для качественных батчей
      })

      if (result.transcript) {
        const chunk: TranscriptionChunk = {
          id: `quality_${++this.chunkCounter}`,
          text: result.transcript,
          confidence: result.confidence,
          timestamp: Date.now() - duration,
          duration,
          type: 'quality'
        }

        // Помечаем быстрые чанки в этом временном диапазоне как замещенные
        this.markReplacedChunks(chunk.timestamp, chunk.timestamp + duration)
        
        this.transcriptionHistory.push(chunk)
        this.notifyListeners(chunk)
        
        console.log(`🎯 [DualTranscription] Качественное распознавание: "${result.transcript}" (${result.confidence.toFixed(2)})`)
      }
    } catch (error) {
      console.error('❌ [DualTranscription] Ошибка качественного распознавания:', error)
    }
  }

  private markReplacedChunks(startTime: number, endTime: number): void {
    this.transcriptionHistory.forEach(chunk => {
      if (chunk.type === 'quick' && 
          chunk.timestamp >= startTime && 
          chunk.timestamp <= endTime) {
        chunk.isReplaced = true
      }
    })
  }

  onTranscription(callback: (chunk: TranscriptionChunk) => void): () => void {
    this.listeners.push(callback)
    
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(chunk: TranscriptionChunk): void {
    this.listeners.forEach(listener => listener(chunk))
  }

  getHistory(): TranscriptionChunk[] {
    return [...this.transcriptionHistory]
  }

  getActiveText(): string {
    return this.transcriptionHistory
      .filter(chunk => !chunk.isReplaced)
      .map(chunk => chunk.text)
      .join(' ')
  }

  async stop(): Promise<void> {
    console.log('🎭 [DualTranscription] Остановка двухуровневого распознавания')

    // Останавливаем VAD
    if (this.vadUnsubscribe) {
      this.vadUnsubscribe()
      this.vadUnsubscribe = null
    }
    
    if (this.vad) {
      this.vad.disconnect()
      this.vad = null
    }

    // Останавливаем рекордеры
    if (this.quickRecorder?.state === 'recording') {
      this.quickRecorder.stop()
    }
    
    if (this.qualityRecorder?.state === 'recording') {
      this.qualityRecorder.stop()
    }

    // Очищаем таймеры
    if (this.quickTimer) {
      clearTimeout(this.quickTimer)
      this.quickTimer = null
    }
    
    if (this.qualityTimer) {
      clearTimeout(this.qualityTimer)
      this.qualityTimer = null
    }

    this.quickRecorder = null
    this.qualityRecorder = null
    this.mediaStream = null
    this.listeners = []
  }

  updateConfig(config: Partial<DualTranscriptionConfig>): void {
    this.config = { ...this.config, ...config }
    
    if (this.vad) {
      this.vad.updateConfig({
        silenceDuration: this.config.quickPauseDuration,
        quickSilenceDuration: this.config.quickPauseDuration
      })
    }
  }
}

export const dualTranscriptionService = new DualTranscriptionService()
