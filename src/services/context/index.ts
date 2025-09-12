// Context Services - Инициализация всех сервисов контекста
import { LLMAgent } from './llmAgent'
import { DialogProcessor } from './dialogProcessor'
import { ContextManager } from './contextManager'
import { HintGenerator } from './hintGenerator'
import { SearchService } from './searchService'
import { appConfig } from '../../config/appConfig'

// Создание LLM агента
const llmAgent = new LLMAgent({
  apiKey: appConfig.llm.apiKey || '',
  baseUrl: appConfig.llm.baseUrl,
  model: appConfig.llm.model
})

// Создание сервисов с LLM агентом
export const dialogProcessor = new DialogProcessor(llmAgent)
export const contextManager = new ContextManager()
export const hintGenerator = new HintGenerator(llmAgent)
export const searchService = new SearchService(llmAgent)

// Экспорт классов для использования в компонентах
export { DialogProcessor, ContextManager, HintGenerator, SearchService, LLMAgent }

console.log('🎯 [CONTEXT] All context services initialized')
