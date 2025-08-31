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
  
  // Динамичные таймауты для автоматического добавления слов
  private readonly WORD_TIMEOUT_MS = 1500        // Основной таймаут: 1.5 секунды
  private readonly QUICK_WORD_TIMEOUT_MS = 800   // Быстрый таймаут: 0.8 секунды
  private readonly MIN_WORD_LENGTH = 3           // Минимальная длина слова для добавления
  
  private wordTimeoutTimers: Map<string, NodeJS.Timeout> = new Map()
  private lastWordUpdateTime: number = 0
  private consecutiveWordCount: number = 0       // Счетчик последовательных слов
  private lastWordBuffer: string[] = []          // Буфер последних слов

  constructor() {
    console.log('🎤 [VOICE] WebSpeechVoiceService constructor called')
    this.initializeRecognition()
    console.log('🎤 [VOICE] WebSpeechVoiceService constructor completed')
  }

  private initializeRecognition() {
    console.log('🎤 [VOICE] Initializing recognition...')
    console.log('🎤 [VOICE] Browser support check:', {
      webkitSpeechRecognition: 'webkitSpeechRecognition' in window,
      SpeechRecognition: 'SpeechRecognition' in window,
      userAgent: navigator.userAgent
    })
    
    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      const error = new Error('Speech recognition not supported in this browser')
      console.error('🎤 [VOICE] Browser not supported:', error.message)
      throw error
    }

    // Initialize the recognition object
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    console.log('🎤 [VOICE] Using SpeechRecognition implementation:', 
      window.SpeechRecognition ? 'native' : 'webkit')
    
    this.recognition = new SpeechRecognition()
    console.log('🎤 [VOICE] Recognition object created:', this.recognition)

    // Configure recognition settings
    this.recognition.continuous = true        // Потоковое наполнение
    this.recognition.interimResults = true   // Промежуточные результаты
    this.recognition.lang = 'ru-RU'         // Поддержка русского
    this.recognition.maxAlternatives = 1
    
    console.log('🎤 [VOICE] Recognition settings configured:', {
      continuous: this.recognition.continuous,
      interimResults: this.recognition.interimResults,
      lang: this.recognition.lang,
      maxAlternatives: this.recognition.maxAlternatives
    })

    // Set up event handlers
    this.setupEventHandlers()
    console.log('🎤 [VOICE] Event handlers set up completed')
  }

  private setupEventHandlers() {
    this.recognition.onstart = () => {
      console.log('🎤 [VOICE] Recognition started at:', new Date().toISOString())
      this.sessionStartTime = Date.now()
      this.updateState({
        status: 'recording',
        isListening: true,
        confidence: 0,
        phraseCount: 0,
        totalDuration: 0
      })
      console.log('🎤 [VOICE] State updated to recording')
    }

    this.recognition.onresult = (event: any) => {
      console.log('🎤 [VOICE] onresult event:', {
        resultIndex: event.resultIndex,
        resultsLength: event.results.length,
        timestamp: new Date().toISOString()
      })

      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const confidence = event.results[i][0].confidence || 0.8
        const isFinal = event.results[i].isFinal

        console.log(`🎤 [VOICE] Result ${i}:`, {
          transcript: transcript?.substring(0, 100) + (transcript?.length > 100 ? '...' : ''),
          confidence: confidence.toFixed(3),
          isFinal: isFinal,
          length: transcript?.length || 0
        })

        // Проверяем, что transcript существует и не пустой
        if (!transcript || typeof transcript !== 'string' || transcript.trim() === '') {
          console.warn('🎤 [VOICE] Skipping empty or invalid transcript:', transcript)
          continue
        }

        if (isFinal) {
          finalTranscript += transcript
          console.log('🎤 [VOICE] Processing FINAL transcript:', transcript.substring(0, 100))
          this.processFinalTranscription(transcript, confidence)
        } else {
          interimTranscript += transcript
          console.log('🎤 [VOICE] Processing INTERIM transcript:', transcript.substring(0, 100))
          this.processInterimTranscription(transcript, confidence)
        }
      }

      // Update confidence based on interim results
      if (interimTranscript) {
        const newConfidence = event.results[event.results.length - 1][0].confidence || 0.8
        console.log('🎤 [VOICE] Updating confidence from interim:', newConfidence.toFixed(3))
        this.updateState({
          ...this.currentState,
          confidence: newConfidence
        })
      }
      
      // Update confidence based on final results too
      if (finalTranscript) {
        const finalConfidence = event.results[event.results.length - 1][0].confidence || 0.8
        console.log('🎤 [VOICE] Updating confidence from final:', finalConfidence.toFixed(3))
        this.updateState({
          ...this.currentState,
          confidence: finalConfidence
        })
      }
    }

    this.recognition.onerror = (event: any) => {
      console.error('🎤 [VOICE] Recognition error:', {
        error: event.error,
        message: event.message,
        timestamp: new Date().toISOString(),
        details: event
      })
      
      const error: VoiceError = this.mapRecognitionError(event)
      console.log('🎤 [VOICE] Mapped error:', error)
      
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
      console.log('🎤 [VOICE] Recognition ended:', {
        totalDuration: `${totalDuration}ms`,
        phraseCount: this.currentState.phraseCount,
        timestamp: new Date().toISOString()
      })
      
      this.updateState({
        ...this.currentState,
        status: 'stopped',
        isListening: false,
        totalDuration
      })
    }
  }

  private processFinalTranscription(text: string, confidence: number) {
    console.log('🎤 [VOICE] Processing FINAL transcription:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      confidence: confidence.toFixed(3),
      length: text.length,
      timestamp: new Date().toISOString()
    })
    
    // Когда isFinal = true → создаем фразы
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.warn('🎤 [VOICE] processFinalTranscription: skipping empty text:', text)
      return
    }
    
    this.createPhrasesFromText(text, confidence, true)
    
    // Уведомляем о транскрипции
    this.notifyTranscription(text, true, confidence)
  }

  private processInterimTranscription(text: string, confidence: number) {
    console.log('🎤 [VOICE] Processing INTERIM transcription:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      confidence: confidence.toFixed(3),
      length: text.length,
      timestamp: new Date().toISOString()
    })
    
    // Пока isFinal = false → НЕ создаем теги, только буферизуем
    // Это предотвращает дублирование промежуточных результатов
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.warn('🎤 [VOICE] processInterimTranscription: skipping empty text:', text)
      return
    }
    
    this.bufferInterimPhrases(text, confidence)
    
    // Уведомляем о промежуточной транскрипции
    this.notifyTranscription(text, false, confidence)
  }

  private bufferInterimPhrases(text: string, confidence: number) {
    console.log('🎤 [VOICE] Buffering interim phrases:', {
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      confidence: confidence.toFixed(3),
      timestamp: new Date().toISOString()
    })
    
    // Буферизуем промежуточные фразы и добавляем слова по таймауту
    const words = text.trim().split(/\s+/)
    if (words.length === 0) {
      console.log('🎤 [VOICE] No words to buffer, returning')
      return
    }
    
    // Обновляем время последнего обновления
    this.lastWordUpdateTime = Date.now()
    
    // Обрабатываем каждое слово отдельно для таймаута
    words.forEach((word, index) => {
      if (word.trim() && word.length > 1) {
        this.scheduleWordTimeout(word.trim(), confidence, index)
      }
    })
    
    // Также создаем фразы по 2-3 слова для буфера
    const phraseSize = 3
    const phrases: string[] = []
    
    for (let i = 0; i < words.length; i += phraseSize) {
      const phraseWords = words.slice(i, i + phraseSize)
      const phrase = phraseWords.join(' ')
      if (phrase.trim()) {
        phrases.push(phrase.trim())
      }
    }
    
    console.log('🎤 [VOICE] Created interim phrases:', {
      phraseCount: phrases.length,
      phrases: phrases.slice(0, 3) // Показываем первые 3 фразы
    })
    
    // Сохраняем в буфер с максимальным confidence
    let updatedPhrases = 0
    phrases.forEach((phrase) => {
      if (phrase.trim() && phrase.length > 1) {
        const existing = this.phraseBuffer.get(phrase)
        if (!existing || confidence > existing.confidence) {
          this.phraseBuffer.set(phrase, { confidence, timestamp: Date.now() })
          updatedPhrases++
          
          console.log('🎤 [VOICE] Buffered phrase:', {
            phrase: phrase.trim(),
            confidence: confidence.toFixed(3),
            wasUpdate: !!existing
          })
        }
      }
    })
    
    console.log('🎤 [VOICE] Interim buffering completed:', {
      totalPhrases: phrases.length,
      updatedPhrases: updatedPhrases,
      bufferSize: this.phraseBuffer.size,
      wordsProcessed: words.length
    })
  }
  
  // Планирует динамичные таймауты для автоматического добавления слова
  private scheduleWordTimeout(word: string, confidence: number, wordIndex: number) {
    const wordKey = `${word}_${wordIndex}_${Date.now()}`
    
    // Отменяем предыдущий таймер для этого слова, если он есть
    const existingTimer = this.wordTimeoutTimers.get(wordKey)
    if (existingTimer) {
      clearTimeout(existingTimer)
      this.wordTimeoutTimers.delete(wordKey)
    }
    
    // Обновляем буфер последних слов
    this.updateWordBuffer(word)
    
    // Определяем динамический таймаут на основе контекста
    const dynamicTimeout = this.calculateDynamicTimeout(word, confidence)
    
    // Создаем новый таймер с динамическим таймаутом
    const timer = setTimeout(() => {
      this.addWordByTimeout(word, confidence, wordKey)
    }, dynamicTimeout)
    
    // Сохраняем таймер
    this.wordTimeoutTimers.set(wordKey, timer)
    
    console.log('🎤 [VOICE] Scheduled dynamic word timeout:', {
      word: word,
      wordIndex: wordIndex,
      wordKey: wordKey,
      dynamicTimeout: dynamicTimeout,
      consecutiveWordCount: this.consecutiveWordCount,
      bufferSize: this.lastWordBuffer.length,
      timestamp: new Date().toISOString()
    })
  }
  
  // Добавляет слово по таймауту
  private addWordByTimeout(word: string, confidence: number, wordKey: string) {
    // Проверяем, не было ли слово уже добавлено как часть фразы
    if (this.createdPhrases.has(word.toLowerCase())) {
      console.log('🎤 [VOICE] Word already exists, skipping timeout addition:', word)
      return
    }
    
    // Проверяем, прошло ли достаточно времени с последнего обновления
    const timeSinceLastUpdate = Date.now() - this.lastWordUpdateTime
    const minRequiredTime = Math.min(this.WORD_TIMEOUT_MS, this.QUICK_WORD_TIMEOUT_MS)
    
    if (timeSinceLastUpdate < minRequiredTime) {
      console.log('🎤 [VOICE] Recent update detected, skipping timeout addition:', {
        word: word,
        timeSinceLastUpdate: timeSinceLastUpdate,
        threshold: minRequiredTime,
        consecutiveWordCount: this.consecutiveWordCount
      })
      return
    }
    
    // Добавляем слово как отдельную фразу
    console.log('🎤 [VOICE] Adding word by dynamic timeout:', {
      word: word,
      confidence: confidence.toFixed(3),
      timeSinceLastUpdate: timeSinceLastUpdate,
      consecutiveWordCount: this.consecutiveWordCount,
      bufferSize: this.lastWordBuffer.length,
      timestamp: new Date().toISOString()
    })
    
    // Добавляем в созданные фразы
    this.createdPhrases.add(word.toLowerCase())
    
    // Уведомляем о завершении фразы (слова)
    this.notifyPhraseComplete(word, confidence)
    
    // Обновляем статистику
    this.updateState({
      ...this.currentState,
      phraseCount: this.currentState.phraseCount + 1
    })
    
    // Сбрасываем счетчик последовательных слов
    this.consecutiveWordCount = 0
    
    // Удаляем таймер
    this.wordTimeoutTimers.delete(wordKey)
  }
  
  // Обновляет буфер последних слов для анализа контекста
  private updateWordBuffer(word: string) {
    // Добавляем новое слово в буфер
    this.lastWordBuffer.push(word.toLowerCase())
    
    // Ограничиваем размер буфера (последние 10 слов)
    if (this.lastWordBuffer.length > 10) {
      this.lastWordBuffer.shift()
    }
    
    // Обновляем счетчик последовательных слов
    this.consecutiveWordCount++
    
    // Сбрасываем счетчик если прошло много времени
    if (this.lastWordUpdateTime > 0) {
      const timeSinceLastUpdate = Date.now() - this.lastWordUpdateTime
      if (timeSinceLastUpdate > 5000) { // 5 секунд
        this.consecutiveWordCount = 1
      }
    }
    
    console.log('🎤 [VOICE] Word buffer updated:', {
      word: word,
      bufferSize: this.lastWordBuffer.length,
      consecutiveWordCount: this.consecutiveWordCount,
      lastWords: this.lastWordBuffer.slice(-3) // Последние 3 слова
    })
  }
  
  // Вычисляет динамический таймаут на основе контекста
  private calculateDynamicTimeout(word: string, confidence: number): number {
    // Базовый таймаут
    let timeout = this.WORD_TIMEOUT_MS
    
    // Если слово короткое, используем быстрый таймаут
    if (word.length <= this.MIN_WORD_LENGTH) {
      timeout = this.QUICK_WORD_TIMEOUT_MS
    }
    
    // Если много последовательных слов, уменьшаем таймаут
    if (this.consecutiveWordCount > 3) {
      timeout = Math.max(timeout * 0.7, 500) // Уменьшаем на 30%, минимум 500мс
    }
    
    // Если высокая уверенность, уменьшаем таймаут
    if (confidence > 0.9) {
      timeout = Math.max(timeout * 0.8, 400) // Уменьшаем на 20%, минимум 400мс
    }
    
    // Если в буфере много похожих слов, увеличиваем таймаут
    const similarWords = this.lastWordBuffer.filter(w => 
      w !== word.toLowerCase() && 
      (w.includes(word.toLowerCase()) || word.toLowerCase().includes(w))
    ).length
    
    if (similarWords > 2) {
      timeout = Math.min(timeout * 1.5, 2000) // Увеличиваем на 50%, максимум 2 сек
    }
    
    console.log('🎤 [VOICE] Dynamic timeout calculated:', {
      word: word,
      baseTimeout: this.WORD_TIMEOUT_MS,
      finalTimeout: timeout,
      confidence: confidence.toFixed(3),
      consecutiveWordCount: this.consecutiveWordCount,
      similarWords: similarWords,
      factors: {
        shortWord: word.length <= this.MIN_WORD_LENGTH,
        manyConsecutive: this.consecutiveWordCount > 3,
        highConfidence: confidence > 0.9,
        manySimilar: similarWords > 2
      }
    })
    
    return timeout
  }

  private createPhrasesFromText(text: string, confidence: number, _isComplete: boolean = true) {
    console.log('🎤 [VOICE] Creating phrases from text:', {
      originalText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      confidence: confidence.toFixed(3),
      timestamp: new Date().toISOString()
    })
    
    // НОВАЯ ЛОГИКА: Разбиваем только финальный текст на короткие фразы
    // Убираем накопление промежуточных результатов
    
    // Очищаем текст от дублирующихся частей
    const cleanText = this.cleanDuplicateText(text)
    const words = cleanText.trim().split(/\s+/)
    
    console.log('🎤 [VOICE] Text processing:', {
      originalWords: words.length,
      cleanText: cleanText.substring(0, 100) + (cleanText.length > 100 ? '...' : '')
    })
    
    if (words.length === 0) {
      console.log('🎤 [VOICE] No words to process, returning')
      return
    }
    
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
    
    console.log('🎤 [VOICE] Created phrases:', {
      phraseCount: phrases.length,
      phrases: phrases.slice(0, 5) // Показываем первые 5 фраз
    })
    
    // Создаем теги только для НОВЫХ фраз (дедупликация)
    let newPhrasesCount = 0
    phrases.forEach((phrase) => {
      if (phrase.trim() && phrase.length > 1) {
        const normalizedPhrase = this.normalizePhrase(phrase)
        
        // Проверяем, не создавали ли мы уже такой тег
        if (!this.createdPhrases.has(normalizedPhrase)) {
          this.createdPhrases.add(normalizedPhrase)
          newPhrasesCount++
          
          console.log('🎤 [VOICE] New phrase created:', {
            phrase: phrase.trim(),
            normalized: normalizedPhrase,
            confidence: confidence.toFixed(3)
          })
          
          // Уведомляем о завершении фразы
          this.notifyPhraseComplete(phrase.trim(), confidence)
          
          // Обновляем статистику
          this.updateState({
            ...this.currentState,
            phraseCount: this.currentState.phraseCount + 1
          })
        } else {
          console.log('🎤 [VOICE] Duplicate phrase skipped:', {
            phrase: phrase.trim(),
            normalized: normalizedPhrase
          })
        }
      }
    })
    
    console.log('🎤 [VOICE] Phrase creation completed:', {
      totalPhrases: phrases.length,
      newPhrases: newPhrasesCount,
      totalCreated: this.currentState.phraseCount
    })
  }

  private normalizePhrase(phrase: string): string {
    const normalized = phrase.toLowerCase().trim()
    console.log('🎤 [VOICE] Normalizing phrase:', {
      original: phrase,
      normalized: normalized,
      timestamp: new Date().toISOString()
    })
    
    // Нормализуем фразу для лучшей дедупликации
    return normalized
  }

  private cleanDuplicateText(text: string): string {
    console.log('🎤 [VOICE] Cleaning duplicate text:', {
      originalText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      originalLength: text.length,
      timestamp: new Date().toISOString()
    })
    
    // Очищаем текст от дублирующихся частей
    const words = text.trim().split(/\s+/)
    if (words.length <= 3) {
      console.log('🎤 [VOICE] Text too short, no cleaning needed')
      return text // Короткие фразы не чистим
    }
    
    const cleanedWords: string[] = []
    let i = 0
    let skippedDuplicates = 0
    let skippedGroups = 0
    
    while (i < words.length) {
      // Проверяем, не повторяется ли текущее слово
      if (i > 0 && words[i] === words[i - 1]) {
        i++ // Пропускаем дублирующееся слово
        skippedDuplicates++
        continue
      }
      
      // Проверяем, не повторяется ли группа из 2-3 слов
      if (i >= 2) {
        const currentGroup = words.slice(i, i + 3).join(' ')
        const previousGroup = words.slice(i - 3, i).join(' ')
        
        if (currentGroup === previousGroup) {
          i += 3 // Пропускаем повторяющуюся группу
          skippedGroups++
          continue
        }
      }
      
      cleanedWords.push(words[i])
      i++
    }
    
    const cleanedText = cleanedWords.join(' ')
    console.log('🎤 [VOICE] Text cleaning completed:', {
      originalWords: words.length,
      cleanedWords: cleanedWords.length,
      skippedDuplicates: skippedDuplicates,
      skippedGroups: skippedGroups,
      cleanedLength: cleanedText.length,
      reduction: ((words.length - cleanedWords.length) / words.length * 100).toFixed(1) + '%'
    })
    
    return cleanedText
  }

  private mapRecognitionError(event: any): VoiceError {
    console.log('🎤 [VOICE] Mapping recognition error:', {
      error: event.error,
      message: event.message,
      timestamp: new Date().toISOString(),
      fullEvent: event
    })
    
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

    const mappedError = errorMap[event.error] || {
      type: 'unknown',
      message: `Ошибка распознавания: ${event.error}`,
      code: event.error,
      details: event
    }
    
    console.log('🎤 [VOICE] Error mapping result:', {
      originalError: event.error,
      mappedType: mappedError.type,
      mappedCode: mappedError.code,
      mappedMessage: mappedError.message
    })
    
    return mappedError
  }

  private updateState(newState: Partial<VoiceState>) {
    const oldState = { ...this.currentState }
    this.currentState = { ...this.currentState, ...newState }
    
    console.log('🎤 [VOICE] State updated:', {
      old: {
        status: oldState.status,
        isListening: oldState.isListening,
        confidence: oldState.confidence?.toFixed(3),
        phraseCount: oldState.phraseCount
      },
      new: {
        status: this.currentState.status,
        isListening: this.currentState.isListening,
        confidence: this.currentState.confidence?.toFixed(3),
        phraseCount: this.currentState.phraseCount
      },
      changes: Object.keys(newState),
      timestamp: new Date().toISOString()
    })
    
    this.notifyStateChange(this.currentState)
  }

  private notifyTranscription(text: string, isFinal: boolean, confidence: number) {
    console.log('🎤 [VOICE] Notifying transcription:', {
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      isFinal: isFinal,
      confidence: confidence.toFixed(3),
      callbackCount: this.transcriptionCallbacks.length,
      timestamp: new Date().toISOString()
    })
    
    // Проверяем, что text существует и не пустой
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.warn('🎤 [VOICE] notifyTranscription: skipping empty text:', text)
      return
    }
    
    // Создаем объект с данными для callback
    const transcriptionData = {
      text,
      isFinal,
      confidence,
      timestamp: Date.now()
    }
    
    this.transcriptionCallbacks.forEach((callback, index) => {
      try {
        console.log(`🎤 [VOICE] Calling transcription callback ${index + 1}/${this.transcriptionCallbacks.length}`)
        callback(transcriptionData)
      } catch (error) {
        console.error(`🎤 [VOICE] Error in transcription callback ${index + 1}:`, error)
      }
    })
  }

  private notifyError(error: VoiceError) {
    console.log('🎤 [VOICE] Notifying error:', {
      type: error.type,
      message: error.message,
      code: error.code,
      callbackCount: this.errorCallbacks.length,
      timestamp: new Date().toISOString()
    })
    
    this.errorCallbacks.forEach((callback, index) => {
      try {
        console.log(`🎤 [VOICE] Calling error callback ${index + 1}/${this.errorCallbacks.length}`)
        callback(error)
      } catch (callbackError) {
        console.error(`🎤 [VOICE] Error in error callback ${index + 1}:`, callbackError)
      }
    })
  }

  private notifyStateChange(state: VoiceState) {
    console.log('🎤 [VOICE] Notifying state change:', {
      status: state.status,
      isListening: state.isListening,
      confidence: state.confidence?.toFixed(3),
      phraseCount: state.phraseCount,
      callbackCount: this.stateCallbacks.length,
      timestamp: new Date().toISOString()
    })
    
    this.stateCallbacks.forEach((callback, index) => {
      try {
        console.log(`🎤 [VOICE] Calling state change callback ${index + 1}/${this.stateCallbacks.length}`)
        callback(state)
      } catch (error) {
        console.error(`🎤 [VOICE] Error in state change callback ${index + 1}:`, error)
      }
    })
  }

  private notifyPhraseComplete(phrase: string, confidence: number) {
    console.log('🎤 [VOICE] Notifying phrase complete:', {
      phrase: phrase.substring(0, 50) + (phrase.length > 50 ? '...' : ''),
      confidence: confidence.toFixed(3),
      callbackCount: this.phraseCallbacks.length,
      timestamp: new Date().toISOString()
    })
    
    // Проверяем, что phrase существует и не пустой
    if (!phrase || typeof phrase !== 'string' || phrase.trim() === '') {
      console.warn('🎤 [VOICE] notifyPhraseComplete: skipping empty phrase:', phrase)
      return
    }
    
    // Создаем объект с данными для callback
    const phraseData = {
      phrase,
      confidence
    }
    
    this.phraseCallbacks.forEach((callback, index) => {
      try {
        console.log(`🎤 [VOICE] Calling phrase callback ${index + 1}/${this.phraseCallbacks.length}`)
        callback(phraseData)
      } catch (error) {
        console.error(`🎤 [VOICE] Error in phrase callback ${index + 1}:`, error)
      }
    })
  }

  async start(): Promise<void> {
    try {
      console.log('🎤 [VOICE] Starting recognition, current status:', this.currentState.status)
      
      if (this.currentState.status === 'recording') {
        console.log('🎤 [VOICE] Already recording, skipping start')
        return
      }

      console.log('🎤 [VOICE] Calling recognition.start()...')
      await this.recognition.start()
      console.log('🎤 [VOICE] recognition.start() completed successfully')
    } catch (error) {
      console.error('🎤 [VOICE] Failed to start recognition:', error)
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
      console.log('🎤 [VOICE] Stopping recognition, current status:', this.currentState.status)
      this.recognition.stop()
      console.log('🎤 [VOICE] recognition.stop() called successfully')
      
      // Очищаем таймеры слов и буферы при остановке
      console.log('🎤 [VOICE] Clearing word timers and buffers on stop:', {
        timers: this.wordTimeoutTimers.size,
        bufferSize: this.lastWordBuffer.length,
        consecutiveCount: this.consecutiveWordCount
      })
      
      this.wordTimeoutTimers.forEach((timer) => {
        clearTimeout(timer)
      })
      this.wordTimeoutTimers.clear()
      this.lastWordUpdateTime = 0
      this.consecutiveWordCount = 0
      this.lastWordBuffer = []
      
      this.updateState({
        status: 'stopped',
        isListening: false,
        confidence: 0
      })
      console.log('🎤 [VOICE] State updated to stopped')
    } catch (error) {
      console.error('🎤 [VOICE] Error stopping recognition:', error)
    }
  }

  pause(): void {
    try {
      console.log('🎤 [VOICE] Pausing recognition, current status:', this.currentState.status)
      this.recognition.stop()
      console.log('🎤 [VOICE] recognition.stop() called for pause')
      
      // Очищаем таймеры слов и буферы при паузе
      console.log('🎤 [VOICE] Clearing word timers and buffers on pause:', {
        timers: this.wordTimeoutTimers.size,
        bufferSize: this.lastWordBuffer.length,
        consecutiveCount: this.consecutiveWordCount
      })
      
      this.wordTimeoutTimers.forEach((timer) => {
        clearTimeout(timer)
      })
      this.wordTimeoutTimers.clear()
      this.lastWordUpdateTime = 0
      this.consecutiveWordCount = 0
      this.lastWordBuffer = []
      
      this.updateState({
        status: 'paused',
        isListening: false
      })
      console.log('🎤 [VOICE] State updated to paused')
    } catch (error) {
      console.error('🎤 [VOICE] Error pausing recognition:', error)
    }
  }

  resume(): void {
    try {
      console.log('🎤 [VOICE] Resuming recognition, current status:', this.currentState.status)
      this.start()
    } catch (error) {
      console.error('🎤 [VOICE] Error resuming recognition:', error)
    }
  }

  onTranscription(callback: (data: TranscriptionResult) => void): void {
    console.log('🎤 [VOICE] Adding transcription callback, total:', this.transcriptionCallbacks.length + 1)
    this.transcriptionCallbacks.push(callback)
  }

  onError(callback: (error: VoiceError) => void): void {
    console.log('🎤 [VOICE] Adding error callback, total:', this.errorCallbacks.length + 1)
    this.errorCallbacks.push(callback)
  }

  onStateChange(callback: (state: VoiceState) => void): void {
    console.log('🎤 [VOICE] Adding state change callback, total:', this.stateCallbacks.length + 1)
    this.stateCallbacks.push(callback)
  }

  onPhraseComplete(callback: (data: { phrase: string, confidence: number }) => void): void {
    console.log('🎤 [VOICE] Adding phrase complete callback, total:', this.phraseCallbacks.length + 1)
    this.phraseCallbacks.push(callback)
  }

  getCurrentState(): VoiceState {
    console.log('🎤 [VOICE] Getting current state:', {
      status: this.currentState.status,
      isListening: this.currentState.isListening,
      confidence: this.currentState.confidence?.toFixed(3),
      phraseCount: this.currentState.phraseCount,
      language: this.currentState.language,
      totalDuration: this.currentState.totalDuration,
      timestamp: new Date().toISOString()
    })
    
    return { ...this.currentState }
  }

  setLanguage(language: string): void {
    if (this.recognition) {
      console.log('🎤 [VOICE] Setting language:', {
        old: this.currentState.language,
        new: language,
        timestamp: new Date().toISOString()
      })
      
      this.recognition.lang = language
      this.updateState({ language })
      
      console.log('🎤 [VOICE] Language updated successfully')
    } else {
      console.warn('🎤 [VOICE] Cannot set language: recognition not initialized')
    }
  }

  cleanup(): void {
    try {
      console.log('🎤 [VOICE] Starting cleanup, current status:', this.currentState.status)
      
      if (this.currentState.status === 'recording') {
        console.log('🎤 [VOICE] Stopping active recognition before cleanup')
        this.recognition.stop()
      }
      
      console.log('🎤 [VOICE] Clearing callbacks:', {
        transcription: this.transcriptionCallbacks.length,
        error: this.errorCallbacks.length,
        state: this.stateCallbacks.length,
        phrase: this.phraseCallbacks.length
      })
      
      this.transcriptionCallbacks = []
      this.errorCallbacks = []
      this.stateCallbacks = []
      this.phraseCallbacks = []
      
      // Очищаем буферы при cleanup
      console.log('🎤 [VOICE] Clearing buffers:', {
        createdPhrases: this.createdPhrases.size,
        phraseBuffer: this.phraseBuffer.size
      })
      
      this.createdPhrases.clear()
      this.phraseBuffer.clear()
      
      // Очищаем таймеры слов и буферы
      console.log('🎤 [VOICE] Clearing word timers and buffers:', {
        timers: this.wordTimeoutTimers.size,
        bufferSize: this.lastWordBuffer.length,
        consecutiveCount: this.consecutiveWordCount
      })
      
      this.wordTimeoutTimers.forEach((timer) => {
        clearTimeout(timer)
      })
      this.wordTimeoutTimers.clear()
      this.lastWordUpdateTime = 0
      this.consecutiveWordCount = 0
      this.lastWordBuffer = []
      
      console.log('🎤 [VOICE] Cleanup completed successfully')
    } catch (error) {
      console.error('🎤 [VOICE] Error during cleanup:', error)
    }
  }
}

// Factory function to create voice service
export function createVoiceService(): VoiceRecognitionService {
  try {
    console.log('🎤 [VOICE] Creating voice service...')
    const service = new WebSpeechVoiceService()
    console.log('🎤 [VOICE] Voice service created successfully:', service)
    return service
  } catch (error) {
    console.error('🎤 [VOICE] Failed to create voice service:', error)
    throw new Error(`Failed to create voice service: ${error}`)
  }
}

// Check if voice recognition is supported
export function isVoiceRecognitionSupported(): boolean {
  const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  console.log('🎤 [VOICE] Voice recognition support check:', {
    supported: supported,
    webkitSpeechRecognition: 'webkitSpeechRecognition' in window,
    SpeechRecognition: 'SpeechRecognition' in window,
    userAgent: navigator.userAgent
  })
  return supported
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
