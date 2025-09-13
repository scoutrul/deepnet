// Dialog Processor - Упрощенная обработка диалога и суммаризация
import type { 
  DialogEntry, 
  DialogSummary, 
  TopicAnalysis, 
  ProcessingState
} from '../../types/context'
import { LLMAgent } from './llmAgent'

class DialogProcessor {
  private dialogEntries: DialogEntry[] = []
  private processingState: ProcessingState = {
    isProcessing: false,
    currentTask: '',
    progress: 0,
    errors: [],
    warnings: [],
    lastUpdate: Date.now()
  }
  private listeners: Array<(state: ProcessingState) => void> = []

  constructor(_llmAgent: LLMAgent) {
    console.log('💬 [DIALOG] DialogProcessor initialized')
  }

  // Добавление записи диалога
  addDialogEntry(entry: Omit<DialogEntry, 'id' | 'timestamp' | 'topics' | 'keywords' | 'importance'>): DialogEntry {
    const dialogEntry: DialogEntry = {
      id: this.generateId(),
      ...entry,
      timestamp: Date.now(),
      topics: [],
      keywords: [],
      importance: 'medium'
    }

    // Анализ текста
    this.analyzeText(dialogEntry)

    this.dialogEntries.push(dialogEntry)
    console.log('💬 [DIALOG] Added dialog entry:', dialogEntry)

    return dialogEntry
  }

  // Получение всех записей диалога
  getDialogEntries(): DialogEntry[] {
    return [...this.dialogEntries]
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
      const topics = this.analyzeTopics()
      const keyPoints = this.extractKeyPoints()
      const sentiment = this.analyzeSentiment()
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
      throw error
    }
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
      // Обновление анализа для всех записей
      this.dialogEntries.forEach(entry => {
        this.analyzeText(entry)
      })

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

  // Объединенный анализ текста
  private analyzeText(entry: DialogEntry): void {
    entry.topics = this.extractTopics(entry.text)
    entry.keywords = this.extractKeywords(entry.text)
    entry.importance = this.calculateImportance(entry.text, entry.speaker)
    entry.sentiment = this.analyzeSentimentForText(entry.text)
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
    const keywords: string[] = []
    const words = text.toLowerCase().split(/\s+/)
    
    // Технические ключевые слова
    const techWords = ['javascript', 'typescript', 'vue', 'react', 'node', 'api', 'база данных', 'алгоритм']
    techWords.forEach(word => {
      if (words.some(w => w.includes(word))) {
        keywords.push(word)
      }
    })
    
    // Общие ключевые слова
    const commonWords = ['проект', 'команда', 'опыт', 'навык', 'задача', 'решение']
    commonWords.forEach(word => {
      if (words.some(w => w.includes(word))) {
        keywords.push(word)
      }
    })
    
    return [...new Set(keywords)] // Убираем дубликаты
  }

  // Расчет важности записи
  private calculateImportance(text: string, speaker: 'A' | 'B' | 'system'): 'low' | 'medium' | 'high' | 'critical' {
    let importance = 0
    
    // Важность по длине текста
    if (text.length > 100) importance += 1
    if (text.length > 200) importance += 1
    
    // Важность по ключевым словам
    const importantWords = ['важно', 'критично', 'срочно', 'проблема', 'решение']
    importantWords.forEach(word => {
      if (text.toLowerCase().includes(word)) {
        importance += 1
      }
    })
    
    // Важность по говорящему
    if (speaker === 'A') importance += 1 // Пользователь обычно важнее
    
    if (importance >= 4) return 'critical'
    if (importance >= 3) return 'high'
    if (importance >= 2) return 'medium'
    return 'low'
  }

  // Анализ тональности для текста
  private analyzeSentimentForText(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['хорошо', 'отлично', 'прекрасно', 'согласен', 'да', 'понятно', 'спасибо']
    const negativeWords = ['плохо', 'не согласен', 'нет', 'не понимаю', 'проблема', 'ошибка']
    
    let positiveCount = 0
    let negativeCount = 0
    const lowerText = text.toLowerCase()
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++
    })
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++
    })
    
    if (positiveCount > negativeCount * 1.5) return 'positive'
    if (negativeCount > positiveCount * 1.5) return 'negative'
    return 'neutral'
  }

  // Анализ тем для резюме
  private analyzeTopics(): TopicAnalysis[] {
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

  // Расчет важности темы
  private calculateTopicImportance(topic: string, frequency: number): number {
    let importance = frequency * 0.3
    
    // Важные темы
    const importantTopics = ['Техническое', 'Опыт работы', 'Навыки']
    if (importantTopics.includes(topic)) {
      importance += 0.3
    }
    
    return Math.min(importance, 1.0)
  }

  // Анализ общей тональности
  private analyzeSentiment(): 'positive' | 'negative' | 'neutral' {
    let positiveCount = 0
    let negativeCount = 0
    
    for (const entry of this.dialogEntries) {
      if (entry.sentiment === 'positive') positiveCount++
      if (entry.sentiment === 'negative') negativeCount++
    }
    
    if (positiveCount > negativeCount * 1.5) return 'positive'
    if (negativeCount > positiveCount * 1.5) return 'negative'
    return 'neutral'
  }

  // Извлечение ключевых моментов
  private extractKeyPoints(): string[] {
    const keyPoints: string[] = []
    
    // Ищем записи с высокой важностью
    const importantEntries = this.dialogEntries.filter(entry => 
      entry.importance === 'high' || entry.importance === 'critical'
    )
    
    importantEntries.forEach(entry => {
      if (entry.text.length > 20) {
        keyPoints.push(entry.text.substring(0, 100) + '...')
      }
    })
    
    return keyPoints.slice(0, 5) // Максимум 5 ключевых моментов
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
      keyPoints.forEach(point => {
        summary += `- ${point}\n`
      })
    }
    
    return summary
  }

  // Подсчет слов
  private calculateWordCount(): number {
    return this.dialogEntries.reduce((total, entry) => {
      return total + entry.text.split(/\s+/).length
    }, 0)
  }

  // Расчет продолжительности
  private calculateDuration(): number {
    if (this.dialogEntries.length < 2) return 0
    
    const first = this.dialogEntries[0]
    const last = this.dialogEntries[this.dialogEntries.length - 1]
    
    return last.timestamp - first.timestamp
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

// Экспорт для использования в других модулях
export { DialogProcessor }