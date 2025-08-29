import type { FetchCompletionResult } from '@/types/ai'

export interface ProviderRequest {
  systemPrompt: string
  question: string
  model: string
  timeoutMs: number
  apiKey: string
  temperature?: number
  maxTokens?: number
  previousAssistantContent?: string
  referrer?: string
  title?: string
  onChunk?: (chunk: string) => void
}

export interface ChatProvider {
  complete(params: ProviderRequest): Promise<FetchCompletionResult>
}


