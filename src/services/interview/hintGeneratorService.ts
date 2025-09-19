/**
 * Сервис генерации подсказок через LLM
 * Кэшированный подход с LLM для генерации топ-20 технологических подсказок
 */

import type { 
  InterviewContext, 
  TechnologyHint, 
  HintGenerationResponse 
} from '@/types/interview'

export class HintGeneratorService {
  private cache = new Map<string, HintGenerationResponse>()
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000 // 24 часа
  private readonly MAX_HINTS = 20

  /**
   * Генерация топ-20 подсказок на основе контекста
   */
  public async generateTopHints(context: InterviewContext): Promise<TechnologyHint[]> {
    try {
      const contextHash = this.generateContextHash(context)
      
      // Проверка кэша
      const cached = this.getCachedHints(contextHash)
      if (cached) {
        console.log('Используем кэшированные подсказки')
        return cached.hints
      }

      // Генерация новых подсказок
      const hints = await this.generateHintsFromLLM(context)
      
      // Сохранение в кэш
      this.cacheHints(contextHash, hints)
      
      return hints
    } catch (error) {
      console.error('Ошибка генерации подсказок:', error)
      // Fallback на базовые подсказки
      return this.getFallbackHints(context)
    }
  }

  /**
   * Генерация подсказок через LLM
   */
  private async generateHintsFromLLM(context: InterviewContext): Promise<TechnologyHint[]> {
    const prompt = this.buildPrompt(context)
    
    try {
      // Интеграция с существующим LLM агентом
      const response = await this.callLLM(prompt)
      return this.parseLLMResponse(response)
    } catch (error) {
      console.error('Ошибка LLM запроса:', error)
      throw error
    }
  }

  /**
   * Построение промпта для LLM
   */
  private buildPrompt(context: InterviewContext): string {
    const { role, skills, background, experience } = context
    
    // Используем промпт для логики, но не возвращаем его
    const prompt = `
Сгенерируй топ-20 технологических тем и навыков, которые могут быть затронуты на собеседовании для позиции "${role.position}" уровня "${role.level}".

Контекст кандидата:
- Позиция: ${role.position} (${role.level})
- Компания: ${role.company || 'Не указана'}
- Отрасль: ${role.industry || 'Не указана'}
- Основные навыки: ${skills.primary.join(', ')}
- Фреймворки: ${skills.frameworks.join(', ')}
- Образование: ${background.education}
- Опыт: ${background.yearsOfExperience} лет
- Текущая роль: ${experience.currentRole}

Требования:
1. Включи только релевантные технологии и темы
2. Учти уровень позиции (${role.level})
3. Включи как базовые, так и продвинутые темы
4. Добавь современные технологии и тренды
5. Учти специфику отрасли (${role.industry || 'общая'})

Формат ответа - JSON массив объектов:
[
  {
    "name": "Название технологии",
    "category": "Категория (например: Frontend, Backend, Database, etc.)",
    "relevance": 0.9
  }
]

Отправь только JSON без дополнительного текста.
    `.trim()
    
    // Логируем для отладки
    console.log('Промпт для генерации подсказок:', prompt)
    return prompt
  }

  /**
   * Вызов LLM API
   */
  private async callLLM(_prompt: string): Promise<string> {
    // Интеграция с существующим LLM агентом
    // Здесь должен быть вызов к существующему сервису LLM
    
    // Временная заглушка для тестирования
    return this.getMockLLMResponse()
  }

  /**
   * Парсинг ответа LLM
   */
  private parseLLMResponse(response: string): TechnologyHint[] {
    try {
      const data = JSON.parse(response)
      
      if (!Array.isArray(data)) {
        throw new Error('Некорректный формат ответа LLM')
      }

      return data
        .slice(0, this.MAX_HINTS)
        .map((item, index) => ({
          id: `hint_${Date.now()}_${index}`,
          name: item.name || 'Неизвестная технология',
          category: item.category || 'Общее',
          relevance: Math.min(1, Math.max(0, item.relevance || 0.5))
        }))
        .sort((a, b) => b.relevance - a.relevance)
    } catch (error) {
      console.error('Ошибка парсинга ответа LLM:', error)
      throw new Error('Не удалось обработать ответ LLM')
    }
  }

  /**
   * Генерация хеша контекста для кэширования
   */
  private generateContextHash(context: InterviewContext): string {
    const key = JSON.stringify({
      position: context.role.position,
      level: context.role.level,
      industry: context.role.industry,
      primarySkills: context.skills.primary.sort(),
      frameworks: context.skills.frameworks.sort(),
      yearsOfExperience: context.background.yearsOfExperience
    })
    
    // Простой хеш (в продакшене лучше использовать crypto.subtle.digest)
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString()
  }

  /**
   * Получение кэшированных подсказок
   */
  private getCachedHints(contextHash: string): HintGenerationResponse | null {
    const cached = this.cache.get(contextHash)
    
    if (!cached) {
      return null
    }

    // Проверка TTL
    const now = Date.now()
    if (now - cached.generatedAt.getTime() > this.CACHE_TTL) {
      this.cache.delete(contextHash)
      return null
    }

    return cached
  }

  /**
   * Кэширование подсказок
   */
  private cacheHints(contextHash: string, hints: TechnologyHint[]): void {
    const response: HintGenerationResponse = {
      hints,
      generatedAt: new Date(),
      contextHash
    }
    
    this.cache.set(contextHash, response)
  }

  /**
   * Fallback подсказки при ошибке LLM
   */
  private getFallbackHints(context: InterviewContext): TechnologyHint[] {
    const { skills } = context
    
    const baseHints: TechnologyHint[] = [
      { id: 'fallback_1', name: 'JavaScript', category: 'Frontend', relevance: 0.9 },
      { id: 'fallback_2', name: 'TypeScript', category: 'Frontend', relevance: 0.8 },
      { id: 'fallback_3', name: 'React', category: 'Frontend', relevance: 0.8 },
      { id: 'fallback_4', name: 'Vue.js', category: 'Frontend', relevance: 0.7 },
      { id: 'fallback_5', name: 'Node.js', category: 'Backend', relevance: 0.7 },
      { id: 'fallback_6', name: 'HTML/CSS', category: 'Frontend', relevance: 0.9 },
      { id: 'fallback_7', name: 'Git', category: 'Tools', relevance: 0.8 },
      { id: 'fallback_8', name: 'Webpack', category: 'Tools', relevance: 0.6 },
      { id: 'fallback_9', name: 'REST API', category: 'Backend', relevance: 0.8 },
      { id: 'fallback_10', name: 'SQL', category: 'Database', relevance: 0.7 }
    ]

    // Добавляем подсказки на основе навыков пользователя
    const userSkills = [...skills.primary, ...skills.frameworks]
    const additionalHints = userSkills
      .filter(skill => !baseHints.some(hint => hint.name.toLowerCase().includes(skill.toLowerCase())))
      .map((skill, index) => ({
        id: `user_skill_${index}`,
        name: skill,
        category: 'User Skills',
        relevance: 0.9
      }))

    return [...baseHints, ...additionalHints].slice(0, this.MAX_HINTS)
  }

  /**
   * Заглушка для тестирования
   */
  private getMockLLMResponse(): string {
    return JSON.stringify([
      { name: "JavaScript ES6+", category: "Frontend", relevance: 0.95 },
      { name: "TypeScript", category: "Frontend", relevance: 0.9 },
      { name: "React Hooks", category: "Frontend", relevance: 0.9 },
      { name: "Vue 3 Composition API", category: "Frontend", relevance: 0.85 },
      { name: "Node.js", category: "Backend", relevance: 0.8 },
      { name: "Express.js", category: "Backend", relevance: 0.75 },
      { name: "MongoDB", category: "Database", relevance: 0.7 },
      { name: "PostgreSQL", category: "Database", relevance: 0.7 },
      { name: "Docker", category: "DevOps", relevance: 0.65 },
      { name: "Kubernetes", category: "DevOps", relevance: 0.6 },
      { name: "AWS", category: "Cloud", relevance: 0.6 },
      { name: "GraphQL", category: "API", relevance: 0.7 },
      { name: "REST API", category: "API", relevance: 0.8 },
      { name: "WebSocket", category: "Real-time", relevance: 0.6 },
      { name: "Jest", category: "Testing", relevance: 0.7 },
      { name: "Cypress", category: "Testing", relevance: 0.6 },
      { name: "Webpack", category: "Build Tools", relevance: 0.6 },
      { name: "Vite", category: "Build Tools", relevance: 0.7 },
      { name: "Git", category: "Version Control", relevance: 0.8 },
      { name: "CI/CD", category: "DevOps", relevance: 0.65 }
    ])
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
export const hintGeneratorService = new HintGeneratorService()
