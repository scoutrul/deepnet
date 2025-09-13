<template>
  <div class="message-content">
    <!-- Индикатор печати -->
    <div v-if="message.typing" class="flex items-center gap-1 text-sm">
      <span class="animate-pulse">●</span>
      <span class="animate-pulse delay-150">●</span>
      <span class="animate-pulse delay-300">●</span>
    </div>
    
    <!-- Сообщение об ошибке -->
    <div v-else-if="message.error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
      <div class="flex items-center justify-between">
        <span>{{ typeof message.error === 'string' ? message.error : (message.content || 'API Error occurred') }}</span>
        <button 
          v-if="message.originalQuestion"
          @click="handleRetry"
          class="retry-button ml-3 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors duration-200 flex items-center gap-1"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Повторить
        </button>
      </div>
    </div>
    
    <!-- Сообщение о таймауте -->
    <div v-else-if="message.isTimeout" class="timeout-message rounded-md border p-3">
      <div class="flex items-center justify-between">
        <span>{{ message.content }}</span>
        <button 
          v-if="message.originalQuestion"
          @click="handleRetry"
          class="retry-button ml-3 px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition-colors duration-200 flex items-center gap-1"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Повторить
        </button>
      </div>
    </div>
    
    <!-- Основное содержимое сообщения -->
    <div v-else>
      <!-- Парсированное содержимое с форматированием -->
      <div 
        v-if="message.parsed && !message.error && !message.isTimeout && !message.parsed.error" 
        class="space-y-2"
      >
        <div 
          class="message-body text-sm"
          v-html="formattedText"
          @click="handleWordClick"
        ></div>
      </div>
      
      <!-- Простое текстовое содержимое -->
      <p v-else class="whitespace-pre-wrap text-sm">{{ message.content }}</p>
    </div>
  </div>
</template>

<script>
import MarkdownIt from 'markdown-it'

export default {
  name: 'MessageContent',
  props: {
    message: {
      type: Object,
      required: true
    }
  },
  emits: [
    'retry',
    'word-click'
  ],
  data() {
    return {
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
        ],
        // Дополнительные настройки для лучшего рендеринга
        quotes: ['«', '»', '‹', '›'],
        // Улучшенная обработка списков
        listIndent: 1,
        // Более гибкий парсинг
        strict: false
      })
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
    }
  },
  methods: {
    handleRetry() {
      this.$emit('retry', {
        originalQuestion: this.message.originalQuestion,
        messageId: this.message.id
      })
    },
    
    handleWordClick(event) {
      // Эмитим событие для обработки клика по слову
      this.$emit('word-click', {
        event,
        messageId: this.message.id
      })
    },
    
    preprocessTextForMarkdown(text) {
      if (!text) return text
      
      console.log('🎯 [MARKDOWN] Preprocessing text:', {
        originalLength: text.length,
        firstLines: text.split('\n').slice(0, 3)
      })
      
      // Шаг 1: Очищаем HTML теги и entities
      text = text.replace(/<[^>]*>/g, '') // Убираем HTML теги
      text = text.replace(/&[a-zA-Z]+;/g, '') // Убираем HTML entities
      
      // Шаг 2: Обрабатываем заголовки и разделы
      // Ищем паттерны типа "🏆 ЗАГОЛОВОК:" или "✅ ПОДЗАГОЛОВОК:"
      text = text.replace(/([🏆✅🔍📋📄🎯⚡🔧🎉🚀]+\s+[А-ЯЁ\s]+:)/g, '\n\n## $1\n')
      
      // Шаг 3: Обрабатываем эмодзи-заголовки без двоеточия
      text = text.replace(/([🏆✅🔍📋📄🎯⚡🔧🎉🚀]+\s+[А-ЯЁ\s]+)(?=\n)/g, '\n\n## $1\n')
      
      // Шаг 4: Находим и исправляем нумерованные списки
      // Ищем паттерны типа "1. текст 2. текст" и разбиваем их на строки
      text = text.replace(/(\d+\.\s+[^\n]+?)(?=\s+\d+\.)/g, '$1\n')
      
      // Шаг 5: Находим и исправляем маркированные списки
      // Ищем паттерны типа "• текст • текст" и разбиваем их на строки
      text = text.replace(/([•\-]\s+[^\n]+?)(?=\s+[•\-])/g, '$1\n')
      
      // Шаг 6: Добавляем пустые строки ПЕРЕД списками для правильного парсинга
      text = text.replace(/([^\n])\n(\d+\.\s)/g, '$1\n\n$2')
      text = text.replace(/([^\n])\n([•\-]\s)/g, '$1\n\n$2')
      
      // Шаг 7: Исправляем случаи, когда первый элемент списка остается в предыдущем абзаце
      text = text.replace(/([^\n])\s+(\d+\.\s)/g, '$1\n\n$2')
      
      // Шаг 8: Обрабатываем элементы списка, содержащие заголовки
      // Ищем паттерны типа "• текст ЗАГОЛОВОК" и разбиваем их
      text = text.replace(/([•\-]\s+[^\n]*?)([🏆✅🔍📋📄🎯⚡🔧🎉🚀]+\s+[А-ЯЁ\s]+:)/g, '$1\n\n## $2\n')
      
      // Шаг 9: Обрабатываем элементы списка с переносами строк
      // Ищем паттерны типа "• текст\nЗАГОЛОВОК" и исправляем
      text = text.replace(/([•\-]\s+[^\n]*?)\n([🏆✅🔍📋📄🎯⚡🔧🎉🚀]+\s+[А-ЯЁ\s]+:)/g, '$1\n\n## $2\n')
      
      // Шаг 10: Убираем лишние пробелы в начале элементов списка
      text = text.replace(/^\s*(\d+\.\s+)/gm, '$1')
      text = text.replace(/^\s*([•\-]\s+)/gm, '$1')
      
      // Шаг 11: Обрабатываем многоуровневые списки
      // Ищем паттерны типа "1. текст\n  2. подтекст" и исправляем
      text = text.replace(/(\d+\.\s+[^\n]+)\n(\s+\d+\.\s+)/g, '$1\n\n$2')
      
      // Шаг 12: Обрабатываем маркированные списки с отступами
      text = text.replace(/([•\-]\s+[^\n]+)\n(\s+[•\-]\s+)/g, '$1\n\n$2')
      
      // Шаг 13: Исправляем случаи, когда заголовки остаются в элементах списка
      text = text.replace(/([•\-]\s+[^\n]*?)([🏆✅🔍📋📄🎯⚡🔧🎉🚀]+\s+[А-ЯЁ\s]+)(?=\n)/g, '$1\n\n## $2\n')
      
      // Шаг 14: Обрабатываем нумерованные списки с заголовками
      text = text.replace(/(\d+\.\s+[^\n]*?)([🏆✅🔍📋📄🎯⚡🔧🎉🚀]+\s+[А-ЯЁ\s]+)(?=\n)/g, '$1\n\n## $2\n')
      
      // Шаг 15: Добавляем пустые строки после заголовков для лучшего отображения
      text = text.replace(/(##\s+[^\n]+)\n([^\n])/g, '$1\n\n$2')
      
      // Шаг 16: Обрабатываем случаи, когда заголовки идут подряд
      text = text.replace(/(##\s+[^\n]+)\n(##\s+[^\n]+)/g, '$1\n\n$2')
      
      // Шаг 17: Исправляем случаи, когда список начинается сразу после заголовка
      text = text.replace(/(##\s+[^\n]+)\n(\d+\.\s)/g, '$1\n\n$2')
      text = text.replace(/(##\s+[^\n]+)\n([•\-]\s)/g, '$1\n\n$2')
      
      // Шаг 18: Обрабатываем случаи, когда заголовок находится в середине элемента списка
      text = text.replace(/([•\-]\s+[^\n]*?)([🏆✅🔍📋📄🎯⚡🔧🎉🚀]+\s+[А-ЯЁ\s]+:)([^\n]*)/g, '$1\n\n## $2$3')
      
      // Шаг 19: Обрабатываем нумерованные списки с заголовками в середине
      text = text.replace(/(\d+\.\s+[^\n]*?)([🏆✅🔍📋📄🎯⚡🔧🎉🚀]+\s+[А-ЯЁ\s]+:)([^\n]*)/g, '$1\n\n## $2$3')
      
      // Шаг 20: Финальная очистка - убираем лишние пустые строки
      text = text.replace(/\n{3,}/g, '\n\n')
      
      console.log('🎯 [MARKDOWN] Processed text:', {
        processedLength: text.length,
        firstLines: text.split('\n').slice(0, 5)
      })
      
      return text
    }
  }
}
</script>

<style scoped>
.message-content {
  /* Стили для содержимого сообщения */
}

.message-body {
  line-height: 1.6;
}

/* Анимации для индикатора печати */
.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

.delay-150 {
  animation-delay: 0.15s;
}

.delay-300 {
  animation-delay: 0.3s;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

/* Стили для кнопок */
.retry-button {
  transition: all 0.2s ease-in-out;
}

.retry-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Стили для сообщений об ошибках */
.timeout-message {
  border-color: #fbbf24;
  background-color: #fef3c7;
  color: #92400e;
}

/* Стили для форматированного текста */
.message-body :deep(h1),
.message-body :deep(h2),
.message-body :deep(h3),
.message-body :deep(h4),
.message-body :deep(h5),
.message-body :deep(h6) {
  margin: 1em 0 0.5em 0;
  font-weight: 600;
  line-height: 1.25;
}

.message-body :deep(ul),
.message-body :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.message-body :deep(li) {
  margin: 0.25em 0;
}

.message-body :deep(p) {
  margin: 0.5em 0;
}

.message-body :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #e5e7eb;
  background-color: #f9fafb;
  font-style: italic;
}

.message-body :deep(code) {
  background-color: #f3f4f6;
  padding: 0.125em 0.25em;
  border-radius: 0.25em;
  font-family: 'Courier New', monospace;
  font-size: 0.875em;
}

.message-body :deep(pre) {
  background-color: #f3f4f6;
  padding: 1em;
  border-radius: 0.5em;
  overflow-x: auto;
  margin: 1em 0;
}

.message-body :deep(pre code) {
  background: none;
  padding: 0;
}
</style>
