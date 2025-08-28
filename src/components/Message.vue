<template>
	<div :class="['w-full flex', message.role === 'user' ? 'justify-end' : 'justify-start']">
		<div :class="[
			'max-w-[80%] rounded-2xl px-3 py-2 shadow-sm border',
			message.role === 'user' ? 'bg-slate-900 text-slate-50 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
		]">
			<div v-if="message.typing" class="flex items-center gap-1 text-sm">
				<span class="animate-pulse">●</span>
				<span class="animate-pulse delay-150">●</span>
				<span class="animate-pulse delay-300">●</span>
			</div>
			<div v-else-if="message.error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
				<div class="flex items-center justify-between">
					<span>{{ typeof message.error === 'string' ? message.error : (message.content || 'API Error occurred') }}</span>
					<button 
						v-if="message.originalQuestion"
						@click="handleRetry(message.originalQuestion, message.id)"
						class="retry-button ml-3 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors duration-200 flex items-center gap-1"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
						</svg>
						Повторить
					</button>
					<!-- Отладочная информация -->
					<div v-if="!message.originalQuestion" class="text-xs text-red-600 mt-1">
						Debug: originalQuestion отсутствует
					</div>
				</div>
			</div>
			<div v-else-if="message.isTimeout" class="timeout-message rounded-md border p-3">
				<div class="flex items-center justify-between">
					<span>{{ message.content }}</span>
					<button 
						v-if="message.originalQuestion"
						@click="handleRetry(message.originalQuestion, message.id)"
						class="retry-button ml-3 px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition-colors duration-200 flex items-center gap-1"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
						</svg>
						Повторить
					</button>
				</div>
			</div>
			<div v-else>
				<div v-if="message.parsed && !message.error && !message.isTimeout && !message.parsed.error" class="space-y-2">
					<div 
						class="text-sm whitespace-pre-wrap" 
						v-html="formattedText"
						@click="handleTermClick"
					></div>
					<div class="flex flex-wrap gap-2">
						<HoverTerm
							v-for="(t, i) in message.parsed.terms"
							:key="i"
							:term="{ label: t.text, description: t.info }"
							:active="isQueued(t.text)"
							@click-term="$emit('click-term', t)"
							@queue-term="$emit('queue-term', t)"
						/>
					</div>
					<div class="pt-2 border-t border-slate-100">
						<button 
							@click="$emit('clarify', message.parsed.text)"
							class="clarify-button px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors duration-200 flex items-center gap-1"
						>
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
							Уточнить детально
						</button>
					</div>
				</div>
				<p v-else class="whitespace-pre-wrap text-sm">{{ message.content }}</p>
			</div>
		</div>
	</div>
</template>

<script>
import HoverTerm from '@/components/hover/HoverTerm.vue'

	export default {
		name: 'Message',
		props: {
			message: { type: Object, required: true },
			queued: { type: Array, default: () => [] },
		},
		components: { HoverTerm },
		mounted() {
			// Отладочная информация для ошибок
			if (this.message.error) {
				console.log('🔍 Message error debug:', {
					messageId: this.message.id,
					error: this.message.error,
					content: this.message.content,
					originalQuestion: this.message.originalQuestion,
					hasOriginalQuestion: !!this.message.originalQuestion
				})
			}
		},
	computed: {
		formattedText() {
			console.log('🔍 Message formattedText:', {
				hasParsed: !!this.message.parsed,
				parsedText: this.message.parsed?.text,
				parsedTerms: this.message.parsed?.terms,
				messageRole: this.message.role,
				messageContent: this.message.content,
				hasError: !!this.message.error,
				isTimeout: !!this.message.isTimeout,
				originalQuestion: this.message.originalQuestion
			})
			
			if (!this.message.parsed?.text) {
				console.log('⚠️ No parsed text, falling back to content')
				return this.message.content || ''
			}
			
			let text = this.message.parsed.text
			const terms = this.message.parsed.terms || []
			
			console.log('🔍 Processing text:', { text, termsCount: terms.length })
			
			// Сортируем термины по длине (от длинных к коротким) для правильной замены
			const sortedTerms = [...terms].sort((a, b) => b.text.length - a.text.length)
			
			// Заменяем термины на интерактивные span'ы
			for (const term of sortedTerms) {
				const regex = new RegExp(`\\b${term.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
				text = text.replace(regex, `<span class="term-highlight underline decoration-dotted underline-offset-2 cursor-pointer hover:text-slate-700" data-term="${term.text}" data-info="${term.info}">${term.text}</span>`)
			}
			
			console.log('🔍 Final formatted text:', text)
			return text
		},
		inlinePieces() {
			if (!this.message.parsed?.terms?.length) return []
			const terms = this.message.parsed.terms.map(t => t.text).sort((a, b) => b.length - a.length)
			let text = this.message.parsed.text
			const pieces = []
			while (text.length) {
				let matched = false
				for (const term of terms) {
					const idx = text.toLowerCase().indexOf(term.toLowerCase())
					if (idx === 0) {
						pieces.push({ isTerm: true, text: text.slice(0, term.length) })
						text = text.slice(idx)
						matched = true
						break
					} else if (idx > 0) {
						pieces.push({ isTerm: false, text: text.slice(0, idx) })
						text = text.slice(idx)
						matched = true
						break
					}
				}
				if (!matched) {
					pieces.push({ isTerm: false, text })
					break
				}
			}
			return pieces
		},
	},
	methods: {
		handleTermClick(event) {
			const target = event.target
			if (target.classList.contains('term-highlight')) {
				const term = target.dataset.term
				const info = target.dataset.info
				
				if (event.ctrlKey || event.metaKey) {
					// Ctrl/Cmd + клик = добавить в очередь
					this.$emit('queue-term', { text: term, info })
				} else {
					// Обычный клик = отправить запрос
					this.$emit('click-term', { text: term, info })
				}
			}
		},
		handleRetry(question, messageId) {
			console.log('🔍 Message retry clicked:', { question, messageId, message: this.message })
			this.$emit('retry', question, messageId)
		},
		isQueued(label) {
			return this.queued.some(q => (q.text || q.label)?.toLowerCase() === label.toLowerCase())
		},
		findInfo(label) {
			const t = (this.message.parsed?.terms || []).find(x => x.text.toLowerCase() === label.toLowerCase())
			return t?.info || ''
		},
	},
}
</script>
