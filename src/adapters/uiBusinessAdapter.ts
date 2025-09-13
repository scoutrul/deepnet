// UI-Business Adapter - Слой-адаптер для связи UI и Business слоев
import type { UIBusinessInterface } from '../interfaces/layerInterfaces'
import { useVoiceStore } from '../stores/voiceStore'
import { useContextStore } from '../stores/contextStore'
import { useChatStore } from '../stores/chatStore'
import { useUiStore } from '../stores/uiStore'
import { diarizationService } from '../services/voice/diarizationService'

// Адаптер для связи UI и Business слоев
export class UIBusinessAdapter implements UIBusinessInterface {
  private voiceStore: any | null = null
  private contextStore: any | null = null
  private chatStore: any | null = null
  private uiStore: any | null = null
  
  constructor() {
    console.log('🔗 [ADAPTER] UI-Business adapter initialized')
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
      console.log('🔗 [ADAPTER] Initializing services...')
      
      // Инициализируем UI store
      this.getUiStore().actions.initialize()
      
      // Инициализируем voice store
      await this.getVoiceStore().actions.initialize()
      
      // Инициализируем context store
      await this.getContextStore().actions.initialize()
      
      // Инициализируем chat store
      await this.getChatStore().actions.initialize()
      
      console.log('🔗 [ADAPTER] All services initialized')
    } catch (error) {
      console.error('🔗 [ADAPTER] Error initializing services:', error)
      this.getUiStore().actions.showError('Ошибка инициализации сервисов')
      throw error
    }
  }
  
  // ==================== ВЫПОЛНЕНИЕ ДЕЙСТВИЙ ====================
  
  async executeAction(action: string, data?: any): Promise<any> {
    try {
      console.log('🔗 [ADAPTER] Executing action:', action, data)
      
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
          
        default:
          throw new Error(`Unknown action: ${action}`)
      }
    } catch (error) {
      console.error('🔗 [ADAPTER] Error executing action:', action, error)
      this.getUiStore().actions.showError(`Ошибка выполнения действия: ${action}`)
      throw error
    }
  }
  
  // ==================== ПОЛУЧЕНИЕ ДАННЫХ ====================
  
  getData(key: string): any {
    try {
      console.log('🔗 [ADAPTER] Getting data:', key)
      
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
          
        default:
          console.warn('🔗 [ADAPTER] Unknown data key:', key)
          return null
      }
    } catch (error) {
      console.error('🔗 [ADAPTER] Error getting data:', key, error)
      return null
    }
  }
  
  // ==================== ОБНОВЛЕНИЕ ДАННЫХ ====================
  
  updateData(key: string, value: any): void {
    try {
      console.log('🔗 [ADAPTER] Updating data:', key, value)
      
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
          
        default:
          console.warn('🔗 [ADAPTER] Unknown update key:', key)
      }
    } catch (error) {
      console.error('🔗 [ADAPTER] Error updating data:', key, error)
      this.getUiStore().actions.showError(`Ошибка обновления данных: ${key}`)
    }
  }
  
  // ==================== ПОДПИСКА НА ИЗМЕНЕНИЯ ====================
  
  subscribe(key: string, callback: (data: any) => void): () => void {
    try {
      console.log('🔗 [ADAPTER] Subscribing to:', key)
      
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
          console.warn('🔗 [ADAPTER] Unknown subscription key:', key)
          return () => {}
      }
    } catch (error) {
      console.error('🔗 [ADAPTER] Error subscribing to:', key, error)
      return () => {}
    }
  }

  // ==================== ДИАРИЗАЦИЯ ДИАЛОГОВ ====================

  // Запуск диаризации
  async startDiarization(): Promise<void> {
    try {
      console.log('🎭 [ADAPTER] Starting diarization...')
      
      // Подписываемся на события диаризации
      diarizationService.on('onSegment', (segment) => {
        this.getChatStore().actions.appendDiarizedSegment(segment)
      })
      
      diarizationService.on('onSpeakerChange', (speaker) => {
        this.getChatStore().actions.addSpeaker(speaker)
      })
      
      diarizationService.on('onStateChange', (state) => {
        this.getChatStore().actions.updateDiarizationState(state)
      })
      
      diarizationService.on('onError', (error) => {
        console.error('🎭 [ADAPTER] Diarization error:', error)
        this.getChatStore().actions.updateDiarizationState({ 
          isActive: false, 
          isConnecting: false, 
          error: error.message 
        })
      })
      
      // Запускаем диаризацию
      await diarizationService.start()
      
      console.log('🎭 [ADAPTER] Diarization started successfully')
    } catch (error) {
      console.error('🎭 [ADAPTER] Error starting diarization:', error)
      this.getChatStore().actions.updateDiarizationState({ 
        isActive: false, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  // Остановка диаризации
  async stopDiarization(): Promise<void> {
    try {
      console.log('🎭 [ADAPTER] Stopping diarization...')
      
      await diarizationService.stop()
      
      // Отписываемся от событий
      diarizationService.off('onSegment')
      diarizationService.off('onSpeakerChange')
      diarizationService.off('onStateChange')
      diarizationService.off('onError')
      
      console.log('🎭 [ADAPTER] Diarization stopped successfully')
    } catch (error) {
      console.error('🎭 [ADAPTER] Error stopping diarization:', error)
    }
  }

  // Отправка аудио данных в диаризацию
  // 🎯 ИСПРАВЛЕНИЕ: Принимаем Blob согласно официальной документации DeepGram
  async sendAudioToDiarization(audioBlob: Blob): Promise<void> {
    try {
      await diarizationService.sendAudio(audioBlob)
    } catch (error) {
      console.error('🎭 [ADAPTER] Error sending audio to diarization:', error)
    }
  }

  // Получение состояния диаризации
  getDiarizationState() {
    return this.getChatStore().getters.diarizationState()
  }
  
  // ==================== ОЧИСТКА РЕСУРСОВ ====================
  
  cleanup(): void {
    try {
      console.log('🔗 [ADAPTER] Cleaning up adapter...')
      
      // Останавливаем диаризацию
      this.stopDiarization()
      
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

console.log('🔗 [ADAPTER] UI-Business adapter created')
