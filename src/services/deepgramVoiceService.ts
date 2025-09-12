// DeepGram Voice Service - Замена Web Speech API
import { createClient } from '@deepgram/sdk'
import type { 
  DeepGramConfig, 
  
  DeepGramError, 
  DeepGramStreamingOptions,
  DeepGramConnection 
} from '../types/deepgram'
import type { VoiceRecognitionService, VoiceError, VoiceState, TranscriptionResult } from './voiceService'

class DeepGramVoiceService implements VoiceRecognitionService {
  private deepgram: any
  private connection: DeepGramConnection | null = null
  
  private transcriptionCallbacks: Array<(data: TranscriptionResult) => void> = []
  private errorCallbacks: Array<(error: VoiceError) => void> = []
  private stateCallbacks: Array<(state: VoiceState) => void> = []
  private phraseCallbacks: Array<(data: { phrase: string, confidence: number }) => void> = []
  
  private currentState: VoiceState = {
    status: 'idle',
    isListening: false,
    confidence: 0,
    language: 'ru-RU',
    phraseCount: 0,
    totalDuration: 0
  }

  private sessionStartTime: number = 0
  private isConnected: boolean = false
  private config: DeepGramConfig

  constructor(config: DeepGramConfig) {
    console.log('🎤 [DEEPGRAM] DeepGramVoiceService constructor called')
    this.config = config
    this.initializeDeepGram()
    console.log('🎤 [DEEPGRAM] DeepGramVoiceService constructor completed')
  }

  private initializeDeepGram(): void {
    try {
      console.log('🎤 [DEEPGRAM] Initializing DeepGram client...')
      console.log('🎤 [DEEPGRAM] API Key:', this.config.apiKey ? `${this.config.apiKey.substring(0, 10)}...` : 'NOT PROVIDED')
      
      // Проверяем API ключ
      if (!this.config.apiKey) {
        throw new Error('API ключ DeepGram не предоставлен')
      }
      
      if (!this.config.apiKey.startsWith('sk-')) {
        throw new Error('Неверный формат API ключа DeepGram. Ключ должен начинаться с "sk-"')
      }
      
      this.deepgram = createClient(this.config.apiKey)
      
      // Проверяем, что клиент создался
      if (!this.deepgram) {
        throw new Error('Не удалось создать DeepGram клиент')
      }
      
      console.log('🎤 [DEEPGRAM] DeepGram client initialized successfully')
    } catch (error) {
      console.error('🎤 [DEEPGRAM] Failed to initialize DeepGram client:', error)
      this.deepgram = null // Явно устанавливаем null
      this.handleError({
        type: 'connection',
        message: 'Не удалось инициализировать DeepGram клиент',
        details: error
      })
      // Выбрасываем ошибку, чтобы конструктор знал об ошибке
      throw error
    }
  }

  async start(): Promise<void> {
    console.log('🎤 [DEEPGRAM] Starting voice recognition...')
    
    if (this.currentState.status === 'recording') {
      console.warn('🎤 [DEEPGRAM] Voice recognition already started')
      return
    }

    // Проверяем, что DeepGram клиент инициализирован
    if (!this.deepgram) {
      console.error('🎤 [DEEPGRAM] DeepGram client not initialized')
      throw new Error('DeepGram клиент не инициализирован')
    }

    try {
      await this.initializeConnection()
      this.updateState({
        status: 'recording',
        isListening: true,
        confidence: 0,
        language: this.config.language,
        phraseCount: 0,
        totalDuration: 0
      })
      
      this.sessionStartTime = Date.now()
      console.log('🎤 [DEEPGRAM] Voice recognition started successfully')
    } catch (error) {
      console.error('🎤 [DEEPGRAM] Failed to start voice recognition:', error)
      this.handleError({
        type: 'connection',
        message: 'Не удалось запустить распознавание голоса',
        details: error
      })
    }
  }

  stop(): void {
    console.log('🎤 [DEEPGRAM] Stopping voice recognition...')
    
    if (this.connection) {
      this.connection.finish()
      this.connection.close()
      this.connection = null
    }
    
    this.isConnected = false
    this.updateState({
      status: 'stopped',
      isListening: false,
      confidence: 0,
      language: this.config.language,
      phraseCount: this.currentState.phraseCount,
      totalDuration: Date.now() - this.sessionStartTime
    })
    
    console.log('🎤 [DEEPGRAM] Voice recognition stopped')
  }

  pause(): void {
    console.log('🎤 [DEEPGRAM] Pausing voice recognition...')
    
    if (this.connection) {
      this.connection.close()
      this.connection = null
    }
    
    this.isConnected = false
    this.updateState({
      ...this.currentState,
      status: 'paused',
      isListening: false
    })
    
    console.log('🎤 [DEEPGRAM] Voice recognition paused')
  }

  resume(): void {
    console.log('🎤 [DEEPGRAM] Resuming voice recognition...')
    
    if (this.currentState.status === 'paused') {
      this.start()
    }
  }

  onTranscription(callback: (data: TranscriptionResult) => void): void {
    this.transcriptionCallbacks.push(callback)
  }

  onError(callback: (error: VoiceError) => void): void {
    this.errorCallbacks.push(callback)
  }

  onStateChange(callback: (state: VoiceState) => void): void {
    this.stateCallbacks.push(callback)
  }

  onPhraseComplete(callback: (data: { phrase: string, confidence: number }) => void): void {
    this.phraseCallbacks.push(callback)
  }

  setLanguage(language: string): void {
    console.log('🎤 [DEEPGRAM] Setting language to:', language)
    this.config.language = language
    this.currentState.language = language
  }

  getCurrentState(): VoiceState {
    return { ...this.currentState }
  }

  cleanup(): void {
    console.log('🎤 [DEEPGRAM] Cleaning up DeepGram service...')
    
    this.stop()
    this.transcriptionCallbacks = []
    this.errorCallbacks = []
    this.stateCallbacks = []
    this.phraseCallbacks = []
    
    console.log('🎤 [DEEPGRAM] DeepGram service cleaned up')
  }

  private async initializeConnection(): Promise<void> {
    if (this.isConnected) {
      return
    }

    // Проверяем, что DeepGram клиент инициализирован
    if (!this.deepgram) {
      console.error('🎤 [DEEPGRAM] DeepGram client not initialized')
      throw new Error('DeepGram клиент не инициализирован')
    }

    const options: DeepGramStreamingOptions = {
      model: this.config.model,
      language: this.config.language,
      punctuate: true,
      interim_results: this.config.interimResults ?? true,
      endpointing: 300,
      vad_turnoff: 500,
      smart_format: true,
      filler_words: false,
      diarize: false,
      multichannel: false,
      alternatives: 1,
      numerals: true,
      profanity_filter: false,
      redact: [],
      search: [],
      replace: [],
      keywords: [],
      keyword_boost: 'latest',
      tag: [],
      tier: 'nova',
      version: '2023-11-22'
    }

    console.log('🎤 [DEEPGRAM] Creating DeepGram connection with options:', options)
    
    this.connection = this.deepgram.listen.live(options)
    this.setupConnectionHandlers()
    
    this.isConnected = true
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return

    this.connection.on('open', () => {
      console.log('🎤 [DEEPGRAM] Connection opened')
    })

    this.connection.on('transcript', (data: any) => {
      console.log('🎤 [DEEPGRAM] Transcript received:', data)
      this.handleTranscript(data)
    })

    this.connection.on('error', (error: any) => {
      console.error('🎤 [DEEPGRAM] Connection error:', error)
      
      // Определяем тип ошибки
      let errorMessage = 'Ошибка соединения DeepGram'
      let errorType: 'connection' | 'authentication' | 'quota' | 'processing' | 'network' | 'unknown' = 'connection'
      
      if (error.message && error.message.includes('WebSocket connection error')) {
        errorMessage = 'Ошибка WebSocket соединения. Проверьте API ключ и интернет-соединение'
        errorType = 'network'
      } else if (error.message && error.message.includes('401')) {
        errorMessage = 'Неверный API ключ DeepGram'
        errorType = 'authentication'
      } else if (error.message && error.message.includes('403')) {
        errorMessage = 'API ключ DeepGram не имеет доступа к сервису'
        errorType = 'authentication'
      }
      
      this.handleError({
        type: errorType,
        message: errorMessage,
        details: error
      })
    })

    this.connection.on('close', () => {
      console.log('🎤 [DEEPGRAM] Connection closed')
      this.isConnected = false
    })
  }

  private handleTranscript(data: any): void {
    try {
      const transcript = data.channel?.alternatives?.[0]?.transcript
      const confidence = data.channel?.alternatives?.[0]?.confidence || 0
      const isFinal = data.is_final || false

      if (!transcript || transcript.trim().length === 0) {
        return
      }

      const transcriptionResult: TranscriptionResult = {
        text: transcript,
        isFinal: isFinal,
        confidence: confidence,
        timestamp: Date.now()
      }

      console.log('🎤 [DEEPGRAM] Processing transcript:', transcriptionResult)

      // Уведомляем о транскрипции
      this.transcriptionCallbacks.forEach(callback => {
        try {
          callback(transcriptionResult)
        } catch (error) {
          console.error('🎤 [DEEPGRAM] Error in transcription callback:', error)
        }
      })

      // Если это финальная фраза, уведомляем о завершении фразы
      if (isFinal) {
        this.phraseCallbacks.forEach(callback => {
          try {
            callback({
              phrase: transcript,
              confidence: confidence
            })
          } catch (error) {
            console.error('🎤 [DEEPGRAM] Error in phrase callback:', error)
          }
        })

        this.updateState({
          ...this.currentState,
          phraseCount: this.currentState.phraseCount + 1,
          confidence: confidence
        })
      }

    } catch (error) {
      console.error('🎤 [DEEPGRAM] Error processing transcript:', error)
      this.handleError({
        type: 'processing',
        message: 'Ошибка обработки транскрипции',
        details: error
      })
    }
  }

  private updateState(newState: Partial<VoiceState>): void {
    this.currentState = { ...this.currentState, ...newState }
    
    this.stateCallbacks.forEach(callback => {
      try {
        callback(this.currentState)
      } catch (error) {
        console.error('🎤 [DEEPGRAM] Error in state callback:', error)
      }
    })
  }

  private handleError(error: DeepGramError): void {
    const voiceError: VoiceError = {
      type: this.mapErrorType(error.type),
      message: error.message,
      details: error.details,
      code: error.code
    }

    console.error('🎤 [DEEPGRAM] Error occurred:', voiceError)

    this.errorCallbacks.forEach(callback => {
      try {
        callback(voiceError)
      } catch (callbackError) {
        console.error('🎤 [DEEPGRAM] Error in error callback:', callbackError)
      }
    })
  }

  private mapErrorType(deepgramType: string): VoiceError['type'] {
    switch (deepgramType) {
      case 'authentication':
        return 'security'
      case 'quota':
        return 'network'
      case 'connection':
      case 'network':
        return 'network'
      case 'processing':
        return 'audio'
      default:
        return 'unknown'
    }
  }

  // Метод для отправки аудио данных (вызывается из VoiceRecorder)
  sendAudioData(audioData: ArrayBuffer | Blob): void {
    if (this.connection && this.isConnected) {
      try {
        this.connection.send(audioData)
      } catch (error) {
        console.error('🎤 [DEEPGRAM] Error sending audio data:', error)
        this.handleError({
          type: 'processing',
          message: 'Ошибка отправки аудио данных',
          details: error
        })
      }
    }
  }
}

// Экспорт для использования в других модулях
export { DeepGramVoiceService }
