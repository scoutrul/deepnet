// Voice Store - Простое управление голосовым состоянием
import { stateActions } from './stateManager'

// Простое состояние без Composition API
const voiceState = {
  // Основное состояние
  isRecording: false,
  isProcessing: false,
  isConnected: false,
  isDeepGramMode: false,
  connectionStatus: 'Не подключен',
  
  // Настройки
  currentLanguage: 'ru-RU',
  confidence: 0,
  autoStart: false,
  autoStop: true,
  maxDuration: 30000,
  
  // Сервис
  voiceService: null as any,
  
  // Теги и фразы
  tags: [] as any[],
  currentPhrase: '',
  phraseHistory: [] as string[],
  lastTranscription: '',
  
  // Ошибки и статус
  error: null as string | null,
  lastError: null as string | null,
  errorCount: 0,
  
  // UI состояние
  isPanelCollapsed: false,
  autoScroll: true,
  
  // Статистика
  totalDuration: 0,
  totalWords: 0,
  sessionStartTime: null as number | null
}

// Голосовые действия
export const voiceActions = {
  // Основные действия записи
  startRecording() {
    if (voiceState.voiceService && !voiceState.isRecording) {
      voiceState.isRecording = true
      voiceState.sessionStartTime = Date.now()
      stateActions.setVoiceRecording(true)
      console.log('🎤 [VOICE] Recording started')
    }
  },
  
  stopRecording() {
    if (voiceState.voiceService && voiceState.isRecording) {
      voiceState.isRecording = false
      stateActions.setVoiceRecording(false)
      console.log('🎤 [VOICE] Recording stopped')
    }
  },
  
  // Управление сервисом
  setVoiceService(service: any) {
    voiceState.voiceService = service
    console.log('🎤 [VOICE] Voice service set')
  },
  
  setLanguage(language: string) {
    if (voiceState.voiceService) {
      voiceState.voiceService.setLanguage(language)
    }
    voiceState.currentLanguage = language
    stateActions.setVoiceLanguage(language)
    console.log('🎤 [VOICE] Language set:', language)
  },
  
  cleanup() {
    if (voiceState.voiceService) {
      voiceState.voiceService.cleanup()
    }
    voiceState.voiceService = null
    console.log('🎤 [VOICE] Voice service cleaned up')
  },
  
  // Управление тегами
  addTag(tag: any) {
    const newTag = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...tag
    }
    voiceState.tags.push(newTag)
    console.log('🎤 [VOICE] Tag added:', newTag.text)
  },
  
  clearTags() {
    voiceState.tags = []
    console.log('🎤 [VOICE] All tags cleared')
  },
  
  // Управление ошибками
  setError(error: string | null) {
    voiceState.error = error
    if (error) {
      voiceState.lastError = error
      voiceState.errorCount++
      stateActions.setError(error)
    }
    console.log('🎤 [VOICE] Error set:', error)
  },
  
  clearError() {
    voiceState.error = null
    stateActions.setError(null)
    console.log('🎤 [VOICE] Error cleared')
  },
  
  // Управление состоянием
  setConnectionStatus(status: string) {
    voiceState.connectionStatus = status
    stateActions.setVoiceConnectionStatus(status)
    console.log('🎤 [VOICE] Connection status set:', status)
  },
  
  setConnected(connected: boolean) {
    voiceState.isConnected = connected
    stateActions.setVoiceConnected(connected)
    console.log('🎤 [VOICE] Connected:', connected)
  },
  
  setProcessing(processing: boolean) {
    voiceState.isProcessing = processing
    stateActions.setVoiceProcessing(processing)
    console.log('🎤 [VOICE] Processing:', processing)
  },
  
  setConfidence(confidence: number) {
    voiceState.confidence = confidence
    stateActions.setVoiceConfidence(confidence)
    console.log('🎤 [VOICE] Confidence set:', confidence)
  },
  
  setLastTranscription(transcription: string) {
    voiceState.lastTranscription = transcription
    stateActions.setLastTranscription(transcription)
    console.log('🎤 [VOICE] Last transcription set:', transcription)
  },
  
  // UI управление
  togglePanel() {
    voiceState.isPanelCollapsed = !voiceState.isPanelCollapsed
    console.log('🎤 [VOICE] Panel toggled:', voiceState.isPanelCollapsed)
  },
  
  setPanelCollapsed(collapsed: boolean) {
    voiceState.isPanelCollapsed = collapsed
    console.log('🎤 [VOICE] Panel collapsed:', collapsed)
  },
  
  setAutoScroll(scroll: boolean) {
    voiceState.autoScroll = scroll
    console.log('🎤 [VOICE] Auto scroll:', scroll)
  },
  
  // Вспомогательные методы
  generateId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Инициализация
  initialize() {
    console.log('🎤 [VOICE] Voice store initialized')
  }
}

// Простые геттеры
export const voiceGetters = {
  isRecording: () => voiceState.isRecording,
  isProcessing: () => voiceState.isProcessing,
  isConnected: () => voiceState.isConnected,
  connectionStatus: () => voiceState.connectionStatus,
  currentLanguage: () => voiceState.currentLanguage,
  confidence: () => voiceState.confidence,
  voiceService: () => voiceState.voiceService,
  canRecord: () => voiceState.voiceService && !voiceState.error,
  tags: () => voiceState.tags,
  currentPhrase: () => voiceState.currentPhrase,
  phraseHistory: () => voiceState.phraseHistory,
  error: () => voiceState.error,
  lastError: () => voiceState.lastError,
  errorCount: () => voiceState.errorCount,
  hasError: () => voiceState.error !== null,
  isPanelCollapsed: () => voiceState.isPanelCollapsed,
  autoScroll: () => voiceState.autoScroll,
  totalDuration: () => voiceState.totalDuration,
  totalWords: () => voiceState.totalWords,
  sessionStartTime: () => voiceState.sessionStartTime,
  isActive: () => voiceState.isRecording || voiceState.isProcessing,
  hasTags: () => voiceState.tags.length > 0,
  hasPhraseHistory: () => voiceState.phraseHistory.length > 0
}

// Хук для использования в компонентах
export const useVoiceStore = () => ({
  state: voiceState,
  actions: voiceActions,
  getters: voiceGetters
})

// Экспорт состояния для прямого доступа
export { voiceState }

console.log('🎤 [VOICE] Voice store initialized')