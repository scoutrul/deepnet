// Chat Store - Простое управление состоянием чата
import { stateActions } from './stateManager'
import type { ChatMessage } from '../types/chat'

// Простое состояние без Composition API
const chatState = {
  // Сообщения
  messages: [] as ChatMessage[],
  currentMessage: null as ChatMessage | null,
  isSending: false,
  selectedMessage: null as ChatMessage | null,
  
  // Состояние загрузки и ошибок
  loading: false,
  error: null as string | null,
  isTimeout: false,
  
  // Очередь терминов
  queuedTerms: [] as any[],
  
  // Выделение текста
  selectedText: null as any,
  
  // Настройки чата
  settings: {
    detailLevel: 'extended' as 'short' | 'extended' | 'max',
    usePreviousContext: true,
    autoScroll: true,
    showTimestamps: true,
    showMetadata: true,
    theme: 'light' as 'light' | 'dark'
  },
  
  // Статистика и метаданные
  totalMessages: 0,
  totalWords: 0,
  sessionStartTime: null as number | null,
  lastActivity: null as number | null
}

// Действия чата
export const chatActions = {
  // Добавление сообщения
  addMessage(message: ChatMessage) {
    chatState.messages.push(message)
    chatState.totalMessages = chatState.messages.length
    chatState.lastActivity = Date.now()
    stateActions.updateTimestamp()
    console.log('💬 [CHAT] Message added:', message.id)
  },
  
  // Обновление сообщения
  updateMessage(messageId: string, updates: Partial<ChatMessage>) {
    const index = chatState.messages.findIndex((m: ChatMessage) => m.id === messageId)
    if (index > -1) {
      chatState.messages[index] = { ...chatState.messages[index], ...updates }
      chatState.lastActivity = Date.now()
      console.log('💬 [CHAT] Message updated:', messageId, updates)
    }
  },
  
  // Удаление сообщения
  removeMessage(messageId: string) {
    const index = chatState.messages.findIndex((m: ChatMessage) => m.id === messageId)
    if (index > -1) {
      chatState.messages.splice(index, 1)
      chatState.totalMessages = chatState.messages.length
      chatState.lastActivity = Date.now()
      console.log('💬 [CHAT] Message removed:', messageId)
    }
  },
  
  // Очистка всех сообщений
  clearMessages() {
    chatState.messages = []
    chatState.totalMessages = 0
    chatState.lastActivity = Date.now()
    console.log('💬 [CHAT] All messages cleared')
  },
  
  // Установка текущего сообщения
  setCurrentMessage(message: ChatMessage | null) {
    chatState.currentMessage = message
    console.log('💬 [CHAT] Current message set:', message?.id || 'null')
  },
  
  // Установка выбранного сообщения
  setSelectedMessage(message: ChatMessage | null) {
    chatState.selectedMessage = message
    console.log('💬 [CHAT] Selected message set:', message?.id || 'null')
  },
  
  // Повторная отправка сообщения
  retryMessage(messageId: string) {
    const message = chatState.messages.find((m: ChatMessage) => m.id === messageId)
    if (message) {
      console.log('💬 [CHAT] Retrying message:', messageId)
    }
  },
  
  // Редактирование сообщения
  editMessage(messageId: string, newText: string) {
    this.updateMessage(messageId, { content: newText })
    console.log('💬 [CHAT] Message edited:', messageId)
  },
  
  // Удаление сообщения
  deleteMessage(messageId: string) {
    this.removeMessage(messageId)
    console.log('💬 [CHAT] Message deleted:', messageId)
  },
  
  // Установка состояния загрузки
  setLoading(isLoading: boolean) {
    chatState.loading = isLoading
    console.log('💬 [CHAT] Loading state:', isLoading)
  },
  
  // Установка ошибки
  setError(message: string | null) {
    chatState.error = message
    console.log('💬 [CHAT] Error set:', message)
  },
  
  // Установка состояния таймаута
  setIsTimeout(isTimeout: boolean) {
    chatState.isTimeout = isTimeout
    console.log('💬 [CHAT] Is timeout:', isTimeout)
  },
  
  // Установка состояния отправки
  setIsSending(isSending: boolean) {
    chatState.isSending = isSending
    console.log('💬 [CHAT] Is sending:', isSending)
  },
  
  // Добавление термина в очередь
  addToQueue(term: any) {
    chatState.queuedTerms.push(term)
    console.log('💬 [CHAT] Term added to queue:', term.text)
  },
  
  // Удаление термина из очереди
  removeFromQueue(termId: string) {
    const index = chatState.queuedTerms.findIndex((t: any) => t.id === termId)
    if (index > -1) {
      chatState.queuedTerms.splice(index, 1)
      console.log('💬 [CHAT] Term removed from queue:', termId)
    }
  },
  
  // Очистка очереди
  clearQueue() {
    chatState.queuedTerms = []
    console.log('💬 [CHAT] Queue cleared')
  },
  
  // Отправка очереди
  sendQueued() {
    console.log('💬 [CHAT] Sending queued terms')
  },
  
  // Установка выделенного текста
  setSelectedText(selection: any) {
    chatState.selectedText = selection
    console.log('💬 [CHAT] Text selected:', selection?.text || 'null')
  },
  
  // Очистка выделения
  clearSelection() {
    chatState.selectedText = null
    console.log('💬 [CHAT] Selection cleared')
  },
  
  // Обработка клика по слову
  handleWordClick(word: string) {
    console.log('💬 [CHAT] Word clicked:', word)
  },
  
  // Обработка клика по термину
  handleTermClick(term: any) {
    console.log('💬 [CHAT] Term clicked:', term.text)
  },
  
  // Установка уровня детализации
  setDetailLevel(level: 'short' | 'extended' | 'max') {
    chatState.settings.detailLevel = level
    console.log('💬 [CHAT] Detail level set:', level)
  },
  
  // Установка использования предыдущего контекста
  setUsePreviousContext(use: boolean) {
    chatState.settings.usePreviousContext = use
    console.log('💬 [CHAT] Use previous context:', use)
  },
  
  // Установка автоскролла
  setAutoScroll(scroll: boolean) {
    chatState.settings.autoScroll = scroll
    console.log('💬 [CHAT] Auto scroll:', scroll)
  },
  
  // Установка отображения временных меток
  setShowTimestamps(show: boolean) {
    chatState.settings.showTimestamps = show
    console.log('💬 [CHAT] Show timestamps:', show)
  },
  
  // Установка отображения метаданных в настройках
  setShowMetadataSetting(show: boolean) {
    chatState.settings.showMetadata = show
    console.log('💬 [CHAT] Show metadata setting:', show)
  },
  
  // Обновление настроек
  updateSettings(updates: any) {
    chatState.settings = { ...chatState.settings, ...updates }
    console.log('💬 [CHAT] Settings updated:', updates)
  },
  
  // Генерация уникального ID
  generateId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Обновление статистики
  updateStatistics() {
    chatState.totalWords = chatState.messages.reduce((total: number, message: ChatMessage) => {
      return total + (message.content?.split(' ').length || 0)
    }, 0)
    
    if (!chatState.sessionStartTime) {
      chatState.sessionStartTime = Date.now()
    }
  },
  
  // Инициализация
  initialize() {
    console.log('💬 [CHAT] Chat store initialized')
  },

  // Очистка состояния
  cleanup() {
    console.log('💬 [CHAT] Cleaning up chat store...')
    
    // Очищаем сообщения
    chatState.messages = []
    chatState.currentMessage = null
    chatState.selectedMessage = null
    
    // Сбрасываем состояние
    chatState.isSending = false
    chatState.loading = false
    chatState.error = null
    chatState.isTimeout = false
    
    // Очищаем очередь терминов
    chatState.queuedTerms = []
    chatState.selectedText = null
    
    // Сбрасываем статистику
    chatState.totalMessages = 0
    chatState.totalWords = 0
    chatState.sessionStartTime = null
    chatState.lastActivity = null
    
    console.log('💬 [CHAT] Chat store cleaned up')
  }
}

// Простые геттеры
export const chatGetters = {
  isLoading: () => chatState.loading,
  hasError: () => chatState.error !== null,
  isSending: () => chatState.isSending,
  allMessages: () => chatState.messages,
  lastMessage: () => chatState.messages[chatState.messages.length - 1] || null,
  hasQueuedTerms: () => chatState.queuedTerms.length > 0,
  hasSelectedText: () => chatState.selectedText !== null,
  currentDetailLevel: () => chatState.settings.detailLevel,
  isUsingPreviousContext: () => chatState.settings.usePreviousContext,
  isAutoScrolling: () => chatState.settings.autoScroll,
  isShowingTimestamps: () => chatState.settings.showTimestamps,
  isShowingMetadata: () => chatState.settings.showMetadata,
  totalMessagesCount: () => chatState.totalMessages,
  totalWordsCount: () => chatState.totalWords,
  sessionDuration: () => {
    if (chatState.sessionStartTime) {
      return Date.now() - chatState.sessionStartTime
    }
    return 0
  },
  userMessages: () => chatState.messages.filter((m: ChatMessage) => m.role === 'user'),
  assistantMessages: () => chatState.messages.filter((m: ChatMessage) => m.role === 'assistant')
}

// Хук для использования в компонентах
export const useChatStore = () => ({
  state: chatState,
  actions: chatActions,
  getters: chatGetters
})

// Экспорт состояния для прямого доступа
export { chatState }

console.log('💬 [CHAT] Chat store initialized')