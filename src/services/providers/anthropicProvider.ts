import Anthropic from '@anthropic-ai/sdk'
import type { ChatProvider, ProviderRequest } from './types'
import type { FetchCompletionResult } from '@/types/ai'

export class AnthropicProvider implements ChatProvider {
  async complete(params: ProviderRequest): Promise<FetchCompletionResult> {
    const client = new Anthropic({ apiKey: params.apiKey, dangerouslyAllowBrowser: true })

    try {
      const msgs: Array<{ role: 'user' | 'assistant'; content: string }> = []
      if (params.previousAssistantContent && params.previousAssistantContent.trim()) {
        const clean = params.previousAssistantContent.replace(/<[^>]*>/g, '').replace(/&[a-zA-Z]+;/g, '').trim()
        if (clean) msgs.push({ role: 'assistant', content: clean })
      }
      msgs.push({ role: 'user', content: params.question })

      const result = await client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens ?? 800,
        temperature: params.temperature ?? 0.5,
        system: params.systemPrompt,
        messages: msgs,
      }) as any

      let text = ''
      const parts = result?.content || []
      for (const part of parts) {
        if (part?.type === 'text' && part?.text) {
          text += part.text
        }
      }
      if (!text && typeof result?.content === 'string') {
        text = result.content
      }

      return { content: text || '', isTimeout: false, isError: false }
    } catch (error: any) {
      const message = error?.message || 'Anthropic API error'
      if (message.includes('timeout')) {
        return { content: 'Request timeout exceeded. Please try again.', isTimeout: true, isError: false }
      }
      return { content: `Anthropic Error: ${message}`, isTimeout: false, isError: true, originalQuestion: params.question }
    }
  }
}


