// System Audio Service - Сервис для захвата системного звука через getDisplayMedia
import type { SystemAudioInterface } from '../../interfaces/layerInterfaces'

export interface SystemAudioConfig {
  // Параметры аудио
  sampleRate?: number
  channelCount?: number
  echoCancellation?: boolean
  noiseSuppression?: boolean
  
  // Параметры записи
  timeslice?: number // Интервал отправки данных в мс
  mimeType?: string
}

export interface SystemAudioState {
  isCapturing: boolean
  isSupported: boolean
  hasPermission: boolean
  error: string | null
  stream: MediaStream | null
  recorder: MediaRecorder | null
}

export interface SystemAudioError {
  type: 'permission' | 'not_supported' | 'stream' | 'recorder' | 'unknown'
  message: string
  details?: any
}

export class SystemAudioService implements SystemAudioInterface {
  private state: SystemAudioState = {
    isCapturing: false,
    isSupported: false,
    hasPermission: false,
    error: null,
    stream: null,
    recorder: null
  }

  private config: SystemAudioConfig
  private audioDataCallbacks: Array<(audioBlob: Blob) => void> = []
  private errorCallbacks: Array<(error: SystemAudioError) => void> = []
  private stateChangeCallbacks: Array<(isCapturing: boolean) => void> = []

  constructor(config: SystemAudioConfig = {}) {
    this.config = {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: false, // Для системного звука обычно отключают
      noiseSuppression: false, // Для системного звука обычно отключают
      timeslice: 1000, // 1 секунда
      mimeType: 'audio/webm;codecs=opus',
      ...config
    }

    this.checkSupport()
    console.log('🔊 [SYSTEM_AUDIO] SystemAudioService инициализирован')
  }

  // Проверка поддержки getDisplayMedia с аудио
  private checkSupport(): void {
    try {
      // Проверяем наличие getDisplayMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        this.state.isSupported = false
        console.warn('🔊 [SYSTEM_AUDIO] getDisplayMedia не поддерживается')
        return
      }

      // Проверяем поддержку MediaRecorder
      if (!window.MediaRecorder) {
        this.state.isSupported = false
        console.warn('🔊 [SYSTEM_AUDIO] MediaRecorder не поддерживается')
        return
      }

      // Проверяем поддержку MIME типа
      if (!MediaRecorder.isTypeSupported(this.config.mimeType!)) {
        // Пробуем альтернативные форматы
        const supportedTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus'
        ]

        let foundSupported = false
        for (const type of supportedTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            this.config.mimeType = type
            foundSupported = true
            console.log(`🔊 [SYSTEM_AUDIO] Используем MIME тип: ${type}`)
            break
          }
        }

        if (!foundSupported) {
          this.state.isSupported = false
          console.warn('🔊 [SYSTEM_AUDIO] Не найдено поддерживаемых MIME типов для записи')
          return
        }
      }

      this.state.isSupported = true
      console.log('🔊 [SYSTEM_AUDIO] Системный звук поддерживается')
    } catch (error) {
      this.state.isSupported = false
      console.error('🔊 [SYSTEM_AUDIO] Ошибка проверки поддержки:', error)
    }
  }

  // Реализация BusinessService
  async initialize(): Promise<void> {
    console.log('🔊 [SYSTEM_AUDIO] Инициализация сервиса...')
    this.checkSupport()
  }

  cleanup(): void {
    console.log('🔊 [SYSTEM_AUDIO] Очистка ресурсов...')
    this.stopSystemAudioCapture()
    this.audioDataCallbacks = []
    this.errorCallbacks = []
    this.stateChangeCallbacks = []
  }

  getState(): SystemAudioState {
    return { ...this.state }
  }

  async handleEvent(event: string, _data?: any): Promise<any> {
    switch (event) {
      case 'start':
        return this.startSystemAudioCapture()
      case 'stop':
        return this.stopSystemAudioCapture()
      default:
        console.warn(`🔊 [SYSTEM_AUDIO] Неизвестное событие: ${event}`)
    }
  }

  // Реализация SystemAudioInterface
  async startSystemAudioCapture(): Promise<void> {
    console.log('🔊 [SYSTEM_AUDIO] Запуск захвата системного звука...')

    if (!this.state.isSupported) {
      const error: SystemAudioError = {
        type: 'not_supported',
        message: 'Захват системного звука не поддерживается в этом браузере'
      }
      this.handleError(error)
      throw new Error(error.message)
    }

    if (this.state.isCapturing) {
      console.warn('🔊 [SYSTEM_AUDIO] Захват уже активен')
      return
    }

    try {
      // Запрашиваем доступ к экрану с системным звуком
      console.log('🔊 [SYSTEM_AUDIO] Запрос доступа к системному звуку...')
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false, // Нам не нужно видео, только аудио
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          // Дополнительные параметры для системного звука
          autoGainControl: false,
          latency: 0,
          sampleSize: 16
        } as any
      })

      // Проверяем, что получили аудио трек
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        throw new Error('Не удалось получить аудио трек из системного звука')
      }

      console.log(`🔊 [SYSTEM_AUDIO] Получен аудио трек: ${audioTracks[0].label}`)
      console.log(`🔊 [SYSTEM_AUDIO] Настройки трека:`, audioTracks[0].getSettings())

      this.state.stream = stream
      this.state.hasPermission = true

      // Создаем MediaRecorder для записи системного звука
      this.state.recorder = new MediaRecorder(stream, {
        mimeType: this.config.mimeType!,
        audioBitsPerSecond: 128000 // 128 kbps для хорошего качества
      })

      // Обработчик получения аудио данных
      this.state.recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`🔊 [SYSTEM_AUDIO] Получены аудио данные: ${event.data.size} байт`)
          this.audioDataCallbacks.forEach(callback => {
            try {
              callback(event.data)
            } catch (error) {
              console.error('🔊 [SYSTEM_AUDIO] Ошибка в callback аудио данных:', error)
            }
          })
        }
      }

      // Обработчик остановки записи
      this.state.recorder.onstop = () => {
        console.log('🔊 [SYSTEM_AUDIO] Запись остановлена')
        this.updateState(false)
      }

      // Обработчик ошибок записи
      this.state.recorder.onerror = (event) => {
        console.error('🔊 [SYSTEM_AUDIO] Ошибка записи:', event)
        this.handleError({
          type: 'recorder',
          message: 'Ошибка при записи системного звука',
          details: event
        })
      }

      // Обработчик остановки стрима (когда пользователь останавливает sharing)
      stream.getAudioTracks().forEach(track => {
        track.onended = () => {
          console.log('🔊 [SYSTEM_AUDIO] Аудио трек завершен пользователем')
          this.stopSystemAudioCapture()
        }
      })

      // Начинаем запись
      this.state.recorder.start(this.config.timeslice)
      this.updateState(true)

      console.log('🔊 [SYSTEM_AUDIO] Захват системного звука запущен успешно')

    } catch (error) {
      console.error('🔊 [SYSTEM_AUDIO] Ошибка запуска захвата:', error)
      
      let errorType: SystemAudioError['type'] = 'unknown'
      let errorMessage = 'Не удалось запустить захват системного звука'

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorType = 'permission'
          errorMessage = 'Пользователь отклонил запрос на доступ к системному звуку'
        } else if (error.name === 'NotSupportedError') {
          errorType = 'not_supported'
          errorMessage = 'Захват системного звука не поддерживается'
        } else if (error.name === 'NotFoundError') {
          errorType = 'stream'
          errorMessage = 'Не найдены источники системного звука'
        } else {
          errorMessage = error.message
        }
      }

      const systemError: SystemAudioError = {
        type: errorType,
        message: errorMessage,
        details: error
      }

      this.handleError(systemError)
      throw error
    }
  }

  stopSystemAudioCapture(): void {
    console.log('🔊 [SYSTEM_AUDIO] Остановка захвата системного звука...')

    try {
      // Останавливаем запись
      if (this.state.recorder && this.state.recorder.state === 'recording') {
        this.state.recorder.stop()
      }

      // Останавливаем все треки стрима
      if (this.state.stream) {
        this.state.stream.getTracks().forEach(track => {
          track.stop()
          console.log(`🔊 [SYSTEM_AUDIO] Остановлен трек: ${track.label}`)
        })
      }

      // Очищаем состояние
      this.state.stream = null
      this.state.recorder = null
      this.updateState(false)

      console.log('🔊 [SYSTEM_AUDIO] Захват системного звука остановлен')

    } catch (error) {
      console.error('🔊 [SYSTEM_AUDIO] Ошибка остановки захвата:', error)
      this.handleError({
        type: 'unknown',
        message: 'Ошибка при остановке захвата системного звука',
        details: error
      })
    }
  }

  isSupported(): boolean {
    return this.state.isSupported
  }

  isCapturing(): boolean {
    return this.state.isCapturing
  }

  getAudioStream(): MediaStream | null {
    return this.state.stream
  }

  // События
  onAudioData(callback: (audioBlob: Blob) => void): void {
    this.audioDataCallbacks.push(callback)
  }

  onError(callback: (error: SystemAudioError) => void): void {
    this.errorCallbacks.push(callback)
  }

  onStateChange(callback: (isCapturing: boolean) => void): void {
    this.stateChangeCallbacks.push(callback)
  }

  // Приватные методы
  private updateState(isCapturing: boolean): void {
    this.state.isCapturing = isCapturing
    this.state.error = null

    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(isCapturing)
      } catch (error) {
        console.error('🔊 [SYSTEM_AUDIO] Ошибка в callback изменения состояния:', error)
      }
    })
  }

  private handleError(error: SystemAudioError): void {
    console.error('🔊 [SYSTEM_AUDIO] Обработка ошибки:', error)
    
    this.state.error = error.message
    this.state.isCapturing = false

    this.errorCallbacks.forEach(callback => {
      try {
        callback(error)
      } catch (callbackError) {
        console.error('🔊 [SYSTEM_AUDIO] Ошибка в callback ошибки:', callbackError)
      }
    })
  }

  // Дополнительные методы для отладки
  getCapabilities(): MediaTrackCapabilities | null {
    if (!this.state.stream) return null
    
    const audioTracks = this.state.stream.getAudioTracks()
    if (audioTracks.length === 0) return null

    return audioTracks[0].getCapabilities()
  }

  getConstraints(): MediaTrackConstraints | null {
    if (!this.state.stream) return null
    
    const audioTracks = this.state.stream.getAudioTracks()
    if (audioTracks.length === 0) return null

    return audioTracks[0].getConstraints()
  }

  getSettings(): MediaTrackSettings | null {
    if (!this.state.stream) return null
    
    const audioTracks = this.state.stream.getAudioTracks()
    if (audioTracks.length === 0) return null

    return audioTracks[0].getSettings()
  }
}

// Создаем экземпляр сервиса
export const systemAudioService = new SystemAudioService()

console.log('🔊 [SYSTEM_AUDIO] SystemAudioService модуль загружен')
