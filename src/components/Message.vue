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
			class="message-body text-sm"
			v-html="formattedText"
			@click="handleWordClick"
		></div>
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
import TextSelectionTooltip from '@/components/TextSelectionTooltip.vue'
import MarkdownIt from 'markdown-it'

export default {
	name: 'Message',
	props: {
		message: { type: Object, required: true },
		queued: { type: Array, default: () => [] },
	},
	components: { TextSelectionTooltip },
	data() {
		return {
			showSelectionTooltip: false,
			selectedText: '',
			tooltipPosition: { x: 0, y: 0 },
					md: new MarkdownIt({
			html: false,
			linkify: true,
			typographer: true,
			breaks: true,
			// Улучшенные настройки для списков
			listIndent: 1,
			// Более строгий парсинг списков
			strict: false,
			// Включаем все плагины для лучшей работы
			enable: [
				'list',
				'newline',
				'emphasis',
				'code',
				'link',
				'image',
				'blockquote',
				'heading',
				'hr',
				'table'
			]
		})
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
			// Используем markdown-it для форматирования
			if (!this.message.parsed?.text) {
				return this.message.content || ''
			}
			
			// Предобработка текста для улучшения списков
			let processedText = this.preprocessTextForMarkdown(this.message.parsed.text)
			
			return this.md.render(processedText)
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
				const newSelectedText = selection.toString().trim()
				
				// Проверяем, изменился ли выделенный текст
				if (this.selectedText !== newSelectedText) {
					this.selectedText = newSelectedText
					
					// Показываем ToolTip для нового выделения
					// НЕ скрываем предыдущий - он должен остаться видимым
					if (this.selectionTimeout) {
						clearTimeout(this.selectionTimeout)
					}
					this.selectionTimeout = setTimeout(() => {
						this.showSelectionTooltip = true
					}, 300) // 300ms задержка для завершения выделения
				}
			} else {
				// Скрываем ToolTip только когда выделение полностью исчезло
				// и прошло некоторое время (чтобы не скрывать при быстрых изменениях)
				if (this.selectionTimeout) {
					clearTimeout(this.selectionTimeout)
				}
				this.selectionTimeout = setTimeout(() => {
					this.hideSelectionTooltip()
				}, 100) // Небольшая задержка перед скрытием
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
				// НЕ скрываем ToolTip здесь - он должен остаться видимым
				// selectedText обновляется в handleSelectionChange
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
			// Расширяем выделение до полных слов
			// Примечание: даже если слово обрезано, AI обычно понимает контекст
			const expandedText = this.expandSelectionToFullWords(selectedText)
			
			// Эмитим событие для отправки вопроса с расширенным текстом
			this.$emit('word-click', {
				word: expandedText,
				messageId: this.message.id
			})
			// Автоматически скрываем ToolTip после отправки
			this.hideSelectionTooltip()
		},
		
		expandSelectionToFullWords(selectedText) {
			if (!selectedText || !this.message.parsed?.text) {
				return selectedText
			}
			
			const fullText = this.message.parsed.text
			const selectedIndex = fullText.indexOf(selectedText)
			
			if (selectedIndex === -1) {
				return selectedText
			}
			
			// Ищем начало слова (от пробела, точки, запятой или начала строки)
			let startIndex = selectedIndex
			while (startIndex > 0 && !/[\s.,!?;:()\[\]{}"'`]/.test(fullText[startIndex - 1])) {
				startIndex--
			}
			
			// Ищем конец слова (до пробела, точки, запятой или конца строки)
			let endIndex = selectedIndex + selectedText.length
			while (endIndex < fullText.length && !/[\s.,!?;:()\[\]{}"'`]/.test(fullText[endIndex])) {
				endIndex++
			}
			
			// Получаем расширенный текст
			const expandedText = fullText.substring(startIndex, endIndex).trim()
			
			// Если расширенный текст слишком длинный (больше 150 символов), 
			// возвращаем только выделенный текст
			if (expandedText.length > 150) {
				return selectedText
			}
			
			// Если расширенный текст содержит только один символ или очень короткий,
			// возвращаем исходный выделенный текст
			if (expandedText.length < 3) {
				return selectedText
			}
			
			return expandedText
		},
		
		preprocessTextForMarkdown(text) {
			if (!text) return text
			
			// Шаг 1: Находим и исправляем нумерованные списки
			// Ищем паттерны типа "1. текст 2. текст" и разбиваем их на строки
			text = text.replace(/(\d+\.\s+[^\n]+?)(?=\s+\d+\.)/g, '$1\n')
			
			// Шаг 2: Находим и исправляем маркированные списки
			// Ищем паттерны типа "• текст • текст" и разбиваем их на строки
			text = text.replace(/([•\-]\s+[^\n]+?)(?=\s+[•\-])/g, '$1\n')
			
			// Шаг 3: Добавляем пустые строки ПЕРЕД списками для правильного парсинга
			// Это критически важно для markdown-it
			text = text.replace(/([^\n])\n(\d+\.\s)/g, '$1\n\n$2')
			text = text.replace(/([^\n])\n([•\-]\s)/g, '$1\n\n$2')
			
			// Шаг 4: Исправляем случаи, когда первый элемент списка остается в предыдущем абзаце
			// Ищем текст, заканчивающийся на "1." и добавляем перенос строки
			text = text.replace(/([^\n])\s+(\d+\.\s)/g, '$1\n\n$2')
			
			// Шаг 5: Убираем лишние пробелы в начале элементов списка
			text = text.replace(/^\s*(\d+\.\s+)/gm, '$1')
			text = text.replace(/^\s*([•\-]\s+)/gm, '$1')
			
			// Шаг 6: Убираем лишние пробелы в конце элементов списка
			text = text.replace(/(\d+\.\s+[^\n]+)\s+$/gm, '$1')
			text = text.replace(/([•\-]\s+[^\n]+)\s+$/gm, '$1')
			
			// Шаг 7: Исправляем случаи, когда элементы списка содержат вложенные списки
			// Например: "1. Основной пункт • Подпункт 1 • Подпункт 2"
			text = text.replace(/(\d+\.\s+[^\n]*?)([•\-]\s+)/g, '$1\n$2')
			
			// Шаг 8: Добавляем пустые строки между основными списками и подсписками
			text = text.replace(/(\d+\.\s+[^\n]+)\n([•\-]\s+)/g, '$1\n\n$2')
			
			return text
		},
		
		handleWordClick(event) {
			// Этот метод обрабатывает клики по сообщению
			// При двойном клике на слово - выделяем его и показываем ToolTip
			if (event.detail === 2) {
				const selection = window.getSelection()
				if (selection) {
					// Очищаем предыдущее выделение
					selection.removeAllRanges()
					
					// Создаем новое выделение для слова
					const range = document.createRange()
					const target = event.target
					
					// Если кликнули по текстовому узлу, выделяем его
					if (target.nodeType === Node.TEXT_NODE) {
						range.selectNodeContents(target)
					} else if (target.nodeType === Node.ELEMENT_NODE) {
						// Если кликнули по элементу, выделяем его содержимое
						range.selectNodeContents(target)
					}
					
					selection.addRange(range)
					
					// Позиционируем ToolTip
					this.tooltipPosition = {
						x: event.clientX,
						y: event.clientY
					}
					
					// Показываем ToolTip
					this.showSelectionTooltip = true
				}
			}
		},
		
		handleRetry(question, messageId) {
			this.$emit('retry', question, messageId)
		},
		

	}
}
</script>

<style scoped>
/* Стили для markdown элементов */
::v-deep .message-body {
	cursor: text;
	line-height: 1.6;
}

::v-deep .message-body h1,
::v-deep .message-body h2,
::v-deep .message-body h3,
::v-deep .message-body h4,
::v-deep .message-body h5,
::v-deep .message-body h6 {
	margin-top: 1.5em;
	margin-bottom: 0.5em;
	font-weight: 600;
	color: rgb(15, 23, 42); /* slate-900 */
}

::v-deep .message-body h1 { font-size: 1.5em; }
::v-deep .message-body h2 { font-size: 1.25em; }
::v-deep .message-body h3 { font-size: 1.125em; }

::v-deep .message-body p {
	margin-bottom: 1em;
}

::v-deep .message-body ul,
::v-deep .message-body ol {
	margin-bottom: 1em;
	padding-left: 1.5em;
}

::v-deep .message-body li {
	margin-bottom: 0.25em;
}

::v-deep .message-body blockquote {
	border-left: 4px solid rgb(59, 130, 246); /* blue-500 */
	padding-left: 1em;
	margin: 1em 0;
	font-style: italic;
	color: rgb(71, 85, 105); /* slate-600 */
}

::v-deep .message-body code {
	background-color: rgb(241, 245, 249); /* slate-100 */
	padding: 0.125em 0.25em;
	border-radius: 0.25em;
	font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	font-size: 0.875em;
	color: rgb(220, 38, 38); /* red-600 */
}

::v-deep .message-body pre {
	background-color: rgb(15, 23, 42); /* slate-900 */
	color: rgb(241, 245, 249); /* slate-100 */
	padding: 1em;
	border-radius: 0.5em;
	overflow-x: auto;
	margin: 1em 0;
}

::v-deep .message-body pre code {
	background-color: transparent;
	padding: 0;
	color: inherit;
}

::v-deep .message-body a {
	color: rgb(59, 130, 246); /* blue-500 */
	text-decoration: underline;
}

::v-deep .message-body a:hover {
	color: rgb(37, 99, 235); /* blue-600 */
}

::v-deep .message-body strong {
	font-weight: 600;
	color: rgb(15, 23, 42); /* slate-900 */
}

::v-deep .message-body em {
	font-style: italic;
	color: rgb(71, 85, 105); /* slate-600 */
}

::v-deep .message-body hr {
	border: none;
	border-top: 1px solid rgb(226, 232, 240); /* slate-200 */
	margin: 2em 0;
}

::v-deep .message-body table {
	border-collapse: collapse;
	width: 100%;
	margin: 1em 0;
}

::v-deep .message-body th,
::v-deep .message-body td {
	border: 1px solid rgb(226, 232, 240); /* slate-200 */
	padding: 0.5em;
	text-align: left;
}

::v-deep .message-body th {
	background-color: rgb(248, 250, 252); /* slate-50 */
	font-weight: 600;
}


</style>

