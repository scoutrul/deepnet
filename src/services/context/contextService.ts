// Context Service - Единый сервис для управления контекстом, подсказками и поиском
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
  SearchResultItem, 
  SearchFilters
} from '../../types/context'
import { LLMAgent } from './llmAgent'

class ContextService {
  private llmAgent: LLMAgent
  
  // Управление контекстом
  private contextA: ContextA | null = null
  private contextB: ContextB | null = null
  private goal: CommunicationGoal | null = null
  private sessionId: string = ''
  private dialogEntries: DialogEntry[] = []
  
  // Подсказки
  private categories: Map<string, HintCategory> = new Map()
  private generatedHints: Map<string, Hint> = new Map()
  
  // Поиск
  private searchHistory: SearchQuery[] = []
  private searchCache: Map<string, SearchResult> = new Map()
  
  // Общие слушатели
  private listeners: Array<(context: FullContext | null) => void> = []
  private hintListeners: Array<(hints: Hint[]) => void> = []
  private searchListeners: Array<(result: SearchResult) => void> = []

  constructor(llmAgent: LLMAgent) {
    this.llmAgent = llmAgent
    this.sessionId = this.generateSessionId()
    this.initializeCategories()
    console.log('🎯 [CONTEXT] ContextService initialized')
  }

  // ==================== УПРАВЛЕНИЕ КОНТЕКСТОМ ====================

  // Установка контекста стороны A
  setContextA(context: Omit<ContextA, 'id' | 'createdAt' | 'updatedAt'>): ContextA {
    const now = Date.now()
    const contextA: ContextA = {
      id: this.generateId(),
      ...context,
      createdAt: now,
      updatedAt: now
    }

    this.contextA = contextA
    console.log('🎯 [CONTEXT] Context A set:', contextA)
    this.notifyContextListeners()
    return contextA
  }

  // Обновление контекста стороны A
  updateContextA(updates: Partial<Omit<ContextA, 'id' | 'createdAt'>>): ContextA | null {
    if (!this.contextA) {
      console.warn('🎯 [CONTEXT] Cannot update Context A: not set')
      return null
    }

    this.contextA = {
      ...this.contextA,
      ...updates,
      updatedAt: Date.now()
    }

    console.log('🎯 [CONTEXT] Context A updated:', this.contextA)
    this.notifyContextListeners()
    return this.contextA
  }

  // Получение контекста стороны A
  getContextA(): ContextA | null {
    return this.contextA
  }

  // Установка контекста стороны B
  setContextB(context: Omit<ContextB, 'id' | 'createdAt' | 'updatedAt'>): ContextB {
    const now = Date.now()
    const contextB: ContextB = {
      id: this.generateId(),
      ...context,
      createdAt: now,
      updatedAt: now
    }

    this.contextB = contextB
    console.log('🎯 [CONTEXT] Context B set:', contextB)
    this.notifyContextListeners()
    return contextB
  }

  // Обновление контекста стороны B
  updateContextB(updates: Partial<Omit<ContextB, 'id' | 'createdAt'>>): ContextB | null {
    if (!this.contextB) {
      console.warn('🎯 [CONTEXT] Cannot update Context B: not set')
      return null
    }

    this.contextB = {
      ...this.contextB,
      ...updates,
      updatedAt: Date.now()
    }

    console.log('🎯 [CONTEXT] Context B updated:', this.contextB)
    this.notifyContextListeners()
    return this.contextB
  }

  // Получение контекста стороны B
  getContextB(): ContextB | null {
    return this.contextB
  }

  // Установка цели коммуникации
  setGoal(goal: Omit<CommunicationGoal, 'id' | 'createdAt' | 'updatedAt'>): CommunicationGoal {
    const now = Date.now()
    const communicationGoal: CommunicationGoal = {
      id: this.generateId(),
      ...goal,
      createdAt: now,
      updatedAt: now
    }

    this.goal = communicationGoal
    console.log('🎯 [CONTEXT] Goal set:', communicationGoal)
    this.notifyContextListeners()
    return communicationGoal
  }

  // Обновление цели коммуникации
  updateGoal(updates: Partial<Omit<CommunicationGoal, 'id' | 'createdAt'>>): CommunicationGoal | null {
    if (!this.goal) {
      console.warn('🎯 [CONTEXT] Cannot update goal: not set')
      return null
    }

    this.goal = {
      ...this.goal,
      ...updates,
      updatedAt: Date.now()
    }

    console.log('🎯 [CONTEXT] Goal updated:', this.goal)
    this.notifyContextListeners()
    return this.goal
  }

  // Получение цели коммуникации
  getGoal(): CommunicationGoal | null {
    return this.goal
  }

  // Получение полного контекста
  getFullContext(): FullContext | null {
    if (!this.contextA || !this.contextB || !this.goal) {
      return null
    }

    return {
      contextA: this.contextA,
      contextB: this.contextB,
      goal: this.goal,
      sessionId: this.sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dialogEntries: this.dialogEntries
    }
  }

  // Очистка контекста
  clearContext(): void {
    console.log('🎯 [CONTEXT] Clearing all context')
    this.contextA = null
    this.contextB = null
    this.goal = null
    this.dialogEntries = []
    this.notifyContextListeners()
  }

  // ==================== ПОДСКАЗКИ ====================

  // Инициализация категорий подсказок
  private initializeCategories(): void {
    const defaultCategories: HintCategory[] = [
      {
        id: 'technical',
        name: 'Техническое',
        description: 'Подсказки по техническим вопросам',
        color: '#3B82F6',
        icon: '🔧',
        priority: 1
      },
      {
        id: 'communication',
        name: 'Коммуникация',
        description: 'Подсказки по улучшению коммуникации',
        color: '#10B981',
        icon: '💬',
        priority: 2
      },
      {
        id: 'experience',
        name: 'Опыт работы',
        description: 'Подсказки по обсуждению опыта',
        color: '#F59E0B',
        icon: '💼',
        priority: 3
      },
      {
        id: 'skills',
        name: 'Навыки',
        description: 'Подсказки по демонстрации навыков',
        color: '#8B5CF6',
        icon: '⚡',
        priority: 4
      },
      {
        id: 'motivation',
        name: 'Мотивация',
        description: 'Подсказки по мотивации и целям',
        color: '#EF4444',
        icon: '🎯',
        priority: 5
      },
      {
        id: 'teamwork',
        name: 'Командная работа',
        description: 'Подсказки по работе в команде',
        color: '#06B6D4',
        icon: '👥',
        priority: 6
      },
      {
        id: 'company',
        name: 'О компании',
        description: 'Подсказки по вопросам о компании',
        color: '#84CC16',
        icon: '🏢',
        priority: 7
      }
    ]

    defaultCategories.forEach(category => {
      this.categories.set(category.id, category)
    })
  }

  // Генерация подсказок на основе контекста
  async generateHints(context: FullContext): Promise<Hint[]> {
    console.log('💡 [HINTS] Generating hints for context:', context.sessionId)
    
    try {
      // Используем существующий метод generateHints из LLMAgent
      const allHints = await this.llmAgent.generateHints([], context)
      
      // Сохраняем подсказки
      allHints.forEach(hint => {
        this.generatedHints.set(hint.id, hint)
      })
      
      // Уведомляем слушателей
      this.notifyHintListeners(allHints)
      
      console.log('💡 [HINTS] Generated', allHints.length, 'hints')
      return allHints
      
    } catch (error) {
      console.error('💡 [HINTS] Error generating hints:', error)
      return []
    }
  }

  // Получение всех подсказок
  getHints(): Hint[] {
    return Array.from(this.generatedHints.values())
      .filter(hint => !hint.isDismissed)
      .sort((a, b) => b.confidence - a.confidence)
  }

  // Получение всех категорий
  getCategories(): HintCategory[] {
    return Array.from(this.categories.values())
  }

  // Получение полного контекста (для совместимости)
  getContext(): FullContext | null {
    return this.getFullContext()
  }

  // Сохранение контекста (для совместимости)
  saveContext(context: FullContext): void {
    if (context.contextA) {
      this.contextA = context.contextA
    }
    if (context.contextB) {
      this.contextB = context.contextB
    }
    if (context.goal) {
      this.goal = context.goal
    }
    if (context.dialogEntries) {
      this.dialogEntries = context.dialogEntries
    }
    this.sessionId = context.sessionId
    console.log('🎯 [CONTEXT] Context saved successfully')
  }

  // ==================== ИСТОРИЯ ПОИСКА ====================

  // Добавление в историю поиска
  async addToHistory(searchQuery: SearchQuery): Promise<void> {
    try {
      this.searchHistory.push(searchQuery)
      
      // Ограничиваем размер истории
      if (this.searchHistory.length > 100) {
        this.searchHistory = this.searchHistory.slice(-100)
      }
      
      console.log('🔍 [SEARCH] Added to history:', searchQuery.text)
    } catch (error) {
      console.error('🔍 [SEARCH] Error adding to history:', error)
    }
  }

  // Получение истории поиска
  async getSearchHistory(): Promise<SearchQuery[]> {
    try {
      return [...this.searchHistory]
    } catch (error) {
      console.error('🔍 [SEARCH] Error getting search history:', error)
      return []
    }
  }

  // Очистка истории поиска
  async clearSearchHistory(): Promise<void> {
    try {
      this.searchHistory = []
      console.log('🔍 [SEARCH] Search history cleared')
    } catch (error) {
      console.error('🔍 [SEARCH] Error clearing search history:', error)
    }
  }

  // Отметка подсказки как прочитанной
  markHintAsRead(hintId: string): void {
    const hint = this.generatedHints.get(hintId)
    if (hint) {
      hint.isRead = true
      this.generatedHints.set(hintId, hint)
    }
  }

  // Отметка подсказки как отклоненной
  dismissHint(hintId: string): void {
    const hint = this.generatedHints.get(hintId)
    if (hint) {
      hint.isDismissed = true
      this.generatedHints.set(hintId, hint)
    }
  }

  // Подписка на изменения подсказок
  onHintsChange(listener: (hints: Hint[]) => void): () => void {
    this.hintListeners.push(listener)
    
    return () => {
      const index = this.hintListeners.indexOf(listener)
      if (index > -1) {
        this.hintListeners.splice(index, 1)
      }
    }
  }

  // Очистка подсказок
  clearHints(): void {
    console.log('💡 [HINTS] Clearing all hints')
    this.generatedHints.clear()
    this.notifyHintListeners([])
  }

  // ==================== ПОИСК ====================

  // Выполнение поиска по фразе
  async searchPhrase(query: string, context: FullContext, filters?: Partial<SearchFilters>): Promise<SearchResult> {
    console.log('🔍 [SEARCH] Searching for phrase:', query)
    
    const searchQuery: SearchQuery = {
      id: this.generateId(),
      text: query,
      context,
      filters: {
        categories: filters?.categories || [],
        timeRange: filters?.timeRange || { start: 0, end: Date.now() },
        priority: filters?.priority || ['low', 'medium', 'high', 'critical'],
        sources: filters?.sources || ['llm', 'rule', 'pattern']
      },
      timestamp: Date.now()
    }

    // Проверка кэша
    const cacheKey = this.generateSearchCacheKey(searchQuery)
    const cached = this.searchCache.get(cacheKey)
    if (cached) {
      console.log('🔍 [SEARCH] Using cached search result')
      return cached
    }

    try {
      const startTime = Date.now()
      
      // Выполняем поиск через LLM
      const searchResult = await this.performSearch(searchQuery)
      
      const processingTime = Date.now() - startTime
      searchResult.processingTime = processingTime
      
      // Сохраняем в кэш
      this.searchCache.set(cacheKey, searchResult)
      
      // Добавляем в историю
      this.searchHistory.unshift(searchQuery)
      if (this.searchHistory.length > 50) {
        this.searchHistory = this.searchHistory.slice(0, 50)
      }
      
      // Уведомляем слушателей
      this.notifySearchListeners(searchResult)
      
      console.log('🔍 [SEARCH] Search completed in', processingTime, 'ms')
      return searchResult
      
    } catch (error) {
      console.error('🔍 [SEARCH] Error performing search:', error)
      throw error
    }
  }

  // Расширенный поиск с дополнительными параметрами
  async expandSearch(query: string, context: FullContext, filters?: Partial<SearchFilters>): Promise<SearchResult> {
    console.log('🔍 [SEARCH] Expanding search for:', query)
    
    const searchQuery: SearchQuery = {
      id: this.generateId(),
      text: query,
      context,
      filters: {
        categories: filters?.categories || [],
        timeRange: filters?.timeRange || { start: 0, end: Date.now() },
        priority: filters?.priority || ['low', 'medium', 'high', 'critical'],
        sources: filters?.sources || ['llm', 'rule', 'pattern']
      },
      timestamp: Date.now()
    }

    // Проверка кэша
    const cacheKey = this.generateSearchCacheKey(searchQuery)
    const cached = this.searchCache.get(cacheKey)
    if (cached) {
      console.log('🔍 [SEARCH] Using cached expanded search result')
      return cached
    }

    try {
      const startTime = Date.now()
      
      // Выполняем расширенный поиск через LLM с дополнительными параметрами
      const searchResult = await this.performExpandedSearch(searchQuery)
      
      const processingTime = Date.now() - startTime
      searchResult.processingTime = processingTime
      
      // Сохраняем в кэш
      this.searchCache.set(cacheKey, searchResult)
      
      // Добавляем в историю
      this.searchHistory.unshift(searchQuery)
      if (this.searchHistory.length > 50) {
        this.searchHistory = this.searchHistory.slice(0, 50)
      }
      
      // Уведомляем слушателей
      this.notifySearchListeners(searchResult)
      
      console.log('🔍 [SEARCH] Expanded search completed in', processingTime, 'ms')
      return searchResult
      
    } catch (error) {
      console.error('🔍 [SEARCH] Error performing expanded search:', error)
      throw error
    }
  }

  // Выполнение поиска через LLM
  private async performSearch(searchQuery: SearchQuery): Promise<SearchResult> {
    try {
      // Используем существующий метод generateHints из LLMAgent
      const hints = await this.llmAgent.generateHints([], searchQuery.context!)
      
      // Преобразуем подсказки в результаты поиска
      const results: SearchResultItem[] = hints.map((hint, index) => ({
        id: this.generateId(),
        title: `Подсказка ${index + 1}`,
        content: hint.text,
        type: 'hint' as const,
        source: hint.source,
        relevance: hint.confidence,
        timestamp: hint.timestamp,
        metadata: {
          query: searchQuery.text,
          category: hint.category.id,
          hintId: hint.id
        }
      }))
      
      return {
        id: this.generateId(),
        query: searchQuery.text,
        results,
        totalCount: results.length,
        processingTime: 0,
        timestamp: Date.now()
      }
      
    } catch (error) {
      console.error('🔍 [SEARCH] Error performing search:', error)
      return {
        id: this.generateId(),
        query: searchQuery.text,
        results: [],
        totalCount: 0,
        processingTime: 0,
        timestamp: Date.now()
      }
    }
  }

  // Выполнение расширенного поиска через LLM
  private async performExpandedSearch(searchQuery: SearchQuery): Promise<SearchResult> {
    try {
      // Используем существующий метод generateHints из LLMAgent с расширенными параметрами
      const hints = await this.llmAgent.generateHints([], searchQuery.context!)
      
      // Преобразуем подсказки в результаты поиска с дополнительной обработкой
      const results: SearchResultItem[] = hints.map((hint, index) => ({
        id: this.generateId(),
        title: `Расширенная подсказка ${index + 1}`,
        content: hint.text,
        type: 'hint' as const,
        source: hint.source,
        relevance: hint.confidence,
        timestamp: hint.timestamp,
        metadata: {
          query: searchQuery.text,
          category: hint.category.id,
          hintId: hint.id,
          expanded: true
        }
      }))
      
      return {
        id: this.generateId(),
        query: searchQuery.text,
        results,
        totalCount: results.length,
        processingTime: 0,
        timestamp: Date.now()
      }
      
    } catch (error) {
      console.error('🔍 [SEARCH] Error performing expanded search:', error)
      return {
        id: this.generateId(),
        query: searchQuery.text,
        results: [],
        totalCount: 0,
        processingTime: 0,
        timestamp: Date.now()
      }
    }
  }

  // Подписка на результаты поиска
  onSearchResult(listener: (result: SearchResult) => void): () => void {
    this.searchListeners.push(listener)
    
    return () => {
      const index = this.searchListeners.indexOf(listener)
      if (index > -1) {
        this.searchListeners.splice(index, 1)
      }
    }
  }

  // ==================== ОБЩИЕ МЕТОДЫ ====================

  // Подписка на изменения контекста
  onContextChange(listener: (context: FullContext | null) => void): () => void {
    this.listeners.push(listener)
    
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Уведомление слушателей контекста
  private notifyContextListeners(): void {
    const context = this.getFullContext()
    this.listeners.forEach(listener => {
      try {
        listener(context)
      } catch (error) {
        console.error('🎯 [CONTEXT] Error in context listener:', error)
      }
    })
  }

  // Уведомление слушателей подсказок
  private notifyHintListeners(hints: Hint[]): void {
    this.hintListeners.forEach(listener => {
      try {
        listener(hints)
      } catch (error) {
        console.error('💡 [HINTS] Error in hints listener:', error)
      }
    })
  }

  // Уведомление слушателей поиска
  private notifySearchListeners(result: SearchResult): void {
    this.searchListeners.forEach(listener => {
      try {
        listener(result)
      } catch (error) {
        console.error('🔍 [SEARCH] Error in search result listener:', error)
      }
    })
  }

  // Очистка всех данных
  clearAll(): void {
    this.clearContext()
    this.clearHints()
    this.clearSearchHistory()
    this.searchCache.clear()
  }

  // Генерация ID
  private generateId(): string {
    return `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Генерация ID сессии
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Генерация ключа кэша поиска
  private generateSearchCacheKey(query: SearchQuery): string {
    return `search_${query.text}_${query.context?.sessionId || 'no-context'}_${JSON.stringify(query.filters)}`
  }
}

// Экспорт для использования в других модулях
export { ContextService }
