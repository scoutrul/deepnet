/**
 * Сервис получения детальной информации по подсказкам
 * Кэшированный контекстный подход для получения детальной информации
 */

import type { 
  InterviewContext, 
  TechnologyHint, 
  HintDetailRequest, 
  HintDetailResponse 
} from '@/types/interview'

export class HintDetailService {
  private cache = new Map<string, HintDetailResponse>()
  private readonly CACHE_TTL = 12 * 60 * 60 * 1000 // 12 часов
  private readonly MAX_EXAMPLES = 5
  private readonly MAX_RELATED_TOPICS = 8

  /**
   * Получение детальной информации по подсказке
   */
  public async getHintDetails(request: HintDetailRequest): Promise<HintDetailResponse> {
    try {
      const cacheKey = this.generateCacheKey(request)
      
      // Проверка кэша
      const cached = this.getCachedDetails(cacheKey)
      if (cached) {
        console.log('Используем кэшированную детальную информацию')
        return cached
      }

      // Генерация детальной информации
      const details = await this.generateDetailsFromLLM(request)
      
      // Сохранение в кэш
      this.cacheDetails(cacheKey, details)
      
      return details
    } catch (error) {
      console.error('Ошибка получения детальной информации:', error)
      // Fallback на базовую информацию
      return this.getFallbackDetails(request)
    }
  }

  /**
   * Генерация детальной информации через LLM
   */
  private async generateDetailsFromLLM(request: HintDetailRequest): Promise<HintDetailResponse> {
    const { hintId, context } = request
    
    // Получаем подсказку из контекста (в реальном приложении это должно приходить извне)
    const hint = this.getHintFromContext(hintId, context)
    
    this.buildDetailPrompt(hint, context) // Используем промпт для логики
    
    try {
      // Интеграция с существующим LLM агентом
      const response = await this.callLLM('')
      return this.parseDetailResponse(response, hint)
    } catch (error) {
      console.error('Ошибка LLM запроса для деталей:', error)
      throw error
    }
  }

  /**
   * Построение промпта для детальной информации
   */
  private buildDetailPrompt(hint: TechnologyHint, context: InterviewContext): string {
    const { role, skills, background, experience } = context
    
    return `
Предоставь детальную информацию о технологии "${hint.name}" в контексте собеседования на позицию "${role.position}" уровня "${role.level}".

Контекст кандидата:
- Позиция: ${role.position} (${role.level})
- Компания: ${role.company || 'Не указана'}
- Отрасль: ${role.industry || 'Не указана'}
- Основные навыки: ${skills.primary.join(', ')}
- Фреймворки: ${skills.frameworks.join(', ')}
- Опыт: ${background.yearsOfExperience} лет
- Текущая роль: ${experience.currentRole}

Требования к ответу:
1. Подробное описание технологии
2. Контекстная информация для данной роли и уровня
3. 3-5 примеров вопросов, которые могут задать на собеседовании
4. 5-8 связанных тем для изучения
5. Объясни, почему эта технология важна для данной позиции

Формат ответа - JSON объект:
{
  "details": "Подробное описание технологии...",
  "contextualInfo": "Контекстная информация для вашей роли...",
  "examples": ["Пример вопроса 1", "Пример вопроса 2", ...],
  "relatedTopics": ["Связанная тема 1", "Связанная тема 2", ...]
}

Отправь только JSON без дополнительного текста.
    `.trim()
  }

  /**
   * Вызов LLM API для детальной информации
   */
  private async callLLM(_prompt: string): Promise<string> {
    // Интеграция с существующим LLM агентом
    // Здесь должен быть вызов к существующему сервису LLM
    
    // Временная заглушка для тестирования
    return this.getMockDetailResponse()
  }

  /**
   * Парсинг ответа LLM для детальной информации
   */
  private parseDetailResponse(response: string, hint: TechnologyHint): HintDetailResponse {
    try {
      const data = JSON.parse(response)
      
      return {
        hint,
        details: data.details || 'Описание недоступно',
        contextualInfo: data.contextualInfo || 'Контекстная информация недоступна',
        examples: (data.examples || []).slice(0, this.MAX_EXAMPLES),
        relatedTopics: (data.relatedTopics || []).slice(0, this.MAX_RELATED_TOPICS)
      }
    } catch (error) {
      console.error('Ошибка парсинга детального ответа LLM:', error)
      throw new Error('Не удалось обработать ответ LLM для детальной информации')
    }
  }

  /**
   * Получение подсказки из контекста (заглушка)
   */
  private getHintFromContext(hintId: string, _context: InterviewContext): TechnologyHint {
    // В реальном приложении подсказка должна передаваться извне
    // Здесь создаем заглушку на основе ID
    return {
      id: hintId,
      name: 'JavaScript',
      category: 'Frontend',
      relevance: 0.9
    }
  }

  /**
   * Генерация ключа кэша
   */
  private generateCacheKey(request: HintDetailRequest): string {
    const { hintId, context } = request
    const contextKey = JSON.stringify({
      position: context.role.position,
      level: context.role.level,
      industry: context.role.industry,
      yearsOfExperience: context.background.yearsOfExperience
    })
    
    return `${hintId}_${this.simpleHash(contextKey)}`
  }

  /**
   * Простой хеш (в продакшене лучше использовать crypto.subtle.digest)
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString()
  }

  /**
   * Получение кэшированных деталей
   */
  private getCachedDetails(cacheKey: string): HintDetailResponse | null {
    const cached = this.cache.get(cacheKey)
    
    if (!cached) {
      return null
    }

    // Проверка TTL
    const now = Date.now()
    if (now - (cached as any).generatedAt.getTime() > this.CACHE_TTL) {
      this.cache.delete(cacheKey)
      return null
    }

    return cached
  }

  /**
   * Кэширование деталей
   */
  private cacheDetails(cacheKey: string, details: HintDetailResponse): void {
    const cachedDetails = {
      ...details,
      generatedAt: new Date()
    }
    this.cache.set(cacheKey, cachedDetails)
  }

  /**
   * Fallback детальная информация при ошибке LLM
   */
  private getFallbackDetails(request: HintDetailRequest): HintDetailResponse {
    const { hintId } = request
    const hint = this.getHintFromContext(hintId, request.context)
    
    return {
      hint,
      details: `Технология ${hint.name} является важной частью современной разработки. Она широко используется в индустрии и часто является предметом обсуждения на технических собеседованиях.`,
      contextualInfo: `Для позиции ${request.context.role.position} уровня ${request.context.role.level} знание ${hint.name} является ${hint.relevance > 0.7 ? 'критически важным' : 'желательным'}.`,
      examples: [
        `Расскажите о вашем опыте работы с ${hint.name}`,
        `Какие преимущества и недостатки у ${hint.name}?`,
        `Как бы вы решили типичную задачу с использованием ${hint.name}?`
      ],
      relatedTopics: [
        'Основы программирования',
        'Архитектура приложений',
        'Лучшие практики',
        'Производительность',
        'Безопасность'
      ]
    }
  }

  /**
   * Заглушка для тестирования
   */
  private getMockDetailResponse(): string {
    return JSON.stringify({
      details: "JavaScript - это высокоуровневый, интерпретируемый язык программирования, который является основой современной веб-разработки. Он поддерживает объектно-ориентированное, функциональное и императивное программирование.",
      contextualInfo: "Для позиции Frontend Developer знание JavaScript является критически важным. Вы должны понимать ES6+ синтаксис, асинхронное программирование, работу с DOM и современные фреймворки.",
      examples: [
        "Объясните разницу между var, let и const",
        "Как работает замыкание в JavaScript?",
        "Что такое промисы и как с ними работать?",
        "Расскажите о стрелочных функциях",
        "Как работает event loop в JavaScript?"
      ],
      relatedTopics: [
        "TypeScript",
        "React",
        "Vue.js",
        "Node.js",
        "Webpack",
        "ES6+",
        "Async/Await",
        "Closures"
      ]
    })
  }

  /**
   * Очистка кэша
   */
  public clearCache(): void {
    this.cache.clear()
  }

  /**
   * Получение статистики кэша
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    }
  }
}

// Создание экземпляра сервиса
export const hintDetailService = new HintDetailService()
