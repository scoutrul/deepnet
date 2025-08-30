// Voice recognition service using Web Speech API
export interface VoiceRecognitionService {
  start(): Promise<void>
  stop(): void
  pause(): void
  resume(): void
  onTranscription(callback: (data: TranscriptionResult) => void): void
  onError(callback: (error: VoiceError) => void): void
  onStateChange(callback: (state: VoiceState) => void): void
  onPhraseComplete(callback: (data: { phrase: string, confidence: number }) => void): void
  setLanguage(language: string): void
  getCurrentState(): VoiceState
  cleanup(): void
}

export interface VoiceError {
  type: 'permission' | 'browser' | 'network' | 'audio' | 'no-speech' | 'security' | 'unknown'
  message: string
  details?: any
  code?: string
}

export interface VoiceState {
  status: 'idle' | 'recording' | 'paused' | 'stopped' | 'error'
  isListening: boolean
  confidence: number
  language: string
  phraseCount: number
  totalDuration: number
}

export interface TranscriptionResult {
  text: string
  isFinal: boolean
  confidence: number
  timestamp: number
}

class WebSpeechVoiceService implements VoiceRecognitionService {
  private recognition: any
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
  
  // Отслеживание уже созданных фраз для дедупликации
  private createdPhrases: Set<string> = new Set()
  private phraseBuffer: Map<string, { confidence: number, timestamp: number }> = new Map()

  constructor() {
    this.initializeRecognition()
  }

  private initializeRecognition() {
    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      const error = new Error('Speech recognition not supported in this browser')
      throw error
    }

    // Initialize the recognition object
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognition()

    // Configure recognition settings
    this.recognition.continuous = true        // Потоковое наполнение
    this.recognition.interimResults = true   // Промежуточные результаты
    this.recognition.lang = 'ru-RU'         // Поддержка русского
    this.recognition.maxAlternatives = 1

    // Set up event handlers
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.recognition.onstart = () => {
      this.sessionStartTime = Date.now()
      this.updateState({
        status: 'recording',
        isListening: true,
        confidence: 0,
        phraseCount: 0,
        totalDuration: 0
      })
    }

    this.recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const confidence = event.results[i][0].confidence || 0.8
        const isFinal = event.results[i].isFinal

        // Проверяем, что transcript существует и не пустой
        if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
          console.warn('Skipping empty or invalid transcript:', transcript)
          continue
        }

        if (isFinal) {
          finalTranscript += transcript
          this.processFinalTranscription(transcript, confidence)
        } else {
          interimTranscript += transcript
          this.processInterimTranscription(transcript, confidence)
        }
      }

      // Update confidence based on interim results
      if (interimTranscript) {
        this.updateState({
          ...this.currentState,
          confidence: event.results[event.results.length - 1][0].confidence || 0.8
        })
      }
      
      // Update confidence based on final results too
      if (finalTranscript) {
        const finalConfidence = event.results[event.results.length - 1][0].confidence || 0.8
        this.updateState({
          ...this.currentState,
          confidence: finalConfidence
        })
      }
    }

    this.recognition.onerror = (event: any) => {
      const error: VoiceError = this.mapRecognitionError(event)
      this.updateState({
        status: 'error',
        isListening: false,
        confidence: 0,
        phraseCount: 0
      })
      this.notifyError(error)
    }

    this.recognition.onend = () => {
      const totalDuration = Date.now() - this.sessionStartTime
      this.updateState({
        ...this.currentState,
        status: 'stopped',
        isListening: false,
        totalDuration
      })
    }
  }

  private processFinalTranscription(text: string, confidence: number) {
    // Когда isFinal = true → создаем фразы
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.warn('processFinalTranscription: skipping empty text:', text)
      return
    }
    
    this.createPhrasesFromText(text, confidence, true)
    
    // Уведомляем о транскрипции
    this.notifyTranscription(text, true, confidence)
  }

  private processInterimTranscription(text: string, confidence: number) {
    // Пока isFinal = false → НЕ создаем теги, только буферизуем
    // Это предотвращает дублирование промежуточных результатов
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.warn('processInterimTranscription: skipping empty text:', text)
      return
    }
    
    this.bufferInterimPhrases(text, confidence)
    
    // Уведомляем о промежуточной транскрипции
    this.notifyTranscription(text, false, confidence)
  }

  private bufferInterimPhrases(text: string, confidence: number) {
    // Буферизуем промежуточные фразы вместо создания тегов
    const words = text.trim().split(/\s+/)
    if (words.length === 0) return
    
    const phraseSize = 3
    const phrases: string[] = []
    
    for (let i = 0; i < words.length; i += phraseSize) {
      const phraseWords = words.slice(i, i + phraseSize)
      const phrase = phraseWords.join(' ')
      if (phrase.trim()) {
        phrases.push(phrase.trim())
      }
    }
    
    // Сохраняем в буфер с максимальным confidence
    phrases.forEach((phrase) => {
      if (phrase.trim() && phrase.length > 1) {
        const existing = this.phraseBuffer.get(phrase)
        if (!existing || confidence > existing.confidence) {
          this.phraseBuffer.set(phrase, { confidence, timestamp: Date.now() })
        }
      }
    })
  }

  private createPhrasesFromText(text: string, confidence: number, _isComplete: boolean = true) {
    // НОВАЯ ЛОГИКА: Разбиваем только финальный текст на короткие фразы
    // Убираем накопление промежуточных результатов
    
    // Очищаем текст от дублирующихся частей
    const cleanText = this.cleanDuplicateText(text)
    const words = cleanText.trim().split(/\s+/)
    
    if (words.length === 0) return
    
    // Создаем фразы по 2-3 слова
    const phraseSize = 3 // Максимум 3 слова в фразе
    const phrases: string[] = []
    
    for (let i = 0; i < words.length; i += phraseSize) {
      const phraseWords = words.slice(i, i + phraseSize)
      const phrase = phraseWords.join(' ')
      if (phrase.trim()) {
        phrases.push(phrase.trim())
      }
    }
    
    // Создаем теги только для НОВЫХ фраз (дедупликация)
    phrases.forEach((phrase) => {
      if (phrase.trim() && phrase.length > 1) {
        const normalizedPhrase = this.normalizePhrase(phrase)
        
        // Проверяем, не создавали ли мы уже такой тег
        if (!this.createdPhrases.has(normalizedPhrase)) {
          this.createdPhrases.add(normalizedPhrase)
          
          // Уведомляем о завершении фразы
          this.notifyPhraseComplete(phrase.trim(), confidence)
          
          // Обновляем статистику
          this.updateState({
            ...this.currentState,
            phraseCount: this.currentState.phraseCount + 1
          })
        }
      }
    })
  }

  private normalizePhrase(phrase: string): string {
    // Нормализуем фразу для лучшей дедупликации
    return phrase.toLowerCase().trim()
  }

  private cleanDuplicateText(text: string): string {
    // Очищаем текст от дублирующихся частей
    const words = text.trim().split(/\s+/)
    if (words.length <= 3) return text // Короткие фразы не чистим
    
    const cleanedWords: string[] = []
    let i = 0
    
    while (i < words.length) {
      // Проверяем, не повторяется ли текущее слово
      if (i > 0 && words[i] === words[i - 1]) {
        i++ // Пропускаем дублирующееся слово
        continue
      }
      
      // Проверяем, не повторяется ли группа из 2-3 слов
      if (i >= 2) {
        const currentGroup = words.slice(i, i + 3).join(' ')
        const previousGroup = words.slice(i - 3, i).join(' ')
        
        if (currentGroup === previousGroup) {
          i += 3 // Пропускаем повторяющуюся группу
          continue
        }
      }
      
      cleanedWords.push(words[i])
      i++
    }
    
    return cleanedWords.join(' ')
  }

  private mapRecognitionError(event: any): VoiceError {
    // Улучшенная обработка ошибок с кодами
    const errorMap: Record<string, VoiceError> = {
      'not-allowed': {
        type: 'permission',
        message: 'Доступ к микрофону запрещен. Разрешите доступ и попробуйте снова.',
        code: 'permission_denied',
        details: event
      },
      'no-speech': {
        type: 'no-speech',
        message: 'Речь не обнаружена. Говорите четче и громче.',
        code: 'no_speech_detected',
        details: event
      },
      'audio-capture': {
        type: 'audio',
        message: 'Ошибка захвата аудио. Проверьте микрофон.',
        code: 'audio_capture_error',
        details: event
      },
      'network': {
        type: 'network',
        message: 'Ошибка сети. Проверьте интернет-соединение.',
        code: 'network_error',
        details: event
      },
      'security': {
        type: 'security',
        message: 'Ошибка безопасности. Попробуйте перезагрузить страницу.',
        code: 'security_error',
        details: event
      },
      'aborted': {
        type: 'unknown',
        message: 'Распознавание было прервано.',
        code: 'aborted',
        details: event
      },
      'service-not-allowed': {
        type: 'permission',
        message: 'Сервис распознавания недоступен. Проверьте настройки браузера.',
        code: 'service_not_allowed',
        details: event
      }
    }

    return errorMap[event.error] || {
      type: 'unknown',
      message: `Ошибка распознавания: ${event.error}`,
      code: event.error,
      details: event
    }
  }

  private updateState(newState: Partial<VoiceState>) {
    this.currentState = { ...this.currentState, ...newState }
    this.notifyStateChange(this.currentState)
  }

  private notifyTranscription(text: string, isFinal: boolean, confidence: number) {
    // Проверяем, что text существует и не пустой
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.warn('notifyTranscription: skipping empty text:', text)
      return
    }
    
    // Создаем объект с данными для callback
    const transcriptionData = {
      text,
      isFinal,
      confidence,
      timestamp: Date.now()
    }
    
    this.transcriptionCallbacks.forEach((callback) => {
      try {
        callback(transcriptionData)
      } catch (error) {
        console.error('Error in transcription callback:', error)
      }
    })
  }

  private notifyError(error: VoiceError) {
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error)
      } catch (error) {
        console.error('Error in error callback:', error)
      }
    })
  }

  private notifyStateChange(state: VoiceState) {
    this.stateCallbacks.forEach((callback) => {
      try {
        callback(state)
      } catch (error) {
        console.error('Error in state change callback:', error)
      }
    })
  }

  private notifyPhraseComplete(phrase: string, confidence: number) {
    // Проверяем, что phrase существует и не пустой
    if (!phrase || typeof phrase !== 'string' || phrase.trim() === '') {
      console.warn('notifyPhraseComplete: skipping empty phrase:', phrase)
      return
    }
    
    // Создаем объект с данными для callback
    const phraseData = {
      phrase,
      confidence
    }
    
    this.phraseCallbacks.forEach((callback) => {
      try {
        callback(phraseData)
      } catch (error) {
        console.error('Error in phrase callback:', error)
      }
    })
  }

  async start(): Promise<void> {
    try {
      if (this.currentState.status === 'recording') {
        return
      }

      await this.recognition.start()
    } catch (error) {
      const voiceError: VoiceError = {
        type: 'unknown',
        message: `Не удалось запустить распознавание: ${error}`,
        code: 'start_failed',
        details: error
      }
      this.notifyError(voiceError)
      throw error
    }
  }

  stop(): void {
    try {
      this.recognition.stop()
      this.updateState({
        status: 'stopped',
        isListening: false,
        confidence: 0
      })
    } catch (error) {
      console.error('Error stopping recognition:', error)
    }
  }

  pause(): void {
    try {
      this.recognition.stop()
      this.updateState({
        status: 'paused',
        isListening: false
      })
    } catch (error) {
      console.error('Error pausing recognition:', error)
    }
  }

  resume(): void {
    try {
      this.start()
    } catch (error) {
      console.error('Error resuming recognition:', error)
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

  getCurrentState(): VoiceState {
    return { ...this.currentState }
  }

  setLanguage(language: string): void {
    if (this.recognition) {
      this.recognition.lang = language
      this.updateState({ language })
    }
  }

  cleanup(): void {
    try {
      if (this.currentState.status === 'recording') {
        this.recognition.stop()
      }
      
      this.transcriptionCallbacks = []
      this.errorCallbacks = []
      this.stateCallbacks = []
      this.phraseCallbacks = []
      
          // Очищаем буферы при cleanup
    this.createdPhrases.clear()
    this.phraseBuffer.clear()
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }
}

// Factory function to create voice service
export function createVoiceService(): VoiceRecognitionService {
  try {
    return new WebSpeechVoiceService()
  } catch (error) {
    throw new Error(`Failed to create voice service: ${error}`)
  }
}

// Check if voice recognition is supported
export function isVoiceRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

// Get supported languages (basic list)
export function getSupportedLanguages(): string[] {
  return [
    'ru-RU', // Russian
    'en-US', // English (US)
    'en-GB', // English (UK)
    'de-DE', // German
    'fr-FR', // French
    'es-ES', // Spanish
    'it-IT', // Italian
    'pt-BR', // Portuguese (Brazil)
    'ja-JP', // Japanese
    'ko-KR', // Korean
    'zh-CN'  // Chinese (Simplified)
  ]
}
