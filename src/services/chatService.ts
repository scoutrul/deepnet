// import { fetchCompletion } from '@/services/aiClient'
import { OpenRouterProvider } from '@/services/providers/openrouterProvider'
import { AnthropicProvider } from '@/services/providers/anthropicProvider'
import type { ChatProvider } from '@/services/providers/types'
import { parseToUiModel } from '@/services/responseParser'
import type { ParsedResponse } from '@/types/ai'

const MODEL = import.meta.env.VITE_CHAT_MODEL || 'gpt-4o'
const TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 5000)
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

export const chatService = {
	async ask(question: string, opts?: { usePreviousContext?: boolean; previousAssistantText?: string; detailLevel?: 'short' | 'extended' | 'max'; systemPrompt?: string }): Promise<{ raw: string; parsed: ParsedResponse | null; isTimeout: boolean; isError: boolean; originalQuestion?: string; isCreditLimit?: boolean; availableTokens?: number }> {
		// Проверяем обязательные переменные окружения
		if (!import.meta.env.VITE_CHAT_MODEL) {
			throw new Error('Отсутствует VITE_CHAT_MODEL')
		}
		if (!import.meta.env.VITE_API_BASE_URL) {
			throw new Error('Отсутствует VITE_API_BASE_URL')
		}
		
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

		// Выбор провайдера: Anthropic для моделей claude*, иначе OpenRouter
		let provider: ChatProvider
		const isAnthropic = /^claude/i.test(MODEL)
		
		// Проверяем переменные окружения для выбранного провайдера
		if (isAnthropic) {
			if (!ANTHROPIC_API_KEY) {
				throw new Error('Отсутствует VITE_ANTHROPIC_API_KEY для моделей Anthropic')
			}
			provider = new AnthropicProvider()
		} else {
			// Для OpenRouter проверяем наличие API ключа
			const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY
			if (!openRouterApiKey) {
				throw new Error('Отсутствует VITE_OPENROUTER_API_KEY для OpenRouter')
			}
			provider = new OpenRouterProvider()
		}
		
		// Получаем API ключ для выбранного провайдера
		const providerApiKey = isAnthropic ? ANTHROPIC_API_KEY : import.meta.env.VITE_OPENROUTER_API_KEY

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
	SHORT: 500,
	EXTENDED: 1600,
	MAX: 3300
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
		termsCount = 8
	} else if (level === 'max') {
		detailInstructions = `Дай максимально полный и детальный ответ: 6-8 предложений. Включи примеры, детали, практические аспекты, углубленные концепции. Используй максимум ${TOKEN_LIMITS.MAX} токенов.`
		termsCount = 18
	} else {
		detailInstructions = 'Дай сбалансированный ответ: 3-4 предложения. Достаточно деталей для понимания, но без избыточности. Используй максимум 600 токенов.'
		termsCount = 12
	}
	
	return `Ты — интерактивный чат-помощник «Энциклопедия Погружение». Твоя цель — помогать пользователю быстро погружаться в любую техническую тему через понятные ответы.

${detailInstructions}

Правила работы:
1. ${detailInstructions}
2. ВСЕГДА отвечай на РУССКОМ языке. Исключение — общепринятые названия технологий (например, Vue.js, React, DOM).
3. Структурируй ответ по абзацам: 3–6 коротких абзацев, между абзацами пустая строка. Каждый абзац начинается с короткого подзаголовка (2–4 слова), выделенного **жирным**.
4. Обязательно делай отбивки между абзацами через двойной перевод строки (\n\n) или с использованием тегов <p> — мы парсим и показываем абзацами.
5. Сделай текст максимально «плотным» на термины: используй как можно больше осмысленных терминов и названий технологий прямо В ТЕКСТЕ.
6. ОБЯЗАТЕЛЬНО добавляй массив terms не менее чем из ${termsCount} элементов (можно больше, до 30). Не опускай термины — все, что сформировал, включай.
7. Каждый термин из массива terms ДОЛЖЕН дословно встречаться в тексте ответа (для клика по словам в тексте).
8. Отдавай приоритет смысловым фразам: Frontend, Framework, Vue.js, React, Virtual DOM, граф зависимостей, подписка на события, асинхронные операции, визуальные элементы и т.п. Избегай служебных слов.
9. Все ответы должны быть контекстно связаны с предыдущими вопросами и ответами пользователя. Стиль — ясный, технический, без воды.
10. Если пользователь выбирает термин из списка, давай новый ответ по выбранному термину, снова с богатым набором терминов.
11. Для кратких ответов — фокус на сути; для развернутых — добавь примеры и практические детали.
12. Строго возвращай ВАЛИДНЫЙ JSON-объект, всегда закрывай все скобки/массивы.
13. Если токенов не хватает — УМЕНЬШИ объём текста внутри поля "text", но обязательно заверши JSON корректно.

ВАЖНО: Всегда отвечай в JSON формате на РУССКОМ языке:
{
  "text": "<текст ответа на русском языке с выделенными терминами>",
  "terms": [
    {"text": "<термин на русском>", "info": "<короткое объяснение на русском языке>"},
    {"text": "<термин на русском>", "info": "<короткое объяснение на русском языке>"}
  ]
}`
}


