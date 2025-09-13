// Context Store - Простое управление контекстным состоянием
import { stateActions } from './stateManager'
import type { 
  ContextA, 
  ContextB, 
  CommunicationGoal, 
  FullContext,
  DialogEntry,
  Hint, 
  HintCategory, 
  SearchQuery, 
  SearchResult, 
  SearchFilters
} from '../types/context'

// Простое состояние без Composition API
const contextState = {
  // Основное состояние
  contextA: null as ContextA | null,
  contextB: null as ContextB | null,
  goal: null as CommunicationGoal | null,
  isInitialized: false,
  isContextValid: false,
  
  // Подсказки
  hints: [] as Hint[],
  categories: [] as HintCategory[],
  selectedHint: null as Hint | null,
  
  // Поиск
  searchResults: [] as SearchResult[],
  searchHistory: [] as SearchQuery[],
  searchFilters: {
    categories: [],
    timeRange: { start: 0, end: Date.now() },
    sources: [],
    priority: []
  } as SearchFilters,
  
  // Диалог
  dialogEntries: [] as DialogEntry[],
  currentDialog: null as DialogEntry | null,
  
  // UI состояние
  isPanelCollapsed: false,
  activeTab: 'context',
  
  // Статистика
  totalHints: 0,
  totalSearches: 0,
  lastUpdate: null as number | null
}

// Контекстные действия
export const contextActions = {
  // Управление контекстом стороны A
  setContextA(context: Omit<ContextA, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = Date.now()
    const contextA: ContextA = {
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      ...context
    }
    contextState.contextA = contextA
    contextState.isContextValid = true
    stateActions.setContextA(true)
    stateActions.updateContextTimestamp()
    console.log('🎯 [CONTEXT] Context A set:', contextA.name)
  },
  
  // Управление контекстом стороны B
  setContextB(context: Omit<ContextB, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = Date.now()
    const contextB: ContextB = {
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      ...context
    }
    contextState.contextB = contextB
    contextState.isContextValid = true
    stateActions.setContextB(true)
    stateActions.updateContextTimestamp()
    console.log('🎯 [CONTEXT] Context B set:', contextB.name)
  },
  
  // Управление целью коммуникации
  setGoal(goal: Omit<CommunicationGoal, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = Date.now()
    const communicationGoal: CommunicationGoal = {
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      ...goal
    }
    contextState.goal = communicationGoal
    contextState.isContextValid = true
    stateActions.setGoal(true)
    stateActions.updateContextTimestamp()
    console.log('🎯 [CONTEXT] Goal set:', communicationGoal.description)
  },
  
  // Получение полного контекста
  getFullContext(): FullContext | null {
    if (contextState.contextA && contextState.contextB && contextState.goal) {
      return {
        contextA: contextState.contextA,
        contextB: contextState.contextB,
        goal: contextState.goal,
        sessionId: this.generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        dialogEntries: contextState.dialogEntries
      }
    }
    return null
  },
  
  // Очистка контекста
  clearContext() {
    contextState.contextA = null
    contextState.contextB = null
    contextState.goal = null
    contextState.isContextValid = false
    stateActions.setContextA(false)
    stateActions.setContextB(false)
    stateActions.setGoal(false)
    console.log('🎯 [CONTEXT] Context cleared')
  },
  
  // Генерация подсказок
  async generateHints(_dialog: DialogEntry[], _context: FullContext): Promise<Hint[]> {
    try {
      const hints: Hint[] = []
      contextState.hints = hints
      contextState.totalHints = hints.length
      console.log('🎯 [CONTEXT] Hints generated:', hints.length)
      return hints
    } catch (error) {
      console.error('🎯 [CONTEXT] Error generating hints:', error)
      return []
    }
  },
  
  // Получение подсказок
  getHints(): Hint[] {
    return contextState.hints
  },
  
  // Получение категорий
  getCategories(): HintCategory[] {
    return contextState.categories
  },
  
  // Отметка подсказки как прочитанной
  markHintAsRead(hintId: string) {
    const hint = contextState.hints.find((h: Hint) => h.id === hintId)
    if (hint) {
      hint.isRead = true
      console.log('🎯 [CONTEXT] Hint marked as read:', hintId)
    }
  },
  
  // Отклонение подсказки
  dismissHint(hintId: string) {
    const hint = contextState.hints.find((h: Hint) => h.id === hintId)
    if (hint) {
      hint.isDismissed = true
      console.log('🎯 [CONTEXT] Hint dismissed:', hintId)
    }
  },
  
  // Поиск
  async search(query: string, filters?: SearchFilters): Promise<SearchResult> {
    try {
      const searchQuery: SearchQuery = {
        id: this.generateId(),
        text: query,
        timestamp: Date.now(),
        context: contextState.contextA && contextState.contextB && contextState.goal ? {
          contextA: contextState.contextA,
          contextB: contextState.contextB,
          goal: contextState.goal,
          sessionId: this.generateId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          dialogEntries: contextState.dialogEntries
        } : undefined,
        filters: filters || contextState.searchFilters
      }
      
      const result: SearchResult = {
        id: this.generateId(),
        query: query,
        results: [],
        totalCount: 0,
        timestamp: Date.now(),
        processingTime: 0
      }
      
      contextState.searchResults.push(result)
      contextState.searchHistory.push(searchQuery)
      contextState.totalSearches++
      
      console.log('🎯 [CONTEXT] Search completed:', query)
      return result
    } catch (error) {
      console.error('🎯 [CONTEXT] Error searching:', error)
      throw error
    }
  },
  
  // Установка фильтров поиска
  setSearchFilters(filters: SearchFilters) {
    contextState.searchFilters = filters
    console.log('🎯 [CONTEXT] Search filters set:', filters)
  },
  
  // Очистка истории поиска
  clearSearchHistory() {
    contextState.searchHistory = []
    console.log('🎯 [CONTEXT] Search history cleared')
  },
  
  // Добавление записи диалога
  addDialogEntry(entry: Omit<DialogEntry, 'id' | 'timestamp'>) {
    const dialogEntry: DialogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...entry
    }
    contextState.dialogEntries.push(dialogEntry)
    console.log('🎯 [CONTEXT] Dialog entry added:', dialogEntry.id)
  },
  
  // Получение записей диалога
  getDialogEntries(): DialogEntry[] {
    return contextState.dialogEntries
  },
  
  // Очистка диалога
  clearDialog() {
    contextState.dialogEntries = []
    console.log('🎯 [CONTEXT] Dialog cleared')
  },
  
  // UI управление
  togglePanel() {
    contextState.isPanelCollapsed = !contextState.isPanelCollapsed
    console.log('🎯 [CONTEXT] Panel toggled:', contextState.isPanelCollapsed)
  },
  
  setPanelCollapsed(collapsed: boolean) {
    contextState.isPanelCollapsed = collapsed
    console.log('🎯 [CONTEXT] Panel collapsed:', collapsed)
  },
  
  setActiveTab(tab: string) {
    contextState.activeTab = tab
    console.log('🎯 [CONTEXT] Active tab set:', tab)
  },
  
  // Вспомогательные методы
  generateId(): string {
    return `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Инициализация
  initialize() {
    contextState.isInitialized = true
    stateActions.setContextInitialized(true)
    console.log('🎯 [CONTEXT] Context store initialized')
  },
  
  // Очистка
  cleanup() {
    this.clearContext()
    this.clearSearchHistory()
    this.clearDialog()
    console.log('🎯 [CONTEXT] Context store cleaned up')
  }
}

// Простые геттеры
export const contextGetters = {
  contextA: () => contextState.contextA,
  contextB: () => contextState.contextB,
  goal: () => contextState.goal,
  isInitialized: () => contextState.isInitialized,
  isContextValid: () => contextState.isContextValid,
  hints: () => contextState.hints,
  categories: () => contextState.categories,
  selectedHint: () => contextState.selectedHint,
  totalHints: () => contextState.totalHints,
  searchResults: () => contextState.searchResults,
  searchHistory: () => contextState.searchHistory,
  searchFilters: () => contextState.searchFilters,
  totalSearches: () => contextState.totalSearches,
  dialogEntries: () => contextState.dialogEntries,
  currentDialog: () => contextState.currentDialog,
  isPanelCollapsed: () => contextState.isPanelCollapsed,
  activeTab: () => contextState.activeTab,
  lastUpdate: () => contextState.lastUpdate,
  hasContext: () => contextState.isContextValid,
  hasHints: () => contextState.hints.length > 0,
  hasSearchResults: () => contextState.searchResults.length > 0,
  hasDialog: () => contextState.dialogEntries.length > 0,
  fullContext: () => contextActions.getFullContext()
}

// Хук для использования в компонентах
export const useContextStore = () => ({
  state: contextState,
  actions: contextActions,
  getters: contextGetters
})

// Экспорт состояния для прямого доступа
export { contextState }

console.log('🎯 [CONTEXT] Context store initialized')