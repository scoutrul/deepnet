// Context Services - Инициализация всех сервисов контекста
import { LLMAgent } from './llmAgent'
import { DialogProcessor } from './dialogProcessor'
import { ContextService } from './contextService'
import { appConfig } from '../../config/appConfig'

// Создание LLM агента
const llmAgent = new LLMAgent({
  apiKey: appConfig.llm.apiKey || '',
  baseUrl: appConfig.llm.baseUrl,
  model: appConfig.llm.model
})

// Создание сервисов с LLM агентом
export const dialogProcessor = new DialogProcessor(llmAgent)
export const contextService = new ContextService(llmAgent)

// Обратная совместимость - экспорт старых сервисов через новый
export const contextManager = contextService
export const contextAssistant = contextService
export const hintGenerator = contextService
export const searchService = contextService

// Экспорт классов для использования в компонентах
export { DialogProcessor, ContextService, LLMAgent }

console.log('🎯 [CONTEXT] All context services initialized')
