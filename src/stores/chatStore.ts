// Chat Store - Простое управление состоянием чата
import { stateActions } from './stateManager'
import type { ChatMessage, DiarizedMessage, DiarizedSegment, DiarizedSpeaker, DiarizationState } from '../types/chat'

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
  lastActivity: null as number | null,

  // Диаризация диалогов
  diarizedMessages: [] as DiarizedMessage[],
  speakers: {} as Record<string, DiarizedSpeaker>,
  activeSegments: {} as Record<string, DiarizedSegment>,
  diarizationState: {
    isActive: false,
    isConnecting: false,
    error: null
  } as DiarizationState
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

  // ==================== ДИАРИЗАЦИЯ ДИАЛОГОВ ====================

  // Очистка диалога
  clearDialog() {
    console.log('💬 [CHAT] Clearing dialog...')
    
    // Очищаем диаризованные сообщения
    chatState.diarizedMessages = []
    chatState.speakers = {}
    chatState.activeSegments = {}
    
    // Сбрасываем состояние диаризации
    chatState.diarizationState = {
      isActive: false,
      isConnecting: false,
      error: null,
      speakers: {},
      activeSegments: {}
    }
    
    console.log('💬 [CHAT] Dialog cleared')
  },

  // Добавление диаризованного сегмента
  appendDiarizedSegment(segment: DiarizedSegment) {
    console.log('💬 [CHAT] Appending diarized segment:', segment.speakerName, segment.text)
    
    // Обновляем активные сегменты
    if (!segment.isFinal) {
      chatState.activeSegments[segment.speakerId] = segment
    } else {
      delete chatState.activeSegments[segment.speakerId]
    }

    // 🔧 ИСПРАВЛЕНИЕ: Создаем сообщения для ВСЕХ сегментов, не только финальных
    this.createOrUpdateDiarizedMessage(segment)

    stateActions.updateTimestamp()
  },

  // 🔧 ИСПРАВЛЕНИЕ: Создание или обновление диаризованного сообщения (для всех сегментов)
  createOrUpdateDiarizedMessage(segment: DiarizedSegment) {
    console.log('💬 [CHAT] 🔧 Creating/updating message for segment:', segment.text, 'isFinal:', segment.isFinal)
    
    // Ищем активное сообщение от того же спикера
    const existingMessageIndex = chatState.diarizedMessages.findIndex(
      msg => msg.speakerId === segment.speakerId && msg.isActive
    )
    
    // Проверяем таймаут между сообщениями (3 секунды)
    const MESSAGE_TIMEOUT = 3000 // 3 секунды
    const lastMessage = chatState.diarizedMessages[chatState.diarizedMessages.length - 1]
    const shouldCreateNewMessage = !lastMessage || 
      (segment.timestamp - lastMessage.timestamp > MESSAGE_TIMEOUT) ||
      (lastMessage.speakerId !== segment.speakerId)

    if (existingMessageIndex >= 0 && !shouldCreateNewMessage) {
      // Обновляем существующее активное сообщение (в пределах таймаута)
      const existingMessage = chatState.diarizedMessages[existingMessageIndex]
      console.log('💬 [CHAT] 🔧 Updating existing message:', existingMessage.content, '→', segment.text)
      
      existingMessage.content = segment.text  // DeepGram дает полный обновленный текст
      existingMessage.segments.push(segment)
      existingMessage.timestamp = segment.timestamp
      existingMessage.isActive = !segment.isFinal  // Активно пока не финальное
    } else {
      // Финализируем предыдущие активные сообщения при создании нового
      if (shouldCreateNewMessage) {
        chatState.diarizedMessages.forEach(msg => {
          if (msg.isActive) {
            console.log('💬 [CHAT] 🔧 Finalizing previous message:', msg.content)
            msg.isActive = false
          }
        })
      }
      
      // Создаем новое сообщение
      const speaker = chatState.speakers[segment.speakerId]
      const message: DiarizedMessage = {
        id: `diarized_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        speakerId: segment.speakerId,
        speakerName: segment.speakerName,
        speakerColor: speaker?.color || '#6B7280',
        content: segment.text,
        timestamp: segment.timestamp,
        segments: [segment],
        isActive: !segment.isFinal  // Активно пока не финальное
      }
      
      console.log('💬 [CHAT] 🔧 Created new message:', message.content, 'isActive:', message.isActive)
      chatState.diarizedMessages.push(message)
    }

    console.log('💬 [CHAT] 🔧 Total diarized messages:', chatState.diarizedMessages.length)
  },

  // Обновление состояния диаризации
  updateDiarizationState(state: Partial<DiarizationState>) {
    chatState.diarizationState = { ...chatState.diarizationState, ...state }
    console.log('💬 [CHAT] Diarization state updated:', state)
  },

  // Добавление спикера
  addSpeaker(speaker: DiarizedSpeaker) {
    chatState.speakers[speaker.id] = speaker
    console.log('💬 [CHAT] Speaker added:', speaker.displayName)
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

    // Очищаем диаризацию
    chatState.diarizedMessages = []
    chatState.speakers = {}
    chatState.activeSegments = {}
    chatState.diarizationState = {
      isActive: false,
      isConnecting: false,
      error: null,
      speakers: {},
      activeSegments: {}
    }
    
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
  assistantMessages: () => chatState.messages.filter((m: ChatMessage) => m.role === 'assistant'),

  // Диаризация геттеры
  diarizedMessages: () => chatState.diarizedMessages,
  speakers: () => chatState.speakers,
  activeSegments: () => chatState.activeSegments,
  diarizationState: () => chatState.diarizationState,
  isDiarizationActive: () => chatState.diarizationState.isActive,
  isDiarizationConnecting: () => chatState.diarizationState.isConnecting,
  diarizationError: () => chatState.diarizationState.error,
  hasDiarizedMessages: () => chatState.diarizedMessages.length > 0,
  activeSpeakers: () => Object.keys(chatState.activeSegments),
  speakerCount: () => Object.keys(chatState.speakers).length
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