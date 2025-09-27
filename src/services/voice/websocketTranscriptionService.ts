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
      const apiKey = appConfig.deepgram.apiKey
      
      if (!apiKey) {
        console.warn('WebSocket: API ключ DeepGram не найден')
        return
      }

      if (apiKey.length < 20) {
        console.warn('WebSocket: API ключ DeepGram слишком короткий')
        return
      }

      const { createClient } = await import('@deepgram/sdk')
      this.deepgram = createClient(apiKey)
      
      if (!this.deepgram) {
        throw new Error('Не удалось создать Deepgram клиент')
      }
      
    } catch (error) {
      console.error('❌ WebSocket: Ошибка инициализации Deepgram:', error)
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
      return
    }

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

      // Создаем WebSocket соединение
      this.connection = this.deepgram.listen.live(connectionOptions)
      
      this.setupConnectionHandlers()
      
      // ВАЖНО: устанавливаем isActive ДО настройки аудиопотока
      this.isConnecting = false
      this.isActive = true
      
      // Настраиваем отправку аудио
      this.setupAudioStream(mediaStream)
      
    } catch (error) {
      this.isConnecting = false
      console.error('❌ [WebSocketTranscription] Ошибка запуска:', error)
      throw error
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return

    this.connection.on('open', () => {
      // Соединение установлено
    })

    this.connection.on('Results', (data: any) => {
      this.handleTranscript(data)
    })

    this.connection.on('Metadata', (data: any) => {
      // Метаданные получены
    })

    this.connection.on('UtteranceEnd', (data: any) => {
      // Конец высказывания
    })

    this.connection.on('SpeechStarted', (data: any) => {
      // Начало речи
    })

    this.connection.on('Transcript', (data: any) => {
      this.handleTranscript(data)
    })

    this.connection.on('error', (error: any) => {
      console.error('❌ [WebSocketTranscription] Ошибка соединения:', error)
      this.handleError(error)
    })

    this.connection.on('close', (event: any) => {
      this.isActive = false
      this.isConnecting = false
      
      // Автоматическое переподключение при неожиданном закрытии
      if (event?.code !== 1000) {
        setTimeout(() => {
          if (!this.isActive && !this.isConnecting) {
            // Переподключение отложено - нет медиапотока
          }
        }, 2000)
      }
    })
  }

  private setupAudioStream(mediaStream: MediaStream): void {
    // Создаем MediaRecorder для отправки аудио в WebSocket
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
    
    const mediaRecorder = new MediaRecorder(mediaStream, { mimeType })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.connection && this.isActive) {
        try {
          this.connection.send(event.data)
        } catch (error) {
          console.error('❌ WebSocket: Ошибка отправки аудио:', error)
        }
      }
    }

    mediaRecorder.onerror = (error) => {
      console.error('❌ WebSocket: Ошибка MediaRecorder:', error)
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

      // Чанк обработан

      this.notifyListeners(chunk)
      
    } catch (error) {
      console.error('❌ WebSocket: Ошибка обработки транскрипта:', error)
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

    console.error(`❌ WebSocket: ${errorMessage}:`, error)
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
        console.warn('WebSocket: Ошибка при закрытии соединения:', error)
      }
      this.connection = null
    }

    // Очищаем слушателей
    this.listeners = []
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
