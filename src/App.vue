<template>
	<div class="min-h-screen bg-slate-50 text-slate-900">
		<div class="mx-auto max-w-6xl px-4 py-4">
			<h1 class="mb-4 text-2xl font-semibold">DeepNet Encyclopedia</h1>
			<div class="grid grid-cols-3 gap-4">
				<div class="col-span-2">
					<div class="flex flex-col rounded-xl border border-slate-200 bg-white">
						<div class="px-4 py-4 space-y-3">
							<Message v-for="m in messages" :key="m.id" :message="m" :queued="queuedTerms" @click-term="onClickTerm" @queue-term="onQueueTerm" />
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
		buildSystemPrompt(level) {
			const hint = level === 'short' ? 'Дай максимально краткий ответ.' : level === 'max' ? 'Дай максимально полный ответ.' : 'Дай сбалансированный ответ.'
			return `Ты — интерактивный чат-помощник «Энциклопедия Погружение». Твоя цель — помогать пользователю быстро погружаться в любую техническую тему через короткие, понятные ответы.\n\n${hint}\n\nПравила работы:\n1. Отвечай коротко: 2–3 предложения максимум.\n2. Выделяй ключевые термины/фразы, которые имеют смысловую нагрузку и могут быть интерактивными.\n3. После каждого ответа предоставляй список сопутствующих терминов и технологий.\n4. Все ответы должны быть контекстно связаны с предыдущими вопросами и ответами пользователя.\n5. Стиль — ясный, технический, без лишней воды.\n6. Если пользователь выбирает термин из списка, давай новый короткий ответ по выбранному термину, снова с сопутствующими терминами.\n7. Ключевые термины должны быть осмысленными, а не каждое отдельное слово.\n\nФормат ответа (JSON):\n{\n  \"text\": \"<короткий текст с выделенными терминами>\",\n  \"terms\": [\n    {\"text\": \"<термин>\", \"info\": \"<короткое объяснение или ссылка>\"},\n    {\"text\": \"<термин>\", \"info\": \"<короткое объяснение или ссылка>\"}\n  ]\n}`
		},
		previewRequest(question, previousAssistantText) {
			const model = import.meta.env.VITE_CHAT_MODEL || 'gpt-4'
			const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.openai.com/v1'
			const level = this.options.detailLevel || 'extended'
			const tuning = level === 'short' ? { temperature: 0.3, max_tokens: 350 } : level === 'max' ? { temperature: 0.7, max_tokens: 1200 } : { temperature: 0.5, max_tokens: 700 }
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
				const previousAssistantText = lastAssistant?.parsed?.text || lastAssistant?.content || ''
				this.previewRequest(question, previousAssistantText)
				const assistant = await chatService.ask(question, { usePreviousContext: !!this.options.usePrev, previousAssistantText, detailLevel: this.options.detailLevel })
				const elapsed = Date.now() - started
				const delay = Math.max(0, 300 - elapsed)
				await new Promise(r => setTimeout(r, delay))
				const idx = this.messages.findIndex(m => m.id === typingId)
				if (idx !== -1) this.messages.splice(idx, 1)
				this.messages.push({ id: uuid(), role: 'assistant', content: assistant.raw, parsed: assistant.parsed, createdAt: Date.now() })
				// reset active tags after response (сохраняем отладочное тело запроса)
				this.queuedTerms = []
				// restore focus to input
				this.$refs.chatInput?.focus?.()
				// clear draft
				this.draft = ''
			} catch (e) {
				const idx = this.messages.findIndex(m => m.id === typingId)
				if (idx !== -1) this.messages.splice(idx, 1)
				this.messages.push({ id: uuid(), role: 'assistant', content: '', error: e?.message || 'Error', createdAt: Date.now() })
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
