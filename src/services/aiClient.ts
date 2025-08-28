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
}

export async function fetchCompletion(params: FetchCompletionParams): Promise<string> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), params.timeoutMs)
	try {
		const msgs: Array<{ role: string; content: string }> = [
			{ role: 'system', content: params.systemPrompt },
		]
		if (params.previousAssistantContent && params.previousAssistantContent.trim()) {
			msgs.push({ role: 'assistant', content: params.previousAssistantContent })
		}
		msgs.push({ role: 'user', content: params.question })

		const response = await fetch(`${params.apiBaseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${params.apiKey}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': location.origin,
				'X-Title': params.title || 'DeepNet Encyclopedia',
			},
			body: JSON.stringify({
				model: params.model,
				messages: msgs,
				max_tokens: params.maxTokens ?? 800,
				temperature: params.temperature ?? 0.5,
			}),
			signal: controller.signal,
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({} as any))
			throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || ''}`)
		}
		const data = await response.json()
		return data?.choices?.[0]?.message?.content ?? 'Извините, не удалось получить ответ.'
	} catch (error: any) {
		if (error.name === 'AbortError') return 'Превышено время ожидания ответа. Попробуйте ещё раз.'
		if (error.message?.includes('401')) return 'Ошибка авторизации API. Проверьте настройки.'
		if (error.message?.includes('429')) return 'Превышен лимит запросов. Попробуйте позже.'
		return 'Произошла ошибка при обращении к чату. Попробуйте ещё раз позже.'
	} finally {
		clearTimeout(timeout)
	}
}
