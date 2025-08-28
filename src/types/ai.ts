export interface InteractiveTerm {
	text: string
	info: string
}

export interface ParsedResponse {
	text: string
	terms: InteractiveTerm[]
}

export interface FetchCompletionResult {
	content: string
	isTimeout: boolean
	isError: boolean
	originalQuestion?: string
	isCreditLimit?: boolean
	availableTokens?: number
}
