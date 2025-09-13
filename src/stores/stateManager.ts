// State Manager - Простая система управления состоянием для Vue 2.7
import { reactive } from '@vue/composition-api'

// Глобальное состояние приложения (инициализируется лениво)
let globalState: any = null

function getGlobalState() {
  if (!globalState) {
    globalState = reactive({
      // Базовое состояние
      isLoading: false,
      error: null as string | null,
      lastUpdate: Date.now(),
      
      // Голосовое состояние
      voice: {
        isRecording: false,
        isProcessing: false,
        isConnected: false,
        isDeepGramMode: false,
        connectionStatus: 'Не подключен',
        currentLanguage: 'ru-RU',
        confidence: 0,
        lastTranscription: '',
        errors: [] as string[]
      },
      
      // Контекстное состояние
      context: {
        isInitialized: false,
        hasContextA: false,
        hasContextB: false,
        hasGoal: false,
        lastUpdate: Date.now()
      },
      
      // UI состояние
      ui: {
        activePanel: 'chat' as 'chat' | 'context' | 'voice' | 'search',
        isSidebarOpen: true,
        theme: 'light' as 'light' | 'dark',
        notifications: [] as Array<{
          id: string,
          type: 'success' | 'error' | 'warning' | 'info',
          message: string,
          timestamp: number
        }>
      }
    })
  }
  return globalState
}

// Базовые действия
export const stateActions = {
  // Базовые действия
  setLoading(loading: boolean) {
    getGlobalState().isLoading = loading
  },
  
  setError(error: string | null) {
    getGlobalState().error = error
  },
  
  updateTimestamp() {
    getGlobalState().lastUpdate = Date.now()
  },
  
  // Голосовые действия
  setVoiceRecording(recording: boolean) {
    getGlobalState().voice.isRecording = recording
  },
  
  setVoiceProcessing(processing: boolean) {
    getGlobalState().voice.isProcessing = processing
  },
  
  setVoiceConnected(connected: boolean) {
    getGlobalState().voice.isConnected = connected
  },
  
  setVoiceConnectionStatus(status: string) {
    getGlobalState().voice.connectionStatus = status
  },
  
  setVoiceLanguage(language: string) {
    getGlobalState().voice.currentLanguage = language
  },
  
  setVoiceConfidence(confidence: number) {
    getGlobalState().voice.confidence = confidence
  },
  
  setLastTranscription(transcription: string) {
    getGlobalState().voice.lastTranscription = transcription
  },
  
  addVoiceError(error: string) {
    getGlobalState().voice.errors.push(error)
  },
  
  clearVoiceErrors() {
    getGlobalState().voice.errors = []
  },
  
  // Контекстные действия
  setContextInitialized(initialized: boolean) {
    getGlobalState().context.isInitialized = initialized
  },
  
  setContextA(hasContextA: boolean) {
    getGlobalState().context.hasContextA = hasContextA
  },
  
  setContextB(hasContextB: boolean) {
    getGlobalState().context.hasContextB = hasContextB
  },
  
  setGoal(hasGoal: boolean) {
    getGlobalState().context.hasGoal = hasGoal
  },
  
  updateContextTimestamp() {
    getGlobalState().context.lastUpdate = Date.now()
  },
  
  // UI действия
  setActivePanel(panel: 'chat' | 'context' | 'voice' | 'search') {
    getGlobalState().ui.activePanel = panel
  },
  
  setSidebarOpen(open: boolean) {
    getGlobalState().ui.isSidebarOpen = open
  },
  
  setTheme(theme: 'light' | 'dark') {
    getGlobalState().ui.theme = theme
  },
  
  addNotification(notification: {
    id: string,
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    timestamp: number
  }) {
    getGlobalState().ui.notifications.push(notification)
  },
  
  removeNotification(id: string) {
    const notifications = getGlobalState().ui.notifications
    const index = notifications.findIndex((n: any) => n.id === id)
    if (index > -1) {
      notifications.splice(index, 1)
    }
  },
  
  clearNotifications() {
    getGlobalState().ui.notifications = []
  },
  
  // Общие действия
  updateData(key: string, value: any) {
    getGlobalState()[key] = value
  },
  
  clearData(key: string) {
    delete getGlobalState()[key]
  },
  
  clearAllData() {
    // Сброс к начальному состоянию
    globalState = null
  }
}

// Простые геттеры (без computed)
export const stateGetters = {
  isLoading: () => getGlobalState().isLoading,
  hasError: () => getGlobalState().error !== null,
  error: () => getGlobalState().error,
  lastUpdate: () => getGlobalState().lastUpdate,
  
  // Голосовые геттеры
  isVoiceRecording: () => getGlobalState().voice.isRecording,
  isVoiceProcessing: () => getGlobalState().voice.isProcessing,
  isVoiceConnected: () => getGlobalState().voice.isConnected,
  voiceConnectionStatus: () => getGlobalState().voice.connectionStatus,
  voiceLanguage: () => getGlobalState().voice.currentLanguage,
  voiceConfidence: () => getGlobalState().voice.confidence,
  lastTranscription: () => getGlobalState().voice.lastTranscription,
  voiceErrors: () => getGlobalState().voice.errors,
  
  // Контекстные геттеры
  isContextInitialized: () => getGlobalState().context.isInitialized,
  hasContextA: () => getGlobalState().context.hasContextA,
  hasContextB: () => getGlobalState().context.hasContextB,
  hasGoal: () => getGlobalState().context.hasGoal,
  contextLastUpdate: () => getGlobalState().context.lastUpdate,
  
  // UI геттеры
  activePanel: () => getGlobalState().ui.activePanel,
  isSidebarOpen: () => getGlobalState().ui.isSidebarOpen,
  theme: () => getGlobalState().ui.theme,
  notifications: () => getGlobalState().ui.notifications
}

// Хук для использования в компонентах
export const useStateManager = () => ({
  state: getGlobalState(),
  actions: stateActions,
  getters: stateGetters
})

// Экспорт состояния для прямого доступа
export const state = getGlobalState

console.log('🏪 [STATE] State manager initialized')