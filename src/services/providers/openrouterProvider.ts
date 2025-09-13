import { fetchCompletion } from '../chat/aiClient'
import type { ChatProvider, ProviderRequest } from './types'

class OpenRouterProvider implements ChatProvider {
  async complete(params: ProviderRequest) {
    return fetchCompletion({
      systemPrompt: params.systemPrompt,
      question: params.question,
      model: params.model,
      timeoutMs: params.timeoutMs,
      apiKey: params.apiKey,
      apiBaseUrl: params.apiBaseUrl || 'https://openrouter.ai/api/v1',
      referrer: params.referrer || location.origin,
      title: params.title || 'DeepNet Context System',
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      previousAssistantContent: params.previousAssistantContent,
      onChunk: params.onChunk,
    })
  }
}

export { OpenRouterProvider }


