<template>
  <div class="search-panel bg-white rounded-lg shadow-lg p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Углубленный поиск</h2>
      <p class="text-gray-600">Найдите релевантную информацию по фразам и ключевым словам</p>
    </div>

    <!-- Поисковый ввод -->
    <SearchInput
      v-model:searchQuery="searchQuery"
      :isSearching="isSearching"
      @search="performSearch"
      @expand-search="expandSearch"
      @clear-search="clearSearch"
      @get-contextual-answer="getContextualAnswer"
    />

    <!-- Фильтры поиска -->
    <SearchFilters
      v-model:filters="searchFilters"
      @apply-filters="applyFilters"
      @reset-filters="resetFilters"
      @save-filters="saveFilters"
    />

    <!-- Результаты поиска -->
    <SearchResults
      :searchResults="searchResults"
      :contextualAnswer="contextualAnswer"
      :searchHistory="searchHistory"
      @copy-to-clipboard="copyToClipboard"
      @use-in-chat="useInChat"
      @repeat-search="repeatSearch"
    />
  </div>
</template>

<script>
import SearchInput from './SearchInput.vue'
import SearchFilters from './SearchFilters.vue'
import SearchResults from './SearchResults.vue'
import { searchService } from '../../services/context'
import { contextManager } from '../../services/context'

export default {
  name: 'SearchPanel',
  components: {
    SearchInput,
    SearchFilters,
    SearchResults
  },
  data() {
    return {
      searchQuery: '',
      isSearching: false,
      searchResults: null,
      contextualAnswer: '',
      searchFilters: {
        categories: [],
        priority: [],
        sources: []
      },
      searchHistory: [],
      contentCache: new Map()
    }
  },
  mounted() {
    this.initializeSearch()
  },
  methods: {
    async initializeSearch() {
      try {
        // Загружаем историю поиска
        this.searchHistory = await searchService.getSearchHistory()
      } catch (error) {
        console.error('Error initializing search:', error)
      }
    },

    async performSearch(query) {
      if (!query.trim()) return
      
      this.isSearching = true
      this.searchResults = null
      this.contextualAnswer = ''
      
      try {
        const context = contextManager.getFullContext()
        if (!context) {
          this.showError('Контекст не настроен')
          return
        }
        
        const results = await searchService.searchPhrase(query, context, this.searchFilters)
        this.searchResults = results
        
        // Добавляем в историю
        this.addToHistory(query)
        
      } catch (error) {
        console.error('Error performing search:', error)
        this.showError('Ошибка при поиске')
      } finally {
        this.isSearching = false
      }
    },
    
    async expandSearch(query) {
      if (!query.trim()) return
      
      this.isSearching = true
      
      try {
        const context = contextManager.getFullContext()
        if (!context) {
          this.showError('Контекст не настроен')
          return
        }
        
        const results = await searchService.expandSearch(query, context, this.searchFilters)
        this.searchResults = results
        
        // Добавляем в историю
        this.addToHistory(query)
        
      } catch (error) {
        console.error('Error expanding search:', error)
        this.showError('Ошибка при расширенном поиске')
      } finally {
        this.isSearching = false
      }
    },
    
    async getContextualAnswer(query) {
      if (!query.trim()) return
      
      this.isSearching = true
      
      try {
        const context = contextManager.getFullContext()
        if (!context) {
          this.showError('Контекст не настроен')
          return
        }
        
        const answer = await searchService.getContextualAnswer(query, context)
        this.contextualAnswer = answer
        
      } catch (error) {
        console.error('Error getting contextual answer:', error)
        this.showError('Ошибка при получении ответа')
      } finally {
        this.isSearching = false
      }
    },
    
    clearSearch() {
      this.searchQuery = ''
      this.searchResults = null
      this.contextualAnswer = ''
      this.contentCache.clear()
    },
    
    applyFilters(filters) {
      this.searchFilters = { ...filters }
      if (this.searchQuery.trim()) {
        this.performSearch(this.searchQuery)
      }
    },

    resetFilters() {
      this.searchFilters = {
        categories: [],
        priority: [],
        sources: []
      }
    },

    saveFilters(filters) {
      // Сохраняем фильтры в localStorage
      localStorage.setItem('searchFilters', JSON.stringify(filters))
      this.showSuccess('Фильтры сохранены')
    },

    async addToHistory(query) {
      const historyItem = {
        id: Date.now().toString(),
        text: query,
        timestamp: Date.now()
      }
      
      this.searchHistory.unshift(historyItem)
      
      // Ограничиваем историю 50 элементами
      if (this.searchHistory.length > 50) {
        this.searchHistory = this.searchHistory.slice(0, 50)
      }
      
      // Сохраняем в сервисе
      await searchService.addToHistory(historyItem)
    },

    repeatSearch(query) {
      this.searchQuery = query
      this.performSearch(query)
    },

    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text)
        this.showSuccess('Скопировано в буфер обмена')
      } catch (error) {
        console.error('Error copying to clipboard:', error)
        this.showError('Ошибка при копировании')
      }
    },
    
    useInChat(result) {
      // Эмит события для использования в чате
      this.$emit('use-in-chat', result.content)
      this.showSuccess('Добавлено в чат')
    },
    
    showError(message) {
      // Простое уведомление об ошибке
      console.error(message)
      // Можно добавить toast уведомления
    },
    
    showSuccess(message) {
      // Простое уведомление об успехе
      console.log(message)
      // Можно добавить toast уведомления
    }
  }
}
</script>

<style scoped>
.search-panel {
  /* Основные стили панели поиска */
}

/* Анимации */
.search-panel {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Стили для уведомлений */
.error-message {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.success-message {
  color: #059669;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
</style>