<template>
  <div class="search-input">
    <!-- Поисковая строка -->
    <div class="mb-6">
      <div class="relative">
        <input
          v-model="localSearchQuery"
          @keyup.enter="handleSearch"
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
          @click="handleSearch"
          :disabled="!localSearchQuery.trim() || isSearching"
          class="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <svg class="h-5 w-5 text-blue-500 hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Кнопки действий -->
    <div class="mb-6 flex flex-wrap gap-3">
      <button
        @click="handleSearch"
        :disabled="!localSearchQuery.trim() || isSearching"
        class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
      >
        <svg v-if="isSearching" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {{ isSearching ? 'Поиск...' : 'Поиск' }}
      </button>
      
      <button
        @click="handleExpandSearch"
        :disabled="!localSearchQuery.trim() || isSearching"
        class="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Расширенный поиск
      </button>
      
      <button
        @click="handleClearSearch"
        class="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
      >
        Очистить
      </button>
      
      <button
        @click="handleGetContextualAnswer"
        :disabled="!localSearchQuery.trim() || isSearching"
        class="px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Получить ответ
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SearchInput',
  props: {
    searchQuery: {
      type: String,
      default: ''
    },
    isSearching: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'search',
    'expand-search',
    'clear-search',
    'get-contextual-answer',
    'update:searchQuery'
  ],
  data() {
    return {
      localSearchQuery: this.searchQuery
    }
  },
  watch: {
    searchQuery(newVal) {
      this.localSearchQuery = newVal
    },
    localSearchQuery(newVal) {
      this.$emit('update:searchQuery', newVal)
    }
  },
  methods: {
    handleSearch() {
      if (this.localSearchQuery.trim()) {
        this.$emit('search', this.localSearchQuery)
      }
    },
    
    handleExpandSearch() {
      if (this.localSearchQuery.trim()) {
        this.$emit('expand-search', this.localSearchQuery)
      }
    },
    
    handleClearSearch() {
      this.localSearchQuery = ''
      this.$emit('clear-search')
    },
    
    handleGetContextualAnswer() {
      if (this.localSearchQuery.trim()) {
        this.$emit('get-contextual-answer', this.localSearchQuery)
      }
    }
  },
  watch: {
    searchQuery(newValue) {
      this.$emit('update:searchQuery', newValue)
    }
  }
}
</script>

<style scoped>
.search-input {
  /* Стили для поискового ввода */
}

/* Анимации */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Hover эффекты */
button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

button:active:not(:disabled) {
  transform: translateY(0);
}
</style>
