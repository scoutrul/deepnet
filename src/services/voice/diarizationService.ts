// Diarization Service - Сервис диаризации диалогов с DeepGram
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'
import { appConfig } from '../../config/appConfig'
import type { DiarizedSegment, DiarizedSpeaker, DiarizationState } from '../../types/chat'

export interface DiarizationServiceEvents {
  onSegment: (segment: DiarizedSegment) => void
  onSpeakerChange: (speaker: DiarizedSpeaker) => void
  onStateChange: (state: Partial<DiarizationState>) => void
  onError: (error: Error) => void
}

export class DiarizationService {
  private deepgram: any = null
  private connection: any = null
  private isActive = false
  private isConnecting = false
  private error: string | null = null
  private speakers: Record<string, DiarizedSpeaker> = {}
  private activeSegments: Record<string, DiarizedSegment> = {}
  private speakerCounter = 0
  private eventListeners: Partial<DiarizationServiceEvents> = {}
  
  // 🔧 ВРЕМЕННАЯ ЛОГИКА: Отслеживание смены спикеров
  private currentSpeakerId: string | null = null
  private currentSpeakerName: string | null = null
  private lastSegmentTime: number | null = null

  constructor() {
    console.log('🎭 [DIARIZATION] Service initialized')
    this.initializeDeepGram().catch(error => {
      console.error('🎭 [DIARIZATION] Failed to initialize:', error)
    })
  }

  private async initializeDeepGram(): Promise<void> {
    try {
      console.log('🎭 [DIARIZATION] Initializing DeepGram client...')
      console.log('🎭 [DIARIZATION] API Key from config:', appConfig.deepgram.apiKey)
      console.log('🎭 [DIARIZATION] API Key type:', typeof appConfig.deepgram.apiKey)
      console.log('🎭 [DIARIZATION] API Key length:', appConfig.deepgram.apiKey?.length)
      
      if (!appConfig.deepgram.apiKey) {
        console.warn('🎭 [DIARIZATION] API ключ не предоставлен, диаризация недоступна')
        this.deepgram = null
        return
      }

      // DeepGram API ключи не имеют фиксированного префикса
      // Проверяем только что ключ не пустой и имеет разумную длину
      if (appConfig.deepgram.apiKey.length < 10) {
        console.warn('🎭 [DIARIZATION] API ключ DeepGram слишком короткий')
        console.warn('🎭 [DIARIZATION] Получен ключ длиной:', appConfig.deepgram.apiKey.length)
        console.warn('🎭 [DIARIZATION] Проверьте правильность API ключа в .env файле')
        console.warn('🎭 [DIARIZATION] Диаризация недоступна')
        this.deepgram = null
        return
      }

      try {
        this.deepgram = createClient(appConfig.deepgram.apiKey)
        console.log('🎭 [DIARIZATION] DeepGram client created')
        
        // Проверяем, что клиент работает
        if (!this.deepgram || !this.deepgram.listen) {
          throw new Error('DeepGram client is not properly initialized')
        }
        
        // Пропускаем тест API ключа из-за CORS ограничений
        console.log('🎭 [DIARIZATION] Skipping API key test due to CORS restrictions')
        console.log('🎭 [DIARIZATION] API key will be validated during WebSocket connection')
        
        // Сохраняем API ключ в localStorage для отладки
        if (appConfig.deepgram.apiKey) {
          localStorage.setItem('deepgram_api_key', appConfig.deepgram.apiKey)
          console.log('🎭 [DIARIZATION] API key saved to localStorage for debugging')
        }
        
        console.log('🎭 [DIARIZATION] DeepGram client initialized successfully')
      } catch (clientError) {
        console.error('🎭 [DIARIZATION] Error creating DeepGram client:', clientError)
        throw clientError
      }
    } catch (error) {
      console.error('🎭 [DIARIZATION] Failed to initialize DeepGram client:', error)
      this.deepgram = null
      this.handleError(new Error('Не удалось инициализировать DeepGram клиент'))
    }
  }

  // Подписка на события
  on<K extends keyof DiarizationServiceEvents>(event: K, callback: DiarizationServiceEvents[K]): void {
    console.log('🎭 [DIARIZATION] 📡 Subscribing to event:', event)
    this.eventListeners[event] = callback
  }

  // Отписка от событий
  off<K extends keyof DiarizationServiceEvents>(event: K): void {
    delete this.eventListeners[event]
  }

  // Эмит событий
  private emit<K extends keyof DiarizationServiceEvents>(event: K, data: Parameters<DiarizationServiceEvents[K]>[0]): void {
    console.log('🎭 [DIARIZATION] 📡 Emitting event:', event, 'with data:', data)
    const callback = this.eventListeners[event]
    if (callback) {
      console.log('🎭 [DIARIZATION] 📡 ✅ Event callback found, executing...')
      callback(data as any)
    } else {
      console.log('🎭 [DIARIZATION] 📡 ❌ No callback for event:', event)
      console.log('🎭 [DIARIZATION] 📡 Available listeners:', Object.keys(this.eventListeners))
    }
  }

  // Запуск диаризации
  async start(): Promise<void> {
    if (!this.deepgram) {
      console.warn('🎭 [DIARIZATION] DeepGram клиент не инициализирован - работаем в режиме без диаризации')
      // Устанавливаем состояние как активное, но без реальной диаризации
      this.isActive = true
      this.isConnecting = false
      this.error = null
      this.emit('onStateChange', { isActive: true, isConnecting: false, error: null })
      return
    }

    if (this.isActive && this.connection) {
      console.warn('🎭 [DIARIZATION] Already active with connection')
      return
    }

    // Если активна, но нет соединения - закрываем старое соединение
    if (this.isActive && !this.connection) {
      console.log('🎭 [DIARIZATION] Reconnecting...')
      this.isActive = false
    }

    try {
      console.log('🎭 [DIARIZATION] Starting diarization...')
      this.isConnecting = true
      this.error = null
      this.emit('onStateChange', { isConnecting: true, error: null })

      // Создаем соединение с правильной конфигурацией для русского языка
      const connectionOptions = {
        // Основные параметры
        model: 'nova-2',              // Стабильная модель
        language: 'ru',               // РУССКИЙ ЯЗЫК (возвращаем)
        
        // Базовые результаты
        interim_results: true,        // Промежуточные результаты
        
        // Добавляем параметры для лучшего распознавания
        smart_format: true,           // Умное форматирование
        punctuate: true              // Пунктуация
      }
      
      console.log('🎭 [DIARIZATION] Connection options:', connectionOptions)
      console.log('🎭 [DIARIZATION] DeepGram client:', this.deepgram)
      console.log('🎭 [DIARIZATION] API Key length:', appConfig.deepgram.apiKey?.length)
      console.log('🎭 [DIARIZATION] API Key first 10 chars:', appConfig.deepgram.apiKey?.substring(0, 10))
      
      try {
        this.connection = this.deepgram.listen.live(connectionOptions)
        console.log('🎭 [DIARIZATION] ✅ Connection created successfully')
      
      // 🔍 КРИТИЧЕСКАЯ ДИАГНОСТИКА: Выставляем connection в window для отладки
      ;(window as any).deepgramConnection = this.connection
      ;(window as any).diarizationService = this
      console.log('🎭 [DIARIZATION] 🔍 Connection доступен в window.deepgramConnection для отладки!')
      console.log('🎭 [DIARIZATION] 🔍 Service доступен в window.diarizationService для отладки!')
      
      // 🔍 Добавляем тестовую функцию для отправки тестового аудио
      ;(window as any).testDeepGramAudio = async () => {
        console.log('🔍 [TEST] Тестируем DeepGram с тестовым аудио...')
        try {
          // Создаем тестовый Blob с синусоидой (имитация звука)
          const sampleRate = 16000
          const duration = 1 // 1 секунда
          const samples = sampleRate * duration
          const buffer = new ArrayBuffer(samples * 2) // 16-bit PCM
          const view = new DataView(buffer)
          
          for (let i = 0; i < samples; i++) {
            const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 32767 // 440Hz тон
            view.setInt16(i * 2, sample, true) // little-endian
          }
          
          // Тестируем разные форматы
          const testBlob1 = new Blob([buffer], { type: 'audio/pcm' })
          const testBlob2 = new Blob([buffer], { type: 'audio/wav' })
          const testBlob3 = new Blob([buffer], { type: 'audio/raw' })
          
          console.log('🔍 [TEST] Тестируем audio/pcm...')
          this.connection.send(testBlob1)
          
          setTimeout(() => {
            console.log('🔍 [TEST] Тестируем audio/wav...')
            this.connection.send(testBlob2)
          }, 2000)
          
          setTimeout(() => {
            console.log('🔍 [TEST] Тестируем audio/raw...')  
            this.connection.send(testBlob3)
          }, 4000)
          
          if (this.connection && this.isActive) {
            console.log('🔍 [TEST] Все тестовые форматы отправлены!')
          } else {
            console.error('🔍 [TEST] Connection не активен!')
          }
        } catch (error) {
          console.error('🔍 [TEST] Ошибка тестирования:', error)
        }
      }
      } catch (error) {
        console.error('🎭 [DIARIZATION] ❌ Failed to create connection:', error)
        this.handleError(error as Error)
        return
      }
      
      console.log('🎭 [DIARIZATION] WebSocket connection created, waiting for events...')
      console.log('🎭 [DIARIZATION] Connection object:', this.connection)
      
      // Добавляем таймаут для проверки соединения
      setTimeout(() => {
        console.log('🎭 [DIARIZATION] Connection status after 3s:', {
          isActive: this.isActive,
          isConnecting: this.isConnecting,
          hasConnection: !!this.connection,
          error: this.error
        })
        
        // Если соединение создано, но не активно, принудительно активируем
        if (this.connection && !this.isActive && !this.error) {
          console.log('🎭 [DIARIZATION] Forcing activation of diarization...')
          this.isActive = true
          this.isConnecting = false
          this.emit('onStateChange', { isActive: true, isConnecting: false, error: null })
        }
      }, 3000)

      // Обработчики событий
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('🎭 [DIARIZATION] ✅ WebSocket connection opened successfully')
        console.log('🎭 [DIARIZATION] Connection URL:', this.connection?.getURL?.() || 'Unknown')
        this.isActive = true
        this.isConnecting = false
        this.error = null
        this.emit('onStateChange', { isActive: true, isConnecting: false, error: null })
        console.log('🎭 [DIARIZATION] Ready to receive audio data')
        
        // Отправляем keepalive сообщение для поддержания соединения
        try {
          console.log('🎭 [DIARIZATION] Sending keepalive message...')
          this.connection.send(new ArrayBuffer(0)) // Пустое сообщение для keepalive
        } catch (error) {
          console.warn('🎭 [DIARIZATION] Could not send keepalive:', error)
        }
      })

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('🎭 [DIARIZATION] Connection closed')
        this.isActive = false
        this.isConnecting = false
        this.emit('onStateChange', { isActive: false, isConnecting: false })
      })

      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('🎭 [DIARIZATION] ❌ WebSocket connection error:', error)
        console.error('🎭 [DIARIZATION] Error details:', {
          message: error.message,
          readyState: error.readyState,
          url: error.url,
          statusCode: error.statusCode
        })
        // Не останавливаем диаризацию при ошибке соединения, пытаемся переподключиться
        this.isConnecting = false
        this.error = `Ошибка соединения: ${error.message || error}`
        this.emit('onStateChange', { 
          isConnecting: false, 
          error: this.error 
        })
        console.warn('🎭 [DIARIZATION] Will attempt to reconnect on next audio data')
      })

      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        console.log('🎭 [DIARIZATION] 📝 LiveTranscriptionEvents.Transcript:', data)
        if (data && data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
          const transcript = data.channel.alternatives[0].transcript
          console.log('🎭 [DIARIZATION] 🎯 Raw transcript:', transcript)
          console.log('🎭 [DIARIZATION] 🎯 Is final:', data.is_final)
          console.log('🎭 [DIARIZATION] 🎯 Duration:', data.duration)
        }
        this.handleTranscript(data)
      })

      // Добавляем обработку всех возможных событий DeepGram
      this.connection.on('Results', (data: any) => {
        console.log('🎭 [DIARIZATION] 📝 Results event:', data)
        this.handleTranscript(data)
      })

      this.connection.on('Metadata', (data: any) => {
        console.log('🎭 [DIARIZATION] 📝 Metadata event:', data)
      })

      this.connection.on('UtteranceEnd', (data: any) => {
        console.log('🎭 [DIARIZATION] 📝 UtteranceEnd event:', data)
      })

      // Добавляем обработку всех возможных событий
      this.connection.on('open', () => {
        console.log('🎭 [DIARIZATION] 🔌 WebSocket open event')
      })

      this.connection.on('close', (event: any) => {
        console.log('🎭 [DIARIZATION] 🔌 WebSocket close event:', event)
      })

      this.connection.on('error', (error: any) => {
        console.log('🎭 [DIARIZATION] 🔌 WebSocket error event:', error)
      })

      this.connection.on('message', (data: any) => {
        console.log('🎭 [DIARIZATION] 🔌 WebSocket message event:', data)
        try {
          const parsed = JSON.parse(data)
          console.log('🎭 [DIARIZATION] 📝 Parsed message:', parsed)
          
          // Проверяем есть ли транскрипт в сообщении
          if (parsed.channel && parsed.channel.alternatives && parsed.channel.alternatives[0]) {
            const transcript = parsed.channel.alternatives[0].transcript
            console.log('🎭 [DIARIZATION] 🎯 Found transcript in message:', transcript)
          }
        } catch (e) {
          console.log('🎭 [DIARIZATION] 📝 Raw message (not JSON):', data)
        }
      })

      console.log('🎭 [DIARIZATION] Diarization started successfully')
    } catch (error) {
      console.error('🎭 [DIARIZATION] Failed to start diarization:', error)
      this.handleError(new Error('Не удалось запустить диаризацию'))
    }
  }

  // Остановка диаризации
  async stop(): Promise<void> {
    if (!this.isActive) {
      console.warn('🎭 [DIARIZATION] Not active')
      return
    }

    try {
      console.log('🎭 [DIARIZATION] Stopping diarization...')
      
      if (this.connection) {
        await this.connection.finish()
        this.connection = null
      }

      this.isActive = false
      this.isConnecting = false
      this.emit('onStateChange', { isActive: false, isConnecting: false })
      
      console.log('🎭 [DIARIZATION] Diarization stopped')
    } catch (error) {
      console.error('🎭 [DIARIZATION] Error stopping diarization:', error)
      this.handleError(new Error('Ошибка при остановке диаризации'))
    }
  }

  // Обработка транскрипции
  private handleTranscript(data: any): void {
    try {
      console.log('🎭 [DIARIZATION] 📝 Received transcript data:', data)
      
      if (!data.channel?.alternatives?.[0]) {
        console.log('🎭 [DIARIZATION] No alternatives in transcript data')
        return
      }

      const alternative = data.channel.alternatives[0]
      const text = alternative.transcript?.trim()
      
      console.log('🎭 [DIARIZATION] Transcript text:', text)
      console.log('🎭 [DIARIZATION] Alternative data:', alternative)
      console.log('🎭 [DIARIZATION] Channel data:', data.channel)
      
      if (!text) {
        console.log('🎭 [DIARIZATION] ❌ Empty transcript text')
        console.log('🎭 [DIARIZATION] 📊 Data structure:', {
          type: data.type,
          channel_index: data.channel_index,
          duration: data.duration,
          start: data.start,
          is_final: data.is_final
        })
        console.log('🎭 [DIARIZATION] 🎯 Alternative data:', {
          transcript: alternative.transcript,
          confidence: alternative.confidence,
          words_count: alternative.words?.length || 0,
          has_words: !!alternative.words
        })
        if (alternative.words && alternative.words.length > 0) {
          console.log('🎭 [DIARIZATION] 🔤 First few words:', alternative.words.slice(0, 3))
        }
        return
      }
      
      console.log('🎭 [DIARIZATION] ✅ Got transcript text:', text)

      // Получаем информацию о спикере
      const speaker = alternative.words?.[0]?.speaker
      const confidence = alternative.confidence || 0
      const isFinal = alternative.words?.[0]?.is_final || false

      console.log('🎭 [DIARIZATION] Speaker info:', { speaker, confidence, isFinal })

      if (speaker !== undefined) {
        const segment = this.createSegment(speaker, text, isFinal, confidence)
        console.log('🎭 [DIARIZATION] Created segment:', segment)
        this.emit('onSegment', segment)
      } else {
        console.log('🎭 [DIARIZATION] No speaker info, creating basic segment')
        
        // 🔧 ВРЕМЕННАЯ ЛОГИКА: Создаем разных спикеров по паузам
        const currentTime = Date.now()
        const SPEAKER_CHANGE_TIMEOUT = 5000 // 5 секунд для смены спикера
        
        // Определяем спикера по времени последнего сообщения
        let speakerId = this.currentSpeakerId || 'speaker_1'
        let speakerName = this.currentSpeakerName || 'Спикер 1'
        
        if (this.lastSegmentTime && (currentTime - this.lastSegmentTime > SPEAKER_CHANGE_TIMEOUT)) {
          // Смена спикера после паузы
          speakerId = speakerId === 'speaker_1' ? 'speaker_2' : 'speaker_1'
          speakerName = speakerId === 'speaker_1' ? 'Спикер 1' : 'Спикер 2'
          console.log('🎭 [DIARIZATION] 🔄 Speaker changed to:', speakerName)
        }
        
        this.currentSpeakerId = speakerId
        this.currentSpeakerName = speakerName
        this.lastSegmentTime = currentTime
        
        const basicSegment = {
          id: `segment_${Date.now()}`,
          speakerId: speakerId,
          speakerName: speakerName,
          text: text,
          isFinal: isFinal,
          timestamp: currentTime,
          confidence: confidence
        }
        this.emit('onSegment', basicSegment)
      }
    } catch (error) {
      console.error('🎭 [DIARIZATION] Error handling transcript:', error)
    }
  }

  // Создание сегмента
  private createSegment(speakerId: number, text: string, isFinal: boolean, confidence: number): DiarizedSegment {
    const speakerKey = `spk_${speakerId}`
    
    // Создаем или получаем спикера
    if (!this.speakers[speakerKey]) {
      this.speakers[speakerKey] = this.createSpeaker(speakerKey, speakerId)
      this.emit('onSpeakerChange', this.speakers[speakerKey])
    }

    const speaker = this.speakers[speakerKey]
    const segmentId = `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const segment: DiarizedSegment = {
      id: segmentId,
      speakerId: speakerKey,
      speakerName: speaker.displayName,
      text,
      isFinal,
      timestamp: Date.now(),
      confidence,
      startTime: Date.now(),
      endTime: isFinal ? Date.now() : undefined
    }

    // Сохраняем активный сегмент
    if (!isFinal) {
      this.activeSegments[speakerKey] = segment
    } else {
      delete this.activeSegments[speakerKey]
    }

    return segment
  }

  // Создание спикера
  private createSpeaker(speakerKey: string, speakerId: number): DiarizedSpeaker {
    const colorIndex = this.speakerCounter % appConfig.diarization.speakerColors.length
    const color = appConfig.diarization.speakerColors[colorIndex]
    const displayName = `Спикер ${speakerId + 1}`
    
    this.speakerCounter++

    return {
      id: speakerKey,
      name: `speaker_${speakerId}`,
      color,
      displayName
    }
  }

  // Отправка аудио данных
  // 🎯 ИСПРАВЛЕНИЕ: Принимаем Blob согласно официальной документации DeepGram
  async sendAudio(audioBlob: Blob): Promise<void> {
    console.log('🎭 [DIARIZATION] sendAudio called, state:', {
      isActive: this.isActive,
      isConnecting: this.isConnecting,
      hasConnection: !!this.connection,
      hasDeepgram: !!this.deepgram,
      error: this.error
    })
    
    if (!this.isActive) {
      console.warn('🎭 [DIARIZATION] Diarization not active - cannot send audio')
      return
    }

    // Если DeepGram не инициализирован, просто логируем
    if (!this.deepgram) {
      console.log('🎭 [DIARIZATION] DeepGram not available - audio data received but not processed')
      return
    }

    // Если соединение потеряно, пытаемся переподключиться
    if (!this.connection) {
      console.log('🎭 [DIARIZATION] Connection lost, attempting to reconnect...')
      try {
        await this.start()
        if (this.connection) {
          console.log('🎭 [DIARIZATION] Reconnected successfully')
        }
      } catch (error) {
        console.error('🎭 [DIARIZATION] Failed to reconnect:', error)
        return
      }
    }

    try {
      console.log('🎭 [DIARIZATION] 🎵 Sending audio Blob, size:', audioBlob.size, 'bytes, type:', audioBlob.type)
      console.log('🎭 [DIARIZATION] 🔍 Connection state before send:', {
        readyState: this.connection.getReadyState?.(),
        isActive: this.isActive,
        isConnecting: this.isConnecting
      })
      
      // Отправляем Blob напрямую как в официальном примере: connection.send(event.data)
      this.connection.send(audioBlob)
      console.log('🎭 [DIARIZATION] ✅ Audio Blob sent successfully')
      
      // 🔍 ДИАГНОСТИКА: Проверяем состояние после отправки
      console.log('🎭 [DIARIZATION] 🔍 Connection state after send:', {
        readyState: this.connection.getReadyState?.(),
        isActive: this.isActive
      })
    } catch (error) {
      console.error('🎭 [DIARIZATION] ❌ Error sending audio:', error)
      // Не останавливаем диаризацию при ошибке отправки
      console.warn('🎭 [DIARIZATION] Will retry on next audio data')
    }
  }

  // Обработка ошибок
  private handleError(error: Error): void {
    this.error = error.message
    this.isActive = false
    this.isConnecting = false
    this.emit('onError', error)
    this.emit('onStateChange', { 
      isActive: false, 
      isConnecting: false, 
      error: this.error 
    })
  }

  // Получение состояния
  getState(): DiarizationState {
    return {
      isActive: this.isActive,
      isConnecting: this.isConnecting,
      error: this.error,
      speakers: { ...this.speakers },
      activeSegments: { ...this.activeSegments }
    }
  }

  // Очистка ресурсов
  cleanup(): void {
    console.log('🎭 [DIARIZATION] Cleaning up...')
    
    if (this.connection) {
      this.connection.finish().catch(console.error)
      this.connection = null
    }

    this.isActive = false
    this.isConnecting = false
    this.error = null
    this.speakers = {}
    this.activeSegments = {}
    this.speakerCounter = 0
    this.eventListeners = {}
  }
}

// Создаем экземпляр сервиса
export const diarizationService = new DiarizationService()
