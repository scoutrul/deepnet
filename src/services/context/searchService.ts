// Search Service - Углубленный поиск по фразам
import type { 
  SearchQuery, 
  SearchResult, 
  SearchResultItem, 
  SearchFilters,
  FullContext,
} from '../../types/context'
import { LLMAgent } from './llmAgent'
// Импорт будет добавлен после инициализации

class SearchService {
  private llmAgent: LLMAgent
  private searchHistory: SearchQuery[] = []
  private searchCache: Map<string, SearchResult> = new Map()
  private listeners: Array<(result: SearchResult) => void> = []

  constructor(llmAgent: LLMAgent) {
    this.llmAgent = llmAgent
    console.log('🔍 [SEARCH] SearchService initialized')
  }

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
    const cacheKey = this.generateCacheKey(searchQuery)
    const cached = this.searchCache.get(cacheKey)
    if (cached) {
      console.log('🔍 [SEARCH] Using cached search result')
      return cached
    }

    try {
      const startTime = Date.now()
      
      // Поиск в диалоге
      const dialogResults = await this.searchInDialog(query, context, searchQuery.filters)
      
      // Поиск через LLM
      const llmResults = await this.searchWithLLM(query, context)
      
      // Поиск в подсказках
      const hintResults = await this.searchInHints(query, context, searchQuery.filters)
      
      // Объединение и ранжирование результатов
      const allResults = [...dialogResults, ...llmResults, ...hintResults]
      const rankedResults = this.rankSearchResults(allResults, query, context)
      
      const searchResult: SearchResult = {
        id: this.generateId(),
        query,
        results: rankedResults,
        totalCount: rankedResults.length,
        processingTime: Date.now() - startTime,
        timestamp: Date.now()
      }

      // Сохранение в кэш
      this.searchCache.set(cacheKey, searchResult)
      
      // Сохранение в историю
      this.searchHistory.push(searchQuery)
      
      console.log('🔍 [SEARCH] Search completed with', rankedResults.length, 'results')
      this.notifyListeners(searchResult)
      
      return searchResult
    } catch (error) {
      console.error('🔍 [SEARCH] Error in search:', error)
      return {
        id: this.generateId(),
        query,
        results: [],
        totalCount: 0,
        processingTime: 0,
        timestamp: Date.now()
      }
    }
  }

  // Поиск в диалоге
  private async searchInDialog(query: string, context: FullContext, filters: SearchFilters): Promise<SearchResultItem[]> {
    // Получаем диалог через контекст или другим способом
    const dialogEntries = context.dialogEntries || []
    const results: SearchResultItem[] = []
    
    const queryWords = query.toLowerCase().split(/\s+/)
    
    dialogEntries.forEach(entry => {
      // Проверка временного фильтра
      if (entry.timestamp < filters.timeRange.start || entry.timestamp > filters.timeRange.end) {
        return
      }
      
      // Проверка приоритета
      if (!filters.priority.includes(entry.importance)) {
        return
      }
      
      const entryText = entry.text.toLowerCase()
      const relevance = this.calculateRelevance(queryWords, entryText, entry.keywords)
      
      if (relevance > 0.3) { // Минимальная релевантность
        results.push({
          id: this.generateId(),
          type: 'dialog',
          title: `Диалог: ${entry.speaker}`,
          content: entry.text,
          relevance,
          source: 'dialog',
          timestamp: entry.timestamp,
          metadata: {
            speaker: entry.speaker,
            topics: entry.topics,
            keywords: entry.keywords,
            importance: entry.importance
          }
        })
      }
    })
    
    return results
  }

  // Поиск через LLM
  private async searchWithLLM(query: string, context: FullContext): Promise<SearchResultItem[]> {
    try {
      const llmResult = await this.llmAgent.deepSearch(query, context)
      
      return llmResult.results.map(result => ({
        ...result,
        id: this.generateId(),
        type: 'hint' as const,
        source: 'llm',
        timestamp: Date.now(),
        metadata: {
          ...result.metadata,
          query,
          context: context.sessionId
        }
      }))
    } catch (error) {
      console.error('🔍 [SEARCH] Error in LLM search:', error)
      return []
    }
  }

  // Поиск в подсказках
  private async searchInHints(_query: string, _context: FullContext, _filters: SearchFilters): Promise<SearchResultItem[]> {
    // Здесь можно добавить поиск в существующих подсказках
    // Пока возвращаем пустой массив
    return []
  }

  // Расчет релевантности
  private calculateRelevance(queryWords: string[], text: string, keywords: string[]): number {
    let relevance = 0
    
    // Точное совпадение слов
    queryWords.forEach(word => {
      if (text.includes(word)) {
        relevance += 0.3
      }
    })
    
    // Совпадение с ключевыми словами
    queryWords.forEach(word => {
      keywords.forEach(keyword => {
        if (keyword.includes(word) || word.includes(keyword)) {
          relevance += 0.2
        }
      })
    })
    
    // Частичное совпадение
    queryWords.forEach(word => {
      const wordVariations = this.generateWordVariations(word)
      wordVariations.forEach(variation => {
        if (text.includes(variation)) {
          relevance += 0.1
        }
      })
    })
    
    return Math.min(relevance, 1.0)
  }

  // Генерация вариаций слов
  private generateWordVariations(word: string): string[] {
    const variations = [word]
    
    // Добавление окончаний
    if (word.endsWith('а')) {
      variations.push(word.slice(0, -1) + 'ы')
      variations.push(word.slice(0, -1) + 'е')
    }
    
    // Удаление окончаний
    if (word.length > 4) {
      variations.push(word.slice(0, -1))
      variations.push(word.slice(0, -2))
    }
    
    return variations
  }

  // Ранжирование результатов поиска
  private rankSearchResults(results: SearchResultItem[], query: string, context: FullContext): SearchResultItem[] {
    return results
      .map(result => ({
        ...result,
        relevance: this.calculateFinalRelevance(result, query, context)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 20) // Максимум 20 результатов
  }

  // Расчет финальной релевантности
  private calculateFinalRelevance(result: SearchResultItem, _query: string, _context: FullContext): number {
    let relevance = result.relevance
    
    // Бонус за тип результата
    const typeBonus = {
      'hint': 0.2,
      'dialog': 0.1,
      'summary': 0.15,
      'context': 0.3
    }
    relevance += typeBonus[result.type] || 0
    
    // Бонус за источник
    const sourceBonus: Record<string, number> = {
      'llm': 0.3,
      'rule': 0.1,
      'pattern': 0.05,
      'dialog': 0.0
    }
    relevance += sourceBonus[result.source] || 0
    
    // Бонус за свежесть
    const age = Date.now() - result.timestamp
    const freshnessBonus = Math.max(0, 1 - (age / (24 * 60 * 60 * 1000))) * 0.1
    relevance += freshnessBonus
    
    return Math.min(relevance, 1.0)
  }

  // Получение контекстного ответа
  async getContextualAnswer(query: string, context: FullContext): Promise<string> {
    console.log('🔍 [SEARCH] Getting contextual answer for:', query)
    
    try {
      const searchResult = await this.searchPhrase(query, context)
      
      if (searchResult.results.length === 0) {
        return 'Извините, не удалось найти релевантную информацию по вашему запросу.'
      }
      
      // Использование LLM для генерации контекстного ответа

      const llmResponse = await this.llmAgent.deepSearch(query, context)
      
      return llmResponse.results[0]?.content || 'Ответ не найден'
    } catch (error) {
      console.error('🔍 [SEARCH] Error getting contextual answer:', error)
      return 'Произошла ошибка при поиске ответа. Попробуйте переформулировать вопрос.'
    }
  }


  // Расширенный поиск
  async expandSearch(originalQuery: string, context: FullContext): Promise<SearchResult> {
    console.log('🔍 [SEARCH] Expanding search for:', originalQuery)
    
    // Генерация связанных запросов
    const relatedQueries = this.generateRelatedQueries(originalQuery, context)
    
    // Выполнение поиска по каждому связанному запросу
    const allResults: SearchResultItem[] = []
    
    for (const query of relatedQueries) {
      try {
        const result = await this.searchPhrase(query, context)
        allResults.push(...result.results)
      } catch (error) {
        console.error('🔍 [SEARCH] Error in expanded search:', error)
      }
    }
    
    // Объединение и дедупликация результатов
    const uniqueResults = this.deduplicateResults(allResults)
    const rankedResults = this.rankSearchResults(uniqueResults, originalQuery, context)
    
    return {
      id: this.generateId(),
      query: originalQuery,
      results: rankedResults,
      totalCount: rankedResults.length,
      processingTime: 0,
      timestamp: Date.now()
    }
  }

  // Генерация связанных запросов
  private generateRelatedQueries(originalQuery: string, context: FullContext): string[] {
    const queries = [originalQuery]
    
    // Добавление контекстных запросов
    if (context.contextA.skills.length > 0) {
      queries.push(`${originalQuery} ${context.contextA.skills[0]}`)
    }
    
    if (context.contextB.requirements.length > 0) {
      queries.push(`${originalQuery} ${context.contextB.requirements[0]}`)
    }
    
    // Добавление синонимов
    const synonyms = this.getSynonyms(originalQuery)
    synonyms.forEach(synonym => {
      queries.push(synonym)
    })
    
    return queries.slice(0, 5) // Максимум 5 запросов
  }

  // Получение синонимов
  private getSynonyms(word: string): string[] {
    const synonymMap: Record<string, string[]> = {
      'опыт': ['стаж', 'практика', 'работа'],
      'навыки': ['умения', 'компетенции', 'способности'],
      'проект': ['задача', 'работа', 'деятельность'],
      'команда': ['коллектив', 'группа', 'сотрудники'],
      'разработка': ['создание', 'программирование', 'кодирование']
    }
    
    return synonymMap[word.toLowerCase()] || []
  }

  // Дедупликация результатов
  private deduplicateResults(results: SearchResultItem[]): SearchResultItem[] {
    const seen = new Set<string>()
    return results.filter(result => {
      const key = result.content.toLowerCase().trim()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  // Получение истории поиска
  getSearchHistory(): SearchQuery[] {
    return [...this.searchHistory].reverse() // Последние запросы первыми
  }

  // Очистка истории поиска
  clearSearchHistory(): void {
    console.log('🔍 [SEARCH] Clearing search history')
    this.searchHistory = []
  }

  // Очистка кэша поиска
  clearSearchCache(): void {
    console.log('🔍 [SEARCH] Clearing search cache')
    this.searchCache.clear()
  }

  // Подписка на результаты поиска
  onSearchResult(listener: (result: SearchResult) => void): () => void {
    this.listeners.push(listener)
    
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Уведомление слушателей
  private notifyListeners(result: SearchResult): void {
    this.listeners.forEach(listener => {
      try {
        listener(result)
      } catch (error) {
        console.error('🔍 [SEARCH] Error in search result listener:', error)
      }
    })
  }

  // Генерация ключа кэша
  private generateCacheKey(query: SearchQuery): string {
    return `search_${query.text}_${query.context.sessionId}_${JSON.stringify(query.filters)}`
  }

  // Генерация ID
  private generateId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Экспорт для использования в других модулях
export { SearchService }
