// UI-Business Adapter - Слой-адаптер для связи UI и Business слоев
import type { UIBusinessInterface } from '../interfaces/layerInterfaces'
import { useVoiceStore } from '../stores/voiceStore'
import { useContextStore } from '../stores/contextStore'
import { useChatStore } from '../stores/chatStore'
import { useUiStore } from '../stores/uiStore'
import { diarizationService } from '../services/voice/diarizationService'
import { systemAudioService } from '../services/voice/systemAudioService'
import type { SystemAudioError } from '../services/voice/systemAudioService'
import { audioMixerService } from '../services/voice/audioMixerService'
import type { AudioMixerError, AudioMixerState } from '../services/voice/audioMixerService'

// Адаптер для связи UI и Business слоев
export class UIBusinessAdapter implements UIBusinessInterface {
  private voiceStore: any | null = null
  private contextStore: any | null = null
  private chatStore: any | null = null
  private uiStore: any | null = null
  
  constructor() {
    // UI-Business adapter initialized
  }
  
  private getVoiceStore() {
    if (!this.voiceStore) {
      this.voiceStore = useVoiceStore()
    }
    return this.voiceStore
  }
  
  private getContextStore() {
    if (!this.contextStore) {
      this.contextStore = useContextStore()
    }
    return this.contextStore
  }
  
  private getChatStore() {
    if (!this.chatStore) {
      this.chatStore = useChatStore()
    }
    return this.chatStore
  }
  
  private getUiStore() {
    if (!this.uiStore) {
      this.uiStore = useUiStore()
    }
    return this.uiStore
  }
  
  // ==================== ИНИЦИАЛИЗАЦИЯ СЕРВИСОВ ====================
  
  async initializeServices(): Promise<void> {
    try {
      // Инициализируем UI store
      this.getUiStore().actions.initialize()
      
      // Инициализируем voice store
      await this.getVoiceStore().actions.initialize()
      
      // Инициализируем context store
      await this.getContextStore().actions.initialize()
      
      // Инициализируем chat store
      await this.getChatStore().actions.initialize()
    } catch (error) {
      this.getUiStore().actions.showError('Ошибка инициализации сервисов')
      throw error
    }
  }
  
  // ==================== ВЫПОЛНЕНИЕ ДЕЙСТВИЙ ====================
  
  async executeAction(action: string, data?: any): Promise<any> {
    try {
      switch (action) {
        case 'voice.startRecording':
          return await this.getVoiceStore().actions.startRecording()
          
        case 'voice.stopRecording':
          return this.getVoiceStore().actions.stopRecording()
          
        case 'voice.pauseRecording':
          return this.getVoiceStore().actions.pauseRecording()
          
        case 'voice.resumeRecording':
          return this.getVoiceStore().actions.resumeRecording()
          
        case 'chat.sendMessage':
          return await this.getChatStore().actions.addMessage(data)
          
        case 'chat.clearMessages':
          return this.getChatStore().actions.clearMessages()
          
        case 'context.setContext':
          return this.getContextStore().actions.setContext(data)
          
        case 'context.generateHints':
          return await this.getContextStore().actions.generateHints(data)
          
        case 'context.search':
          return await this.getContextStore().actions.search(data)
          
        case 'ui.setActivePanel':
          return this.getUiStore().actions.setActivePanel(data)
          
        case 'ui.toggleSidebar':
          return this.getUiStore().actions.toggleSidebar()
          
        case 'ui.showNotification':
          return this.getUiStore().actions.addNotification(data)
          
        case 'systemAudio.start':
          return await this.startSystemAudioCapture()
          
        case 'systemAudio.stop':
          return this.stopSystemAudioCapture()
          
        case 'audioMixer.start':
          return await this.startAudioMixing()
          
        case 'audioMixer.stop':
          return this.stopAudioMixing()
          
        case 'audioMixer.testSystemAudio':
          return await this.testSystemAudio()
          
        default:
          throw new Error(`Unknown action: ${action}`)
      }
    } catch (error) {
      this.getUiStore().actions.showError(`Ошибка выполнения действия: ${action}`)
      throw error
    }
  }
  
  // ==================== ПОЛУЧЕНИЕ ДАННЫХ ====================
  
  getData(key: string): any {
    try {
      switch (key) {
        case 'voice.state':
          return this.getVoiceStore().getters
          
        case 'voice.isRecording':
          return this.getVoiceStore().getters.isRecording
          
        case 'voice.tags':
          return this.getVoiceStore().getters.tags
          
        case 'chat.messages':
          return this.getChatStore().getters.allMessages
          
        case 'chat.loading':
          return this.getChatStore().getters.isLoading
          
        case 'context.context':
          return this.getContextStore().getters.context
          
        case 'context.hints':
          return this.getContextStore().getters.hints
          
        case 'context.searchResults':
          return this.getContextStore().getters.searchResults
          
        case 'ui.activePanel':
          return this.getUiStore().getters.activePanel
          
        case 'ui.sidebarOpen':
          return this.getUiStore().getters.sidebarOpen
          
        case 'ui.notifications':
          return this.getUiStore().getters.notifications
          
        case 'systemAudio.isSupported':
          return systemAudioService.isSupported()
          
        case 'systemAudio.isCapturing':
          return systemAudioService.isCapturing()
          
        case 'systemAudio.state':
          return systemAudioService.getState()
          
        case 'audioMixer.isActive':
          return audioMixerService.getState().isActive
          
        case 'audioMixer.state':
          return audioMixerService.getState()
          
        case 'audioMixer.microphoneActive':
          return audioMixerService.isMicrophoneActive()
          
        case 'audioMixer.systemAudioActive':
          return audioMixerService.isSystemAudioActive()
          
        case 'audioMixer.macOSPermissions':
          return audioMixerService.checkMacOSPermissions()
          
        default:
          return null
      }
    } catch (error) {
      return null
    }
  }
  
  // ==================== ОБНОВЛЕНИЕ ДАННЫХ ====================
  
  updateData(key: string, value: any): void {
    try {
      switch (key) {
        case 'voice.settings':
          this.getVoiceStore().actions.updateSettings(value)
          break
          
        case 'chat.settings':
          this.getChatStore().actions.updateSettings(value)
          break
          
        case 'context.settings':
          this.getContextStore().actions.updateSettings(value)
          break
          
        case 'ui.theme':
          this.getUiStore().actions.setTheme(value)
          break
          
        case 'ui.sidebarOpen':
          this.getUiStore().actions.setSidebarOpen(value)
          break
      }
    } catch (error) {
      this.getUiStore().actions.showError(`Ошибка обновления данных: ${key}`)
    }
  }
  
  // ==================== ПОДПИСКА НА ИЗМЕНЕНИЯ ====================
  
  subscribe(key: string, callback: (data: any) => void): () => void {
    try {
      switch (key) {
        case 'voice.state':
          return this.getVoiceStore().actions.subscribe(callback)
          
        case 'chat.messages':
          return this.getChatStore().actions.subscribe(callback)
          
        case 'context.state':
          return this.getContextStore().actions.subscribe(callback)
          
        case 'ui.state':
          return this.getUiStore().actions.subscribe(callback)
          
        default:
          return () => {}
      }
    } catch (error) {
      return () => {}
    }
  }

  // ==================== ДИАРИЗАЦИЯ ДИАЛОГОВ ====================

  // Запуск диаризации
  async startDiarization(): Promise<void> {
    try {
      console.log('🎭 [ADAPTER] Запуск диаризации...')

      // Подписываемся на события диаризации
      diarizationService.on('onSegment', (segment) => {
        this.getChatStore().actions.appendDiarizedSegment(segment)
      })

      diarizationService.on('onSpeakerChange', (speaker) => {
        console.log('🎭 [ADAPTER] Новый спикер обнаружен:', speaker.displayName)
        this.getChatStore().actions.addSpeaker(speaker)
      })

      diarizationService.on('onStateChange', (state) => {
        this.getChatStore().actions.updateDiarizationState(state)
      })

      diarizationService.on('onError', (error) => {
        console.error('🎭 [ADAPTER] Ошибка диаризации:', error.message)
        this.getChatStore().actions.updateDiarizationState({
          isActive: false,
          isConnecting: false,
          error: error.message
        })
      })

      // Запускаем диаризацию (параллельно с аудио)
      await diarizationService.start()

      console.log('🎭 [ADAPTER] Диаризация запущена успешно')
    } catch (error) {
      console.error('🎭 [ADAPTER] Ошибка запуска диаризации:', error)
      this.getChatStore().actions.updateDiarizationState({
        isActive: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Пауза диаризации (без закрытия соединения)
  pauseDiarization(): void {
    console.log('🎭 [ADAPTER] Пауза диаризации...')
    try {
      diarizationService.pause()
      console.log('🎭 [ADAPTER] Диаризация приостановлена')
    } catch (error) {
      console.error('🎭 [ADAPTER] Ошибка паузы диаризации:', error)
    }
  }

  // Возобновление диаризации
  async resumeDiarization(): Promise<void> {
    console.log('🎭 [ADAPTER] Возобновление диаризации...')
    try {
      await diarizationService.resume()
      console.log('🎭 [ADAPTER] Диаризация возобновлена')
    } catch (error) {
      console.error('🎭 [ADAPTER] Ошибка возобновления диаризации:', error)
    }
  }

  // Остановка диаризации
  async stopDiarization(): Promise<void> {
    try {
      console.log('🎭 [ADAPTER] Остановка диаризации...')
      await diarizationService.stop()
      
      // Отписываемся от событий
      diarizationService.off('onSegment')
      diarizationService.off('onSpeakerChange')
      diarizationService.off('onStateChange')
      diarizationService.off('onError')
      console.log('🎭 [ADAPTER] Диаризация остановлена')
    } catch (error) {
      console.error('🎭 [ADAPTER] Ошибка остановки диаризации:', error)
    }
  }

  // Отправка аудио данных в диаризацию
  // 🎯 ИСПРАВЛЕНИЕ: Принимаем Blob согласно официальной документации DeepGram
  async sendAudioToDiarization(audioBlob: Blob): Promise<void> {
    try {
      // Проверяем что диаризация активна или подключается перед отправкой
      const diarizationState = diarizationService.getState()
      if (!diarizationState.isActive && !diarizationState.isConnecting) {
        console.warn('🎭 [ADAPTER] Диаризация неактивна и не подключается - не отправляем аудио')
        return
      }
      

      await diarizationService.sendAudio(audioBlob)
    } catch (error) {
      console.error('🎭 [ADAPTER] Ошибка отправки аудио в диаризацию:', error)
    }
  }

  // Получение состояния диаризации
  getDiarizationState() {
    return this.getChatStore().getters.diarizationState()
  }

  // ==================== СИСТЕМНЫЙ ЗВУК ====================

  // Запуск захвата системного звука
  async startSystemAudioCapture(): Promise<void> {
    try {
      console.log('🔊 [ADAPTER] Запуск захвата системного звука...')
      
      // Подписываемся на события системного аудио
      systemAudioService.onAudioData((audioBlob) => {
        // Отправляем аудио данные в диаризацию
        this.sendAudioToDiarization(audioBlob)
      })
      
      systemAudioService.onError((error: SystemAudioError) => {
        console.error('🔊 [ADAPTER] Ошибка системного звука:', error.message)
        this.getUiStore().actions.showError(`Ошибка системного звука: ${error.message}`)
        
        // Если это критическая ошибка доступа, можно предложить fallback на микрофон
        if (error.type === 'permission' || error.type === 'not_supported') {
          console.log('🔊 [ADAPTER] Предлагаем fallback на микрофон')
          // Эмитируем событие для UI о необходимости переключения на микрофон
          this.getUiStore().actions.addNotification({
            type: 'warning',
            message: 'Системный звук недоступен. Переключитесь на микрофон для продолжения записи.',
            action: 'switchToMicrophone'
          })
        }
      })
      
      systemAudioService.onStateChange((isCapturing) => {
        console.log(`🔊 [ADAPTER] Состояние захвата системного звука: ${isCapturing}`)
      })
      
      // Запускаем захват
      await systemAudioService.startSystemAudioCapture()
      console.log('🔊 [ADAPTER] Захват системного звука запущен успешно')
    } catch (error) {
      console.error('🔊 [ADAPTER] Ошибка запуска захвата системного звука:', error)
      throw error
    }
  }

  // Остановка захвата системного звука
  stopSystemAudioCapture(): void {
    try {
      console.log('🔊 [ADAPTER] Остановка захвата системного звука...')
      systemAudioService.stopSystemAudioCapture()
      console.log('🔊 [ADAPTER] Захват системного звука остановлен')
    } catch (error) {
      console.error('🔊 [ADAPTER] Ошибка остановки захвата системного звука:', error)
    }
  }

  // Проверка поддержки системного звука
  isSystemAudioSupported(): boolean {
    return systemAudioService.isSupported()
  }

  // Получение состояния системного звука
  getSystemAudioState() {
    return systemAudioService.getState()
  }

  // ==================== АУДИО МИКШЕР ====================

  // Запуск микширования аудио (микрофон + системный звук)
  async startAudioMixing(): Promise<void> {
    try {
      console.log('🎧 [ADAPTER] Запуск микширования аудио...')
      
      // Инициализируем микшер если нужно
      await audioMixerService.initialize()
      
      // Подписываемся на события микшера
      audioMixerService.onAudioData((audioBlob) => {
        // Отправляем смешанные аудио данные в диаризацию
        this.sendAudioToDiarization(audioBlob)
      })
      
      audioMixerService.onError((error: AudioMixerError) => {
        console.error('🎧 [ADAPTER] Ошибка микшера:', error.message)
        this.getUiStore().actions.showError(`Ошибка аудио микшера: ${error.message}`)
      })
      
      audioMixerService.onStateChange((state: AudioMixerState) => {
        console.log('🎧 [ADAPTER] Состояние микшера изменилось:', {
          isActive: state.isActive,
          microphone: state.microphone.isActive,
          systemAudio: state.systemAudio.isActive
        })
      })
      
      // Запускаем микширование
      await audioMixerService.startMixing()
      console.log('🎧 [ADAPTER] Микширование аудио запущено успешно')
    } catch (error) {
      console.error('🎧 [ADAPTER] Ошибка запуска микширования:', error)
      throw error
    }
  }

  // Остановка микширования аудио
  stopAudioMixing(): void {
    try {
      console.log('🎧 [ADAPTER] Остановка микширования аудио...')
      audioMixerService.stopMixing()
      console.log('🎧 [ADAPTER] Микширование аудио остановлено')
    } catch (error) {
      console.error('🎧 [ADAPTER] Ошибка остановки микширования:', error)
    }
  }

  // Получение состояния микшера
  getAudioMixerState(): AudioMixerState {
    return audioMixerService.getState()
  }

  // Тестирование системного звука
  async testSystemAudio(): Promise<any> {
    try {
      console.log('🎧 [ADAPTER] Тестирование системного звука...')
      const result = await audioMixerService.testSystemAudio()
      
      if (result.needsPermission) {
        const permissions = audioMixerService.checkMacOSPermissions()
        this.getUiStore().actions.showError(
          `Требуются разрешения macOS для системного звука:\n\n${permissions.instructions}`
        )
      } else if (!result.supported) {
        this.getUiStore().actions.showError(`Системный звук недоступен: ${result.error}`)
      }
      
      return result
    } catch (error) {
      console.error('🎧 [ADAPTER] Ошибка тестирования системного звука:', error)
      throw error
    }
  }
  
  // ==================== ОЧИСТКА РЕСУРСОВ ====================
  
  cleanup(): void {
    try {
      console.log('🔗 [ADAPTER] Cleaning up adapter...')
      
      // Останавливаем диаризацию
      this.stopDiarization()
      
      // Останавливаем системный звук
      this.stopSystemAudioCapture()
      
      // Останавливаем микширование
      this.stopAudioMixing()
      
      // Очищаем сервисы
      systemAudioService.cleanup()
      audioMixerService.cleanup()
      
      // Очищаем stores
      this.getVoiceStore().actions.cleanup()
      this.getContextStore().actions.cleanup()
      this.getChatStore().actions.cleanup()
      this.getUiStore().actions.cleanup()
      
      console.log('🔗 [ADAPTER] Adapter cleaned up')
    } catch (error) {
      console.error('🔗 [ADAPTER] Error cleaning up adapter:', error)
    }
  }
}

// Создаем экземпляр адаптера
export const uiBusinessAdapter = new UIBusinessAdapter()

// Экспортируем для использования в компонентах
export default uiBusinessAdapter

// UI-Business adapter created
