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
  private isPaused = false // Состояние паузы
  private error: string | null = null
  private speakers: Record<string, DiarizedSpeaker> = {}
  private activeSegments: Record<string, DiarizedSegment> = {}
  private speakerCounter = 0
  private eventListeners: Partial<DiarizationServiceEvents> = {}
  private keepaliveInterval: NodeJS.Timeout | null = null
  
  // 🔧 ВРЕМЕННАЯ ЛОГИКА: Отслеживание смены спикеров
  private currentSpeakerId: string | null = null
  private currentSpeakerName: string | null = null
  private lastSegmentTime: number | null = null

  constructor() {
    this.initializeDeepGram().catch(error => {
      console.error('🎤 [DIARIZATION] Ошибка инициализации:', error)
    })
  }

  private async initializeDeepGram(): Promise<void> {
    try {
      if (!appConfig.deepgram.apiKey) {
        this.deepgram = null
        return
      }

      // DeepGram API ключи не имеют фиксированного префикса
      // Проверяем только что ключ не пустой и имеет разумную длину
      if (appConfig.deepgram.apiKey.length < 10) {
        this.deepgram = null
        return
      }

      try {
        this.deepgram = createClient(appConfig.deepgram.apiKey)
        
        // Проверяем, что клиент работает
        if (!this.deepgram || !this.deepgram.listen) {
          throw new Error('DeepGram client is not properly initialized')
        }
        
        console.log('🎤 [DIARIZATION] DeepGram клиент инициализирован')
        
        // Сохраняем API ключ в localStorage для отладки
        if (appConfig.deepgram.apiKey) {
          localStorage.setItem('deepgram_api_key', appConfig.deepgram.apiKey)
        }
      } catch (clientError) {
        throw clientError
      }
    } catch (error) {
      this.deepgram = null
      this.handleError(new Error('Не удалось инициализировать DeepGram клиент'))
    }
  }

  // Подписка на события
  on<K extends keyof DiarizationServiceEvents>(event: K, callback: DiarizationServiceEvents[K]): void {
    this.eventListeners[event] = callback
  }

  // Отписка от событий
  off<K extends keyof DiarizationServiceEvents>(event: K): void {
    delete this.eventListeners[event]
  }

  // Эмит событий
  private emit<K extends keyof DiarizationServiceEvents>(event: K, data: Parameters<DiarizationServiceEvents[K]>[0]): void {
    const callback = this.eventListeners[event]
    if (callback) {
      callback(data as any)
    }
  }

  // Запуск диаризации
  async start(): Promise<void> {
    console.log('🎤 [DIARIZATION] Запуск диаризации. Текущее состояние - isActive:', this.isActive, 'isPaused:', this.isPaused, 'isConnecting:', this.isConnecting)
    
    // Проверяем, не идет ли уже процесс запуска
    if (this.isConnecting) {
      console.log('🎤 [DIARIZATION] Диаризация уже запускается, пропускаем')
      return
    }

    // Проверяем, не активна ли уже диаризация
    if (this.isActive && this.connection) {
      console.log('🎤 [DIARIZATION] Диаризация уже активна, пропускаем')
      return
    }
    
    console.log('🎤 [DIARIZATION] Продолжаем запуск диаризации...')
    
    if (!this.deepgram) {
      console.warn('🎤 [DIARIZATION] DeepGram не инициализирован, работаем в режиме эмуляции')
      // Устанавливаем состояние как активное, но без реальной диаризации
      this.isActive = true
      this.isConnecting = false
      this.error = null
      this.emit('onStateChange', { isActive: true, isConnecting: false, error: null })
      return
    }

    // 🔧 ИСПРАВЛЕНИЕ: Полная очистка состояния перед новым запуском
    await this.forceCleanup()

    console.log('🎤 [DIARIZATION] Состояние очищено, создаем новое соединение...')

    try {
      this.isConnecting = true
      this.isPaused = false // Сбрасываем паузу при новом запуске
      this.error = null
      this.emit('onStateChange', { isConnecting: true, isPaused: false, error: null })

      // Создаем соединение с правильной конфигурацией для русского языка
      const connectionOptions = {
        // Основные параметры
        model: 'nova-2',              // Стабильная модель
        language: 'ru',               // РУССКИЙ ЯЗЫК
        
        // Базовые результаты
        interim_results: true,        // Промежуточные результаты
        
        // Добавляем параметры для лучшего распознавания
        smart_format: true,           // Умное форматирование
        punctuate: true,              // Пунктуация
        
        // Параметры для диаризации
        diarize: true,                // Включаем диаризацию
        diarize_version: '2023-05-22', // Версия диаризации
        
        // Параметры аудио для лучшей совместимости
        encoding: 'linear16',         // PCM 16-bit
        sample_rate: 16000,           // 16kHz sample rate
        channels: 1                   // Моно
      }
      
      try {
        this.connection = this.deepgram.listen.live(connectionOptions)
      
      // 🔍 КРИТИЧЕСКАЯ ДИАГНОСТИКА: Выставляем connection в window для отладки
      ;(window as any).deepgramConnection = this.connection
      ;(window as any).diarizationService = this
      
      // 🔍 Добавляем тестовую функцию для отправки тестового аудио
      ;(window as any).testDeepGramAudio = async () => {
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
          
          this.connection.send(testBlob1)
          
          setTimeout(() => {
            this.connection.send(testBlob2)
          }, 2000)
          
          setTimeout(() => {
            this.connection.send(testBlob3)
          }, 4000)
        } catch (error) {
          // Ошибка тестирования
        }
      }
      } catch (error) {
        this.handleError(error as Error)
        return
      }
      

      // Обработчики событий
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('🎤 [DIARIZATION] Соединение с DeepGram установлено')
        this.isActive = true
        this.isConnecting = false
        this.isPaused = false // Убеждаемся, что пауза сброшена
        this.error = null
        this.emit('onStateChange', { isActive: true, isConnecting: false, isPaused: false, error: null })
        
        // 🔧 ИСПРАВЛЕНИЕ: Улучшенный keepalive механизм
        try {
          // Отправляем пустой буфер для инициализации соединения
          const keepaliveBuffer = new ArrayBuffer(0)
          this.connection.send(keepaliveBuffer)
          console.log('🎤 [DIARIZATION] Keepalive сообщение отправлено')
          
          // Устанавливаем периодический keepalive каждые 30 секунд
          if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval)
          }
          this.keepaliveInterval = setInterval(() => {
            if (this.connection && this.isActive) {
              try {
                this.connection.send(new ArrayBuffer(0))
                // console.log('🎤 [DIARIZATION] Периодический keepalive отправлен')
              } catch (error) {
                console.warn('🎤 [DIARIZATION] Ошибка периодического keepalive:', error)
              }
            }
          }, 30000) // 30 секунд
        } catch (error) {
          console.warn('🎤 [DIARIZATION] Ошибка отправки keepalive:', error)
        }
      })

      this.connection.on(LiveTranscriptionEvents.Close, (event: any) => {
        console.log('🎤 [DIARIZATION] Соединение с DeepGram закрыто. Код:', event?.code, 'Причина:', event?.reason)
        
        // 🔧 ИСПРАВЛЕНИЕ: Очищаем keepalive интервал при закрытии
        if (this.keepaliveInterval) {
          clearInterval(this.keepaliveInterval)
          this.keepaliveInterval = null
          console.log('🎤 [DIARIZATION] Keepalive интервал очищен')
        }
        
        // Просто закрываем соединение без автоматического переподключения
        this.isActive = false
        this.isConnecting = false
        
        this.emit('onStateChange', { isActive: false, isConnecting: false })
      })

      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('🎤 [DIARIZATION] Ошибка соединения:', error)
        
        // 🔧 ИСПРАВЛЕНИЕ: Очищаем keepalive интервал при ошибке
        if (this.keepaliveInterval) {
          clearInterval(this.keepaliveInterval)
          this.keepaliveInterval = null
        }
        
        // Не останавливаем диаризацию при ошибке соединения, пытаемся переподключиться
        this.isConnecting = false
        this.error = `Ошибка соединения: ${error.message || error}`
        this.emit('onStateChange', { 
          isConnecting: false, 
          error: this.error 
        })
      })

      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        this.handleTranscript(data)
      })

      // Добавляем обработку всех возможных событий DeepGram
      this.connection.on('Results', (data: any) => {
        this.handleTranscript(data)
      })

      this.connection.on('Metadata', (_data: any) => {
        // Metadata event
      })

      this.connection.on('UtteranceEnd', (_data: any) => {
        // UtteranceEnd event
      })

      // 🔧 ИСПРАВЛЕНИЕ: Добавляем обработку всех возможных событий WebSocket
      this.connection.on('open', () => {
        console.log('🎤 [DIARIZATION] WebSocket соединение открыто')
      })

      this.connection.on('close', (event: any) => {
        console.log('🎤 [DIARIZATION] WebSocket соединение закрыто:', event?.code, event?.reason)
        
        // Очищаем keepalive интервал при закрытии WebSocket
        if (this.keepaliveInterval) {
          clearInterval(this.keepaliveInterval)
          this.keepaliveInterval = null
        }
        
        // Если соединение закрылось неожиданно, пытаемся переподключиться
        if (this.isActive && event?.code !== 1000) { // 1000 = нормальное закрытие
          console.log('🎤 [DIARIZATION] Неожиданное закрытие соединения, пытаемся переподключиться...')
          setTimeout(() => {
            if (this.isActive && !this.connection) {
              this.start().catch(error => {
                console.error('🎤 [DIARIZATION] Ошибка автоматического переподключения:', error)
              })
            }
          }, 2000) // Ждем 2 секунды перед переподключением
        }
      })

      this.connection.on('error', (error: any) => {
        console.error('🎤 [DIARIZATION] WebSocket ошибка:', error)
        
        // Очищаем keepalive интервал при ошибке WebSocket
        if (this.keepaliveInterval) {
          clearInterval(this.keepaliveInterval)
          this.keepaliveInterval = null
        }
      })

      this.connection.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data)
          
          // Проверяем есть ли транскрипт в сообщении
          if (parsed.channel && parsed.channel.alternatives && parsed.channel.alternatives[0]) {
            // Found transcript in message
            console.log('🎤 [DIARIZATION] Транскрипт в сообщении найден')
          }
        } catch (e) {
          // Raw message (not JSON)
        }
      })
    } catch (error) {
      this.handleError(new Error('Не удалось запустить диаризацию'))
    }
  }

  // Пауза диаризации (сохраняем соединение)
  pause(): void {
    console.log('🎤 [DIARIZATION] Пауза диаризации...')
    this.isPaused = true
    this.emit('onStateChange', { isActive: false, isConnecting: false, isPaused: true, error: null })
    console.log('🎤 [DIARIZATION] Диаризация приостановлена')
  }

  // Возобновление диаризации
  async resume(): Promise<void> {
    console.log('🎤 [DIARIZATION] Возобновление диаризации...')
    
    // Проверяем, есть ли активное соединение
    if (!this.connection) {
      console.log('🎤 [DIARIZATION] Соединение отсутствует - переподключаемся...')
      await this.start()
      return
    }
    
    this.isPaused = false
    this.isActive = true
    this.error = null
    this.emit('onStateChange', { isActive: true, isConnecting: false, isPaused: false, error: null })
    console.log('🎤 [DIARIZATION] Диаризация возобновлена')
  }

  // Остановка диаризации
  async stop(): Promise<void> {
    console.log('🎤 [DIARIZATION] Остановка диаризации...')
    
    // 🔧 ИСПРАВЛЕНИЕ: Останавливаем даже если не активно (для очистки состояния)
    try {
      if (this.connection) {
        console.log('🎤 [DIARIZATION] Закрываем соединение...')
        await this.connection.finish()
        this.connection = null
      }

      // 🔧 ИСПРАВЛЕНИЕ: Принудительно сбрасываем все состояния
      this.isActive = false
      this.isConnecting = false
      this.isPaused = false // Сбрасываем паузу
      this.error = null
      
      // 🔧 ИСПРАВЛЕНИЕ: Очищаем keepalive интервал
      if (this.keepaliveInterval) {
        clearInterval(this.keepaliveInterval)
        this.keepaliveInterval = null
        console.log('🎤 [DIARIZATION] Keepalive интервал очищен при остановке')
      }
      
      // Очищаем активные сегменты и спикеров при остановке
      this.activeSegments = {}
      this.currentSpeakerId = null
      this.currentSpeakerName = null
      this.lastSegmentTime = null
      
      this.emit('onStateChange', { isActive: false, isConnecting: false, error: null })
      console.log('🎤 [DIARIZATION] Диаризация остановлена и состояние очищено')
    } catch (error) {
      console.error('🎤 [DIARIZATION] Ошибка при остановке:', error)
      
      // 🔧 ИСПРАВЛЕНИЕ: Даже при ошибке сбрасываем состояния
      this.isActive = false
      this.isConnecting = false
      this.isPaused = false
      this.connection = null
      this.error = error instanceof Error ? error.message : 'Ошибка остановки'
      
      this.emit('onStateChange', { 
        isActive: false, 
        isConnecting: false, 
        error: this.error 
      })
    }
  }

  // Обработка транскрипции
  private handleTranscript(data: any): void {
    try {
      if (!data.channel?.alternatives?.[0]) {
        return
      }

      const alternative = data.channel.alternatives[0]
      const text = alternative.transcript?.trim()
      
      if (!text) {
        return
      }

      // Получаем информацию о спикере
      const speaker = alternative.words?.[0]?.speaker
      const confidence = alternative.confidence || 0
      const isFinal = alternative.words?.[0]?.is_final || false

      // Логируем результат распознавания
      console.log(`🎤 [DIARIZATION] Распознано: "${text}" (уверенность: ${(confidence * 100).toFixed(1)}%, финальное: ${isFinal})`)

      if (speaker !== undefined) {
        const segment = this.createSegment(speaker, text, isFinal, confidence)
        this.emit('onSegment', segment)
      } else {
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
          console.log(`🎤 [DIARIZATION] Смена спикера: ${speakerName}`)
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
      console.error('🎤 [DIARIZATION] Ошибка обработки транскрипции:', error)
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
    
    console.log(`🎤 [DIARIZATION] Новый спикер: ${displayName} (цвет: ${color})`)
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
    // 🔧 ИСПРАВЛЕНИЕ: Добавляем детальную диагностику состояния
    if (!this.isActive) {
      console.warn('🎤 [DIARIZATION] Попытка отправки аудио при неактивной диаризации - игнорируем')
      return
    }

    // Проверяем состояние паузы
    if (this.isPaused) {
      console.log('🎤 [DIARIZATION] Диаризация на паузе - игнорируем аудио. isPaused:', this.isPaused, 'isActive:', this.isActive)
      return
    }

    // Дополнительная проверка - если соединение закрыто, не отправляем
    if (!this.connection) {
      console.warn('🎤 [DIARIZATION] Соединение закрыто - не отправляем аудио')
      return
    }

    // Если DeepGram не инициализирован, просто логируем
    if (!this.deepgram) {
      console.warn('🎤 [DIARIZATION] DeepGram не инициализирован')
      return
    }

    // 🔧 ИСПРАВЛЕНИЕ: Если соединение потеряно, пытаемся переподключиться
    if (!this.connection) {
      console.warn('🎤 [DIARIZATION] Соединение потеряно, пытаемся переподключиться...')
      try {
        await this.start()
        if (this.connection) {
          console.log('🎤 [DIARIZATION] Переподключение успешно')
        } else {
          console.error('🎤 [DIARIZATION] Не удалось создать соединение при переподключении')
          return
        }
      } catch (error) {
        console.error('🎤 [DIARIZATION] Ошибка переподключения:', error)
        return
      }
    }

    try {
      // 🔧 ИСПРАВЛЕНИЕ: Проверяем что соединение готово к отправке
      if (!this.connection || typeof this.connection.send !== 'function') {
        console.error('🎤 [DIARIZATION] Соединение не готово для отправки данных')
        return
      }

      // 🔧 ИСПРАВЛЕНИЕ: Обрабатываем PCM и WebM данные по-разному
      let audioData: ArrayBuffer | Blob = audioBlob
      
      if (audioBlob.type === 'audio/pcm') {
        // PCM данные уже готовы для DeepGram
        audioData = await audioBlob.arrayBuffer()
        // console.log(`🎤 [DIARIZATION] PCM данные готовы (размер: ${audioData.byteLength} байт)`)
      } else if (audioBlob.type.includes('webm')) {
        try {
          // Читаем WebM как ArrayBuffer
          audioData = await audioBlob.arrayBuffer()
          // console.log(`🎤 [DIARIZATION] Конвертирован WebM в ArrayBuffer (размер: ${audioData.byteLength} байт)`)
        } catch (conversionError) {
          console.warn('🎤 [DIARIZATION] Ошибка конвертации WebM, отправляем как Blob:', conversionError)
          audioData = audioBlob
        }
      }

      // Отправляем данные
      this.connection.send(audioData)
      // console.log(`🎤 [DIARIZATION] Аудио отправлено (размер: ${audioData instanceof ArrayBuffer ? audioData.byteLength : audioData.size} байт, тип: ${audioBlob.type})`)
    } catch (error) {
      console.error('🎤 [DIARIZATION] Ошибка отправки аудио:', error)
      // При критической ошибке отправки пытаемся переподключиться
      if (error instanceof Error && error.message.includes('WebSocket')) {
        console.log('🎤 [DIARIZATION] Ошибка WebSocket, пытаемся переподключиться...')
        this.connection = null
      }
    }
  }

  // Обработка ошибок
  private handleError(error: Error): void {
    console.error('🎤 [DIARIZATION] Критическая ошибка:', error.message)
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
      isPaused: this.isPaused,
      error: this.error,
      speakers: { ...this.speakers },
      activeSegments: { ...this.activeSegments }
    }
  }

  // Принудительная очистка состояния
  private async forceCleanup(): Promise<void> {
    console.log('🎤 [DIARIZATION] Принудительная очистка состояния...')
    
    // Сначала сбрасываем состояния, чтобы остановить все процессы
    this.isActive = false
    this.isConnecting = false
    this.error = null

    // Очищаем keepalive интервал
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval)
      this.keepaliveInterval = null
    }

    // Закрываем соединение если есть
    if (this.connection) {
      try {
        await this.connection.finish()
      } catch (error) {
        console.warn('🎤 [DIARIZATION] Ошибка при закрытии соединения:', error)
      }
      this.connection = null
    }

    // Очищаем данные
    this.activeSegments = {}
    this.currentSpeakerId = null
    this.currentSpeakerName = null
    this.lastSegmentTime = null
    
    // Небольшая задержка для очистки ресурсов
    await new Promise(resolve => setTimeout(resolve, 100))
    
    console.log('🎤 [DIARIZATION] Состояние принудительно очищено')
  }

  // Очистка ресурсов
  cleanup(): void {
    console.log('🎤 [DIARIZATION] Очистка ресурсов...')
    
    // 🔧 ИСПРАВЛЕНИЕ: Очищаем keepalive интервал
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval)
      this.keepaliveInterval = null
      console.log('🎤 [DIARIZATION] Keepalive интервал очищен при cleanup')
    }
    
    if (this.connection) {
      this.connection.finish().catch(() => {})
      this.connection = null
    }

    this.isActive = false
    this.isConnecting = false
    this.error = null
    this.speakers = {}
    this.activeSegments = {}
    this.speakerCounter = 0
    this.eventListeners = {}
    
    // Очищаем временную логику спикеров
    this.currentSpeakerId = null
    this.currentSpeakerName = null
    this.lastSegmentTime = null
    
    console.log('🎤 [DIARIZATION] Ресурсы очищены')
  }
}

// Создаем экземпляр сервиса
export const diarizationService = new DiarizationService()
