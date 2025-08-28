import type { ParsedResponse, InteractiveTerm } from '@/types/ai'

export function parseToUiModel(raw: string): ParsedResponse | null {

	
	// Очищаем от markdown разметки (```json ... ```)
	let cleanRaw = raw.trim()

	
	if (cleanRaw.startsWith('```json') && cleanRaw.endsWith('```')) {
		cleanRaw = cleanRaw.slice(7, -3).trim() // Убираем ```json и ```

	} else if (cleanRaw.startsWith('```') && cleanRaw.endsWith('```')) {
		cleanRaw = cleanRaw.slice(3, -3).trim() // Убираем ``` и ```

	} else {

	}
	
	// Ищем JSON в конце текста (часто AI возвращает текст + JSON)
	const jsonMatch = cleanRaw.match(/\{[\s\S]*\}$/)
	if (jsonMatch) {
		try {
			const jsonStr = jsonMatch[0]
			const json = JSON.parse(jsonStr)

			
			// Проверяем структуру JSON
			if (json && typeof json === 'object') {
				
				
				if (typeof json.text === 'string' && Array.isArray(json.terms)) {
					const terms: InteractiveTerm[] = []
					for (const t of json.terms) {
						if (!t) continue
						const text = typeof t.text === 'string' ? t.text.trim() : ''
						const info = typeof t.info === 'string' ? t.info.trim() : ''
						if (text && info) terms.push({ text, info })
					}
					
					// Очищаем текст от лишних пробелов и форматируем
					const cleanText = json.text
						.replace(/\s+/g, ' ') // Убираем множественные пробелы
						.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **текст** -> <strong>текст</strong>
						.replace(/`([^`]+)`/g, '<code>$1</code>') // `код` -> <code>код</code>
						.trim()
					
					// Очищаем термины от лишних пробелов
					const cleanTerms = terms.map(term => ({
						...term,
						text: term.text.trim(),
						info: term.info.trim()
					}))
					
					return { text: cleanText, terms: cleanTerms }
				} else {
					
				}
			}
		} catch (error) {
			// JSON at end parsing failed
		}
	}
	
	// Если JSON не найден в конце, пытаемся распарсить весь текст как JSON
	try {
		const json = JSON.parse(cleanRaw)

		
		// Проверяем структуру JSON
		if (json && typeof json === 'object') {

			
			if (typeof json.text === 'string' && Array.isArray(json.terms)) {
				const terms: InteractiveTerm[] = []
				for (const t of json.terms) {
					if (!t) continue
					const text = typeof t.text === 'string' ? t.text.trim() : ''
					const info = typeof t.info === 'string' ? t.info.trim() : ''
					if (text && info) terms.push({ text, info })
				}
				
				// Очищаем текст от лишних пробелов и форматируем
				const cleanText = json.text
					.replace(/\s+/g, ' ') // Убираем множественные пробелы
					.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **текст** -> <strong>текст</strong>
					.replace(/`([^`]+)`/g, '<code>$1</code>') // `код` -> <code>код</code>
					.trim()
				
				// Очищаем термины от лишних пробелов
				const cleanTerms = terms.map(term => ({
					...term,
					text: term.text.trim(),
					info: term.info.trim()
				}))
				
				return { text: cleanText, terms: cleanTerms }
			} else {

			}
		}

	} catch (error) {

		
		// Пытаемся исправить неполный JSON
		try {
			// Ищем начало JSON объекта
			const jsonStart = cleanRaw.indexOf('{')
			if (jsonStart !== -1) {
				// Ищем закрывающие скобки для text и terms
				let jsonEnd = jsonStart
				let braceCount = 0
				let inString = false
				let escapeNext = false
				
				for (let i = jsonStart; i < cleanRaw.length; i++) {
					const char = cleanRaw[i]
					
					if (escapeNext) {
						escapeNext = false
						continue
					}
					
					if (char === '\\') {
						escapeNext = true
						continue
					}
					
					if (char === '"' && !escapeNext) {
						inString = !inString
						continue
					}
					
					if (!inString) {
						if (char === '{') {
							braceCount++
						} else if (char === '}') {
							braceCount--
							if (braceCount === 0) {
								jsonEnd = i + 1
								break
							}
						}
					}
				}
				
				if (braceCount === 0 && jsonEnd > jsonStart) {
					const fixedJson = cleanRaw.substring(jsonStart, jsonEnd)
	
					
					try {
						const json = JSON.parse(fixedJson)
						if (json && typeof json === 'object' && typeof json.text === 'string') {
							// Извлекаем текст и пытаемся найти термины
							const text = json.text.trim()
							const terms: InteractiveTerm[] = []
							
							// Если есть terms, используем их
							if (Array.isArray(json.terms)) {
								for (const t of json.terms) {
									if (t && typeof t.text === 'string' && typeof t.info === 'string') {
										terms.push({
											text: t.text.trim(),
											info: t.info.trim()
										})
									}
								}
							}
							
							// Если терминов нет, извлекаем их из текста
							if (terms.length === 0) {
								const termPatterns = [
									/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
									/\b[A-Z]{2,}\b/g,
									/\b[a-z]+(?:\.[a-z]+)+\b/g,
									/\b\w+\(\)\b/g,
								]
								
								const foundTerms = new Set<string>()
								for (const pattern of termPatterns) {
									const matches = text.match(pattern)
									if (matches) {
										matches.forEach((match: string) => {
											if (match.length > 2 && !foundTerms.has(match)) {
												foundTerms.add(match)
												terms.push({
													text: match,
													info: `Термин: ${match}`
												})
											}
										})
									}
								}
							}
							
							// Ограничиваем количество терминов
							const limitedTerms = terms.slice(0, 5)
							
							return { text, terms: limitedTerms }
						}
					} catch (fixError) {
						// Failed to fix incomplete JSON
					}
				}
			}
		} catch (fixError) {
			// Error during JSON fixing attempt
		}
		
		// Если JSON не парсится, обрабатываем как обычный текст
	}

	// Fallback: обрабатываем обычный текст
	const text = cleanRaw.trim()
	if (!text) return null



	// Извлекаем потенциальные термины из текста
	const terms: InteractiveTerm[] = []
	
	// Ищем технические термины (слова с заглавной буквы, аббревиатуры, etc.)
	const termPatterns = [
		/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Vue 2 Options API
		/\b[A-Z]{2,}\b/g, // API, DOM, JSON
		/\b[a-z]+(?:\.[a-z]+)+\b/g, // promise.then, fetch.catch
		/\b\w+\(\)\b/g, // then(), catch()
	]

	const foundTerms = new Set<string>()
	
	for (const pattern of termPatterns) {
		const matches = text.match(pattern)
		if (matches) {
			matches.forEach(match => {
				if (match.length > 2 && !foundTerms.has(match)) {
					foundTerms.add(match)
					terms.push({
						text: match,
						info: `Термин: ${match}`
					})
				}
			})
		}
	}

	// Ограничиваем количество терминов
	const limitedTerms = terms.slice(0, 5)
	


	return { text, terms: limitedTerms }
}
