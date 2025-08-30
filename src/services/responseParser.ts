import type { ParsedResponse, InteractiveTerm } from '@/types/ai'

export function parseToUiModel(raw: string): ParsedResponse | null {

	
	// Очищаем от markdown разметки (```json ... ```)
	let cleanRaw = raw.trim()

	// АГРЕССИВНАЯ очистка: убираем ВСЕ HTML-атрибуты и теги, оставляем только чистый текст
	cleanRaw = cleanRaw
		// 0. Специфично удаляем паттерны " data-info="">" и подобные
		.replace(/"\s+data-info="[^"]*"[^>]*>/g, '')
		.replace(/"\s+data-[a-zA-Z-]+="[^"]*"[^>]*>/g, '')
		// 1. Удаляем ВСЕ HTML-теги с атрибутами
		.replace(/<[^>]*>/g, '')
		// 2. Удаляем ВСЕ data-* атрибуты в любом виде
		.replace(/data-[a-zA-Z-]+="[^"]*"/g, '')
		// 3. Удаляем ВСЕ class и style атрибуты
		.replace(/class="[^"]*"/g, '')
		.replace(/style="[^"]*"/g, '')
		// 4. Удаляем ВСЕ оставшиеся HTML-атрибуты
		.replace(/[a-zA-Z-]+="[^"]*"/g, '')
		// 5. Удаляем ВСЕ оставшиеся HTML-теги
		.replace(/<[^>]*>/g, '')
		// 6. Удаляем ВСЕ оставшиеся символы > и <
		.replace(/[<>]/g, '')
		// 7. Схлопываем множественные пробелы
		.replace(/\s{2,}/g, ' ')
		.trim()

	
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
					
					// АГРЕССИВНАЯ очистка: убираем ВСЕ HTML-атрибуты и теги
					const cleanText = json.text
						// 0. Специфично удаляем паттерны " data-info="">" и подобные
						.replace(/"\s+data-info="[^"]*"[^>]*>/g, '')
						.replace(/"\s+data-[a-zA-Z-]+="[^"]*"[^>]*>/g, '')
						// 1. Удаляем ВСЕ HTML-теги с атрибутами
						.replace(/<[^>]*>/g, '')
						// 2. Удаляем ВСЕ data-* атрибуты в любом виде
						.replace(/data-[a-zA-Z-]+="[^"]*"/g, '')
						// 3. Удаляем ВСЕ class и style атрибуты
						.replace(/class="[^"]*"/g, '')
						.replace(/style="[^"]*"/g, '')
						// 4. Удаляем ВСЕ оставшиеся HTML-атрибуты
						.replace(/[a-zA-Z-]+="[^"]*"/g, '')
						// 5. Удаляем ВСЕ оставшиеся HTML-теги
						.replace(/<[^>]*>/g, '')
						// 6. Удаляем ВСЕ оставшиеся символы > и <
						.replace(/[<>]/g, '')
						.replace(/\r\n/g, '\n')
						// Обрабатываем блоки кода с обратными кавычками (```код```)
						.replace(/```(\w+)?\n?([\s\S]*?)```/g, '<blockquote class="code-block"><pre><code>$2</code></pre></blockquote>')
						// Обрабатываем inline код с обратными кавычками (`код`)
						.replace(/`([^`]+)`/g, '<code>$1</code>')
						.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **текст** -> <strong>текст</strong>
						.replace(/[^\S\n]+/g, ' ') // схлопываем только пробельные, кроме перевода строки
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
				
									// АГРЕССИВНАЯ очистка: убираем ВСЕ HTML-атрибуты и теги
					const cleanText = json.text
						// 1. Удаляем ВСЕ HTML-теги с атрибутами
						.replace(/<[^>]*>/g, '')
						// 2. Удаляем ВСЕ data-* атрибуты в любом виде
						.replace(/data-[a-zA-Z-]+="[^"]*"/g, '')
						// 3. Удаляем ВСЕ class и style атрибуты
						.replace(/class="[^"]*"/g, '')
						.replace(/style="[^"]*"/g, '')
						// 4. Удаляем ВСЕ оставшиеся HTML-атрибуты
						.replace(/[a-zA-Z-]+="[^"]*"/g, '')
						// 5. Удаляем ВСЕ оставшиеся HTML-теги
						.replace(/<[^>]*>/g, '')
						// 6. Удаляем ВСЕ оставшиеся символы > и <
						.replace(/[<>]/g, '')
						.replace(/\r\n/g, '\n')
						// Обрабатываем блоки кода с обратными кавычками (```код```)
						.replace(/```(\w+)?\n?([\s\S]*?)```/g, '<blockquote class="code-block"><pre><code>$2</code></pre></blockquote>')
						// Обрабатываем inline код с обратными кавычками (`код`)
						.replace(/`([^`]+)`/g, '<code>$1</code>')
						.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **текст** -> <strong>текст</strong>
						.replace(/[^\S\n]+/g, ' ') // схлопываем только пробельные, кроме перевода строки
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
				// Сначала попытка найти сбалансированный JSON
				let jsonEnd = jsonStart
				let braceCount = 0
				let inString = false
				let escapeNext = false
				let bracketCount = 0
				for (let i = jsonStart; i < cleanRaw.length; i++) {
					const ch = cleanRaw[i]
					if (escapeNext) { escapeNext = false; continue }
					if (ch === '\\') { escapeNext = true; continue }
					if (ch === '"') { inString = !inString; continue }
					if (!inString) {
						if (ch === '{') braceCount++
						else if (ch === '}') { braceCount--; if (braceCount === 0) { jsonEnd = i + 1; break } }
						else if (ch === '[') bracketCount++
						else if (ch === ']') bracketCount--
					}
				}
				let candidate = cleanRaw.substring(jsonStart, jsonEnd > jsonStart ? jsonEnd : cleanRaw.length)
				// Если не сбалансировано — пытаемся дозакрыть
				if (inString) candidate += '"'
				if (bracketCount > 0) candidate += ']'.repeat(bracketCount)
				if (braceCount > 0) candidate += '}'.repeat(braceCount)
				// Убираем возможную висячую запятую перед закрывающей скобкой
				candidate = candidate.replace(/,\s*([]}])/g, '$1')
				try {
					const json = JSON.parse(candidate)
					if (json && typeof json === 'object' && typeof json.text === 'string') {
						const text = json.text.trim()
						const terms: InteractiveTerm[] = []
						if (Array.isArray(json.terms)) {
							for (const t of json.terms) {
								if (t && typeof t.text === 'string' && typeof t.info === 'string') {
									terms.push({ text: t.text.trim(), info: t.info.trim() })
								}
							}
						}
						return { text, terms }
					}
				} catch {}
			}
		} catch (fixError) {
			// Error during JSON fixing attempt
		}
		
		// Если JSON не парсится, обрабатываем как обычный текст
	}

	// Fallback: обрабатываем обычный текст
	const text = cleanRaw.trim()
	if (!text) return null

	// АГРЕССИВНАЯ очистка: убираем ВСЕ HTML-атрибуты и теги
	const cleanText = text
		// 0. Специфично удаляем паттерны " data-info="">" и подобные
		.replace(/"\s+data-info="[^"]*"[^>]*>/g, '')
		.replace(/"\s+data-[a-zA-Z-]+="[^"]*"[^>]*>/g, '')
		// 1. Удаляем ВСЕ HTML-теги с атрибутами
		.replace(/<[^>]*>/g, '')
		// 2. Удаляем ВСЕ data-* атрибуты в любом виде
		.replace(/data-[a-zA-Z-]+="[^"]*"/g, '')
		// 3. Удаляем ВСЕ class и style атрибуты
		.replace(/class="[^"]*"/g, '')
		.replace(/style="[^"]*"/g, '')
		// 4. Удаляем ВСЕ оставшиеся HTML-атрибуты
		.replace(/[a-zA-Z-]+="[^"]*"/g, '')
		// 5. Удаляем ВСЕ оставшиеся HTML-теги
		.replace(/<[^>]*>/g, '')
		// 6. Удаляем ВСЕ оставшиеся символы > и <
		.replace(/[<>]/g, '')
		// Обрабатываем блоки кода с обратными кавычками (```код```)
		.replace(/```(\w+)?\n?([\s\S]*?)```/g, '<blockquote class="code-block"><pre><code>$2</code></pre></blockquote>')
		// Обрабатываем inline код с обратными кавычками (`код`)
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **текст** -> <strong>текст</strong>
		.replace(/\s{2,}/g, ' ') // Схлопываем множественные пробелы
		.trim()


	// Извлекаем потенциальные термины из текста
	const terms: InteractiveTerm[] = []
	
	// Ищем технические термины (слова с заглавной буквы, аббревиатуры, etc.)
	const termPatterns = [
		/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Nouns/Proper names: Frontend Framework
		/\b[A-Z]{2,}\b/g, // API, DOM, JSON
		/\b(?:[A-Z][a-z0-9]+\.)+[A-Za-z0-9]+\b/g, // Namespaces like React.DOM
		/\b[a-z]+(?:\.[a-z]+)+\b/g, // promise.then, fetch.catch
		/\b\w+\(\)\b/g, // then(), catch()
		/\b[A-Za-z]+[- ][A-Za-z]+\b/g, // composed phrases: Virtual DOM, data flow
	]

	const foundTerms = new Set<string>()
	
	for (const pattern of termPatterns) {
		const matches = cleanText.match(pattern)
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

	// Возвращаем все найденные термины
	return { text: cleanText, terms }
}
