import type { FetchCompletionResult } from '@/types/ai'

export interface FetchCompletionParams {
	systemPrompt: string
	question: string
	model: string
	timeoutMs: number
	apiKey: string
	apiBaseUrl: string
	referrer?: string
	title?: string
	temperature?: number
	maxTokens?: number
	previousAssistantContent?: string
	onChunk?: (chunk: string) => void
}

export async function fetchCompletion(params: FetchCompletionParams): Promise<FetchCompletionResult> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), params.timeoutMs)
	
	// Debug logging

	
	try {
		const msgs: Array<{ role: string; content: string }> = [
			{ role: 'system', content: params.systemPrompt },
		]
		if (params.previousAssistantContent && params.previousAssistantContent.trim()) {
			// Очищаем HTML теги из предыдущего контекста
			const cleanContent = params.previousAssistantContent
				.replace(/<[^>]*>/g, '') // Убираем все HTML теги
				.replace(/&[a-zA-Z]+;/g, '') // Убираем HTML entities
				.trim()
			

			
			if (cleanContent) {
				msgs.push({ role: 'assistant', content: cleanContent })
			}
		}
		msgs.push({ role: 'user', content: params.question })

		const response = await fetch(`${params.apiBaseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${params.apiKey}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': params.referrer || location.origin,
				'X-Title': params.title || 'DeepNet Encyclopedia',
			},
			body: JSON.stringify({
				model: `${params.model}`,
				messages: msgs,
				max_tokens: params.maxTokens ?? 800,
				temperature: params.temperature ?? 0.5,
				stream: true
			}),
			signal: controller.signal,
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({} as any))
			throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorData.error?.message || ''}`)
		}

		// Обработка потокового ответа (SSE)
		if (!response.body) {
			throw new Error('Response body is null')
		}

		const reader = response.body.getReader()
		const decoder = new TextDecoder()
		let fullContent = ''
		
		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				
				const chunk = decoder.decode(value)
				const lines = chunk.split('\n')
				
				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6) // Убираем 'data: '
						
						if (data === '[DONE]') {
							break
						}
						
						try {
							const parsed = JSON.parse(data)
							if (parsed.choices?.[0]?.delta?.content) {
								const contentChunk = parsed.choices[0].delta.content
								fullContent += contentChunk
								
								// Вызываем callback для потокового обновления UI
								if (params.onChunk) {
									params.onChunk(contentChunk)
								}
							}
						} catch (e) {
							// Игнорируем ошибки парсинга отдельных чанков
						}
					}
				}
			}
		} finally {
			reader.releaseLock()
		}


		return {
			content: fullContent || 'Извините, не удалось получить ответ.',
			isTimeout: false,
			isError: false
		}
			} catch (error: any) {


		if (error.name === 'AbortError') {
			return {
				content: 'Request timeout exceeded. Please try again.',
				isTimeout: true,
				isError: false,
				originalQuestion: params.question
			}
		}
		if (error.message?.includes('400')) {
			return {
				content: `HTTP 400: ${error.message}`,
				isTimeout: false,
				isError: true,
				originalQuestion: params.question
			}
		}
		
		if (error.message?.includes('401')) {
			return {
				content: `HTTP 401: ${error.message}`,
				isTimeout: false,
				isError: true,
				originalQuestion: params.question
			}
		}
		if (error.message?.includes('429')) {
			return {
				content: `HTTP 429: ${error.message}`,
				isTimeout: false,
				isError: true,
				originalQuestion: params.question
			}
		}
		if (error.message?.includes('402') || error.message?.includes('Payment Required') || error.message?.includes('requires more credits')) {
			// Пытаемся извлечь информацию о доступных токенах из ошибки
			let availableTokens = null
			
			// Если есть информация о доступных токенах, извлекаем её
			if (error.message?.includes('can only afford')) {
				const match = error.message.match(/can only afford (\d+) tokens/)
				if (match) {
					availableTokens = parseInt(match[1])
				}
			}
			
			// Сохраняем информацию об ошибке для будущих запросов
			if (availableTokens) {
				try {
					localStorage.setItem('lastOpenRouterError', JSON.stringify({
						code: 402,
						availableTokens,
						timestamp: Date.now()
					}))
				} catch (e) {
					// Failed to save error info to localStorage
				}
			}
			
			return {
				content: `HTTP 402: ${error.message}`,
				isTimeout: false,
				isError: true,
				isCreditLimit: true,
				availableTokens: availableTokens || undefined,
				originalQuestion: params.question
			}
		}
		return {
			content: `API Error: ${error.message}`,
			isTimeout: false,
			isError: true,
			originalQuestion: params.question
		}
	} finally {
		clearTimeout(timeout)
	}
}
