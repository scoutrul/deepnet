// LLM Agent Service - Интеграция с LLM для генерации подсказок
import type { 
  FullContext, 
  DialogEntry, 
  Hint, 
  SearchResult, 
  DialogSummary,
  LLMRequest,
  LLMResponse,
} from '../../types/context'

class LLMAgent {
  private apiKey: string
  private baseUrl: string
  private model: string
  private cache: Map<string, { response: any, timestamp: number, ttl: number }> = new Map()
  private requestQueue: Array<{ request: LLMRequest, resolve: Function, reject: Function }> = []
  private isProcessing: boolean = false
  private rateLimitDelay: number = 1000 // 1 секунда между запросами

  constructor(config: {
    apiKey: string
    baseUrl?: string
    model?: string
  }) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://api.openrouter.ai/v1'
    this.model = config.model || 'anthropic/claude-3.5-sonnet'
    
    console.log('🤖 [LLM] LLMAgent initialized with model:', this.model)
  }

  // Генерация подсказок на основе диалога и контекста
  async generateHints(dialog: DialogEntry[], context: FullContext): Promise<Hint[]> {
    console.log('🤖 [LLM] Generating hints for dialog with', dialog.length, 'entries')
    
    const cacheKey = this.generateCacheKey('hints', { dialog, context })
    const cached = this.getCachedResponse(cacheKey)
    if (cached) {
      console.log('🤖 [LLM] Using cached hints')
      return cached
    }

    try {
      const prompt = this.buildHintPrompt(dialog, context)
      const response = await this.makeRequest({
        id: this.generateId(),
        type: 'hint',
        prompt,
        context,
        options: {
          model: this.model,
          temperature: 0.7,
          maxTokens: 1000,
          topP: 0.9,
          frequencyPenalty: 0.1,
          presencePenalty: 0.1
        },
        timestamp: Date.now()
      })

      const hints = this.parseHintResponse(response.content, context)
      this.setCachedResponse(cacheKey, hints, 300000) // 5 минут кэш
      
      console.log('🤖 [LLM] Generated', hints.length, 'hints')
      return hints
    } catch (error) {
      console.error('🤖 [LLM] Error generating hints:', error)
      return []
    }
  }

  // Углубленный поиск по фразе
  async deepSearch(query: string, context: FullContext): Promise<SearchResult> {
    console.log('🤖 [LLM] Deep search for query:', query)
    
    const cacheKey = this.generateCacheKey('search', { query, context })
    const cached = this.getCachedResponse(cacheKey)
    if (cached) {
      console.log('🤖 [LLM] Using cached search results')
      return cached
    }

    try {
      const prompt = this.buildSearchPrompt(query, context)
      const response = await this.makeRequest({
        id: this.generateId(),
        type: 'search',
        prompt,
        context,
        options: {
          model: this.model,
          temperature: 0.5,
          maxTokens: 1500,
          topP: 0.8,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0
        },
        timestamp: Date.now()
      })

      const searchResult = this.parseSearchResponse(response.content, query, context)
      this.setCachedResponse(cacheKey, searchResult, 600000) // 10 минут кэш
      
      console.log('🤖 [LLM] Search completed with', searchResult.results.length, 'results')
      return searchResult
    } catch (error) {
      console.error('🤖 [LLM] Error in deep search:', error)
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

  // Суммаризация диалога
  async summarizeDialog(dialog: DialogEntry[]): Promise<DialogSummary> {
    console.log('🤖 [LLM] Summarizing dialog with', dialog.length, 'entries')
    
    const cacheKey = this.generateCacheKey('summary', { dialog })
    const cached = this.getCachedResponse(cacheKey)
    if (cached) {
      console.log('🤖 [LLM] Using cached summary')
      return cached
    }

    try {
      const prompt = this.buildSummaryPrompt(dialog)
      const response = await this.makeRequest({
        id: this.generateId(),
        type: 'summary',
        prompt,
        context: null as any, // Summary doesn't need context
        options: {
          model: this.model,
          temperature: 0.3,
          maxTokens: 800,
          topP: 0.7,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0
        },
        timestamp: Date.now()
      })

      const summary = this.parseSummaryResponse(response.content, dialog)
      this.setCachedResponse(cacheKey, summary, 1800000) // 30 минут кэш
      
      console.log('🤖 [LLM] Dialog summarized successfully')
      return summary
    } catch (error) {
      console.error('🤖 [LLM] Error summarizing dialog:', error)
      return {
        id: this.generateId(),
        sessionId: '',
        topics: [],
        keyPoints: [],
        summary: 'Ошибка при создании резюме диалога',
        sentiment: 'neutral',
        duration: 0,
        wordCount: 0,
        createdAt: Date.now()
      }
    }
  }

  // Анализ контекста
  async analyzeContext(context: FullContext): Promise<{
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    recommendations: string[]
  }> {
    console.log('🤖 [LLM] Analyzing context')
    
    const cacheKey = this.generateCacheKey('analysis', { context })
    const cached = this.getCachedResponse(cacheKey)
    if (cached) {
      console.log('🤖 [LLM] Using cached analysis')
      return cached
    }

    try {
      const prompt = this.buildAnalysisPrompt(context)
      const response = await this.makeRequest({
        id: this.generateId(),
        type: 'analysis',
        prompt,
        context,
        options: {
          model: this.model,
          temperature: 0.6,
          maxTokens: 1200,
          topP: 0.8,
          frequencyPenalty: 0.1,
          presencePenalty: 0.1
        },
        timestamp: Date.now()
      })

      const analysis = this.parseAnalysisResponse(response.content)
      this.setCachedResponse(cacheKey, analysis, 600000) // 10 минут кэш
      
      console.log('🤖 [LLM] Context analysis completed')
      return analysis
    } catch (error) {
      console.error('🤖 [LLM] Error analyzing context:', error)
      return {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        recommendations: []
      }
    }
  }

  // Выполнение запроса к LLM
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject })
      this.processQueue()
    })
  }

  // Обработка очереди запросов
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      const { request, resolve, reject } = this.requestQueue.shift()!
      
      try {
        const response = await this.executeRequest(request)
        resolve(response)
      } catch (error) {
        reject(error)
      }

      // Задержка между запросами для соблюдения rate limit
      if (this.requestQueue.length > 0) {
        await this.delay(this.rateLimitDelay)
      }
    }

    this.isProcessing = false
  }

  // Выполнение HTTP запроса
  private async executeRequest(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now()
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'DeepNet Context System'
      },
      body: JSON.stringify({
        model: request.options.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(request.type)
          },
          {
            role: 'user',
            content: request.prompt
          }
        ],
        temperature: request.options.temperature,
        max_tokens: request.options.maxTokens,
        top_p: request.options.topP,
        frequency_penalty: request.options.frequencyPenalty,
        presence_penalty: request.options.presencePenalty
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const processingTime = Date.now() - startTime

    return {
      id: this.generateId(),
      requestId: request.id,
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      model: data.model,
      timestamp: Date.now(),
      processingTime
    }
  }

  // Получение системного промпта
  private getSystemPrompt(type: string): string {
    const basePrompt = `Вы - экспертный помощник для проведения эффективных коммуникаций. 
Ваша задача - анализировать диалоги и предоставлять контекстные подсказки для максимальной эффективности общения.

Контекст:
- Сторона A: Пользователь системы
- Сторона B: Собеседник
- Цель: Успешная коммуникация

Отвечайте на русском языке. Будьте конкретными и практичными в своих рекомендациях.`

    switch (type) {
      case 'hint':
        return basePrompt + '\n\nГенерируйте подсказки для улучшения коммуникации. Каждая подсказка должна быть краткой, конкретной и полезной.'
      case 'search':
        return basePrompt + '\n\nПредоставляйте детальные ответы на вопросы, основанные на контексте диалога.'
      case 'summary':
        return basePrompt + '\n\nСоздавайте краткие и информативные резюме диалогов.'
      case 'analysis':
        return basePrompt + '\n\nАнализируйте контекст и предоставляйте SWOT-анализ с рекомендациями.'
      default:
        return basePrompt
    }
  }

  // Построение промпта для подсказок
  private buildHintPrompt(dialog: DialogEntry[], context: FullContext): string {
    const dialogText = dialog.map(entry => 
      `${entry.speaker}: ${entry.text}`
    ).join('\n')

    return `Контекст коммуникации:
Сторона A (${context.contextA.name}): ${context.contextA.role} - ${context.contextA.background}
Сторона B (${context.contextB.name}): ${context.contextB.role} в ${context.contextB.company}
Цель: ${context.goal.description}

Диалог:
${dialogText}

Проанализируйте диалог и предоставьте 3-5 конкретных подсказок для улучшения коммуникации. Каждая подсказка должна быть в формате:
- Категория: [категория]
- Текст: [текст подсказки]
- Приоритет: [низкий/средний/высокий/критический]`
  }

  // Построение промпта для поиска
  private buildSearchPrompt(query: string, context: FullContext): string {
    return `Контекст коммуникации:
Сторона A (${context.contextA.name}): ${context.contextA.role} - ${context.contextA.background}
Сторона B (${context.contextB.name}): ${context.contextB.role} в ${context.contextB.company}
Цель: ${context.goal.description}

Вопрос: ${query}

Предоставьте детальный ответ на вопрос, учитывая контекст коммуникации. Ответ должен быть практичным и полезным.`
  }

  // Построение промпта для суммаризации
  private buildSummaryPrompt(dialog: DialogEntry[]): string {
    const dialogText = dialog.map(entry => 
      `${entry.speaker}: ${entry.text}`
    ).join('\n')

    return `Проанализируйте следующий диалог и создайте краткое резюме:

${dialogText}

Резюме должно включать:
- Ключевые темы обсуждения
- Основные моменты
- Общий тон диалога
- Рекомендации для дальнейшего общения`
  }

  // Построение промпта для анализа
  private buildAnalysisPrompt(context: FullContext): string {
    return `Проанализируйте контекст коммуникации и предоставьте SWOT-анализ:

Контекст:
Сторона A: ${context.contextA.name} - ${context.contextA.role}
Фон: ${context.contextA.background}
Навыки: ${context.contextA.skills.join(', ')}
Цели: ${context.contextA.goals.join(', ')}

Сторона B: ${context.contextB.name} - ${context.contextB.role}
Компания: ${context.contextB.company}
Требования: ${context.contextB.requirements.join(', ')}
Ожидания: ${context.contextB.expectations.join(', ')}

Цель коммуникации: ${context.goal.description}
Критерии успеха: ${context.goal.successCriteria.join(', ')}

Предоставьте анализ в формате:
- Сильные стороны: [список]
- Слабые стороны: [список]
- Возможности: [список]
- Рекомендации: [список]`
  }

  // Парсинг ответа с подсказками
  private parseHintResponse(content: string, context: FullContext): Hint[] {
    const hints: Hint[] = []
    const lines = content.split('\n').filter(line => line.trim())
    
    let currentHint: Partial<Hint> = {}
    
    for (const line of lines) {
      if (line.includes('Категория:')) {
        if (currentHint.text) {
          hints.push(this.createHint(currentHint, context))
        }
        currentHint = {
          category: this.parseCategory(line)
        }
      } else if (line.includes('Текст:')) {
        currentHint.text = line.replace('Текст:', '').trim()
      } else if (line.includes('Приоритет:')) {
        currentHint.priority = this.parsePriority(line)
      }
    }
    
    if (currentHint.text) {
      hints.push(this.createHint(currentHint, context))
    }
    
    return hints
  }

  // Парсинг ответа с результатами поиска
  private parseSearchResponse(content: string, query: string, context: FullContext): SearchResult {
    return {
      id: this.generateId(),
      query,
      results: [{
        id: this.generateId(),
        type: 'hint',
        title: 'Ответ на вопрос',
        content: content,
        relevance: 1.0,
        source: 'llm',
        timestamp: Date.now(),
        metadata: { query, context: context.sessionId }
      }],
      totalCount: 1,
      processingTime: 0,
      timestamp: Date.now()
    }
  }

  // Парсинг ответа с резюме
  private parseSummaryResponse(content: string, dialog: DialogEntry[]): DialogSummary {
    const wordCount = dialog.reduce((count, entry) => count + entry.text.split(' ').length, 0)
    const duration = dialog.length > 0 ? dialog[dialog.length - 1].timestamp - dialog[0].timestamp : 0
    
    return {
      id: this.generateId(),
      sessionId: '',
      topics: [],
      keyPoints: content.split('\n').filter(line => line.trim()),
      summary: content,
      sentiment: 'neutral',
      duration,
      wordCount,
      createdAt: Date.now()
    }
  }

  // Парсинг ответа с анализом
  private parseAnalysisResponse(content: string): {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    recommendations: string[]
  } {
    const result = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      opportunities: [] as string[],
      recommendations: [] as string[]
    }
    
    const lines = content.split('\n').filter(line => line.trim())
    let currentSection = ''
    
    for (const line of lines) {
      if (line.includes('Сильные стороны:')) {
        currentSection = 'strengths'
      } else if (line.includes('Слабые стороны:')) {
        currentSection = 'weaknesses'
      } else if (line.includes('Возможности:')) {
        currentSection = 'opportunities'
      } else if (line.includes('Рекомендации:')) {
        currentSection = 'recommendations'
      } else if (currentSection && line.trim().startsWith('-')) {
        result[currentSection as keyof typeof result].push(line.replace('-', '').trim())
      }
    }
    
    return result
  }

  // Создание подсказки
  private createHint(hintData: Partial<Hint>, context: FullContext): Hint {
    return {
      id: this.generateId(),
      text: hintData.text || '',
      category: hintData.category || { id: 'general', name: 'Общее', description: '', color: '#6B7280', icon: '💡', priority: 1 },
      priority: hintData.priority || 'medium',
      context: context.sessionId,
      source: 'llm',
      confidence: 0.8,
      timestamp: Date.now(),
      isRead: false,
      isDismissed: false,
      relatedTopics: []
    }
  }

  // Парсинг категории
  private parseCategory(line: string): any {
    const category = line.replace('Категория:', '').trim()
    return {
      id: category.toLowerCase().replace(/\s+/g, '_'),
      name: category,
      description: '',
      color: '#3B82F6',
      icon: '💡',
      priority: 1
    }
  }

  // Парсинг приоритета
  private parsePriority(line: string): 'low' | 'medium' | 'high' | 'critical' {
    const priority = line.replace('Приоритет:', '').trim().toLowerCase()
    if (priority.includes('критический')) return 'critical'
    if (priority.includes('высокий')) return 'high'
    if (priority.includes('низкий')) return 'low'
    return 'medium'
  }

  // Кэширование
  private getCachedResponse(key: string): any {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.response
    }
    if (cached) {
      this.cache.delete(key)
    }
    return null
  }

  private setCachedResponse(key: string, response: any, ttl: number): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl
    })
  }

  private generateCacheKey(type: string, data: any): string {
    return `${type}_${JSON.stringify(data).slice(0, 100)}`
  }

  private generateId(): string {
    return `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Экспорт для использования в других модулях
export { LLMAgent }
