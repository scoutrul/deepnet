<template>
  <div class="search-results">
    <!-- Результаты поиска -->
    <div v-if="searchResults" class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-800">
          Результаты поиска ({{ searchResults.totalCount }})
        </h3>
        <div class="text-sm text-gray-500">
          Время поиска: {{ searchResults.processingTime }}мс
        </div>
      </div>
      
      <div v-if="searchResults.results.length === 0" class="text-center py-8 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <p>Результаты не найдены</p>
        <p class="text-sm">Попробуйте изменить поисковый запрос или фильтры</p>
      </div>
      
      <div v-else class="space-y-3">
        <div
          v-for="result in searchResults.results"
          :key="result.id"
          class="search-result border rounded-lg p-4 hover:shadow-md transition-shadow"
          :class="getResultClass(result)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center mb-2">
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2"
                  :class="getTypeClass(result.type)"
                >
                  {{ getTypeIcon(result.type) }} {{ getTypeText(result.type) }}
                </span>
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  :class="getRelevanceClass(result.relevance)"
                >
                  {{ Math.round(result.relevance * 100) }}% релевантность
                </span>
              </div>
              
              <h4 class="font-semibold text-gray-800 mb-2">{{ result.title }}</h4>
              <div 
                class="text-gray-600 mb-3 search-result-content"
                v-html="getFormattedContent(result.content)"
              ></div>
              
              <div class="flex items-center text-xs text-gray-500">
                <span class="mr-4">Источник: {{ getSourceText(result.source) }}</span>
                <span class="mr-4">{{ formatTime(result.timestamp) }}</span>
                <span v-if="result.metadata && result.metadata.speaker">
                  Спикер: {{ result.metadata.speaker }}
                </span>
              </div>
            </div>
            
            <div class="flex flex-col space-y-2 ml-4">
              <button
                @click="copyToClipboard(result.content)"
                class="p-2 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Копировать в буфер обмена"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              </button>
              
              <button
                @click="useInChat(result)"
                class="p-2 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                title="Использовать в чате"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Контекстный ответ -->
    <div v-if="contextualAnswer" class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 class="font-semibold text-blue-800 mb-2">Контекстный ответ:</h4>
      <p class="text-blue-700">{{ contextualAnswer }}</p>
    </div>

    <!-- История поиска -->
    <div v-if="searchHistory.length > 0" class="mt-8">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">История поиска</h3>
      <div class="space-y-2">
        <div
          v-for="query in searchHistory.slice(0, 5)"
          :key="query.id"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <span class="text-gray-700">{{ query.text }}</span>
          <div class="flex items-center space-x-2">
            <span class="text-xs text-gray-500">{{ formatTime(query.timestamp) }}</span>
            <button
              @click="repeatSearch(query.text)"
              class="p-1 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
              title="Повторить поиск"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SearchResults',
  props: {
    searchResults: {
      type: Object,
      default: null
    },
    contextualAnswer: {
      type: String,
      default: ''
    },
    searchHistory: {
      type: Array,
      default: () => []
    }
  },
  emits: [
    'copy-to-clipboard',
    'use-in-chat',
    'repeat-search'
  ],
  methods: {
    getResultClass(result) {
      const classes = []
      if (result.relevance > 0.8) classes.push('border-green-200 bg-green-50')
      else if (result.relevance > 0.6) classes.push('border-yellow-200 bg-yellow-50')
      else classes.push('border-gray-200 bg-white')
      return classes.join(' ')
    },
    
    getTypeClass(type) {
      const typeClasses = {
        'llm': 'bg-purple-100 text-purple-800',
        'rule': 'bg-blue-100 text-blue-800',
        'pattern': 'bg-green-100 text-green-800',
        'dialog': 'bg-orange-100 text-orange-800'
      }
      return typeClasses[type] || 'bg-gray-100 text-gray-800'
    },
    
    getRelevanceClass(relevance) {
      if (relevance > 0.8) return 'bg-green-100 text-green-800'
      if (relevance > 0.6) return 'bg-yellow-100 text-yellow-800'
      return 'bg-red-100 text-red-800'
    },
    
    getTypeIcon(type) {
      const icons = {
        'llm': '🤖',
        'rule': '📋',
        'pattern': '🔍',
        'dialog': '💬'
      }
      return icons[type] || '📄'
    },
    
    getTypeText(type) {
      const texts = {
        'llm': 'ИИ',
        'rule': 'Правило',
        'pattern': 'Паттерн',
        'dialog': 'Диалог'
      }
      return texts[type] || 'Неизвестно'
    },
    
    getSourceText(source) {
      const sources = {
        'llm': 'ИИ-ассистент',
        'rule': 'Правила системы',
        'pattern': 'Паттерны',
        'dialog': 'Диалог'
      }
      return sources[source] || 'Неизвестный источник'
    },
    
    getFormattedContent(content) {
      if (!content) return ''
      // Простое форматирование - можно расширить
      return content.replace(/\n/g, '<br>')
    },
    
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleString('ru-RU')
    },
    
    copyToClipboard(content) {
      this.$emit('copy-to-clipboard', content)
    },
    
    useInChat(result) {
      this.$emit('use-in-chat', result)
    },
    
    repeatSearch(query) {
      this.$emit('repeat-search', query)
    }
  }
}
</script>

<style scoped>
.search-results {
  /* Стили для результатов поиска */
}

.search-result {
  transition: all 0.2s ease-in-out;
}

.search-result:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.search-result-content {
  line-height: 1.6;
}

/* Стили для кнопок действий */
button {
  transition: all 0.2s ease-in-out;
}

button:hover {
  transform: scale(1.05);
}

/* Анимации для загрузки */
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

.search-result {
  animation: fadeIn 0.3s ease-out;
}

/* Стили для истории поиска */
.history-item {
  transition: all 0.2s ease-in-out;
}

.history-item:hover {
  transform: translateX(4px);
}
</style>
