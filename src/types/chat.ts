import type { ParsedResponse } from '@/types/ai'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
	id: string
	role: ChatRole
	content: string
	parsed?: ParsedResponse
	error?: string
	createdAt: number
}
