// Dialog Processor - Обработка диалога и суммаризация
import type { 
  DialogEntry, 
  DialogSummary, 
  TopicAnalysis, 
  ProcessingState
  // FullContext - временно отключен из-за 402 ошибки
} from '../../types/context'
import { LLMAgent } from './llmAgent'

class DialogProcessor {
  private dialogEntries: DialogEntry[] = []
  // private llmAgent: LLMAgent - временно отключен из-за 402 ошибки
  private processingState: ProcessingState = {
    isProcessing: false,
    currentTask: '',
    progress: 0,
    errors: [],
    warnings: [],
    lastUpdate: Date.now()
  }
  private listeners: Array<(state: ProcessingState) => void> = []
  private processingQueue: Array<() => Promise<void>> = []
  private isProcessingQueue: boolean = false

  constructor(_llmAgent: LLMAgent) {
    // this.llmAgent = _llmAgent - временно отключен из-за 402 ошибки
    console.log('💬 [DIALOG] DialogProcessor initialized (LLM agent temporarily disabled)')
  }

  // Добавление записи диалога
  addDialogEntry(entry: Omit<DialogEntry, 'id' | 'timestamp' | 'topics' | 'keywords' | 'importance'>): DialogEntry {
    const dialogEntry: DialogEntry = {
      id: this.generateId(),
      ...entry,
      timestamp: Date.now(),
      topics: this.extractTopics(entry.text),
      keywords: this.extractKeywords(entry.text),
      importance: this.calculateImportance(entry.text, entry.speaker)
    }

    this.dialogEntries.push(dialogEntry)
    console.log('💬 [DIALOG] Added dialog entry:', dialogEntry)

    // Асинхронная обработка
    this.queueProcessing(() => this.processNewEntry(dialogEntry))

    return dialogEntry
  }

  // Получение всех записей диалога
  getDialogEntries(): DialogEntry[] {
    return [...this.dialogEntries]
  }

  // Получение записей за период
  getDialogEntriesInRange(startTime: number, endTime: number): DialogEntry[] {
    return this.dialogEntries.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    )
  }

  // Получение последних N записей
  getRecentEntries(count: number): DialogEntry[] {
    return this.dialogEntries.slice(-count)
  }

  // Обработка в реальном времени
  async processRealTime(): Promise<void> {
    if (this.dialogEntries.length === 0) {
      return
    }

    console.log('💬 [DIALOG] Processing real-time dialog analysis')
    this.updateProcessingState({
      isProcessing: true,
      currentTask: 'Анализ диалога в реальном времени',
      progress: 0
    })

    try {
      // Анализ тем
      await this.analyzeTopics()
      
      // Анализ тональности
      await this.analyzeSentiment()
      
      // Обновление важности записей
      this.updateImportanceLevels()

      this.updateProcessingState({
        isProcessing: false,
        currentTask: '',
        progress: 100,
        lastUpdate: Date.now()
      })

      console.log('💬 [DIALOG] Real-time processing completed')
    } catch (error) {
      console.error('💬 [DIALOG] Error in real-time processing:', error)
      this.updateProcessingState({
        isProcessing: false,
        currentTask: '',
        progress: 0,
        errors: [...this.processingState.errors, `Ошибка обработки: ${error}`]
      })
    }
  }

  // Генерация резюме диалога
  async generateSummary(): Promise<DialogSummary> {
    console.log('💬 [DIALOG] Generating dialog summary')
    
    this.updateProcessingState({
      isProcessing: true,
      currentTask: 'Создание резюме диалога',
      progress: 0
    })

    try {
      const topics = await this.analyzeTopics()
      const keyPoints = this.extractKeyPoints()
      const sentiment = await this.analyzeSentiment()
      const wordCount = this.calculateWordCount()
      const duration = this.calculateDuration()

      const summary: DialogSummary = {
        id: this.generateId(),
        sessionId: '',
        topics,
        keyPoints,
        summary: this.generateTextSummary(topics, keyPoints),
        sentiment,
        duration,
        wordCount,
        createdAt: Date.now()
      }

      this.updateProcessingState({
        isProcessing: false,
        currentTask: '',
        progress: 100,
        lastUpdate: Date.now()
      })

      console.log('💬 [DIALOG] Summary generated successfully')
      return summary
    } catch (error) {
      console.error('💬 [DIALOG] Error generating summary:', error)
      this.updateProcessingState({
        isProcessing: false,
        currentTask: '',
        progress: 0,
        errors: [...this.processingState.errors, `Ошибка создания резюме: ${error}`]
      })

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

  // Анализ тем диалога через LLM (временно отключен из-за 402 ошибки)
  private async analyzeTopics(): Promise<TopicAnalysis[]> {
    if (this.dialogEntries.length === 0) return []

    // Временно отключаем LLM анализ из-за проблем с API (402 Payment Required)
    console.log('💬 [DIALOG] LLM topic analysis temporarily disabled due to API issues')
    return this.fallbackTopicAnalysis()
    
    /* Временно закомментировано из-за 402 ошибки
    try {
      // Создаем контекст для LLM
      const context: FullContext = {
        sessionId: this.generateId(),
        contextA: { 
          id: this.generateId(),
          name: '', 
          role: '', 
          skills: [], 
          experience: '', 
          goals: [],
          background: '',
          preferences: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        contextB: { 
          id: this.generateId(),
          name: '', 
          role: '', 
          requirements: [], 
          company: '', 
          position: '',
          expectations: [],
          background: '',
          preferences: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        goal: { 
          id: this.generateId(),
          description: '', 
          successCriteria: [],
          context: '',
          priority: 'medium',
          deadline: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      // Формируем диалог для анализа
      const dialogText = this.dialogEntries
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n')

      // Запрос к LLM для анализа тем
      const response = await this.llmAgent.makeRequest({
        id: this.generateId(),
        type: 'hint',
        prompt: `Проанализируй диалог и определи основные темы. Верни JSON с массивом тем в формате:
      [{"topic": "название темы", "frequency": число_упоминаний, "importance": 0.0-1.0, "keywords": ["ключевые", "слова"], "sentiment": "positive/negative/neutral", "examples": ["пример1", "пример2"]}]
      
      Диалог:
      ${dialogText}`,
        context,
        options: {
          model: 'anthropic/claude-3.5-sonnet',
          temperature: 0.3,
          maxTokens: 1000,
          topP: 0.9,
          frequencyPenalty: 0.1,
          presencePenalty: 0.1
        },
        timestamp: Date.now()
      })

      // Парсим ответ LLM
      const topics = JSON.parse(response.content) as TopicAnalysis[]
      return topics.sort((a, b) => b.importance - a.importance)
    } catch (error) {
      console.error('💬 [DIALOG] Error in LLM topic analysis:', error)
      // Fallback к простому анализу
      return this.fallbackTopicAnalysis()
    }
    */
  }

  // Резервный анализ тем (простой)
  private fallbackTopicAnalysis(): TopicAnalysis[] {
    const topicMap = new Map<string, {
      frequency: number,
      keywords: Set<string>,
      examples: string[],
      sentiment: 'positive' | 'negative' | 'neutral'
    }>()

    for (const entry of this.dialogEntries) {
      for (const topic of entry.topics) {
        if (!topicMap.has(topic)) {
          topicMap.set(topic, {
            frequency: 0,
            keywords: new Set(),
            examples: [],
            sentiment: 'neutral'
          })
        }

        const topicData = topicMap.get(topic)!
        topicData.frequency++
        entry.keywords.forEach(keyword => topicData.keywords.add(keyword))
        topicData.examples.push(entry.text)
        
        if (entry.sentiment) {
          topicData.sentiment = entry.sentiment
        }
      }
    }

    const topics: TopicAnalysis[] = []
    for (const [topic, data] of topicMap) {
      topics.push({
        topic,
        frequency: data.frequency,
        importance: this.calculateTopicImportance(topic, data.frequency),
        keywords: Array.from(data.keywords),
        sentiment: data.sentiment,
        examples: data.examples.slice(0, 3)
      })
    }

    return topics.sort((a, b) => b.importance - a.importance)
  }

  // Извлечение ключевых моментов
  private extractKeyPoints(): string[] {
    const keyPoints: string[] = []
    
    // Поиск вопросов
    const questions = this.dialogEntries.filter(entry => 
      entry.text.includes('?') || 
      entry.text.toLowerCase().includes('как') ||
      entry.text.toLowerCase().includes('что') ||
      entry.text.toLowerCase().includes('почему') ||
      entry.text.toLowerCase().includes('когда') ||
      entry.text.toLowerCase().includes('где')
    )
    
    questions.forEach(entry => {
      keyPoints.push(`Вопрос: ${entry.text}`)
    })

    // Поиск важных утверждений
    const importantEntries = this.dialogEntries.filter(entry => 
      entry.importance === 'high' || entry.importance === 'critical'
    )
    
    importantEntries.forEach(entry => {
      keyPoints.push(`Важно: ${entry.text}`)
    })

    // Поиск решений и выводов
    const conclusions = this.dialogEntries.filter(entry => 
      entry.text.toLowerCase().includes('вывод') ||
      entry.text.toLowerCase().includes('решение') ||
      entry.text.toLowerCase().includes('согласен') ||
      entry.text.toLowerCase().includes('не согласен')
    )
    
    conclusions.forEach(entry => {
      keyPoints.push(`Вывод: ${entry.text}`)
    })

    return keyPoints.slice(0, 10) // Максимум 10 ключевых моментов
  }

  // Анализ тональности через LLM (временно отключен из-за 402 ошибки)
  private async analyzeSentiment(): Promise<'positive' | 'negative' | 'neutral'> {
    if (this.dialogEntries.length === 0) return 'neutral'

    // Временно отключаем LLM анализ из-за проблем с API (402 Payment Required)
    console.log('💬 [DIALOG] LLM sentiment analysis temporarily disabled due to API issues')
    return this.fallbackSentimentAnalysis()
    
    /* Временно закомментировано из-за 402 ошибки
    try {
      // Формируем диалог для анализа
      const dialogText = this.dialogEntries
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n')

      // Запрос к LLM для анализа тональности
      const context: FullContext = {
        sessionId: this.generateId(),
        contextA: { 
          id: this.generateId(),
          name: '', 
          role: '', 
          skills: [], 
          experience: '', 
          goals: [],
          background: '',
          preferences: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        contextB: { 
          id: this.generateId(),
          name: '', 
          role: '', 
          requirements: [], 
          company: '', 
          position: '',
          expectations: [],
          background: '',
          preferences: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        goal: { 
          id: this.generateId(),
          description: '', 
          successCriteria: [],
          context: '',
          priority: 'medium',
          deadline: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const response = await this.llmAgent.makeRequest({
        id: this.generateId(),
        type: 'hint',
        prompt: `Проанализируй тональность диалога. Верни только одно слово: "positive", "negative" или "neutral".
      
      Диалог:
      ${dialogText}`,
        context,
        options: {
          model: 'anthropic/claude-3.5-sonnet',
          temperature: 0.3,
          maxTokens: 1000,
          topP: 0.9,
          frequencyPenalty: 0.1,
          presencePenalty: 0.1
        },
        timestamp: Date.now()
      })

      const sentiment = response.content.trim().toLowerCase()
      if (['positive', 'negative', 'neutral'].includes(sentiment)) {
        return sentiment as 'positive' | 'negative' | 'neutral'
      }
      
      return 'neutral'
    } catch (error) {
      console.error('💬 [DIALOG] Error in LLM sentiment analysis:', error)
      // Fallback к простому анализу
      return this.fallbackSentimentAnalysis()
    }
    */
  }

  // Резервный анализ тональности (простой)
  private fallbackSentimentAnalysis(): 'positive' | 'negative' | 'neutral' {
    
    const positiveWords = ['хорошо', 'отлично', 'прекрасно', 'согласен', 'да', 'понятно', 'спасибо']
    const negativeWords = ['плохо', 'не согласен', 'нет', 'не понимаю', 'проблема', 'ошибка']
    
    let positiveCount = 0
    let negativeCount = 0
    
    for (const entry of this.dialogEntries) {
      const text = entry.text.toLowerCase()
      
      for (const word of positiveWords) {
        if (text.includes(word)) positiveCount++
      }
      
      for (const word of negativeWords) {
        if (text.includes(word)) negativeCount++
      }
    }
    
    if (positiveCount > negativeCount * 1.5) return 'positive'
    if (negativeCount > positiveCount * 1.5) return 'negative'
    return 'neutral'
  }

  // Извлечение тем из текста
  private extractTopics(text: string): string[] {
    const topics: string[] = []
    const lowerText = text.toLowerCase()
    
    // Технические темы
    if (lowerText.includes('код') || lowerText.includes('программирование') || lowerText.includes('разработка')) {
      topics.push('Техническое')
    }
    
    // Вопросы о опыте
    if (lowerText.includes('опыт') || lowerText.includes('работал') || lowerText.includes('проект')) {
      topics.push('Опыт работы')
    }
    
    // Вопросы о навыках
    if (lowerText.includes('навык') || lowerText.includes('знание') || lowerText.includes('умеешь')) {
      topics.push('Навыки')
    }
    
    // Вопросы о мотивации
    if (lowerText.includes('мотивация') || lowerText.includes('цель') || lowerText.includes('планы')) {
      topics.push('Мотивация')
    }
    
    // Вопросы о команде
    if (lowerText.includes('команда') || lowerText.includes('коллеги') || lowerText.includes('работа в команде')) {
      topics.push('Командная работа')
    }
    
    // Вопросы о компании
    if (lowerText.includes('компания') || lowerText.includes('продукт') || lowerText.includes('бизнес')) {
      topics.push('О компании')
    }
    
    return topics
  }

  // Извлечение ключевых слов
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
    
    // Простая частота слов
    const wordCount = new Map<string, number>()
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1)
    })
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
  }

  // Расчет важности записи
  private calculateImportance(text: string, _speaker: 'A' | 'B' | 'system'): 'low' | 'medium' | 'high' | 'critical' {
    const lowerText = text.toLowerCase()
    
    // Критические слова
    if (lowerText.includes('важно') || lowerText.includes('критично') || lowerText.includes('срочно')) {
      return 'critical'
    }
    
    // Высокая важность - вопросы и ответы
    if (lowerText.includes('?') || lowerText.includes('как') || lowerText.includes('что') || lowerText.includes('почему')) {
      return 'high'
    }
    
    // Средняя важность - утверждения
    if (lowerText.length > 50 && (lowerText.includes('я') || lowerText.includes('мы') || lowerText.includes('компания'))) {
      return 'medium'
    }
    
    return 'low'
  }

  // Расчет важности темы
  private calculateTopicImportance(topic: string, frequency: number): number {
    const baseImportance = Math.min(frequency / this.dialogEntries.length, 1)
    
    // Бонус за важные темы
    const importantTopics = ['Техническое', 'Опыт работы', 'Навыки']
    if (importantTopics.includes(topic)) {
      return Math.min(baseImportance + 0.3, 1)
    }
    
    return baseImportance
  }

  // Генерация текстового резюме
  private generateTextSummary(topics: TopicAnalysis[], keyPoints: string[]): string {
    let summary = 'Резюме диалога:\n\n'
    
    if (topics.length > 0) {
      summary += 'Основные темы:\n'
      topics.slice(0, 3).forEach(topic => {
        summary += `- ${topic.topic} (${topic.frequency} упоминаний)\n`
      })
      summary += '\n'
    }
    
    if (keyPoints.length > 0) {
      summary += 'Ключевые моменты:\n'
      keyPoints.slice(0, 5).forEach(point => {
        summary += `- ${point}\n`
      })
    }
    
    return summary
  }

  // Расчет количества слов
  private calculateWordCount(): number {
    return this.dialogEntries.reduce((count, entry) => 
      count + entry.text.split(/\s+/).length, 0
    )
  }

  // Расчет продолжительности
  private calculateDuration(): number {
    if (this.dialogEntries.length < 2) return 0
    return this.dialogEntries[this.dialogEntries.length - 1].timestamp - this.dialogEntries[0].timestamp
  }

  // Очередь обработки
  private async queueProcessing(task: () => Promise<void>): Promise<void> {
    this.processingQueue.push(task)
    if (!this.isProcessingQueue) {
      await this.processQueue()
    }
  }

  // Обработка очереди
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return
    
    this.isProcessingQueue = true
    
    while (this.processingQueue.length > 0) {
      const task = this.processingQueue.shift()!
      try {
        await task()
      } catch (error) {
        console.error('💬 [DIALOG] Error in processing queue:', error)
      }
    }
    
    this.isProcessingQueue = false
  }

  // Обработка новой записи
  private async processNewEntry(entry: DialogEntry): Promise<void> {
    // Обновление тем и ключевых слов
    entry.topics = this.extractTopics(entry.text)
    entry.keywords = this.extractKeywords(entry.text)
    entry.importance = this.calculateImportance(entry.text, entry.speaker)
    
    // Анализ тональности (асинхронный, но не ждем)
    this.analyzeSentiment().then(sentiment => {
      entry.sentiment = sentiment
    })
  }

  // Обновление уровней важности
  private updateImportanceLevels(): void {
    for (const entry of this.dialogEntries) {
      entry.importance = this.calculateImportance(entry.text, entry.speaker)
    }
  }

  // Подписка на изменения состояния обработки
  onProcessingStateChange(listener: (state: ProcessingState) => void): () => void {
    this.listeners.push(listener)
    
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Получение текущего состояния обработки
  getProcessingState(): ProcessingState {
    return { ...this.processingState }
  }

  // Обновление состояния обработки
  private updateProcessingState(updates: Partial<ProcessingState>): void {
    this.processingState = { ...this.processingState, ...updates }
    
    this.listeners.forEach(listener => {
      try {
        listener(this.processingState)
      } catch (error) {
        console.error('💬 [DIALOG] Error in processing state listener:', error)
      }
    })
  }

  // Очистка диалога
  clearDialog(): void {
    console.log('💬 [DIALOG] Clearing dialog entries')
    this.dialogEntries = []
    this.processingState = {
      isProcessing: false,
      currentTask: '',
      progress: 0,
      errors: [],
      warnings: [],
      lastUpdate: Date.now()
    }
  }

  // Генерация ID
  private generateId(): string {
    return `dialog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Создание глобального экземпляра будет происходить после инициализации LLM агента
// export const dialogProcessor = new DialogProcessor()

// Экспорт для использования в других модулях
export { DialogProcessor }
