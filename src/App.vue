<template>
	<div class="min-h-screen bg-slate-50 text-slate-900">
		<div class="mx-auto max-w-6xl px-4 py-4">
			<h1 class="mb-4 text-2xl font-semibold">DeepNet Encyclopedia</h1>
			<div class="grid grid-cols-3 gap-4">
				<div class="col-span-2">
					<div class="flex flex-col rounded-xl border border-slate-200 bg-white">
						<div class="px-4 py-4 space-y-3">
							<Message v-for="m in messages" :key="m.id" :message="m" :queued="queuedTerms" @click-term="onClickTerm" @queue-term="onQueueTerm" @retry="onRetry" @clarify="onClarify" />
							<div v-if="draft" class="w-full flex justify-end">
								<div class="max-w-[80%] rounded-2xl px-3 py-2 shadow-sm border bg-slate-900 text-slate-50 border-slate-800">
									<div class="flex items-center gap-1 text-sm">
										<span class="animate-pulse">●</span>
										<span class="animate-pulse delay-150">●</span>
										<span class="animate-pulse delay-300">●</span>
									</div>
								</div>
							</div>
							<div v-else class="h-4"></div>
						</div>
						<div class="border-t border-slate-200 px-4 py-3">
							<ChatInput ref="chatInput" :loading="loading" @submit="onSubmit" @draft-change="onDraftChange" />
							<p class="mt-2 text-xs text-slate-500">Подсказки: ЛКМ — сразу спросить. ПКМ/⌃-клик — добавить в запрос. Enter — отправить. Кнопка «Отправить» тоже доступна.</p>
						</div>
					</div>
				</div>
				<div class="col-span-1">
					<div class="sticky top-4">
						<OptionsPanel v-model="options" />
					</div>
				</div>
			</div>

			<div v-if="isDev" class="mt-4 rounded-xl border border-slate-200 bg-white p-3">
				<div class="mb-2 text-xs font-semibold text-slate-700">Отладка: тело запроса</div>
				<pre class="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-slate-900 p-3 text-xs text-slate-100"><code>{{ lastRequestPreview }}</code></pre>
			</div>
		</div>
	</div>
</template>

<script>
import { v4 as uuid } from 'uuid'
import Message from '@/components/Message.vue'
import ChatInput from '@/components/ChatInput.vue'
import OptionsPanel from '@/components/OptionsPanel.vue'
import { chatService } from '@/services/chatService'

export default {
	name: 'App',
	components: { Message, ChatInput, OptionsPanel },
	data() {
		return {
			messages: [
				{
					id: uuid(),
					role: 'assistant',
					content: '',
					parsed: {
						text: 'Здравствуйте! Что бы вы хотели узнать сегодня? Начните с Vue 2 Options API или Reactivity, можно ещё про Promise chaining.',
						terms: [
							{ text: 'Vue 2 Options API', info: 'Классический способ описания компонентов через объект options.' },
							{ text: 'Reactivity', info: 'Система реактивности отслеживает зависимости и обновляет DOM.' },
							{ text: 'Promise chaining', info: 'Последовательная обработка асинхронных операций с помощью then().' }
						],
					},
					createdAt: Date.now(),
				},
			],
			loading: false,
			options: { detailLevel: 'extended', usePrev: true },
			queuedTerms: [],
			lastRequestPreview: '{\n  "status": "ожидание первого запроса"\n}',
			isDev: !!import.meta.env.DEV,
			draft: '',
		}
	},
	mounted() {
		this.$refs.chatInput?.focus?.()
	},
	watch: {
		messages: {
			deep: true,
			handler() {
				this.$nextTick(() => {
					window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
				})
			},
		},
	},
	methods: {
		onDraftChange(val) {
			this.draft = val
		},
		async onSubmit(text) {
			if (!text?.trim()) return
			await this.ask(text)
		},
		onClickTerm(t) {
			const label = t?.text || t?.label || ''
			if (!label) return
			if (this.queuedTerms.length > 0) {
				if (!this.queuedTerms.some((q) => (q.text || q.label)?.toLowerCase() === label.toLowerCase())) {
					this.queuedTerms.push({ text: label })
				}
				const q = this.queuedTerms.map((x) => x.text || x.label).join(', ')
				this.queuedTerms = []
				this.ask(q)
			} else {
				this.ask(label)
			}
		},
		onQueueTerm(t) {
			if (!this.queuedTerms.some((q) => (q.text || q.label)?.toLowerCase() === t.text.toLowerCase())) {
				this.queuedTerms.push({ text: t.text })
			}
			this.$refs.chatInput?.appendText?.(t.text)
		},
		onRetry(question, messageId) {
			if (question?.trim()) {
				this.retryMessage(question, messageId)
			}
		},
		onClarify(text) {
			if (text?.trim()) {
				// Временно переключаемся на максимальную детализацию
				const originalLevel = this.options.detailLevel
				this.options.detailLevel = 'max'
				
				// Отправляем запрос на уточнение без показа в чате
				this.askClarification(`Уточни детально и разверни следующую информацию: ${text}`)
				
				// Возвращаем исходный уровень детализации
				setTimeout(() => {
					this.options.detailLevel = originalLevel
				}, 100)
			}
		},
		buildSystemPrompt(level) {
			let detailInstructions = ''
			let termsCount = 3
			
			if (level === 'short') {
				detailInstructions = 'Дай максимально краткий ответ: 1-2 предложения максимум. Фокус на самом главном. Используй максимум 150 токенов.'
				termsCount = 2
			} else if (level === 'max') {
				detailInstructions = 'Дай максимально полный и детальный ответ: 6-8 предложений. Включи примеры, детали, практические аспекты, углубленные концепции. Используй максимум 980 токенов.'
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
		},
		buildClarificationPrompt(level, previousText) {
			let detailInstructions = ''
			let termsCount = 6 // Больше терминов для уточнений
			
			if (level === 'short') {
				detailInstructions = 'Дай развернутый ответ: 3-4 предложения. Фокус на дополнительной информации. Используй максимум 300 токенов.'
				termsCount = 4
			} else if (level === 'max') {
				detailInstructions = 'Дай максимально полный и детальный ответ: 8-10 предложений. Включи примеры, детали, практические аспекты, углубленные концепции. Используй максимум 2000 токенов.'
				termsCount = 8
			} else {
				detailInstructions = 'Дай развернутый ответ: 5-6 предложений. Достаточно деталей для углубленного понимания. Используй максимум 800 токенов.'
				termsCount = 6
			}
			
			return `Ты — интерактивный чат-помощник «Энциклопедия Погружение». Сейчас ты отвечаешь на запрос пользователя об уточнении деталей.

${detailInstructions}

ВАЖНОЕ ПРАВИЛО ДЛЯ УТОЧНЕНИЙ:
- ВСЕГДА включай контекст предыдущего ответа: "${previousText}"
- НЕ повторяй информацию, которая уже была сказана ранее
- Дай НОВУЮ, дополнительную информацию по теме
- Расширь и углубь понимание темы
- Добавь практические примеры, детали, нюансы, которые не были упомянуты

Правила работы:
1. ${detailInstructions}
2. ВСЕГДА отвечай на РУССКОМ языке. Никаких английских фраз или терминов без перевода.
3. Выделяй ключевые термины/фразы, которые имеют смысловую нагрузку и могут быть интерактивными.
4. После каждого ответа предоставляй список из ${termsCount} сопутствующих терминов и технологий.
5. Все ответы должны быть контекстно связаны с предыдущими вопросами и ответами пользователя.
6. Стиль — ясный, технический, без лишней воды.
7. Если пользователь выбирает термин из списка, давай новый ответ по выбранному термину, снова с сопутствующими терминами.
8. Ключевые термины должны быть осмысленными, а не каждое отдельное слово.
9. Для уточнений: фокус на НОВОЙ информации, примерах и практических деталях.

ВАЖНО: Всегда отвечай в JSON формате на РУССКОМ языке:
{
  "text": "<текст ответа на русском языке с выделенными терминами>",
  "terms": [
    {"text": "<термин на русском>", "info": "<короткое объяснение на русском языке>"},
    {"text": "<термин на русском>", "info": "<короткое объяснение на русском языке>"}
  ]
}`
		},
		previewRequest(question, previousAssistantText) {
			const model = import.meta.env.VITE_CHAT_MODEL || 'gpt-4o'
			const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://openrouter.ai/api/v1'
			const level = this.options.detailLevel || 'extended'
			const tuning = level === 'short' ? { temperature: 0.3, max_tokens: 200 } : level === 'max' ? { temperature: 0.7, max_tokens: 1500 } : { temperature: 0.5, max_tokens: 500 }
			const messages = [{ role: 'system', content: this.buildSystemPrompt(level) }]
			let previousIncluded = false
			let previousSnippet = ''
			if (this.options.usePrev && previousAssistantText) {
				messages.push({ role: 'assistant', content: previousAssistantText })
				previousIncluded = true
				previousSnippet = String(previousAssistantText).slice(0, 160)
			}
			messages.push({ role: 'user', content: question })
			this.lastRequestPreview = JSON.stringify({ url: `${apiBaseUrl}/chat/completions`, options: { includePreviousContext: !!this.options.usePrev, previousAssistantIncluded: previousIncluded, previousAssistantSnippet: previousSnippet }, body: { model, messages, ...tuning } }, null, 2)
		},
		async ask(question) {
			const userMsg = { id: uuid(), role: 'user', content: question, createdAt: Date.now() }
			this.messages.push(userMsg)
			// typing placeholder
			const typingId = uuid()
			this.messages.push({ id: typingId, role: 'assistant', content: '', typing: true, createdAt: Date.now() })
			this.loading = true
			const started = Date.now()
			try {
				const lastAssistant = [...this.messages].reverse().find(m => m.role === 'assistant' && (m.parsed?.text || m.content))
				let previousAssistantText = lastAssistant?.parsed?.text || lastAssistant?.content || ''
				
				// Очищаем HTML теги из предыдущего контекста
				if (previousAssistantText) {
					const originalText = previousAssistantText
					previousAssistantText = previousAssistantText
						.replace(/<[^>]*>/g, '') // Убираем все HTML теги
						.replace(/&[a-zA-Z]+;/g, '') // Убираем HTML entities
						.trim()
					
					console.log('🔍 App HTML cleaning:', {
						original: originalText.substring(0, 100) + '...',
						cleaned: previousAssistantText.substring(0, 100) + '...',
						hasHtml: /<[^>]*>/.test(originalText)
					})
				}
				this.previewRequest(question, previousAssistantText)
				const systemPrompt = this.buildSystemPrompt(this.options.detailLevel)
				const assistant = await chatService.ask(question, { 
					usePreviousContext: !!this.options.usePrev, 
					previousAssistantText, 
					detailLevel: this.options.detailLevel,
					systemPrompt
				})
				
				console.log('🔍 Assistant response:', {
					raw: assistant.raw,
					parsed: assistant.parsed,
					hasParsed: !!assistant.parsed,
					parsedText: assistant.parsed?.text,
					parsedTerms: assistant.parsed?.terms,
					isTimeout: assistant.isTimeout,
					isError: assistant.isError,
					originalQuestion: assistant.originalQuestion
				})
				
				const elapsed = Date.now() - started
				const delay = Math.max(0, 300 - elapsed)
				await new Promise(r => setTimeout(r, delay))
				const idx = this.messages.findIndex(m => m.id === typingId)
				if (idx !== -1) this.messages.splice(idx, 1)
				
				// Создаем сообщение с информацией о таймауте
				const messageData = { 
					id: uuid(), 
					role: 'assistant', 
					content: assistant.parsed?.text || assistant.raw, // Используем распарсенный текст, если есть
					parsed: assistant.parsed, 
					createdAt: Date.now() 
				}
				
				// Если это таймаут, добавляем специальные поля
				if (assistant.isTimeout) {
					messageData.isTimeout = true
					messageData.originalQuestion = assistant.originalQuestion
				}

				// Если это ошибка API, добавляем специальные поля
				if (assistant.isError) {
					messageData.error = true
					messageData.content = assistant.raw // Устанавливаем текст ошибки
					messageData.originalQuestion = assistant.originalQuestion
				}
				
				this.messages.push(messageData)
				// reset active tags after response (сохраняем отладочное тело запроса)
				this.queuedTerms = []
				// restore focus to input
				this.$refs.chatInput?.focus?.()
				// clear draft
				this.draft = ''
			} catch (e) {
				const idx = this.messages.findIndex(m => m.id === typingId)
				if (idx !== -1) this.messages.splice(idx, 1)
				this.messages.push({ 
					id: uuid(), 
					role: 'assistant', 
					content: '', 
					error: e?.message || 'Error', 
					originalQuestion: question, // Сохраняем оригинальный вопрос для кнопки повтора
					createdAt: Date.now() 
				})
				// reset on error too (сохраняем отладочное тело запроса)
				this.queuedTerms = []
				this.$refs.chatInput?.focus?.()
				this.draft = ''
			} finally {
				this.loading = false
			}
		},
		async retryMessage(question, messageId) {
			console.log('🔍 Retry started:', { question, messageId })
			
			// Находим сообщение для повтора
			const messageIndex = this.messages.findIndex(m => m.id === messageId)
			if (messageIndex === -1) {
				console.warn('Message not found for retry:', messageId)
				return
			}

			console.log('🔍 Found message at index:', messageIndex, this.messages[messageIndex])

			// Заменяем содержимое сообщения на лоадер
			this.messages[messageIndex] = {
				...this.messages[messageIndex],
				content: '',
				parsed: null,
				error: false,
				isTimeout: false,
				typing: true
			}

			this.loading = true
			const started = Date.now()

			try {
				// Ищем последний ответ ассистента (исключая текущее сообщение)
				const lastAssistant = this.messages
					.slice(0, messageIndex)
					.reverse()
					.find(m => m.role === 'assistant' && (m.parsed?.text || m.content))
				
				let previousAssistantText = lastAssistant?.parsed?.text || lastAssistant?.content || ''

				// Очищаем HTML теги из предыдущего контекста
				if (previousAssistantText) {
					const originalText = previousAssistantText
					previousAssistantText = previousAssistantText
						.replace(/<[^>]*>/g, '') // Убираем все HTML теги
						.replace(/&[a-zA-Z]+;/g, '') // Убираем HTML entities
						.trim()

					console.log('🔍 Retry HTML cleaning:', {
						original: originalText.substring(0, 100) + '...',
						cleaned: previousAssistantText.substring(0, 100) + '...',
						hasHtml: /<[^>]*>/.test(originalText)
					})
				}

				this.previewRequest(question, previousAssistantText)
				const systemPrompt = this.buildSystemPrompt(this.options.detailLevel)
				
				console.log('🔍 Sending retry request:', { question, systemPrompt })
				
				const assistant = await chatService.ask(question, {
					usePreviousContext: !!this.options.usePrev,
					previousAssistantText,
					detailLevel: this.options.detailLevel,
					systemPrompt
				})

				console.log('🔍 Retry response:', {
					raw: assistant.raw,
					parsed: assistant.parsed,
					hasParsed: !!assistant.parsed,
					parsedText: assistant.parsed?.text,
					parsedTerms: assistant.parsed?.terms,
					isTimeout: assistant.isTimeout,
					isError: assistant.isError,
					originalQuestion: assistant.originalQuestion
				})
				
				const elapsed = Date.now() - started
				const delay = Math.max(0, 300 - elapsed)
				await new Promise(r => setTimeout(r, delay))

				// Заменяем содержимое того же сообщения
				const messageData = {
					id: messageId,
					role: 'assistant',
					content: assistant.parsed?.text || assistant.raw, // Используем распарсенный текст, если есть
					parsed: assistant.parsed,
					createdAt: Date.now()
				}

				// Если это таймаут, добавляем специальные поля
				if (assistant.isTimeout) {
					messageData.isTimeout = true
					messageData.originalQuestion = assistant.originalQuestion
				}

				// Если это ошибка API, добавляем специальные поля
				if (assistant.isError) {
					messageData.error = true
					messageData.content = assistant.raw // Устанавливаем текст ошибки
					messageData.originalQuestion = assistant.originalQuestion
				}

				console.log('🔍 Updating message at index:', messageIndex, messageData)
				this.messages[messageIndex] = messageData
				
				this.queuedTerms = []
				this.$refs.chatInput?.focus?.()
				this.draft = ''
			} catch (e) {
				console.error('🔍 Retry error:', e)
				
				// При ошибке возвращаем исходное сообщение с ошибкой
				this.messages[messageIndex] = {
					id: messageId,
					role: 'assistant',
					content: '',
					error: e?.message || 'Error',
					originalQuestion: question,
					createdAt: Date.now()
				}
				this.queuedTerms = []
				this.$refs.chatInput?.focus?.()
				this.draft = ''
			} finally {
				this.loading = false
			}
		},
		async askClarification(question) {
			// typing placeholder
			const typingId = uuid()
			this.messages.push({ id: typingId, role: 'assistant', content: '', typing: true, createdAt: Date.now() })
			this.loading = true
			const started = Date.now()
			try {
				const lastAssistant = [...this.messages].reverse().find(m => m.role === 'assistant' && (m.parsed?.text || m.content))
				let previousAssistantText = lastAssistant?.parsed?.text || lastAssistant?.content || ''
				
				// Очищаем HTML теги из предыдущего контекста
				if (previousAssistantText) {
					const originalText = previousAssistantText
					previousAssistantText = previousAssistantText
						.replace(/<[^>]*>/g, '') // Убираем все HTML теги
						.replace(/&[a-zA-Z]+;/g, '') // Убираем HTML entities
						.trim()
					
					console.log('🔍 Clarification HTML cleaning:', {
						original: originalText.substring(0, 100) + '...',
						cleaned: previousAssistantText.substring(0, 100) + '...',
						hasHtml: /<[^>]*>/.test(originalText)
					})
				}
				
				// Для уточнений ВСЕГДА используем предыдущий контекст и специальный промпт
				this.previewRequest(question, previousAssistantText)
				const systemPrompt = this.buildClarificationPrompt(this.options.detailLevel, previousAssistantText)
				const assistant = await chatService.ask(question, { 
					usePreviousContext: true, // Принудительно включаем контекст для уточнений
					previousAssistantText, 
					detailLevel: this.options.detailLevel,
					systemPrompt
				})
				
				console.log('🔍 Clarification response:', {
					raw: assistant.raw,
					parsed: assistant.parsed,
					hasParsed: !!assistant.parsed,
					parsedText: assistant.parsed?.text,
					parsedTerms: assistant.parsed?.terms,
					isTimeout: assistant.isTimeout,
					isError: assistant.isError,
					originalQuestion: assistant.originalQuestion
				})

				console.log('🔍 Clarification isError check:', {
					isError: assistant.isError,
					content: assistant.raw,
					isTimeout: assistant.isTimeout
				})
				
				const elapsed = Date.now() - started
				const delay = Math.max(0, 300 - elapsed)
				await new Promise(r => setTimeout(r, delay))
				const idx = this.messages.findIndex(m => m.id === typingId)
				if (idx !== -1) this.messages.splice(idx, 1)
				
				// Создаем сообщение с информацией о таймауте
				const messageData = { 
					id: uuid(), 
					role: 'assistant', 
					content: assistant.parsed?.text || assistant.raw, // Используем распарсенный текст, если есть
					parsed: assistant.parsed, 
					createdAt: Date.now() 
				}
				
				// Если это таймаут, добавляем специальные поля
				if (assistant.isTimeout) {
					messageData.isTimeout = true
					messageData.originalQuestion = assistant.originalQuestion
				}

				// Если это ошибка API, добавляем специальные поля
				if (assistant.isError) {
					messageData.error = true
					messageData.content = assistant.raw // Устанавливаем текст ошибки
					messageData.originalQuestion = assistant.originalQuestion
				}
				
				this.messages.push(messageData)
				// reset active tags after response (сохраняем отладочное тело запроса)
				this.queuedTerms = []
				// restore focus to input
				this.$refs.chatInput?.focus?.()
				// clear draft
				this.draft = ''
			} catch (e) {
				const idx = this.messages.findIndex(m => m.id === typingId)
				if (idx !== -1) this.messages.splice(idx, 1)
				this.messages.push({ 
					id: uuid(), 
					role: 'assistant', 
					content: '', 
					error: e?.message || 'Error', 
					originalQuestion: question, // Сохраняем оригинальный вопрос для кнопки повтора
					createdAt: Date.now() 
				})
				// reset on error too (сохраняем отладочное тело запроса)
				this.queuedTerms = []
				this.$refs.chatInput?.focus?.()
				this.draft = ''
			} finally {
				this.loading = false
			}
		},
	},
}
</script>
