import { fetchCompletion } from '@/services/aiClient'
import type { ChatProvider, ProviderRequest } from './types'

export class OpenRouterProvider implements ChatProvider {
  async complete(params: ProviderRequest) {
    return fetchCompletion({
      systemPrompt: params.systemPrompt,
      question: params.question,
      model: params.model,
      timeoutMs: params.timeoutMs,
      apiKey: params.apiKey,
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://openrouter.ai/api/v1',
      referrer: params.referrer || import.meta.env.VITE_HTTP_REFERRER || location.origin,
      title: params.title || import.meta.env.VITE_APP_TITLE || 'DeepNet Encyclopedia',
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      previousAssistantContent: params.previousAssistantContent,
      onChunk: params.onChunk,
    })
  }
}


