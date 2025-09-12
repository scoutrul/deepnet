// Hint Generator - Генерация подсказок по тематикам
import type { 
  DialogEntry, 
  Hint, 
  HintCategory, 
  FullContext 
} from '../../types/context'
import { LLMAgent } from './llmAgent'

class HintGenerator {
  private llmAgent: LLMAgent
  private categories: Map<string, HintCategory> = new Map()
  private generatedHints: Map<string, Hint> = new Map()
  private listeners: Array<(hints: Hint[]) => void> = []

  constructor(llmAgent: LLMAgent) {
    this.llmAgent = llmAgent
    this.initializeCategories()
    console.log('💡 [HINTS] HintGenerator initialized')
  }

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
        description: 'Подсказки по навыкам и компетенциям',
        color: '#8B5CF6',
        icon: '🎯',
        priority: 4
      },
      {
        id: 'motivation',
        name: 'Мотивация',
        description: 'Подсказки по мотивации и целям',
        color: '#EF4444',
        icon: '🚀',
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
      },
      {
        id: 'general',
        name: 'Общее',
        description: 'Общие подсказки',
        color: '#6B7280',
        icon: '💡',
        priority: 8
      }
    ]

    defaultCategories.forEach(category => {
      this.categories.set(category.id, category)
    })
  }

  // Генерация подсказок на основе диалога
  async generateHints(dialog: DialogEntry[], context: FullContext): Promise<Hint[]> {
    console.log('💡 [HINTS] Generating hints for', dialog.length, 'dialog entries')
    
    try {
      // Анализ тем диалога
      const topics = this.analyzeDialogTopics(dialog)
      
      // Генерация подсказок для каждой темы
      const hints: Hint[] = []
      
      for (const topic of topics) {
        const topicHints = await this.generateTopicHints(topic, dialog, context)
        hints.push(...topicHints)
      }
      
      // Генерация общих подсказок
      const generalHints = await this.generateGeneralHints(dialog, context)
      hints.push(...generalHints)
      
      // Фильтрация и ранжирование подсказок
      const filteredHints = this.filterAndRankHints(hints, context)
      
      // Сохранение подсказок
      filteredHints.forEach(hint => {
        this.generatedHints.set(hint.id, hint)
      })
      
      console.log('💡 [HINTS] Generated', filteredHints.length, 'hints')
      this.notifyListeners(filteredHints)
      
      return filteredHints
    } catch (error) {
      console.error('💡 [HINTS] Error generating hints:', error)
      return []
    }
  }

  // Анализ тем диалога
  private analyzeDialogTopics(dialog: DialogEntry[]): string[] {
    const topicCount = new Map<string, number>()
    
    dialog.forEach(entry => {
      entry.topics.forEach(topic => {
        topicCount.set(topic, (topicCount.get(topic) || 0) + 1)
      })
    })
    
    return Array.from(topicCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Топ-5 тем
      .map(([topic]) => topic)
  }

  // Генерация подсказок для конкретной темы
  private async generateTopicHints(topic: string, dialog: DialogEntry[], context: FullContext): Promise<Hint[]> {
    const category = this.getCategoryForTopic(topic)
    const relevantEntries = dialog.filter(entry => entry.topics.includes(topic))
    
    if (relevantEntries.length === 0) {
      return []
    }
    
    try {
      const llmHints = await this.llmAgent.generateHints(relevantEntries, context)
      
      return llmHints.map(hint => ({
        ...hint,
        category: category,
        relatedTopics: [topic]
      }))
    } catch (error) {
      console.error('💡 [HINTS] Error generating topic hints:', error)
      return this.generateFallbackHints(topic, category, context)
    }
  }

  // Генерация общих подсказок
  private async generateGeneralHints(dialog: DialogEntry[], context: FullContext): Promise<Hint[]> {
    try {
      const llmHints = await this.llmAgent.generateHints(dialog, context)
      
      return llmHints.map(hint => ({
        ...hint,
        category: this.categories.get('general')!,
        relatedTopics: []
      }))
    } catch (error) {
      console.error('💡 [HINTS] Error generating general hints:', error)
      return this.generateFallbackGeneralHints(context)
    }
  }

  // Получение категории для темы
  private getCategoryForTopic(topic: string): HintCategory {
    const topicMap: Record<string, string> = {
      'Техническое': 'technical',
      'Опыт работы': 'experience',
      'Навыки': 'skills',
      'Мотивация': 'motivation',
      'Командная работа': 'teamwork',
      'О компании': 'company',
      'Коммуникация': 'communication'
    }
    
    const categoryId = topicMap[topic] || 'general'
    return this.categories.get(categoryId) || this.categories.get('general')!
  }

  // Генерация резервных подсказок
  private generateFallbackHints(topic: string, category: HintCategory, context: FullContext): Hint[] {
    const fallbackHints: Record<string, string[]> = {
      'Техническое': [
        'Подготовьте конкретные примеры вашего технического опыта',
        'Объясните сложные концепции простыми словами',
        'Покажите, как вы решали технические проблемы'
      ],
      'Опыт работы': [
        'Используйте метод STAR (Ситуация, Задача, Действие, Результат)',
        'Приводите конкретные примеры достижений',
        'Связывайте опыт с требованиями позиции'
      ],
      'Навыки': [
        'Демонстрируйте навыки на конкретных примерах',
        'Покажите, как вы развивали свои навыки',
        'Объясните, как навыки помогут в работе'
      ],
      'Мотивация': [
        'Объясните, почему вас интересует эта позиция',
        'Покажите, как ваши цели совпадают с целями компании',
        'Расскажите о ваших карьерных планах'
      ],
      'Командная работа': [
        'Приведите примеры успешной работы в команде',
        'Объясните, как вы решали конфликты в команде',
        'Покажите, как вы поддерживали коллег'
      ],
      'О компании': [
        'Изучите историю и ценности компании',
        'Подготовьте вопросы о продуктах и услугах',
        'Покажите интерес к развитию компании'
      ]
    }
    
    const hints = fallbackHints[topic] || ['Будьте конкретны в своих ответах']
    
    return hints.map((text) => ({
      id: this.generateId(),
      text,
      category,
      priority: 'medium' as const,
      context: context.sessionId,
      source: 'rule' as const,
      confidence: 0.6,
      timestamp: Date.now(),
      isRead: false,
      isDismissed: false,
      relatedTopics: [topic]
    }))
  }

  // Генерация общих резервных подсказок
  private generateFallbackGeneralHints(context: FullContext): Hint[] {
    const generalHints = [
      'Слушайте внимательно и задавайте уточняющие вопросы',
      'Будьте честными и открытыми в своих ответах',
      'Показывайте энтузиазм и заинтересованность',
      'Используйте конкретные примеры из вашего опыта',
      'Демонстрируйте понимание требований позиции'
    ]
    
    return generalHints.map((text) => ({
      id: this.generateId(),
      text,
      category: this.categories.get('general')!,
      priority: 'medium' as const,
      context: context.sessionId,
      source: 'rule' as const,
      confidence: 0.5,
      timestamp: Date.now(),
      isRead: false,
      isDismissed: false,
      relatedTopics: []
    }))
  }

  // Фильтрация и ранжирование подсказок
  private filterAndRankHints(hints: Hint[], context: FullContext): Hint[] {
    // Удаление дубликатов
    const uniqueHints = this.removeDuplicates(hints)
    
    // Фильтрация по релевантности
    const relevantHints = uniqueHints.filter(hint => 
      this.isRelevantToContext(hint, context)
    )
    
    // Сортировка по приоритету и уверенности
    return relevantHints.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      
      if (priorityDiff !== 0) return priorityDiff
      
      return b.confidence - a.confidence
    }).slice(0, 10) // Максимум 10 подсказок
  }

  // Удаление дубликатов
  private removeDuplicates(hints: Hint[]): Hint[] {
    const seen = new Set<string>()
    return hints.filter(hint => {
      const key = hint.text.toLowerCase().trim()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  // Проверка релевантности подсказки контексту
  private isRelevantToContext(hint: Hint, context: FullContext): boolean {
    // Проверка по категории
    const relevantCategories = this.getRelevantCategories(context)
    if (!relevantCategories.includes(hint.category.id)) {
      return false
    }
    
    // Проверка по ключевым словам
    const contextKeywords = [
      ...context.contextA.skills,
      ...context.contextB.requirements,
      ...context.goal.successCriteria
    ].map(k => k.toLowerCase())
    
    const hintKeywords = hint.text.toLowerCase().split(/\s+/)
    const hasRelevantKeywords = hintKeywords.some(keyword => 
      contextKeywords.some(contextKeyword => 
        contextKeyword.includes(keyword) || keyword.includes(contextKeyword)
      )
    )
    
    return hasRelevantKeywords || hint.confidence > 0.7
  }

  // Получение релевантных категорий для контекста
  private getRelevantCategories(context: FullContext): string[] {
    const categories = ['general'] // Всегда включаем общие подсказки
    
    // Анализ требований позиции
    const requirements = context.contextB.requirements.join(' ').toLowerCase()
    if (requirements.includes('технический') || requirements.includes('разработка')) {
      categories.push('technical')
    }
    if (requirements.includes('опыт') || requirements.includes('стаж')) {
      categories.push('experience')
    }
    if (requirements.includes('навык') || requirements.includes('компетенция')) {
      categories.push('skills')
    }
    if (requirements.includes('мотивация') || requirements.includes('цель')) {
      categories.push('motivation')
    }
    if (requirements.includes('команда') || requirements.includes('коллеги')) {
      categories.push('teamwork')
    }
    if (requirements.includes('компания') || requirements.includes('продукт')) {
      categories.push('company')
    }
    
    return categories
  }

  // Получение всех подсказок
  getHints(): Hint[] {
    return Array.from(this.generatedHints.values())
  }

  // Получение подсказок по категории
  getHintsByCategory(categoryId: string): Hint[] {
    return Array.from(this.generatedHints.values())
      .filter(hint => hint.category.id === categoryId)
  }

  // Получение подсказок по приоритету
  getHintsByPriority(priority: 'low' | 'medium' | 'high' | 'critical'): Hint[] {
    return Array.from(this.generatedHints.values())
      .filter(hint => hint.priority === priority)
  }

  // Получение всех категорий
  getCategories(): HintCategory[] {
    return Array.from(this.categories.values())
  }

  // Получение категории по ID
  getCategory(categoryId: string): HintCategory | undefined {
    return this.categories.get(categoryId)
  }

  // Отметка подсказки как прочитанной
  markAsRead(hintId: string): void {
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
    this.listeners.push(listener)
    
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Уведомление слушателей
  private notifyListeners(hints: Hint[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(hints)
      } catch (error) {
        console.error('💡 [HINTS] Error in hints listener:', error)
      }
    })
  }

  // Очистка подсказок
  clearHints(): void {
    console.log('💡 [HINTS] Clearing all hints')
    this.generatedHints.clear()
    this.notifyListeners([])
  }

  // Генерация ID
  private generateId(): string {
    return `hint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Экспорт для использования в других модулях
export { HintGenerator }
