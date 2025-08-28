<template>
	<div class="card">
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-sm text-slate-700">Подсказки: ЛКМ — сразу спросить. ПКМ — добавить в запрос.</span>
			</div>
		</div>

		<div v-if="queuedTerms.length" class="mb-4 rounded-md border border-slate-200 bg-slate-900 p-3 text-slate-100">
			<div class="mb-2 text-xs font-semibold">Выбранные термины (ПКМ):</div>
			<div class="mb-2 flex flex-wrap gap-2">
				<span v-for="(t, i) in queuedTerms" :key="i" class="badge bg-slate-800 text-slate-100">{{ t.text }}</span>
			</div>
			<button type="button" class="btn" @click="sendQueued">Отправить</button>
		</div>

		<div class="mb-4 max-h-[50vh] overflow-y-auto space-y-3">
			<Message
				v-for="m in messages"
				:key="m.id"
				:message="m"
				@click-term="onClickTerm"
				@queue-term="onQueueTerm"
			/>
		</div>

		<ChatInput ref="chatInput" :loading="loading" @submit="onSubmit" />
	</div>
</template>

<script>
import { v4 as uuid } from 'uuid'
import Message from '@/components/Message.vue'
import ChatInput from '@/components/ChatInput.vue'
import { chatService } from '@/services/chatService'

export default {
	name: 'ChatContainer',
	components: { Message, ChatInput },
	data() {
		return {
			messages: [],
			loading: false,
			queuedTerms: [],
		}
	},
	methods: {
		async onSubmit(payload) {
			const { text, detailLevel, usePrev } = payload
			if (!text?.trim()) return
			await this.ask(text, { usePrev, detailLevel })
		},
		onClickTerm(t) {
			this.ask(t.text, { usePrev: true, detailLevel: 'extended' })
		},
		onQueueTerm(t) {
			if (!this.queuedTerms.some((q) => q.text.toLowerCase() === t.text.toLowerCase())) {
				this.queuedTerms.push({ text: t.text })
			}
			this.$refs.chatInput?.appendText?.(t.text)
		},
		async sendQueued() {
			if (!this.queuedTerms.length) return
			const q = this.queuedTerms.map((t) => t.text).join(', ')
			this.queuedTerms = []
			await this.ask(q, { usePrev: true, detailLevel: 'extended' })
		},
		async ask(question, opts) {
			const userMsg = { id: uuid(), role: 'user', content: question, createdAt: Date.now() }
			this.messages.push(userMsg)
			this.loading = true
			try {
				const lastAssistant = [...this.messages].reverse().find(m => m.role === 'assistant' && (m.parsed?.text || m.content))
				const previousAssistantText = lastAssistant?.parsed?.text || lastAssistant?.content || ''
				const assistant = await chatService.ask(question, { usePreviousContext: !!opts?.usePrev, previousAssistantText })
				this.messages.push({ id: uuid(), role: 'assistant', content: assistant.raw, parsed: assistant.parsed, createdAt: Date.now() })
			} catch (e) {
				this.messages.push({ id: uuid(), role: 'assistant', content: '', error: e?.message || 'Error', createdAt: Date.now() })
			} finally {
				this.loading = false
			}
		},
	},
}
</script>
