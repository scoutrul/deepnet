/**
 * Voice Activity Detection (VAD) Service
 * Определяет паузы в речи для умной отправки батчей
 */

export interface VADConfig {
  /** Порог громкости для определения речи (0-1) */
  volumeThreshold: number
  /** Время тишины для считывания обычной паузы (мс) */
  silenceDuration: number
  /** Время тишины для быстрой отправки коротких фраз (мс) */
  quickSilenceDuration: number
  /** Минимальное время батча (мс) */
  minBatchDuration: number
  /** Максимальное время батча (мс) */
  maxBatchDuration: number
  /** Размер окна анализа (количество сэмплов) */
  analysisWindowSize: number
  /** Частота обновления анализа (мс) */
  analysisInterval: number
}

export interface VADState {
  /** Текущий уровень громкости (0-1) */
  currentVolume: number
  /** Идет ли речь сейчас */
  isSpeaking: boolean
  /** Время последней активности речи */
  lastSpeechTime: number
  /** Время начала текущего батча */
  batchStartTime: number
  /** Готов ли батч к отправке */
  shouldFlushBatch: boolean
  /** Была ли достаточная пауза для завершения предыдущей фразы */
  hadSufficientPause: boolean
  /** Время начала последней паузы */
  lastPauseStartTime: number
}

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationFrame: number | null = null
  private config: VADConfig
  private state: VADState
  private listeners: ((state: VADState) => void)[] = []

  constructor(config: Partial<VADConfig> = {}) {
    this.config = {
      volumeThreshold: 0.015,     // Чувствительность к речи
      silenceDuration: 300,       // 0.3 секунды тишины = ультра-быстрая пауза
      quickSilenceDuration: 300,  // Единая пауза для всех случаев
      minBatchDuration: 0,        // Убираем минимум - отправляем любой батч
      maxBatchDuration: 8000,     // Максимум 8 секунд
      analysisWindowSize: 1024,
      analysisInterval: 25,       // Анализ каждые 25мс - максимально часто
      ...config
    }

    this.state = {
      currentVolume: 0,
      isSpeaking: false,
      lastSpeechTime: 0,
      batchStartTime: 0,
      shouldFlushBatch: false,
      hadSufficientPause: false,
      lastPauseStartTime: 0
    }
  }

  /**
   * Подключается к медиа-потоку для анализа
   */
  async connect(mediaStream: MediaStream): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = this.audioContext.createMediaStreamSource(mediaStream)
      
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = this.config.analysisWindowSize * 2
      this.analyser.smoothingTimeConstant = 0.3
      
      source.connect(this.analyser)
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
      this.state.batchStartTime = Date.now()
      
      this.startAnalysis()
      
      console.log('🎤 [VAD] Voice Activity Detection подключен')
    } catch (error) {
      console.error('🎤 [VAD] Ошибка подключения:', error)
      throw error
    }
  }

  /**
   * Отключается от анализа
   */
  disconnect(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.analyser = null
    this.dataArray = null
    
    console.log('🎤 [VAD] Voice Activity Detection отключен')
  }

  /**
   * Подписка на изменения состояния VAD
   */
  onStateChange(callback: (state: VADState) => void): () => void {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Сброс состояния батча (после отправки)
   */
  resetBatch(): void {
    this.state.batchStartTime = Date.now()
    this.state.shouldFlushBatch = false
    this.state.hadSufficientPause = false
    this.notifyListeners()
  }

  /**
   * Получение текущего состояния
   */
  getState(): VADState {
    return { ...this.state }
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(newConfig: Partial<VADConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  private startAnalysis(): void {
    if (!this.analyser || !this.dataArray) return

    const analyze = () => {
      if (!this.analyser || !this.dataArray) return

      // Получаем данные частотного спектра
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
      this.analyser.getByteFrequencyData(dataArray)
      
      // Вычисляем средний уровень громкости
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const averageVolume = sum / dataArray.length / 255 // Нормализуем к 0-1

      this.state.currentVolume = averageVolume

      const now = Date.now()
      const wasSpeaking = this.state.isSpeaking
      
      // Определяем, идет ли речь
      this.state.isSpeaking = averageVolume > this.config.volumeThreshold

      // Отслеживаем переходы речь → тишина → речь
      if (this.state.isSpeaking) {
        this.state.lastSpeechTime = now
        
        // Если началась новая речь после достаточной паузы - отправляем предыдущий батч
        if (!wasSpeaking && this.state.hadSufficientPause) {
          const batchDuration = now - this.state.batchStartTime
          
          // Отправляем любой батч, даже очень короткий
          if (batchDuration > 0 && !this.state.shouldFlushBatch) {
            this.state.shouldFlushBatch = true
            console.log(`🎤 [VAD] Отправляем батч при возобновлении речи: duration=${Math.round(batchDuration)}ms, volume=${averageVolume.toFixed(3)}`)
          }
        }
      } else {
        // Тишина - отмечаем начало паузы
        if (wasSpeaking) {
          this.state.lastPauseStartTime = now
          this.state.hadSufficientPause = false
        }
        
        // Проверяем, достаточно ли длинная пауза
        const pauseDuration = now - this.state.lastPauseStartTime
        if (pauseDuration >= this.config.quickSilenceDuration && !this.state.hadSufficientPause) {
          this.state.hadSufficientPause = true
        }
      }

      // Принудительная отправка по максимальному времени
      const batchDuration = now - this.state.batchStartTime
      const hasMaxDuration = batchDuration >= this.config.maxBatchDuration
      
      if (hasMaxDuration && !this.state.shouldFlushBatch) {
        this.state.shouldFlushBatch = true
        console.log(`🎤 [VAD] Принудительная отправка батча по максимальному времени: duration=${Math.round(batchDuration/1000)}s`)
      }

      // Уведомляем слушателей об изменениях
      if (wasSpeaking !== this.state.isSpeaking || this.state.shouldFlushBatch) {
        this.notifyListeners()
      }

      this.animationFrame = requestAnimationFrame(analyze)
    }

    analyze()
  }

  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(callback => {
      try {
        callback(state)
      } catch (error) {
        console.error('🎤 [VAD] Ошибка в callback:', error)
      }
    })
  }
}

// Создаем singleton экземпляр
export const voiceActivityDetector = new VoiceActivityDetector()
