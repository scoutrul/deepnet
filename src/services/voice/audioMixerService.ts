// Audio Mixer Service - Сервис для объединения аудио потоков от микрофона и системного звука
import type { BusinessService } from '../../interfaces/layerInterfaces'

export interface AudioMixerConfig {
  // Параметры микшера
  sampleRate?: number
  channelCount?: number
  timeslice?: number
  mimeType?: string
  
  // Настройки громкости
  microphoneGain?: number
  systemAudioGain?: number
}

export interface AudioSourceState {
  isActive: boolean
  stream: MediaStream | null
  recorder: MediaRecorder | null
  error: string | null
}

export interface AudioMixerState {
  isActive: boolean
  microphone: AudioSourceState
  systemAudio: AudioSourceState
  mixedRecorder: MediaRecorder | null
  error: string | null
}

export interface AudioMixerError {
  type: 'microphone' | 'system_audio' | 'mixer' | 'permission' | 'unknown'
  source: 'microphone' | 'system_audio' | 'mixer'
  message: string
  details?: any
}

export class AudioMixerService implements BusinessService {
  private state: AudioMixerState = {
    isActive: false,
    microphone: {
      isActive: false,
      stream: null,
      recorder: null,
      error: null
    },
    systemAudio: {
      isActive: false,
      stream: null,
      recorder: null,
      error: null
    },
    mixedRecorder: null,
    error: null
  }

  private config: AudioMixerConfig
  private audioContext: AudioContext | null = null
  private mixerNode: GainNode | null = null
  private microphoneNode: MediaStreamAudioSourceNode | null = null
  private systemAudioNode: MediaStreamAudioSourceNode | null = null
  private destinationStream: MediaStream | null = null

  // Callbacks
  private audioDataCallbacks: Array<(audioBlob: Blob) => void> = []
  private errorCallbacks: Array<(error: AudioMixerError) => void> = []
  private stateChangeCallbacks: Array<(state: AudioMixerState) => void> = []
  
  // PCM аудио для DeepGram
  private pcmProcessor: ScriptProcessorNode | null = null

  constructor(config: AudioMixerConfig = {}) {
    // DeepGram лучше работает с PCM аудио, но браузеры не поддерживают прямой PCM
    // Используем WebM без кодека для лучшей совместимости
    let mimeType = 'audio/webm'
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm'
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4'
    } else if (MediaRecorder.isTypeSupported('audio/wav')) {
      mimeType = 'audio/wav'
    }
    
    this.config = {
      sampleRate: 16000,
      channelCount: 1,
      timeslice: 1000,
      mimeType,
      microphoneGain: 1.0,
      systemAudioGain: 0.8, // Немного тише системный звук
      ...config
    }
    
    console.log('🎧 [AUDIO_MIXER] Выбранный MIME тип:', mimeType)

    console.log('🎧 [AUDIO_MIXER] AudioMixerService инициализирован')
  }

  // Реализация BusinessService
  async initialize(): Promise<void> {
    console.log('🎧 [AUDIO_MIXER] Инициализация сервиса...')
    
    try {
      // Создаем AudioContext для микширования
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
        latencyHint: 'interactive'
      })

      // Создаем узел микшера
      this.mixerNode = this.audioContext.createGain()
      this.mixerNode.gain.value = 1.0

      console.log('🎧 [AUDIO_MIXER] AudioContext создан')
    } catch (error) {
      console.error('🎧 [AUDIO_MIXER] Ошибка инициализации AudioContext:', error)
      throw error
    }
  }

  // Создание PCM процессора для DeepGram
  private createPCMProcessor(): void {
    if (!this.audioContext || !this.mixerNode) return
    
    // Создаем ScriptProcessorNode для получения PCM данных
    const bufferSize = 4096
    this.pcmProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)
    
    this.pcmProcessor.onaudioprocess = (event) => {
      if (!this.state.isActive) return
      
      const inputBuffer = event.inputBuffer
      const inputData = inputBuffer.getChannelData(0)
      
      // Конвертируем Float32Array в Int16Array (PCM 16-bit)
      const pcmData = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
      }
      
      // Создаем Blob с PCM данными
      const pcmBlob = new Blob([pcmData], { type: 'audio/pcm' })
      
      // Отправляем PCM данные
      this.audioDataCallbacks.forEach(callback => {
        try {
          callback(pcmBlob)
        } catch (error) {
          console.error('🎧 [AUDIO_MIXER] Ошибка в PCM callback:', error)
        }
      })
    }
    
    // Подключаем PCM процессор к микшеру
    this.mixerNode.connect(this.pcmProcessor)
    this.pcmProcessor.connect(this.audioContext.destination)
    
    console.log('🎧 [AUDIO_MIXER] PCM процессор создан')
  }

  cleanup(): void {
    console.log('🎧 [AUDIO_MIXER] Очистка ресурсов...')
    
    this.stopMixing()
    
    // Очищаем AudioContext
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    // Очищаем callbacks
    this.audioDataCallbacks = []
    this.errorCallbacks = []
    this.stateChangeCallbacks = []

    console.log('🎧 [AUDIO_MIXER] Ресурсы очищены')
  }

  getState(): AudioMixerState {
    return { ...this.state }
  }

  async handleEvent(event: string, _data?: any): Promise<any> {
    switch (event) {
      case 'start':
        return this.startMixing()
      case 'stop':
        return this.stopMixing()
      default:
        console.warn(`🎧 [AUDIO_MIXER] Неизвестное событие: ${event}`)
    }
  }

  // Запуск микширования
  async startMixing(): Promise<void> {
    console.log('🎧 [AUDIO_MIXER] Запуск микширования аудио потоков...')

    if (this.state.isActive) {
      console.warn('🎧 [AUDIO_MIXER] Микширование уже активно')
      return
    }

    try {
      // Инициализируем AudioContext если не создан
      if (!this.audioContext) {
        await this.initialize()
      }

      // Запускаем захват микрофона
      await this.startMicrophoneCapture()

      // Запускаем захват системного звука (опционально)
      await this.startSystemAudioCapture()

      // Проверяем что хотя бы один источник активен
      if (!this.state.microphone.isActive && !this.state.systemAudio.isActive) {
        throw new Error('Ни один источник аудио не доступен')
      }

      // Создаем смешанный поток
      await this.createMixedStream()

      this.state.isActive = true
      this.state.error = null
      this.emitStateChange()

      console.log('🎧 [AUDIO_MIXER] Микширование запущено успешно')
    } catch (error) {
      console.error('🎧 [AUDIO_MIXER] Ошибка запуска микширования:', error)
      this.handleError({
        type: 'mixer',
        source: 'mixer',
        message: 'Не удалось запустить микширование аудио',
        details: error
      })
      throw error
    }
  }

  // Остановка микширования
  stopMixing(): void {
    console.log('🎧 [AUDIO_MIXER] Остановка микширования...')

    try {
      // Сначала помечаем как неактивное, чтобы остановить обработку аудио
      this.state.isActive = false
      this.emitStateChange()

      // Останавливаем запись
      if (this.state.mixedRecorder && this.state.mixedRecorder.state === 'recording') {
        this.state.mixedRecorder.stop()
      }
      
      // Останавливаем PCM процессор
      if (this.pcmProcessor) {
        this.pcmProcessor.disconnect()
        this.pcmProcessor = null
        console.log('🎧 [AUDIO_MIXER] PCM процессор остановлен')
      }

      // Останавливаем микрофон
      this.stopMicrophoneCapture()

      // Останавливаем системный звук
      this.stopSystemAudioCapture()

      // Очищаем смешанный поток
      if (this.destinationStream) {
        this.destinationStream.getTracks().forEach(track => track.stop())
        this.destinationStream = null
      }

      // Отключаем узлы
      if (this.microphoneNode) {
        this.microphoneNode.disconnect()
        this.microphoneNode = null
      }

      if (this.systemAudioNode) {
        this.systemAudioNode.disconnect()
        this.systemAudioNode = null
      }

      this.state.mixedRecorder = null
      this.emitStateChange()

      console.log('🎧 [AUDIO_MIXER] Микширование остановлено')
    } catch (error) {
      console.error('🎧 [AUDIO_MIXER] Ошибка остановки микширования:', error)
    }
  }

  // Захват микрофона
  private async startMicrophoneCapture(): Promise<void> {
    try {
      console.log('🎧 [AUDIO_MIXER] Запуск захвата микрофона...')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      this.state.microphone.stream = stream
      this.state.microphone.isActive = true
      this.state.microphone.error = null

      console.log('🎧 [AUDIO_MIXER] Микрофон захвачен успешно')
    } catch (error) {
      console.error('🎧 [AUDIO_MIXER] Ошибка захвата микрофона:', error)
      
      this.state.microphone.error = error instanceof Error ? error.message : 'Неизвестная ошибка'
      
      this.handleError({
        type: 'microphone',
        source: 'microphone',
        message: 'Не удалось получить доступ к микрофону',
        details: error
      })
    }
  }

  // Захват системного звука
  private async startSystemAudioCapture(): Promise<void> {
    try {
      console.log('🎧 [AUDIO_MIXER] Попытка захвата системного звука...')

      // Проверяем поддержку getDisplayMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        console.warn('🎧 [AUDIO_MIXER] getDisplayMedia не поддерживается')
        return
      }

      // КРИТИЧЕСКОЕ ОГРАНИЧЕНИЕ: На macOS системный звук НЕ РАБОТАЕТ
      const userAgent = navigator.userAgent
      const isMacOS = /Mac|iPhone|iPad|iPod/.test(userAgent)
      
      if (isMacOS) {
        console.warn('🎧 [AUDIO_MIXER] macOS обнаружен - системный звук через браузеры НЕ ПОДДЕРЖИВАЕТСЯ')
        console.warn('🎧 [AUDIO_MIXER] Это ограничение браузеров, а не приложения')
        this.state.systemAudio.error = 'macOS: Системный звук не поддерживается браузерами'
        return
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } as any
      })

      // Проверяем наличие аудио трека
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        console.warn('🎧 [AUDIO_MIXER] Нет аудио треков в системном потоке')
        return
      }

      this.state.systemAudio.stream = stream
      this.state.systemAudio.isActive = true
      this.state.systemAudio.error = null

      // Обработчик остановки пользователем
      audioTracks.forEach(track => {
        track.onended = () => {
          console.log('🎧 [AUDIO_MIXER] Системный звук остановлен пользователем')
          this.stopSystemAudioCapture()
        }
      })

      console.log('🎧 [AUDIO_MIXER] Системный звук захвачен успешно')
    } catch (error) {
      console.warn('🎧 [AUDIO_MIXER] Системный звук недоступен:', error)
      
      // Детальная диагностика ошибок для macOS
      const userAgent = navigator.userAgent
      const isMacOS = /Mac|iPhone|iPad|iPod/.test(userAgent)
      const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent)
      
      let errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      
      if (isMacOS && isChrome && error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'macOS: Требуется разрешение "Screen Recording" для Chrome в System Preferences → Security & Privacy'
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'macOS: Системный звук может быть недоступен в этой версии Chrome'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'macOS: Не найдены источники системного звука'
        }
      }
      
      this.state.systemAudio.error = errorMessage
      
      // Эмитируем специальную ошибку для macOS
      if (isMacOS && isChrome) {
        this.handleError({
          type: 'system_audio',
          source: 'system_audio',
          message: errorMessage,
          details: {
            platform: 'macOS',
            browser: 'Chrome',
            originalError: error,
            needsPermission: error instanceof Error && error.name === 'NotAllowedError'
          }
        })
      }
      
      // Не считаем это критической ошибкой - можем работать только с микрофоном
      console.log('🎧 [AUDIO_MIXER] Продолжаем работу только с микрофоном')
    }
  }

  // Остановка микрофона
  private stopMicrophoneCapture(): void {
    if (this.state.microphone.stream) {
      this.state.microphone.stream.getTracks().forEach(track => track.stop())
      this.state.microphone.stream = null
    }
    this.state.microphone.isActive = false
  }

  // Остановка системного звука
  private stopSystemAudioCapture(): void {
    if (this.state.systemAudio.stream) {
      this.state.systemAudio.stream.getTracks().forEach(track => track.stop())
      this.state.systemAudio.stream = null
    }
    this.state.systemAudio.isActive = false
  }

  // Создание смешанного потока
  private async createMixedStream(): Promise<void> {
    if (!this.audioContext || !this.mixerNode) {
      throw new Error('AudioContext не инициализирован')
    }

    try {
      // Создаем узлы для каждого источника
      if (this.state.microphone.isActive && this.state.microphone.stream) {
        this.microphoneNode = this.audioContext.createMediaStreamSource(this.state.microphone.stream)
        const micGain = this.audioContext.createGain()
        micGain.gain.value = this.config.microphoneGain!
        this.microphoneNode.connect(micGain)
        micGain.connect(this.mixerNode)
        console.log('🎧 [AUDIO_MIXER] Микрофон подключен к микшеру')
      }

      if (this.state.systemAudio.isActive && this.state.systemAudio.stream) {
        this.systemAudioNode = this.audioContext.createMediaStreamSource(this.state.systemAudio.stream)
        const sysGain = this.audioContext.createGain()
        sysGain.gain.value = this.config.systemAudioGain!
        this.systemAudioNode.connect(sysGain)
        sysGain.connect(this.mixerNode)
        console.log('🎧 [AUDIO_MIXER] Системный звук подключен к микшеру')
      }

      // Создаем выходной поток
      const destination = this.audioContext.createMediaStreamDestination()
      this.mixerNode.connect(destination)
      this.destinationStream = destination.stream

      // Создаем MediaRecorder для смешанного потока
      this.state.mixedRecorder = new MediaRecorder(this.destinationStream, {
        mimeType: this.config.mimeType!,
        audioBitsPerSecond: 16000 // 16kHz для DeepGram
      })
      
      // Создаем PCM процессор для DeepGram
      this.createPCMProcessor()

      // Обработчик данных
      this.state.mixedRecorder.ondataavailable = (event) => {
        // Проверяем что микширование активно
        if (!this.state.isActive) {
          console.log('🎧 [AUDIO_MIXER] Игнорируем аудио данные - микширование неактивно')
          return
        }

        if (event.data.size > 0) {
          // console.log(`🎧 [AUDIO_MIXER] Смешанные аудио данные: ${event.data.size} байт`)
          this.audioDataCallbacks.forEach(callback => {
            try {
              callback(event.data)
            } catch (error) {
              console.error('🎧 [AUDIO_MIXER] Ошибка в callback аудио данных:', error)
            }
          })
        }
      }

      // Запускаем запись
      this.state.mixedRecorder.start(this.config.timeslice)

      console.log('🎧 [AUDIO_MIXER] Смешанный поток создан и запись началась')
    } catch (error) {
      console.error('🎧 [AUDIO_MIXER] Ошибка создания смешанного потока:', error)
      throw error
    }
  }

  // События
  onAudioData(callback: (audioBlob: Blob) => void): void {
    this.audioDataCallbacks.push(callback)
  }

  onError(callback: (error: AudioMixerError) => void): void {
    this.errorCallbacks.push(callback)
  }

  onStateChange(callback: (state: AudioMixerState) => void): void {
    this.stateChangeCallbacks.push(callback)
  }

  // Приватные методы
  private handleError(error: AudioMixerError): void {
    console.error('🎧 [AUDIO_MIXER] Обработка ошибки:', error)
    
    this.state.error = error.message

    this.errorCallbacks.forEach(callback => {
      try {
        callback(error)
      } catch (callbackError) {
        console.error('🎧 [AUDIO_MIXER] Ошибка в callback ошибки:', callbackError)
      }
    })
  }

  private emitStateChange(): void {
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(this.getState())
      } catch (error) {
        console.error('🎧 [AUDIO_MIXER] Ошибка в callback изменения состояния:', error)
      }
    })
  }

  // Дополнительные методы
  isMicrophoneActive(): boolean {
    return this.state.microphone.isActive
  }

  isSystemAudioActive(): boolean {
    return this.state.systemAudio.isActive
  }

  getMixerState(): AudioMixerState {
    return this.getState()
  }

  // Настройка громкости в реальном времени
  setMicrophoneGain(gain: number): void {
    this.config.microphoneGain = Math.max(0, Math.min(2, gain))
    console.log(`🎧 [AUDIO_MIXER] Громкость микрофона: ${this.config.microphoneGain}`)
  }

  setSystemAudioGain(gain: number): void {
    this.config.systemAudioGain = Math.max(0, Math.min(2, gain))
    console.log(`🎧 [AUDIO_MIXER] Громкость системного звука: ${this.config.systemAudioGain}`)
  }

  // Диагностика для macOS
  checkMacOSPermissions(): {
    isMacOS: boolean
    isChrome: boolean
    needsPermission: boolean
    instructions: string
    systemAudioSupported: boolean
  } {
    const userAgent = navigator.userAgent
    const isMacOS = /Mac|iPhone|iPad|iPod/.test(userAgent)
    const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent)
    
    // КРИТИЧЕСКОЕ ОГРАНИЧЕНИЕ: На macOS системный звук через getDisplayMedia НЕ РАБОТАЕТ
    const systemAudioSupported = !isMacOS
    
    const instructions = isMacOS 
      ? '⚠️ ВАЖНО: На macOS системный звук через браузеры НЕ ПОДДЕРЖИВАЕТСЯ.\n\nЭто ограничение браузеров, а не приложения:\n• Chrome: только аудио вкладки браузера\n• Firefox: аналогичные ограничения\n• Safari: ограниченная поддержка\n\nРаботает только микрофон. Для системного звука нужны специальные приложения.'
      : 'Системный звук должен работать на этой платформе'

    return {
      isMacOS,
      isChrome,
      needsPermission: false, // Не нужно разрешение - функция не работает
      systemAudioSupported,
      instructions
    }
  }

  // Тест системного звука
  async testSystemAudio(): Promise<{
    supported: boolean
    error: string | null
    needsPermission: boolean
  }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        return {
          supported: false,
          error: 'getDisplayMedia не поддерживается в этом браузере',
          needsPermission: false
        }
      }

      // Попытка тестового захвата
      const testStream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: true
      } as any)

      // Проверяем наличие аудио треков
      const audioTracks = testStream.getAudioTracks()
      const hasAudio = audioTracks.length > 0

      // Останавливаем тестовый поток
      testStream.getTracks().forEach(track => track.stop())

      return {
        supported: hasAudio,
        error: hasAudio ? null : 'Нет аудио треков в системном потоке',
        needsPermission: false
      }

    } catch (error) {
      const userAgent = navigator.userAgent
      const isMacOS = /Mac|iPhone|iPad|iPod/.test(userAgent)
      const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent)

      return {
        supported: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        needsPermission: isMacOS && isChrome && error instanceof Error && error.name === 'NotAllowedError'
      }
    }
  }
}

// Создаем экземпляр сервиса
export const audioMixerService = new AudioMixerService()

console.log('🎧 [AUDIO_MIXER] AudioMixerService модуль загружен')
