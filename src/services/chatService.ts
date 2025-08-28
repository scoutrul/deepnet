import { fetchCompletion } from '@/services/aiClient'
import { parseToUiModel } from '@/services/responseParser'
import type { ParsedResponse } from '@/types/ai'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://openrouter.ai/api/v1'
const MODEL = import.meta.env.VITE_CHAT_MODEL || 'gpt-4.1-mini'
const TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 20000)
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || ''

export const chatService = {
	async ask(question: string, opts?: { usePreviousContext?: boolean; previousAssistantText?: string; detailLevel?: 'short' | 'extended' | 'max' }): Promise<{ raw: string; parsed: ParsedResponse | null }> {
		const systemPrompt = buildSystemPrompt(opts?.detailLevel)

		if (!API_KEY) {
			const mock = buildMockResponse(question)
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
			temperature: 0.7,
			maxTokens: 500,
			previousAssistantContent: opts?.usePreviousContext ? (opts?.previousAssistantText || '') : undefined,
		})
		const parsed = parseToUiModel(raw)
		return { raw, parsed }
	},
}

function buildSystemPrompt(level: 'short' | 'extended' | 'max' = 'extended'): string {
	const levelHint = level === 'short' ? 'Дай максимально краткий ответ.' : level === 'max' ? 'Дай максимально полный ответ.' : 'Дай сбалансированный ответ.'
	return `Ты — интерактивный чат-помощник «Энциклопедия Погружение». Твоя цель — помогать пользователю быстро погружаться в любую техническую тему через короткие, понятные ответы.

${levelHint}

Правила работы:
1. Отвечай коротко: 2–3 предложения максимум.
2. Выделяй ключевые термины/фразы, которые имеют смысловую нагрузку и могут быть интерактивными.
3. После каждого ответа предоставляй список сопутствующих терминов и технологий.
4. Все ответы должны быть контекстно связаны с предыдущими вопросами и ответами пользователя.
5. Стиль — ясный, технический, без лишней воды.
6. Если пользователь выбирает термин из списка, давай новый короткий ответ по выбранному термину, снова с сопутствующими терминами.
7. Ключевые термины должны быть осмысленными, а не каждое отдельное слово.

Формат ответа (JSON):
{
  "text": "<короткий текст с выделенными терминами>",
  "terms": [
    {"text": "<термин>", "info": "<короткое объяснение или ссылка>"},
    {"text": "<термин>", "info": "<короткое объяснение или ссылка>"}
  ]
}`
}

function buildMockResponse(question: string): ParsedResponse {
	const baseTerms = [
		{ text: 'Vue 2 Options API', info: 'Классический способ описания компонентов через объект options.' },
		{ text: 'Reactivity', info: 'Система реактивности отслеживает зависимости и обновляет DOM.' },
		{ text: 'Promise chaining', info: 'Последовательная обработка асинхронных операций с помощью then().' },
		{ text: 'TypeScript', info: 'Статическая типизация для улучшения DX и надёжности.' },
	]
	const text = `Коротко по запросу: «${question}». Обратите внимание на Vue 2 Options API, Reactivity и Promise chaining.`
	return { text, terms: baseTerms }
}
