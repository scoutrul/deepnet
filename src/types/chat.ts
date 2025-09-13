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

// ==================== ДИАРИЗАЦИЯ ДИАЛОГОВ ====================

export interface DiarizedSpeaker {
	id: string
	name: string
	color: string
	displayName: string
}

export interface DiarizedSegment {
	id: string
	speakerId: string
	speakerName: string
	text: string
	isFinal: boolean
	timestamp: number
	confidence: number
	startTime?: number
	endTime?: number
}

export interface DiarizedMessage {
	id: string
	speakerId: string
	speakerName: string
	speakerColor: string
	content: string
	timestamp: number
	segments: DiarizedSegment[]
	isActive: boolean
}

export interface DiarizationState {
	isActive: boolean
	isConnecting: boolean
	error: string | null
	speakers: Record<string, DiarizedSpeaker>
	activeSegments: Record<string, DiarizedSegment>
}
