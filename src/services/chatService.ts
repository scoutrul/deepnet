import { fetchCompletion } from '@/services/aiClient'
import { parseToUiModel } from '@/services/responseParser'
import type { ParsedResponse } from '@/types/ai'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.openai.com/v1'
const MODEL = import.meta.env.VITE_CHAT_MODEL || 'gpt-4'
const TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 5000)
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

export const chatService = {
	async ask(question: string, opts?: { usePreviousContext?: boolean; previousAssistantText?: string; detailLevel?: 'short' | 'extended' | 'max' }): Promise<{ raw: string; parsed: ParsedResponse | null }> {
		const level = opts?.detailLevel || 'extended'
		const systemPrompt = buildSystemPrompt(level)
		const { temperature, maxTokens } = tuningByLevel(level)

		if (!API_KEY) {
			const mock = buildMockResponse(question, level)
			return { raw: JSON.stringify(mock), parsed: mock }
		}

		const raw = await fetchCompletion({
			systemPrompt,
			question,
			model: MODEL,
			timeoutMs: TIMEOUT_MS,
			apiKey: API_KEY,
			apiBaseUrl: BASE_URL,
			title: import.meta.env.VITE_APP_TITLE || 'DeepNet Encyclopedia',
			temperature,
			maxTokens,
			previousAssistantContent: opts?.usePreviousContext ? (opts?.previousAssistantText || '') : undefined,
		})
		const parsed = parseToUiModel(raw)
		return { raw, parsed }
	},
}

function tuningByLevel(level: 'short' | 'extended' | 'max') {
	if (level === 'short') return { temperature: 0.3, maxTokens: 350 }
	if (level === 'max') return { temperature: 0.7, maxTokens: 1200 }
	return { temperature: 0.5, maxTokens: 700 }
}

function buildSystemPrompt(level: 'short' | 'extended' | 'max' = 'extended'): string {
	const levelHint = level === 'short' ? 'Дай максимально краткий ответ.' : level === 'max' ? 'Дай максимально полный ответ.' : 'Дай сбалансированный ответ.'
	return `Ты — интерактивный чат-помощник «Энциклопедия Погружение». Твоя цель — помогать пользователю быстро погружаться в любую техническую тему через короткие, понятные ответы.\n\n${levelHint}\n\nПравила работы:\n1. Отвечай коротко: 2–3 предложения максимум.\n2. Выделяй ключевые термины/фразы, которые имеют смысловую нагрузку и могут быть интерактивными.\n3. После каждого ответа предоставляй список сопутствующих терминов и технологий.\n4. Все ответы должны быть контекстно связаны с предыдущими вопросами и ответами пользователя.\n5. Стиль — ясный, технический, без лишней воды.\n6. Если пользователь выбирает термин из списка, давай новый короткий ответ по выбранному термину, снова с сопутствующими терминами.\n7. Ключевые термины должны быть осмысленными, а не каждое отдельное слово.\n\nФормат ответа (JSON):\n{\n  \"text\": \"<короткий текст с выделенными терминами>\",\n  \"terms\": [\n    {\"text\": \"<термин>\", \"info\": \"<короткое объяснение или ссылка>\"},\n    {\"text\": \"<термин>\", \"info\": \"<короткое объяснение или ссылка>\"}\n  ]\n}`
}

function buildMockResponse(question: string, level: 'short' | 'extended' | 'max'): ParsedResponse {
	const baseTerms = [
		{ text: 'Vue 2 Options API', info: 'Классический способ описания компонентов через объект options.' },
		{ text: 'Reactivity', info: 'Система реактивности отслеживает зависимости и обновляет DOM.' },
		{ text: 'Promise chaining', info: 'Последовательная обработка асинхронных операций с помощью then().' },
		{ text: 'TypeScript', info: 'Статическая типизация для улучшения DX и надёжности.' },
	]
	const prefix = level === 'short' ? 'Коротко по запросу' : level === 'max' ? 'Максимально подробно по запросу' : 'Развернуто по запросу'
	const text = `${prefix}: «${question}». Обратите внимание на Vue 2 Options API, Reactivity и Promise chaining.`
	return { text, terms: baseTerms }
}
