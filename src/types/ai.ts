export interface InteractiveTerm {
	text: string
	info: string
}

export interface ParsedResponse {
	text: string
	terms: InteractiveTerm[]
}
