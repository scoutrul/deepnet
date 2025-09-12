<template>
  <div class="search-panel bg-white rounded-lg shadow-lg p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Углубленный поиск</h2>
      <p class="text-gray-600">Найдите релевантную информацию по фразам и ключевым словам</p>
    </div>

    <!-- Поисковая строка -->
    <div class="mb-6">
      <div class="relative">
        <input
          v-model="searchQuery"
          @keyup.enter="performSearch"
          type="text"
          class="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Введите фразу или вопрос для поиска..."
        />
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <button
          @click="performSearch"
          :disabled="!searchQuery.trim() || isSearching"
          class="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <svg class="h-5 w-5 text-blue-500 hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Фильтры поиска -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Категории</label>
        <select
          v-model="searchFilters.categories"
          multiple
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="technical">Техническое</option>
          <option value="experience">Опыт работы</option>
          <option value="skills">Навыки</option>
          <option value="motivation">Мотивация</option>
          <option value="teamwork">Командная работа</option>
          <option value="company">О компании</option>
        </select>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Приоритет</label>
        <select
          v-model="searchFilters.priority"
          multiple
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="critical">Критический</option>
          <option value="high">Высокий</option>
          <option value="medium">Средний</option>
          <option value="low">Низкий</option>
        </select>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Временной диапазон</label>
        <select
          v-model="timeRange"
          @change="updateTimeRange"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Все время</option>
          <option value="today">Сегодня</option>
          <option value="week">Неделя</option>
          <option value="month">Месяц</option>
          <option value="custom">Пользовательский</option>
        </select>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Источники</label>
        <select
          v-model="searchFilters.sources"
          multiple
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="llm">ИИ</option>
          <option value="rule">Правила</option>
          <option value="pattern">Паттерны</option>
          <option value="dialog">Диалог</option>
        </select>
      </div>
    </div>

    <!-- Пользовательский временной диапазон -->
    <div v-if="timeRange === 'custom'" class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">От</label>
        <input
          v-model="customStartTime"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">До</label>
        <input
          v-model="customEndTime"
          type="datetime-local"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    <!-- Кнопки действий -->
    <div class="mb-6 flex flex-wrap gap-3">
      <button
        @click="performSearch"
        :disabled="!searchQuery.trim() || isSearching"
        class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
      >
        <svg v-if="isSearching" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {{ isSearching ? 'Поиск...' : 'Поиск' }}
      </button>
      
      <button
        @click="expandSearch"
        :disabled="!searchQuery.trim() || isSearching"
        class="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Расширенный поиск
      </button>
      
      <button
        @click="clearSearch"
        class="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
      >
        Очистить
      </button>
      
      <button
        @click="getContextualAnswer"
        :disabled="!searchQuery.trim() || isSearching"
        class="px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Получить ответ
      </button>
    </div>

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
              <p class="text-gray-600 mb-3">{{ result.content }}</p>
              
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
          @click="loadSearchQuery(query)"
          class="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <div class="font-medium text-gray-800">{{ query.text }}</div>
          <div class="text-sm text-gray-500">{{ formatTime(query.timestamp) }}</div>
        </div>
      </div>
      
      <button
        @click="clearSearchHistory"
        class="mt-3 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
      >
        Очистить историю
      </button>
    </div>
  </div>
</template>

<script>
import { SearchService, contextManager, searchService } from '../../services/context'

export default {
  name: 'SearchPanel',
  data() {
    return {
      searchQuery: '',
      searchResults: null,
      contextualAnswer: '',
      isSearching: false,
      searchHistory: [],
      timeRange: 'all',
      customStartTime: '',
      customEndTime: '',
      searchFilters: {
        categories: [],
        priority: [],
        sources: ['llm', 'rule', 'pattern', 'dialog']
      },
      searchService: null
    }
  },
  mounted() {
    this.initializeSearchService()
    this.loadSearchHistory()
  },
  methods: {
    // Инициализация сервиса поиска
    initializeSearchService() {
      // Используем глобальный экземпляр SearchService
      this.searchService = searchService
    },
    
    // Загрузка истории поиска
    loadSearchHistory() {
      if (this.searchService) {
        this.searchHistory = this.searchService.getSearchHistory()
      }
    },
    
    // Выполнение поиска
    async performSearch() {
      if (!this.searchQuery.trim()) return
      
      this.isSearching = true
      this.searchResults = null
      this.contextualAnswer = ''
      
      try {
        const context = contextManager.getFullContext()
        if (!context) {
          this.showError('Контекст не настроен. Пожалуйста, настройте контекст в панели контекста.')
          return
        }
        
        const filters = {
          ...this.searchFilters,
          timeRange: this.getTimeRange()
        }
        
        const results = await this.searchService.searchPhrase(this.searchQuery, context, filters)
        this.searchResults = results
        
      } catch (error) {
        console.error('Error performing search:', error)
        this.showError('Ошибка при выполнении поиска')
      } finally {
        this.isSearching = false
      }
    },
    
    // Расширенный поиск
    async expandSearch() {
      if (!this.searchQuery.trim()) return
      
      this.isSearching = true
      
      try {
        const context = contextManager.getFullContext()
        if (!context) {
          this.showError('Контекст не настроен')
          return
        }
        
        const results = await this.searchService.expandSearch(this.searchQuery, context)
        this.searchResults = results
        
      } catch (error) {
        console.error('Error expanding search:', error)
        this.showError('Ошибка при расширенном поиске')
      } finally {
        this.isSearching = false
      }
    },
    
    // Получение контекстного ответа
    async getContextualAnswer() {
      if (!this.searchQuery.trim()) return
      
      this.isSearching = true
      this.contextualAnswer = ''
      
      try {
        const context = contextManager.getFullContext()
        if (!context) {
          this.showError('Контекст не настроен')
          return
        }
        
        const answer = await this.searchService.getContextualAnswer(this.searchQuery, context)
        this.contextualAnswer = answer
        
      } catch (error) {
        console.error('Error getting contextual answer:', error)
        this.showError('Ошибка при получении ответа')
      } finally {
        this.isSearching = false
      }
    },
    
    // Очистка поиска
    clearSearch() {
      this.searchQuery = ''
      this.searchResults = null
      this.contextualAnswer = ''
    },
    
    // Загрузка запроса из истории
    loadSearchQuery(query) {
      this.searchQuery = query.text
      this.performSearch()
    },
    
    // Очистка истории поиска
    clearSearchHistory() {
      if (this.searchService) {
        this.searchService.clearSearchHistory()
        this.searchHistory = []
      }
    },
    
    // Обновление временного диапазона
    updateTimeRange() {
      if (this.timeRange === 'custom') {
        const now = new Date()
        this.customEndTime = now.toISOString().slice(0, 16)
        this.customStartTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
      }
    },
    
    // Получение временного диапазона
    getTimeRange() {
      const now = Date.now()
      
      switch (this.timeRange) {
        case 'today':
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          return { start: today.getTime(), end: now }
        case 'week':
          return { start: now - 7 * 24 * 60 * 60 * 1000, end: now }
        case 'month':
          return { start: now - 30 * 24 * 60 * 60 * 1000, end: now }
        case 'custom':
          return {
            start: this.customStartTime ? new Date(this.customStartTime).getTime() : 0,
            end: this.customEndTime ? new Date(this.customEndTime).getTime() : now
          }
        default:
          return { start: 0, end: now }
      }
    },
    
    // Копирование в буфер обмена
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text)
        this.showSuccess('Скопировано в буфер обмена')
      } catch (error) {
        console.error('Error copying to clipboard:', error)
        this.showError('Ошибка при копировании')
      }
    },
    
    // Использование в чате
    useInChat(result) {
      // Эмит события для использования в чате
      this.$emit('use-in-chat', result.content)
      this.showSuccess('Добавлено в чат')
    },
    
    // Получение класса результата
    getResultClass(result) {
      const baseClass = 'border-gray-200'
      
      if (result.relevance > 0.8) {
        return `${baseClass} border-green-200 bg-green-50`
      } else if (result.relevance > 0.6) {
        return `${baseClass} border-yellow-200 bg-yellow-50`
      }
      
      return baseClass
    },
    
    // Получение класса типа
    getTypeClass(type) {
      const typeMap = {
        hint: 'bg-blue-100 text-blue-800',
        dialog: 'bg-green-100 text-green-800',
        summary: 'bg-purple-100 text-purple-800',
        context: 'bg-orange-100 text-orange-800'
      }
      
      return typeMap[type] || 'bg-gray-100 text-gray-800'
    },
    
    // Получение иконки типа
    getTypeIcon(type) {
      const iconMap = {
        hint: '💡',
        dialog: '💬',
        summary: '📝',
        context: '🎯'
      }
      
      return iconMap[type] || '📄'
    },
    
    // Получение текста типа
    getTypeText(type) {
      const textMap = {
        hint: 'Подсказка',
        dialog: 'Диалог',
        summary: 'Резюме',
        context: 'Контекст'
      }
      
      return textMap[type] || type
    },
    
    // Получение класса релевантности
    getRelevanceClass(relevance) {
      if (relevance > 0.8) {
        return 'bg-green-100 text-green-800'
      } else if (relevance > 0.6) {
        return 'bg-yellow-100 text-yellow-800'
      } else {
        return 'bg-gray-100 text-gray-800'
      }
    },
    
    // Получение текста источника
    getSourceText(source) {
      const sourceMap = {
        llm: 'ИИ',
        rule: 'Правило',
        pattern: 'Паттерн',
        dialog: 'Диалог'
      }
      
      return sourceMap[source] || source
    },
    
    // Форматирование времени
    formatTime(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) {
        return 'только что'
      } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000)
        return `${minutes} мин назад`
      } else if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000)
        return `${hours} ч назад`
      } else {
        return date.toLocaleDateString('ru-RU')
      }
    },
    
    // Показ ошибки
    showError(message) {
      // Здесь можно добавить уведомления
      console.error(message)
    },
    
    // Показ успеха
    showSuccess(message) {
      // Здесь можно добавить уведомления
      console.log(message)
    }
  }
}
</script>

<style scoped>
.search-panel {
  max-height: 80vh;
  overflow-y: auto;
}

/* Стили для скроллбара */
.search-panel::-webkit-scrollbar {
  width: 6px;
}

.search-panel::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.search-panel::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.search-panel::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Анимация загрузки */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
