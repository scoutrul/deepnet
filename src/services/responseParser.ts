import type { ParsedResponse, InteractiveTerm } from '@/types/ai'

export function parseToUiModel(raw: string): ParsedResponse | null {
	console.log('🔍 Parsing response:', raw.substring(0, 200) + '...')
	
	// Очищаем от markdown разметки (```json ... ```)
	let cleanRaw = raw.trim()
	console.log('🔍 Raw starts with:', cleanRaw.substring(0, 10))
	console.log('🔍 Raw ends with:', cleanRaw.length > 10 ? cleanRaw.substring(cleanRaw.length - 10) : cleanRaw)
	
	if (cleanRaw.startsWith('```json') && cleanRaw.endsWith('```')) {
		cleanRaw = cleanRaw.slice(7, -3).trim() // Убираем ```json и ```
		console.log('🔍 Cleaned markdown (json):', cleanRaw.substring(0, 100) + '...')
	} else if (cleanRaw.startsWith('```') && cleanRaw.endsWith('```')) {
		cleanRaw = cleanRaw.slice(3, -3).trim() // Убираем ``` и ```
		console.log('🔍 Cleaned markdown (no lang):', cleanRaw.substring(0, 100) + '...')
	} else {
		console.log('🔍 No markdown detected, using raw')
	}
	
	// Ищем JSON в конце текста (часто AI возвращает текст + JSON)
	const jsonMatch = cleanRaw.match(/\{[\s\S]*\}$/)
	if (jsonMatch) {
		try {
			const jsonStr = jsonMatch[0]
			const json = JSON.parse(jsonStr)
			console.log('✅ Found JSON at end, parsed:', json)
			
			// Проверяем структуру JSON
			if (json && typeof json === 'object') {
				console.log('🔍 JSON structure check:', {
					hasText: typeof json.text === 'string',
					hasTerms: Array.isArray(json.terms),
					textLength: json.text?.length || 0,
					termsCount: json.terms?.length || 0
				})
				
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
					
					console.log('✅ Returning JSON response with terms:', cleanTerms)
					return { text: cleanText, terms: cleanTerms }
				} else {
					console.log('⚠️ JSON structure invalid:', {
						textType: typeof json.text,
						termsType: Array.isArray(json.terms) ? 'array' : typeof json.terms
					})
				}
			}
		} catch (error) {
			console.log('⚠️ JSON at end parsing failed:', error)
		}
	}
	
	// Если JSON не найден в конце, пытаемся распарсить весь текст как JSON
	try {
		const json = JSON.parse(cleanRaw)
		console.log('✅ Parsed entire text as JSON:', json)
		
		// Проверяем структуру JSON
		if (json && typeof json === 'object') {
			console.log('🔍 JSON structure check:', {
				hasText: typeof json.text === 'string',
				hasTerms: Array.isArray(json.terms),
				textLength: json.text?.length || 0,
				termsCount: json.terms?.length || 0
			})
			
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
				
				console.log('✅ Returning JSON response with terms:', cleanTerms)
				return { text: cleanText, terms: cleanTerms }
			} else {
				console.log('⚠️ JSON structure invalid:', {
					textType: typeof json.text,
					termsType: Array.isArray(json.terms) ? 'array' : typeof json.terms
				})
			}
		}
		console.log('⚠️ JSON parsed but invalid structure')
	} catch (error) {
		console.log('⚠️ JSON parsing failed, trying to fix incomplete JSON:', error)
		
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
					console.log('🔧 Attempting to fix incomplete JSON:', fixedJson.substring(0, 100) + '...')
					
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
							
							console.log('✅ Fixed incomplete JSON, returning:', { text, terms: limitedTerms })
							return { text, terms: limitedTerms }
						}
					} catch (fixError) {
						console.log('⚠️ Failed to fix incomplete JSON:', fixError)
					}
				}
			}
		} catch (fixError) {
			console.log('⚠️ Error during JSON fixing attempt:', fixError)
		}
		
		// Если JSON не парсится, обрабатываем как обычный текст
	}

	// Fallback: обрабатываем обычный текст
	const text = cleanRaw.trim()
	if (!text) return null

	console.log('📝 Processing as plain text, length:', text.length)

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
	
	console.log('🔍 Extracted terms from text (fallback):', limitedTerms)

	return { text, terms: limitedTerms }
}
