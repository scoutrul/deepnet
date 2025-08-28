<template>
	<div class="min-h-screen bg-slate-50 text-slate-900">
		<div class="mx-auto max-w-6xl px-4 py-4">
			<h1 class="mb-4 text-2xl font-semibold">DeepNet Encyclopedia</h1>
			<div class="grid grid-cols-3 gap-4">
				<div class="col-span-2">
					<div class="flex flex-col rounded-xl border border-slate-200 bg-white">
						<div class="flex-1 overflow-y-auto px-4 py-4" :style="{ maxHeight: 'calc(100svh - 100px)' }">
							<Message v-for="m in messages" :key="m.id" :message="m" @click-term="onClickTerm" @queue-term="onQueueTerm" />
						</div>
						<div class="border-t border-slate-200 px-4 py-3">
							<ChatInput ref="chatInput" :loading="loading" @submit="onSubmit" />
							<p class="mt-2 text-xs text-slate-500">Подсказки: ЛКМ — сразу спросить. ПКМ — добавить в запрос.</p>
						</div>
					</div>
				</div>
				<div class="col-span-1">
					<OptionsPanel v-model="options" />
				</div>
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
		}
	},
	methods: {
		async onSubmit(text) {
			if (!text?.trim()) return
			await this.ask(text)
		},
		onClickTerm(t) {
			this.ask(t.text)
		},
		onQueueTerm(t) {
			this.$refs.chatInput?.appendText?.(t.text)
		},
		async ask(question) {
			const userMsg = { id: uuid(), role: 'user', content: question, createdAt: Date.now() }
			this.messages.push(userMsg)
			this.loading = true
			try {
				const lastAssistant = [...this.messages].reverse().find(m => m.role === 'assistant' && (m.parsed?.text || m.content))
				const previousAssistantText = lastAssistant?.parsed?.text || lastAssistant?.content || ''
				const assistant = await chatService.ask(question, { usePreviousContext: !!this.options.usePrev, previousAssistantText, detailLevel: this.options.detailLevel })
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
