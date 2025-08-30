<template>
	<div class="message-container">
		<!-- TextSelectionTooltip для выделенного текста -->
		<TextSelectionTooltip
			:is-visible="showSelectionTooltip"
			:selected-text="selectedText"
			:position="tooltipPosition"
			@ask-question="handleAskQuestion"
			@close="hideSelectionTooltip"
		/>
		
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
						class="message-body text-sm whitespace-pre-wrap" 
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
	</div>
</template>

<script>
import HoverTerm from '@/components/hover/HoverTerm.vue'
import TextSelectionTooltip from '@/components/TextSelectionTooltip.vue'
import { splitToParagraphs, applyMarkdownBasic, doubleNewlinesToBr } from '@/utils/text/format'
import { highlightTerms } from '@/utils/text/highlight'

	export default {
		name: 'Message',
		props: {
			message: { type: Object, required: true },
			queued: { type: Array, default: () => [] },
		},
		components: { HoverTerm, TextSelectionTooltip },
		data() {
			return {
				showSelectionTooltip: false,
				selectedText: '',
				tooltipPosition: { x: 0, y: 0 }
			}
		},
		mounted() {
			this.setupTextSelection()
		},
		beforeDestroy() {
			// Убираем обработчики при уничтожении компонента
			document.removeEventListener('selectionchange', this.handleSelectionChange)
			document.removeEventListener('mouseup', this.handleMouseUp)
			document.removeEventListener('click', this.handleDocumentClick)
			// Очищаем timeout
			if (this.selectionTimeout) {
				clearTimeout(this.selectionTimeout)
				this.selectionTimeout = null
			}
		},
	computed: {
		formattedText() {
			if (!this.message.parsed?.text) {
				return this.message.content || ''
			}
			let text = this.message.parsed.text
			const terms = this.message.parsed.terms || []
			
			// АГРЕССИВНАЯ очистка: убираем ВСЕ HTML-атрибуты и теги
			text = text
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
				.replace(/\s{2,}/g, ' ') // Схлопываем множественные пробелы
			
			// markdown -> html (strong, code)
			text = applyMarkdownBasic(text)
			// подсветка терминов
			text = highlightTerms(text, terms)
			// параграфы
			return doubleNewlinesToBr(text)
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
		setupTextSelection() {
			// Добавляем обработчики для отслеживания выделения текста
			document.addEventListener('selectionchange', this.handleSelectionChange)
			document.addEventListener('mouseup', this.handleMouseUp)
			document.addEventListener('click', this.handleDocumentClick)
			// Добавляем задержку для завершения выделения
			this.selectionTimeout = null
		},
		
		handleSelectionChange() {
			const selection = window.getSelection()
			if (selection && selection.toString().trim()) {
				this.selectedText = selection.toString().trim()
				// Добавляем задержку для завершения выделения
				if (this.selectionTimeout) {
					clearTimeout(this.selectionTimeout)
				}
				this.selectionTimeout = setTimeout(() => {
					this.showSelectionTooltip = true
				}, 300) // 300ms задержка для завершения выделения
			} else {
				this.hideSelectionTooltip()
			}
		},
		
		handleMouseUp(event) {
			const selection = window.getSelection()
			if (selection && selection.toString().trim()) {
				// Позиционируем ToolTip рядом с курсором
				this.tooltipPosition = {
					x: event.clientX,
					y: event.clientY
				}
				this.selectedText = selection.toString().trim()
				// ToolTip показывается через handleSelectionChange с задержкой
			}
		},
		
		handleDocumentClick(event) {
			// Скрываем ToolTip при клике вне его области
			if (this.showSelectionTooltip) {
				const tooltip = event.target.closest('.text-selection-tooltip')
				if (!tooltip) {
					this.hideSelectionTooltip()
				}
			}
		},
		
		hideSelectionTooltip() {
			this.showSelectionTooltip = false
			this.selectedText = ''
			// Очищаем timeout при скрытии
			if (this.selectionTimeout) {
				clearTimeout(this.selectionTimeout)
				this.selectionTimeout = null
			}
		},
		
		handleAskQuestion(selectedText) {
			// Эмитим событие для отправки вопроса
			this.$emit('ask-selected-text', selectedText)
			// Автоматически скрываем ToolTip после отправки
			this.hideSelectionTooltip()
		},
		
		handleTermClick(event) {
			const target = event.target
			// Сначала проверяем клик по подсвеченному термину
			if (target.classList && target.classList.contains('term-highlight')) {
				const term = target.dataset.term
				const info = target.dataset.info
				if (event.ctrlKey || event.metaKey) {
					this.$emit('queue-term', { text: term, info })
				} else {
					this.$emit('click-term', { text: term, info })
				}
				return
			}
			// Если клик по <strong> — используем его текст как термин
			if (target.tagName === 'STRONG') {
				const label = (target.textContent || '').trim()
				if (label) {
					if (event.ctrlKey || event.metaKey) {
						this.$emit('queue-term', { text: label, info: `Термин: ${label}` })
					} else {
						this.$emit('click-term', { text: label, info: `Термин: ${label}` })
					}
				}
			}
		},
		handleRetry(question, messageId) {
			
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

<style scoped>
/* Применяем стили к контенту, вставленному через v-html */
::v-deep .message-body strong {
	cursor: pointer;
	text-decoration: underline dotted;
	text-underline-offset: 2px;
	transition: color 0.15s ease-in-out;
}
::v-deep .message-body strong:hover {
	color: rgb(51, 65, 85); /* slate-700 */
}
</style>
