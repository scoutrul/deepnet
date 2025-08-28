import type { ParsedResponse, InteractiveTerm } from '@/types/ai'

export function parseToUiModel(raw: string): ParsedResponse | null {
	try {
		const json = JSON.parse(raw)
		if (!json || typeof json !== 'object') return null
		if (typeof json.text !== 'string' || !Array.isArray(json.terms)) return null
		const terms: InteractiveTerm[] = []
		for (const t of json.terms) {
			if (!t) continue
			const text = typeof t.text === 'string' ? t.text.trim() : ''
			const info = typeof t.info === 'string' ? t.info.trim() : ''
			if (text && info) terms.push({ text, info })
		}
		return { text: String(json.text).trim(), terms }
	} catch {
		return null
	}
}
