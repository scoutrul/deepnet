<template>
	<div class="min-h-screen bg-slate-50 text-slate-900">
		<div class="mx-auto max-w-6xl px-4 py-4">
			<h1 class="mb-4 text-2xl font-semibold">DeepNet Encyclopedia</h1>
			<!-- Voice Transcription Panel - Full Width -->
			<div class="mb-6">
				<VoicePanel ref="voicePanel" @tag-selected="onTagSelected"
					@add-selected-to-input="onAddSelectedToInput" />
			</div>

			<!-- Chat and Options Grid -->
			<div class="grid grid-cols-3 gap-4">
				<div class="col-span-2">
					<div class="flex flex-col rounded-xl border border-slate-200 bg-white">
						<div class="px-4 py-4 space-y-3">
							<Message v-for="m in messages" :key="m.id" :message="m" :queued="queuedTerms"
								@click-term="onClickTerm" @queue-term="onQueueTerm" @retry="onRetry"
								@clarify="onClarify" @ask-selected-text="onAskSelectedText" />
							<div v-if="draft" class="w-full flex justify-end">
								<div
									class="max-w-[80%] rounded-2xl px-3 py-2 shadow-sm border bg-slate-900 text-slate-50 border-slate-800">
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
							<ChatInput ref="chatInput" :loading="loading" @submit="onSubmit"
								@draft-change="onDraftChange" />
							<p class="mt-2 text-xs text-slate-500">Подсказки: ЛКМ — сразу спросить. ПКМ/⌃-клик —
								добавить в запрос. Enter — отправить. Кнопка «Отправить» тоже доступна.</p>
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
				<pre
					class="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-slate-900 p-3 text-xs text-slate-100"><code>{{ lastRequestPreview }}</code></pre>
			</div>
		</div>
	</div>
</template>

<script>
import { v4 as uuid } from 'uuid'
import Message from '@/components/Message.vue'
import ChatInput from '@/components/ChatInput.vue'
import OptionsPanel from '@/components/OptionsPanel.vue'
import VoicePanel from '@/components/voice/VoicePanel.vue'
import { chatService } from '@/services/chatService'

export default {
	name: 'App',
	components: { Message, ChatInput, OptionsPanel, VoicePanel },
	data() {
		return {
			messages: [
				{
					id: uuid(),
					role: 'assistant',
					content: '',
					parsed: {
						text: 'Привет! Я готов помочь вам в подготовке к интервью. Сейчас я опишу наши роли и цели беседы.',
						terms: [
							{ text: 'роли и цели', info: 'Определение ролей участников и целей беседы для эффективного взаимодействия.' },
							{ text: 'подготовка к интервью', info: 'Помощь в подготовке к техническому интервью или скринингу.' }
						],
					},
					createdAt: Date.now(),
				},
			],
			loading: false,
			options: {
				detailLevel: 'extended',
				usePrev: true,
				scene: 'technical-interview',
				jobDescription: '',
				resumeText: ''
			},
			queuedTerms: [],
			lastRequestPreview: '{\n  "status": "ожидание первого запроса"\n}',
			isDev: !!import.meta.env.DEV,
			draft: '',
			shouldAutoScroll: true,
		}
	},
		mounted() {
		this.$refs.chatInput?.focus?.()
		
		// Загружаем сохраненные настройки из localStorage
		this.loadSavedSettings()
		
		// Автоматически отправляем первый запрос боту
		this.$nextTick(() => {
			this.ask('Опиши наши роли и цели беседы')
		})
	},
	watch: {
		messages: {
			deep: true,
			handler() {
				if (!this.shouldAutoScroll) return
				this.$nextTick(() => {
					// Скроллим к последнему сообщению
					const messages = document.querySelectorAll('.message-container')
					if (messages.length > 0) {
						const lastMessage = messages[messages.length - 1]
						lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' })
					} else {
						// Fallback: скроллим к контейнеру чата
						const chatContainer = document.querySelector('.grid.grid-cols-3')
						if (chatContainer) {
							chatContainer.scrollIntoView({ behavior: 'smooth', block: 'end' })
						}
					}
				})
			},
		},
		// Автоматический старт беседы при изменении сцены или контекста
		'options.scene'() {
			if (!this.autoStartInProgress) {
				this.autoStartConversation()
			}
		},
	},
	methods: {
		onDraftChange(val) {
			this.draft = val
		},
		async onSubmit(text) {
			if (!text?.trim()) return
			this.shouldAutoScroll = true
			this.$refs.chatInput?.clear?.()
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
				this.shouldAutoScroll = true
				this.$refs.chatInput?.clear?.()
				this.ask(q)
			} else {
				this.shouldAutoScroll = true
				this.$refs.chatInput?.clear?.()
				this.ask(label)
			}
		},
		onQueueTerm(t) {
			if (!this.queuedTerms.some((q) => (q.text || q.label)?.toLowerCase() === t.text.toLowerCase())) {
				this.queuedTerms.push({ text: t.text })
			}
			// Не скроллим чат во время набора списка терминов
			this.shouldAutoScroll = false
			this.$refs.chatInput?.appendText?.(t.text)
		},
		onRetry(question, messageId) {
			if (question?.trim()) {
				this.shouldAutoScroll = true
				this.retryMessage(question, messageId)
			}
		},
		onClarify(text) {
			if (text?.trim()) {
				// Временно переключаемся на максимальную детализацию
				const originalLevel = this.options.detailLevel
				this.options.detailLevel = 'max'

				// Отправляем запрос на уточнение без показа в чате
				this.shouldAutoScroll = true
				this.$refs.chatInput?.clear?.()
				this.askClarification(`Уточни детально и разверни следующую информацию: ${text}`)

				// Возвращаем исходный уровень детализации
				setTimeout(() => {
					this.options.detailLevel = originalLevel
				}, 0)
			}
		},
		
		onAskSelectedText(selectedText) {
			if (selectedText?.trim()) {
				// Отправляем вопрос по выделенному тексту
				this.shouldAutoScroll = true
				this.$refs.chatInput?.clear?.()
				this.ask(`Ответь от пользователя на этот вопрос: ${selectedText}`)
			}
		},
		previewRequest(question, previousAssistantText) {
			const model = import.meta.env.VITE_CHAT_MODEL || 'gpt-4o'
			const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://openrouter.ai/api/v1'
			const level = this.options.detailLevel || 'extended'
			const tuning = level === 'short' ? { temperature: 0.3, max_tokens: 200 } : level === 'max' ? { temperature: 0.7, max_tokens: 1500 } : { temperature: 0.5, max_tokens: 500 }
			const systemPrompt = this.buildSystemPrompt()

			// Формируем сообщения в зависимости от наличия системного промпта
			const messages = []
			if (systemPrompt && systemPrompt.trim()) {
				messages.push({ role: 'system', content: systemPrompt })
			}

			let previousIncluded = false
			let previousSnippet = ''
			if (this.options.usePrev && previousAssistantText) {
				messages.push({ role: 'assistant', content: previousAssistantText })
				previousIncluded = true
				previousSnippet = String(previousAssistantText).slice(0, 160)
			}
			messages.push({ role: 'user', content: question })

			this.lastRequestPreview = JSON.stringify({
				url: `${apiBaseUrl}/chat/completions`,
				options: {
					includePreviousContext: !!this.options.usePrev,
					previousAssistantIncluded: previousIncluded,
					previousAssistantSnippet: previousSnippet,
					scene: this.options.scene || 'не выбрана',
					hasSystemPrompt: !!(systemPrompt && systemPrompt.trim()),
					hasJobContext: !!(this.options.jobDescription && this.options.jobDescription.trim()),
					hasResumeContext: !!(this.options.resumeText && this.options.resumeText.trim())
				},
				body: { model, messages, ...tuning }
			}, null, 2)
		},
		onTagSelected(tagData) {
			const { text, action } = tagData
			if (action === 'add-to-input') {
				this.$refs.chatInput?.appendText?.(text)
			} else if (action === 'quick-add') {
				this.$refs.chatInput?.appendText?.(text)
			}
		},

		onAddSelectedToInput(selectedTags) {
			if (selectedTags && selectedTags.length > 0) {
				const texts = selectedTags.map(tag => tag.text || tag)
				const combinedText = texts.join(', ')
				this.$refs.chatInput?.appendText?.(combinedText)
			}
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


				}
				this.previewRequest(question, previousAssistantText)
				const assistant = await chatService.ask(question, {
					usePreviousContext: !!this.options.usePrev,
					previousAssistantText,
					detailLevel: this.options.detailLevel,
					systemPrompt: this.buildSystemPrompt(),
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

			// Находим сообщение для повтора
			const messageIndex = this.messages.findIndex(m => m.id === messageId)
			if (messageIndex === -1) {
				return
			}

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
				}

				this.previewRequest(question, previousAssistantText)
				const systemPrompt = '[generated in chatService]'



				const assistant = await chatService.ask(question, {
					usePreviousContext: !!this.options.usePrev,
					previousAssistantText,
					detailLevel: this.options.detailLevel,
					systemPrompt
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

				this.messages[messageIndex] = messageData

				this.queuedTerms = []
				this.$refs.chatInput?.focus?.()
				this.draft = ''
			} catch (e) {


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
				}

				// Для уточнений ВСЕГДА используем предыдущий контекст и специальный промпт
				this.previewRequest(question, previousAssistantText)
				const assistant = await chatService.ask(question, {
					usePreviousContext: true, // Принудительно включаем контекст для уточнений
					previousAssistantText,
					detailLevel: this.options.detailLevel,
					systemPrompt: this.buildSystemPrompt(),
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

		// Методы построения системного промпта
		buildSystemPrompt() {
			let prompt = ''

			// Базовый промпт в зависимости от сцены
			switch (this.options.scene) {
				case 'technical-interview':
					prompt = this.buildTechnicalInterviewPrompt()
					break
				case 'screening':
					prompt = this.buildScreeningPrompt()
					break
				default:
					// Если сцена не выбрана, не добавляем базовый промпт
					prompt = ''
			}

			// Добавляем контекст вакансии
			if (this.options.jobDescription && this.options.jobDescription.trim()) {
				if (prompt) prompt += '\n\n'
				prompt += `📋 КОНТЕКСТ ВАКАНСИИ:\n${this.options.jobDescription.trim()}`
			}

			// Добавляем контекст резюме
			if (this.options.resumeText && this.options.resumeText.trim()) {
				if (prompt) prompt += '\n\n'
				prompt += `📄 КОНТЕКСТ РЕЗЮМЕ:\n${this.options.resumeText.trim()}`
			}

			// Если ничего не выбрано и нет контекста, возвращаем пустую строку
			if (!prompt) {
				return ''
			}

			return prompt
		},

		// Промпт для технического интервью
		buildTechnicalInterviewPrompt() {
			return `🎤 ТЫ - ЭКСПЕРТ ПО ТЕХНИЧЕСКОМУ ИНТЕРВЬЮ

РОЛЬ: Проводишь глубокое техническое интервью с кандидатом
ЦЕЛЬ: Проверить, сможет ли работать

ОСНОВНЫЕ БЛОКИ ДЛЯ ПРОВЕРКИ:

1. ЗНАНИЯ И ПРАКТИКА (код, архитектура)
   - Технические навыки и компетенции
   - Умение писать код и решать задачи
   - Понимание архитектурных принципов
   - Знание технологий и инструментов

2. ОПЫТ РЕАЛЬНЫХ ПРОЕКТОВ
   - Конкретные проекты и их сложность
   - Роль в команде и ответственность
   - Решенные технические проблемы
   - Масштаб и результаты проектов

3. ГЛУБИНА ЭКСПЕРТИЗЫ
   - Понимание внутренних механизмов
   - Способность объяснить сложные концепции
   - Критическое мышление и анализ
   - Готовность к обучению и развитию

СТИЛЬ ОБЩЕНИЯ:
- Задавай технические вопросы разного уровня сложности
- Проси объяснить решения и подходы
- Оценивай качество ответов и глубину знаний
- Помогай кандидату раскрыться, если он нервничает

ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ:
- Понимание технического уровня кандидата
- Оценка способности к работе в команде
- Анализ опыта работы с технологиями
- Рекомендации по дальнейшему развитию`
		},

		// Промпт для скрининга
		buildScreeningPrompt() {
			return `📋 ТЫ - РЕКРУТЕР-СКРИНЕР

РОЛЬ: Проводишь первичный скрининг кандидата
ЦЕЛЬ: Понять, стоит ли звать дальше

ОСНОВНЫЕ БЛОКИ ДЛЯ ПРОВЕРКИ:

1. МОТИВАЦИЯ, ЗАРПЛАТА, СТЕК
   - Причины смены работы
   - Ожидания по зарплате
   - Соответствие технологического стека
   - Карьерные цели и планы

2. БАЗОВЫЙ ОПЫТ
   - Общий стаж работы
   - Релевантный опыт в индустрии
   - Ключевые проекты и достижения
   - Соответствие требованиям вакансии

3. СОФТ-СКИЛЛЫ И КУЛЬТУРА
   - Коммуникативные навыки
   - Работа в команде
   - Адаптивность и гибкость
   - Культурное соответствие компании

СТИЛЬ ОБЩЕНИЯ:
- Задавай короткие, четкие вопросы
- Фокусируйся на ключевых требованиях
- Оценивай мотивацию и культурное соответствие
- Определяй готовность к следующему этапу

ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ:
- Быстрая оценка соответствия
- Определение сильных сторон
- Выявление потенциальных рисков
- Рекомендация по дальнейшим этапам`
		},

		// Загрузка сохраненных настроек из localStorage
		loadSavedSettings() {
			try {
				const saved = localStorage.getItem('deepnet-settings')
				if (saved) {
					const settings = JSON.parse(saved)
					// Применяем сохраненные настройки, если они есть
					if (settings.scene) this.options.scene = settings.scene
					if (settings.jobDescription) this.options.jobDescription = settings.jobDescription
					if (settings.resumeText) this.options.resumeText = settings.resumeText
					if (settings.detailLevel) this.options.detailLevel = settings.detailLevel
					if (settings.usePrev !== undefined) this.options.usePrev = settings.usePrev
				}
			} catch (e) {
				console.warn('Failed to load settings from localStorage:', e)
			}
		},

		// Автоматический старт беседы при изменении сцены или контекста
		async autoStartConversation() {
			// Проверяем, что у нас есть сцена и контекст для старта беседы
			if (!this.options.scene || (!this.options.jobDescription && !this.options.resumeText)) {
				return
			}

			// Проверяем, что у нас нет активных сообщений (чтобы не дублировать)
			if (this.messages.length > 1) {
				return
			}

			// Проверяем, что у нас нет активного запроса
			if (this.loading) {
				return
			}

			// Устанавливаем флаг, чтобы предотвратить множественные вызовы
			this.autoStartInProgress = true

			try {
				// Небольшая задержка для стабилизации настроек
				await new Promise(resolve => setTimeout(resolve, 500))

				// Проверяем еще раз, что не было других изменений
				if (this.messages.length > 1 || this.loading) {
					return
				}

				// Отправляем приветствие для старта беседы
				const greeting = this.getGreetingForScene()
				if (greeting) {
					await this.ask(greeting)
				}
			} finally {
				// Сбрасываем флаг
				this.autoStartInProgress = false
			}
		},

		// Получение приветствия в зависимости от выбранной сцены
		getGreetingForScene() {
			switch (this.options.scene) {
				case 'technical-interview':
					return 'Здравствуйте! Начинаем техническое интервью.'
				case 'screening':
					return 'Здравствуйте! Начинаем первичный скрининг.'
				default:
					return null
			}
		},
	},
}
</script>

<style>
/* Стили для блоков кода с обратными кавычками */
.code-block {
	@apply my-4 rounded-lg border border-slate-200 bg-slate-50 p-4;
}

.code-block pre {
	@apply m-0 overflow-x-auto;
}

.code-block code {
	@apply block whitespace-pre text-sm text-slate-800;
}

/* Стили для inline кода */
code {
	@apply rounded bg-slate-100 px-1 py-0.5 text-sm font-mono text-slate-800;
}

/* Стили для жирного текста */
strong {
	@apply font-semibold text-slate-900;
}
</style>
