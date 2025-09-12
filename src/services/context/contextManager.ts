// Context Manager - Управление контекстами сторон A и B
import type { 
  ContextA, 
  ContextB, 
  CommunicationGoal, 
  FullContext,
  DialogEntry
} from '../../types/context'

class ContextManager {
  private contextA: ContextA | null = null
  private contextB: ContextB | null = null
  private goal: CommunicationGoal | null = null
  private sessionId: string = ''
  private dialogEntries: DialogEntry[] = []
  private listeners: Array<(context: FullContext | null) => void> = []

  constructor() {
    console.log('🎯 [CONTEXT] ContextManager initialized')
    this.sessionId = this.generateSessionId()
  }

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
    this.notifyListeners()
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
    this.notifyListeners()
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
    this.notifyListeners()
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
    this.notifyListeners()
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
    this.notifyListeners()
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
    this.notifyListeners()
    return this.goal
  }

  // Получение полного контекста
  getFullContext(): FullContext | null {
    if (!this.contextA || !this.contextB || !this.goal) {
      console.warn('🎯 [CONTEXT] Cannot get full context: missing components')
      return null
    }

    const fullContext: FullContext = {
      contextA: this.contextA,
      contextB: this.contextB,
      goal: this.goal,
      sessionId: this.sessionId,
      createdAt: Math.min(
        this.contextA.createdAt,
        this.contextB.createdAt,
        this.goal.createdAt
      ),
      updatedAt: Date.now(),
      dialogEntries: this.dialogEntries
    }

    return fullContext
  }

  // Получение контекста стороны A
  getContextA(): ContextA | null {
    return this.contextA
  }

  // Получение контекста стороны B
  getContextB(): ContextB | null {
    return this.contextB
  }

  // Получение цели коммуникации
  getGoal(): CommunicationGoal | null {
    return this.goal
  }

  // Проверка готовности контекста
  isContextReady(): boolean {
    return !!(this.contextA && this.contextB && this.goal)
  }

  // Подписка на изменения контекста
  onContextChange(listener: (context: FullContext | null) => void): () => void {
    this.listeners.push(listener)
    
    // Возвращаем функцию отписки
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Очистка контекста
  clearContext(): void {
    console.log('🎯 [CONTEXT] Clearing all context')
    this.contextA = null
    this.contextB = null
    this.goal = null
    this.sessionId = this.generateSessionId()
    this.notifyListeners()
  }

  // Сброс сессии
  resetSession(): void {
    console.log('🎯 [CONTEXT] Resetting session')
    this.sessionId = this.generateSessionId()
    this.notifyListeners()
  }

  // Экспорт контекста
  exportContext(): string {
    const context = this.getFullContext()
    if (!context) {
      throw new Error('Контекст не готов для экспорта')
    }
    return JSON.stringify(context, null, 2)
  }

  // Импорт контекста
  importContext(contextJson: string): FullContext {
    try {
      const context = JSON.parse(contextJson) as FullContext
      
      // Валидация импортированного контекста
      if (!this.validateContext(context)) {
        throw new Error('Неверный формат контекста')
      }

      this.contextA = context.contextA
      this.contextB = context.contextB
      this.goal = context.goal
      this.sessionId = context.sessionId

      console.log('🎯 [CONTEXT] Context imported successfully')
      this.notifyListeners()
      return context
    } catch (error) {
      console.error('🎯 [CONTEXT] Error importing context:', error)
      throw new Error('Ошибка импорта контекста')
    }
  }

  // Валидация контекста
  private validateContext(context: any): boolean {
    return !!(
      context &&
      context.contextA &&
      context.contextB &&
      context.goal &&
      context.sessionId &&
      typeof context.contextA.id === 'string' &&
      typeof context.contextB.id === 'string' &&
      typeof context.goal.id === 'string'
    )
  }

  // Уведомление слушателей
  private notifyListeners(): void {
    const context = this.getFullContext()
    this.listeners.forEach(listener => {
      try {
        listener(context)
      } catch (error) {
        console.error('🎯 [CONTEXT] Error in context listener:', error)
      }
    })
  }

  // Генерация ID
  private generateId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Генерация ID сессии
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Добавление записи диалога
  addDialogEntry(entry: DialogEntry): void {
    this.dialogEntries.push(entry)
    console.log('🎯 [CONTEXT] Dialog entry added:', entry)
    this.notifyListeners()
  }

  // Получение записей диалога
  getDialogEntries(): DialogEntry[] {
    return [...this.dialogEntries]
  }

  // Очистка диалога
  clearDialog(): void {
    this.dialogEntries = []
    console.log('🎯 [CONTEXT] Dialog cleared')
    this.notifyListeners()
  }
}

// Создание глобального экземпляра
export const contextManager = new ContextManager()

// Экспорт для использования в других модулях
export { ContextManager }
