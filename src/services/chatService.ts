// import { fetchCompletion } from '@/services/aiClient'
import { OpenRouterProvider } from '@/services/providers/openrouterProvider'
import { AnthropicProvider } from '@/services/providers/anthropicProvider'
import type { ChatProvider } from '@/services/providers/types'
import { parseToUiModel } from '@/services/responseParser'
import type { ParsedResponse } from '@/types/ai'

const MODEL = import.meta.env.VITE_CHAT_MODEL || 'gpt-4o'
const TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 5000)
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

export const chatService = {
	async ask(question: string, opts?: { usePreviousContext?: boolean; previousAssistantText?: string; detailLevel?: 'short' | 'extended' | 'max'; systemPrompt?: string }): Promise<{ raw: string; parsed: ParsedResponse | null; isTimeout: boolean; isError: boolean; originalQuestion?: string; isCreditLimit?: boolean; availableTokens?: number }> {
		const level = opts?.detailLevel || 'extended'
		const systemPrompt = opts?.systemPrompt || buildSystemPrompt(level)
		let { temperature, maxTokens } = tuningByLevel(level)
		
		// Проверяем, есть ли информация о предыдущих ошибках 402 для ограничения max_tokens
		const lastError = localStorage.getItem('lastOpenRouterError')
		if (lastError) {
			try {
				const errorInfo = JSON.parse(lastError)
				if (errorInfo.code === 402 && errorInfo.availableTokens) {
					// Ограничиваем max_tokens доступным количеством с запасом
					const safeLimit = Math.floor(errorInfo.availableTokens * 0.9) // 90% от доступного
					if (maxTokens > safeLimit) {
	
						maxTokens = safeLimit
					}
				}
			} catch (e) {
				// Failed to parse last error info
			}
		}

		if (!API_KEY) {
			const mock = buildMockResponse(question, level)
			return { 
				raw: JSON.stringify(mock), 
				parsed: mock,
				isTimeout: false,
				isError: false,
				originalQuestion: question
			}
		}

		// Выбор провайдера: Anthropic для моделей claude*, иначе OpenRouter
		let provider: ChatProvider
		const isAnthropic = /^claude/i.test(MODEL)
		provider = isAnthropic ? new AnthropicProvider() : new OpenRouterProvider()
		const providerApiKey = isAnthropic ? (ANTHROPIC_API_KEY || API_KEY) : API_KEY

		const result = await provider.complete({
			systemPrompt,
			question,
			model: MODEL,
			timeoutMs: TIMEOUT_MS,
			apiKey: providerApiKey,
			temperature,
			maxTokens,
			referrer: import.meta.env.VITE_HTTP_REFERRER || location.origin,
			title: import.meta.env.VITE_APP_TITLE || 'DeepNet Encyclopedia',
			previousAssistantContent: opts?.usePreviousContext ? (opts?.previousAssistantText || '') : undefined,
		})
		

		const parsed = result.isTimeout ? null : parseToUiModel(result.content)

		
		return { 
			raw: result.content, 
			parsed,
			isTimeout: result.isTimeout,
			isError: result.isError,
			originalQuestion: result.originalQuestion,
			isCreditLimit: result.isCreditLimit,
			availableTokens: result.availableTokens
		}
	},
}

// Константы для настройки уровней подробности
const TOKEN_LIMITS = {
	SHORT: 200,
	EXTENDED: 600,
	MAX: 1500
}

function tuningByLevel(level: 'short' | 'extended' | 'max') {
	// Базовые настройки для каждого уровня с большей разницей
	const baseSettings = {
		short: { temperature: 0.2, maxTokens: TOKEN_LIMITS.SHORT },      // Более низкая температура для краткости
		extended: { temperature: 0.5, maxTokens: TOKEN_LIMITS.EXTENDED },   // Средний уровень
		max: { temperature: 0.8, maxTokens: TOKEN_LIMITS.MAX }        // Высокая температура для креативности и деталей
	}
	
	const settings = { ...baseSettings[level] } // Создаем копию для изменения
	
	// Проверяем, есть ли ограничения по кредитам
	const lastError = localStorage.getItem('lastOpenRouterError')
	if (lastError) {
		try {
			const errorInfo = JSON.parse(lastError)
			if (errorInfo.code === 402 && errorInfo.availableTokens) {
				// Ограничиваем max_tokens доступным количеством с запасом
				const safeLimit = Math.floor(errorInfo.availableTokens * 0.8) // 80% от доступного
				if (settings.maxTokens > safeLimit) {
	
					settings.maxTokens = safeLimit
				}
			}
					} catch (e) {
				// Failed to parse credit limit info
			}
	}
	

	return settings
}

function buildSystemPrompt(level: 'short' | 'extended' | 'max' = 'extended'): string {
	let detailInstructions = ''
	let termsCount = 3
	
	if (level === 'short') {
		detailInstructions = 'Дай максимально краткий ответ: 1-2 предложения максимум. Фокус на самом главном. Используй максимум 150 токенов.'
		termsCount = 2
	} else if (level === 'max') {
		detailInstructions = `Дай максимально полный и детальный ответ: 6-8 предложений. Включи примеры, детали, практические аспекты, углубленные концепции. Используй максимум ${TOKEN_LIMITS.MAX} токенов.`
		termsCount = 6
	} else {
		detailInstructions = 'Дай сбалансированный ответ: 3-4 предложения. Достаточно деталей для понимания, но без избыточности. Используй максимум 600 токенов.'
		termsCount = 4
	}
	
	return `Ты — интерактивный чат-помощник «Энциклопедия Погружение». Твоя цель — помогать пользователю быстро погружаться в любую техническую тему через понятные ответы.

${detailInstructions}

Правила работы:
1. ${detailInstructions}
2. ВСЕГДА отвечай на РУССКОМ языке. Никаких английских фраз или терминов без перевода.
3. Выделяй ключевые термины/фразы, которые имеют смысловую нагрузку и могут быть интерактивными.
4. После каждого ответа предоставляй список из ${termsCount} сопутствующих терминов и технологий.
5. Все ответы должны быть контекстно связаны с предыдущими вопросами и ответами пользователя.
6. Стиль — ясный, технический, без лишней воды.
7. Если пользователь выбирает термин из списка, давай новый ответ по выбранному термину, снова с сопутствующими терминами.
8. Ключевые термины должны быть осмысленными, а не каждое отдельное слово.
9. Для кратких ответов: фокус на сути. Для развернутых: добавь примеры и практические детали.

ВАЖНО: Всегда отвечай в JSON формате на РУССКОМ языке:
{
  "text": "<текст ответа на русском языке с выделенными терминами>",
  "terms": [
    {"text": "<термин на русском>", "info": "<короткое объяснение на русском языке>"},
    {"text": "<термин на русском>", "info": "<короткое объяснение на русском языке>"}
  ]
}`
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
