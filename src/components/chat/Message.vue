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
        <!-- Содержимое сообщения -->
        <MessageContent
          :message="message"
          @retry="handleRetry"
          @word-click="handleWordClick"
        />
        
        <!-- Действия с сообщением -->
        <MessageActions
          v-if="message.parsed && !message.error && !message.isTimeout && !message.parsed.error"
          :message="message"
          :show-actions="showActions"
          @clarify="handleClarify"
          @respond-as-user="handleRespondAsUser"
          @continue-as-bot="handleContinueAsBot"
          @copy="handleCopy"
          @edit="handleEdit"
          @delete="handleDelete"
        />
					</div>
				</div>
    
    <!-- Метаданные сообщения -->
    <MessageMetadata
      :message="message"
      :queued="queued"
      :show-metadata="showMetadata"
      :show-additional-info="showAdditionalInfo"
    />
	</div>
</template>

<script>
import TextSelectionTooltip from '@/components/ui/TextSelectionTooltip.vue'
import MessageContent from '@/components/chat/MessageContent.vue'
import MessageActions from '@/components/chat/MessageActions.vue'
import MessageMetadata from '@/components/chat/MessageMetadata.vue'

export default {
	name: 'Message',
  components: {
    TextSelectionTooltip,
    MessageContent,
    MessageActions,
    MessageMetadata
  },
	props: {
    message: { 
      type: Object, 
      required: true 
    },
    queued: { 
      type: Array, 
      default: () => [] 
    },
    showActions: {
      type: Boolean,
      default: true
    },
    showMetadata: {
      type: Boolean,
      default: true
    },
    showAdditionalInfo: {
      type: Boolean,
      default: false
    }
  },
	data() {
		return {
			showSelectionTooltip: false,
			selectedText: '',
			tooltipPosition: { x: 0, y: 0 },
      selectionTimeout: null
		}
	},
	mounted() {
		this.setupTextSelection()
	},
	beforeDestroy() {
    this.cleanupTextSelection()
	},
	methods: {
		setupTextSelection() {
			// Добавляем обработчики для отслеживания выделения текста
			document.addEventListener('selectionchange', this.handleSelectionChange)
			document.addEventListener('mouseup', this.handleMouseUp)
			document.addEventListener('click', this.handleDocumentClick)
			this.selectionTimeout = null
		},
    
    cleanupTextSelection() {
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
		
		handleSelectionChange() {
			const selection = window.getSelection()
			if (selection && selection.toString().trim()) {
				const newSelectedText = selection.toString().trim()
				
				// Проверяем, изменился ли выделенный текст
				if (this.selectedText !== newSelectedText) {
					this.selectedText = newSelectedText
					
					// Показываем ToolTip для нового выделения
					if (this.selectionTimeout) {
						clearTimeout(this.selectionTimeout)
					}
					this.selectionTimeout = setTimeout(() => {
						this.showSelectionTooltip = true
					}, 300) // 300ms задержка для завершения выделения
				}
			} else {
				// Скрываем ToolTip только когда выделение полностью исчезло
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
		
    // Обработчики событий от дочерних компонентов
    handleRetry(data) {
      this.$emit('retry', data)
    },
    
    handleWordClick(data) {
      // Обработка клика по слову в содержимом сообщения
      // Здесь можно добавить дополнительную логику
    },
    
    handleClarify(text) {
      this.$emit('clarify', text)
    },
    
    handleRespondAsUser(text) {
      this.$emit('respond-as-user', text)
    },
    
    handleContinueAsBot(text) {
      this.$emit('continue-as-bot', text)
    },
    
    handleCopy(text) {
      this.$emit('copy', text)
    },
    
    handleEdit(message) {
      this.$emit('edit', message)
    },
    
    handleDelete(message) {
      this.$emit('delete', message)
    }
	}
}
</script>

<style scoped>
.message-container {
  /* Стили для контейнера сообщения */
}

/* Анимации */
.message-container {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Стили для сообщений пользователя */
.message-container .bg-slate-900 {
  background-color: #0f172a;
  color: #f8fafc;
  border-color: #1e293b;
}

/* Стили для сообщений бота */
.message-container .bg-white {
  background-color: #ffffff;
  color: #0f172a;
  border-color: #e2e8f0;
}

/* Стили для тени */
.message-container .shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

/* Стили для скругления */
.message-container .rounded-2xl {
  border-radius: 1rem;
}

/* Стили для отступов */
.message-container .px-3 {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.message-container .py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

/* Стили для максимальной ширины */
.message-container .max-w-\[80\%\] {
  max-width: 80%;
}

/* Стили для выравнивания */
.message-container .justify-end {
  justify-content: flex-end;
}

.message-container .justify-start {
  justify-content: flex-start;
}

/* Стили для полной ширины */
.message-container .w-full {
  width: 100%;
}

/* Стили для флекса */
.message-container .flex {
  display: flex;
}

/* Стили для границ */
.message-container .border {
  border-width: 1px;
  border-style: solid;
}

/* Стили для текста */
.message-container .text-slate-50 {
  color: #f8fafc;
}

.message-container .text-slate-900 {
  color: #0f172a;
}

/* Стили для границ */
.message-container .border-slate-800 {
  border-color: #1e293b;
}

.message-container .border-slate-200 {
  border-color: #e2e8f0;
}
</style>