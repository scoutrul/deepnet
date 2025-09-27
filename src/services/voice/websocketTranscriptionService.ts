import { appConfig } from '@/config/appConfig'

export interface WebSocketTranscriptionChunk {
  id: string
  text: string
  confidence: number
  timestamp: number
  isFinal: boolean
  type: 'websocket'
}

export class WebSocketTranscriptionService {
  private deepgram: any = null
  private connection: any = null
  private isActive = false
  private isConnecting = false
  private chunkCounter = 0
  
  private listeners: ((chunk: WebSocketTranscriptionChunk) => void)[] = []
  
  constructor() {
    // Не вызываем инициализацию в конструкторе
  }

  private async initializeDeepgram() {
    try {
      console.log('🌐 [WebSocketTranscription] Инициализация Deepgram...')
      
      const apiKey = appConfig.deepgram.apiKey
      
      console.log('🌐 [WebSocketTranscription] API ключ:', apiKey ? `${apiKey.substring(0, 10)}...` : 'НЕ НАЙДЕН')
      
      if (!apiKey) {
        console.warn('🌐 [WebSocketTranscription] API ключ DeepGram не найден в env или localStorage')
        return
      }

      // Deepgram API ключи могут иметь разные форматы, не только sk-
      if (apiKey.length < 20) {
        console.warn('🌐 [WebSocketTranscription] API ключ DeepGram слишком короткий')
        return
      }

      console.log('🌐 [WebSocketTranscription] Импорт Deepgram SDK...')
      const { createClient } = await import('@deepgram/sdk')
      
      console.log('🌐 [WebSocketTranscription] Создание клиента...')
      this.deepgram = createClient(apiKey)
      
      if (!this.deepgram) {
        throw new Error('Не удалось создать Deepgram клиент')
      }
      
      console.log('✅ [WebSocketTranscription] Deepgram инициализирован успешно')
    } catch (error) {
      console.error('❌ [WebSocketTranscription] Ошибка инициализации Deepgram:', error)
    }
  }

  async start(mediaStream: MediaStream): Promise<void> {
    // Всегда инициализируем Deepgram перед запуском
    if (!this.deepgram) {
      await this.initializeDeepgram()
    }
    
    if (!this.deepgram) {
      throw new Error(`Не удалось инициализировать Deepgram. 
Проверьте API ключ в .env файле (VITE_DEEPGRAM_API_KEY) или localStorage (deepgram_api_key).
Убедитесь что ключ корректный и имеет доступ к Live Streaming API.`)
    }

    if (this.isActive || this.isConnecting) {
      console.log('🌐 [WebSocketTranscription] Уже активен или подключается')
      return
    }

    console.log('🌐 [WebSocketTranscription] Запуск WebSocket соединения...')

    try {
      this.isConnecting = true
      
      // Настройки подключения
      const connectionOptions: any = {
        model: appConfig.deepgram.model || 'nova-2',
        language: appConfig.deepgram.language || 'ru',
        punctuate: appConfig.deepgram.punctuate === true,
        smart_format: appConfig.deepgram.smart_format === true,
        interim_results: true,
        endpointing: 1000, // Увеличиваем до 1 секунды для лучшего распознавания
        vad_events: true, // Принудительно включаем VAD события
        // Убираем encoding для WebM - Deepgram автоматически определит
        // encoding: 'linear16',  
        // sample_rate: 16000,
        // channels: 1
      }

      // Добавляем диаризацию если включена
      if (appConfig.deepgram.diarize === true) {
        connectionOptions.diarize = true
        connectionOptions.diarize_version = '2024-01-09'
      }

      console.log('🌐 [WebSocketTranscription] Опции подключения:', connectionOptions)

      // Создаем WebSocket соединение
      this.connection = this.deepgram.listen.live(connectionOptions)
      
      this.setupConnectionHandlers()
      
      // ВАЖНО: устанавливаем isActive ДО настройки аудиопотока
      this.isConnecting = false
      this.isActive = true
      
      console.log('🌐 [WebSocketTranscription] Статус установлен: isActive =', this.isActive)
      
      // Настраиваем отправку аудио
      this.setupAudioStream(mediaStream)
      
      console.log('✅ [WebSocketTranscription] WebSocket соединение установлено')
      
    } catch (error) {
      this.isConnecting = false
      console.error('❌ [WebSocketTranscription] Ошибка запуска:', error)
      throw error
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return

    this.connection.on('open', () => {
      console.log('🌐 [WebSocketTranscription] Соединение открыто')
      // НЕ меняем isActive здесь - он уже установлен
      console.log('🌐 [WebSocketTranscription] Текущий статус: isActive =', this.isActive)
    })

    this.connection.on('Results', (data: any) => {
      console.log('🌐 [WebSocketTranscription] Получены результаты:', JSON.stringify(data, null, 2))
      this.handleTranscript(data)
    })

    this.connection.on('Metadata', (data: any) => {
      console.log('🌐 [WebSocketTranscription] Метаданные:', JSON.stringify(data, null, 2))
    })

    this.connection.on('UtteranceEnd', (data: any) => {
      console.log('🌐 [WebSocketTranscription] Конец высказывания:', JSON.stringify(data, null, 2))
    })

    // Добавляем обработчики для всех возможных событий
    this.connection.on('SpeechStarted', (data: any) => {
      console.log('🌐 [WebSocketTranscription] Начало речи:', data)
    })

    this.connection.on('Transcript', (data: any) => {
      console.log('🌐 [WebSocketTranscription] Транскрипт:', JSON.stringify(data, null, 2))
      this.handleTranscript(data)
    })

    this.connection.on('error', (error: any) => {
      console.error('❌ [WebSocketTranscription] Ошибка соединения:', error)
      this.handleError(error)
    })

    this.connection.on('close', (event: any) => {
      console.log('🌐 [WebSocketTranscription] Соединение закрыто:', event?.code, event?.reason)
      console.log('🌐 [WebSocketTranscription] Устанавливаем isActive = false из-за закрытия соединения')
      this.isActive = false
      this.isConnecting = false
      
      // Автоматическое переподключение при неожиданном закрытии
      if (event?.code !== 1000) {
        console.log('🌐 [WebSocketTranscription] Неожиданное закрытие, попытка переподключения через 2 сек...')
        setTimeout(() => {
          if (!this.isActive && !this.isConnecting) {
            // Здесь нужен mediaStream для переподключения
            console.log('🌐 [WebSocketTranscription] Переподключение отложено - нет медиапотока')
          }
        }, 2000)
      }
    })
  }

  private setupAudioStream(mediaStream: MediaStream): void {
    console.log('🌐 [WebSocketTranscription] Настройка аудиопотока...')
    
    // Создаем MediaRecorder для отправки аудио в WebSocket
    // Проверяем поддерживаемые форматы
    const supportedTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ]
    
    let mimeType = 'audio/webm;codecs=opus'
    for (const type of supportedTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type
        break
      }
    }
    
    console.log('🌐 [WebSocketTranscription] Используемый MIME тип:', mimeType)
    
    const mediaRecorder = new MediaRecorder(mediaStream, { mimeType })

    mediaRecorder.ondataavailable = (event) => {
      console.log('🌐 [WebSocketTranscription] Получен аудио чанк:', {
        size: event.data.size,
        hasConnection: !!this.connection,
        isActive: this.isActive,
        connectionState: this.connection?.readyState
      })
      
      if (event.data.size > 0 && this.connection && this.isActive) {
        // Отправляем аудио данные в WebSocket
        try {
          this.connection.send(event.data)
          console.log('✅ [WebSocketTranscription] Отправлен аудио чанк:', {
            size: Math.round(event.data.size/1024) + 'KB',
            type: event.data.type,
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          console.error('❌ [WebSocketTranscription] Ошибка отправки аудио:', error)
        }
      } else {
        console.warn('🌐 [WebSocketTranscription] Пропущен чанк:', {
          size: event.data.size,
          hasConnection: !!this.connection,
          isActive: this.isActive,
          connectionState: this.connection?.readyState,
          reason: !event.data.size ? 'пустой чанк' : 
                  !this.connection ? 'нет соединения' : 
                  !this.isActive ? 'сервис неактивен' : 'неизвестно'
        })
      }
    }

    mediaRecorder.onerror = (error) => {
      console.error('❌ [WebSocketTranscription] Ошибка MediaRecorder:', error)
    }

    mediaRecorder.onstart = () => {
      console.log('🌐 [WebSocketTranscription] MediaRecorder запущен')
    }

    mediaRecorder.onstop = () => {
      console.log('🌐 [WebSocketTranscription] MediaRecorder остановлен')
    }

    // Запускаем запись с оптимальными чанками для Deepgram
    mediaRecorder.start(1000) // Чанки по 1000мс (1 секунда)
    
    // Сохраняем ссылку на MediaRecorder для остановки
    this.mediaRecorder = mediaRecorder
  }

  private mediaRecorder: MediaRecorder | null = null

  private handleTranscript(data: any): void {
    try {
      if (!data?.channel?.alternatives?.length) {
        return
      }

      const alternative = data.channel.alternatives[0]
      const transcript = alternative.transcript?.trim()
      
      if (!transcript) {
        return
      }

      const chunk: WebSocketTranscriptionChunk = {
        id: `ws_${++this.chunkCounter}`,
        text: transcript,
        confidence: alternative.confidence || 0,
        timestamp: Date.now(),
        isFinal: data.is_final === true,
        type: 'websocket'
      }

      console.log(`🌐 [WebSocketTranscription] Чанк: "${transcript}" (final: ${chunk.isFinal}, confidence: ${chunk.confidence.toFixed(2)})`)

      this.notifyListeners(chunk)
      
    } catch (error) {
      console.error('❌ [WebSocketTranscription] Ошибка обработки транскрипта:', error)
    }
  }

  private handleError(error: any): void {
    let errorMessage = 'Ошибка WebSocket соединения'
    
    if (error.message?.includes('401')) {
      errorMessage = 'Неверный API ключ DeepGram'
    } else if (error.message?.includes('403')) {
      errorMessage = 'API ключ DeepGram не имеет доступа к сервису'
    } else if (error.message?.includes('WebSocket')) {
      errorMessage = 'Ошибка WebSocket соединения. Проверьте API ключ и интернет'
    }

    console.error(`❌ [WebSocketTranscription] ${errorMessage}:`, error)
  }

  onTranscription(callback: (chunk: WebSocketTranscriptionChunk) => void): () => void {
    this.listeners.push(callback)
    
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(chunk: WebSocketTranscriptionChunk): void {
    this.listeners.forEach(listener => listener(chunk))
  }

  async stop(): Promise<void> {
    console.log('🌐 [WebSocketTranscription] Остановка сервиса...')
    console.log('🌐 [WebSocketTranscription] Устанавливаем isActive = false (ручная остановка)')

    this.isActive = false
    this.isConnecting = false

    // Останавливаем MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
      this.mediaRecorder = null
    }

    // Закрываем WebSocket соединение
    if (this.connection) {
      try {
        this.connection.finish()
      } catch (error) {
        console.warn('🌐 [WebSocketTranscription] Ошибка при закрытии соединения:', error)
      }
      this.connection = null
    }

    // Очищаем слушателей
    this.listeners = []

    console.log('✅ [WebSocketTranscription] Сервис остановлен')
  }

  isConnected(): boolean {
    return this.isActive && this.connection !== null
  }

  getState() {
    return {
      isActive: this.isActive,
      isConnecting: this.isConnecting,
      hasConnection: this.connection !== null
    }
  }
}

export const websocketTranscriptionService = new WebSocketTranscriptionService()
