/**
 * Сервис управления контекстом интервью
 * Реактивный сервис с Vue реактивностью для управления состоянием контекста
 */

import { ref, computed } from 'vue'
import type { InterviewContext, RoleInfo, SkillsInfo, BackgroundInfo, ExperienceInfo } from '@/types/interview'

export class InterviewContextService {
  private context = ref<InterviewContext | null>(null)
  private isLoading = ref(false)
  private error = ref<string | null>(null)

  // Реактивные геттеры
  public readonly currentContext = computed(() => this.context.value)
  public readonly isContextLoaded = computed(() => this.context.value !== null)
  public readonly loading = computed(() => this.isLoading.value)
  public readonly hasError = computed(() => this.error.value !== null)
  public readonly errorMessage = computed(() => this.error.value)

  /**
   * Установить контекст интервью
   */
  public setContext(context: InterviewContext): void {
    try {
      this.isLoading.value = true
      this.error.value = null
      
      // Валидация контекста
      if (!this.validateContext(context)) {
        throw new Error('Некорректные данные контекста')
      }

      // Обновление времени
      context.updatedAt = new Date()
      
      this.context.value = context
      this.saveToStorage()
    } catch (err) {
      this.error.value = err instanceof Error ? err.message : 'Ошибка при установке контекста'
      console.error('Ошибка установки контекста:', err)
    } finally {
      this.isLoading.value = false
    }
  }

  /**
   * Получить текущий контекст
   */
  public getContext(): InterviewContext | null {
    return this.context.value
  }

  /**
   * Обновить часть контекста
   */
  public updateContext(updates: Partial<InterviewContext>): void {
    if (!this.context.value) {
      throw new Error('Контекст не установлен')
    }

    const updatedContext = {
      ...this.context.value,
      ...updates,
      updatedAt: new Date()
    }

    this.setContext(updatedContext)
  }

  /**
   * Обновить информацию о роли
   */
  public updateRole(role: RoleInfo): void {
    this.updateContext({ role })
  }

  /**
   * Обновить навыки
   */
  public updateSkills(skills: SkillsInfo): void {
    this.updateContext({ skills })
  }

  /**
   * Обновить фон
   */
  public updateBackground(background: BackgroundInfo): void {
    this.updateContext({ background })
  }

  /**
   * Обновить опыт
   */
  public updateExperience(experience: ExperienceInfo): void {
    this.updateContext({ experience })
  }

  /**
   * Валидация контекста
   */
  public validateContext(context: Partial<InterviewContext>): boolean {
    try {
      // Минимальная валидация - достаточно иметь позицию или навыки
      if (!context) {
        return false
      }

      // Проверяем, что есть хотя бы позиция или навыки для генерации подсказок
      const hasPosition = !!(context.role?.position && context.role.position.trim().length > 0)
      const hasSkills = !!(context.skills?.primary && Array.isArray(context.skills.primary) && context.skills.primary.length > 0)
      const hasCurrentRole = !!(context.experience?.currentRole && context.experience.currentRole.trim().length > 0)

      // Достаточно иметь любую из этих информаций для генерации подсказок
      return hasPosition || hasSkills || hasCurrentRole
    } catch {
      return false
    }
  }

  /**
   * Очистить контекст
   */
  public clearContext(): void {
    this.context.value = null
    this.error.value = null
    this.removeFromStorage()
  }

  /**
   * Создать новый контекст
   */
  public createNewContext(): InterviewContext {
    const now = new Date()
    return {
      id: `context_${Date.now()}`,
      role: {
        position: '',
        level: '',
        company: '',
        industry: ''
      },
      skills: {
        primary: [],
        secondary: [],
        frameworks: [],
        tools: []
      },
      background: {
        education: '',
        yearsOfExperience: 0,
        previousRoles: [],
        achievements: []
      },
      experience: {
        currentRole: '',
        responsibilities: [],
        projects: [],
        technologies: []
      },
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * Сохранить в локальное хранилище
   */
  private saveToStorage(): void {
    try {
      if (this.context.value) {
        localStorage.setItem('interview_context', JSON.stringify(this.context.value))
      }
    } catch (err) {
      console.warn('Не удалось сохранить контекст в локальное хранилище:', err)
    }
  }

  /**
   * Загрузить из локального хранилища
   */
  public loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('interview_context')
      if (stored) {
        const context = JSON.parse(stored)
        // Преобразование дат
        context.createdAt = new Date(context.createdAt)
        context.updatedAt = new Date(context.updatedAt)
        
        if (this.validateContext(context)) {
          this.context.value = context
        } else {
          this.removeFromStorage()
        }
      }
    } catch (err) {
      console.warn('Не удалось загрузить контекст из локального хранилища:', err)
      this.removeFromStorage()
    }
  }

  /**
   * Удалить из локального хранилища
   */
  private removeFromStorage(): void {
    try {
      localStorage.removeItem('interview_context')
    } catch (err) {
      console.warn('Не удалось удалить контекст из локального хранилища:', err)
    }
  }

  /**
   * Экспорт контекста
   */
  public exportContext(): string {
    if (!this.context.value) {
      throw new Error('Контекст не установлен')
    }
    return JSON.stringify(this.context.value, null, 2)
  }

  /**
   * Импорт контекста
   */
  public importContext(jsonString: string): void {
    try {
      const context = JSON.parse(jsonString)
      context.createdAt = new Date(context.createdAt)
      context.updatedAt = new Date(context.updatedAt)
      
      this.setContext(context)
    } catch (err) {
      throw new Error('Некорректный формат данных для импорта')
    }
  }
}

// Создание экземпляра сервиса
export const interviewContextService = new InterviewContextService()
