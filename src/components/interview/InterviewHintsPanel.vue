<template>
  <div class="interview-hints-panel bg-white rounded-lg shadow-md p-6">
    <div class="mb-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-2">
        Подсказки для интервью
      </h3>
      <p class="text-sm text-gray-600">
        Нажмите на подсказку для получения детальной информации
      </p>
    </div>

    <!-- Состояние загрузки -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <svg class="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-gray-600">Генерируем подсказки...</p>
      </div>
    </div>

    <!-- Пустое состояние -->
    <div v-else-if="hints.length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
      </div>
      <h4 class="text-lg font-medium text-gray-700 mb-2">Нет подсказок</h4>
      <p class="text-gray-600 mb-4">
        Заполните контекст интервью и нажмите "Сгенерировать подсказки"
      </p>
      <button
        @click="$emit('generate-hints')"
        :disabled="!isFormValid"
        :class="[
          'px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm',
          isFormValid 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        ]"
      >
        Сгенерировать подсказки
      </button>
    </div>

    <!-- Список подсказок -->
    <div v-else class="space-y-4">
      <!-- Фильтры -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button
          v-for="category in categories"
          :key="category"
          @click="toggleCategory(category)"
          :class="[
            'px-3 py-1 rounded-full text-sm font-medium transition-colors',
            selectedCategories.includes(category)
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
          ]"
        >
          {{ category }}
        </button>
        <button
          @click="clearFilters"
          class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
        >
          Сбросить
        </button>
      </div>

      <!-- Сетка подсказок -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="hint in filteredHints"
          :key="hint.id"
          @click="selectHint(hint)"
          :class="[
            'p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md',
            selectedHint?.id === hint.id
              ? 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-gray-200 hover:border-gray-300'
          ]"
        >
          <div class="flex items-start justify-between mb-2">
            <h4 class="font-medium text-gray-800 text-sm">{{ hint.name }}</h4>
            <span
              :class="[
                'px-2 py-1 text-xs rounded-full',
                getCategoryColor(hint.category)
              ]"
            >
              {{ hint.category }}
            </span>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="w-16 bg-gray-200 rounded-full h-2">
                <div
                  class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${hint.relevance * 100}%` }"
                ></div>
              </div>
              <span class="text-xs text-gray-600">
                {{ Math.round(hint.relevance * 100) }}%
              </span>
            </div>
            
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Статистика и действия -->
      <div class="mt-6 pt-4 border-t border-gray-200">
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-600">
            <span>Показано {{ filteredHints.length }} из {{ hints.length }} подсказок</span>
            <span v-if="selectedCategories.length > 0" class="ml-2">
              Фильтр: {{ selectedCategories.join(', ') }}
            </span>
          </div>
          <button
            @click="$emit('generate-hints')"
            :disabled="!isFormValid"
            :class="[
              'px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm',
              isFormValid 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            ]"
          >
            Сгенерировать подсказки
          </button>
        </div>
      </div>
    </div>

    <!-- Модальное окно с детальной информацией -->
    <HintDetailModal
      v-if="showDetailModal"
      :hint="selectedHint"
      :context="context"
      @close="closeDetailModal"
      @add-to-chat="addToChat"
    />
  </div>
</template>

<script>
import HintDetailModal from './HintDetailModal.vue'

export default {
  name: 'InterviewHintsPanel',
  components: {
    HintDetailModal
  },
  props: {
    hints: {
      type: Array,
      default: () => []
    },
    context: {
      type: Object,
      default: null
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    isFormValid: {
      type: Boolean,
      default: false
    }
  },
  emits: ['generate-hints', 'hint-selected', 'add-to-chat'],
  data() {
    return {
      selectedHint: null,
      showDetailModal: false,
      selectedCategories: []
    }
  },
  computed: {
    categories() {
      const cats = new Set(this.hints.map(hint => hint.category))
      return Array.from(cats).sort()
    },
    filteredHints() {
      if (this.selectedCategories.length === 0) {
        return this.hints
      }
      return this.hints.filter(hint => 
        this.selectedCategories.includes(hint.category)
      )
    }
  },
  watch: {
    hints: {
      handler(newHints) {
        if (newHints.length > 0) {
          // Автоматически выбираем первую категорию при загрузке
          if (this.selectedCategories.length === 0 && this.categories.length > 0) {
            this.selectedCategories = [this.categories[0]]
          }
        }
      },
      immediate: true
    }
  },
  methods: {
    selectHint(hint) {
      this.selectedHint = hint
      this.showDetailModal = true
      this.$emit('hint-selected', hint)
    },

    closeDetailModal() {
      this.showDetailModal = false
      this.selectedHint = null
    },

    addToChat(hint) {
      this.$emit('add-to-chat', hint)
      this.closeDetailModal()
    },

    toggleCategory(category) {
      const index = this.selectedCategories.indexOf(category)
      if (index > -1) {
        this.selectedCategories.splice(index, 1)
      } else {
        this.selectedCategories.push(category)
      }
    },

    clearFilters() {
      this.selectedCategories = []
    },

    getCategoryColor(category) {
      const colors = {
        'Frontend': 'bg-blue-100 text-blue-800',
        'Backend': 'bg-green-100 text-green-800',
        'Database': 'bg-purple-100 text-purple-800',
        'DevOps': 'bg-orange-100 text-orange-800',
        'Cloud': 'bg-cyan-100 text-cyan-800',
        'API': 'bg-pink-100 text-pink-800',
        'Testing': 'bg-yellow-100 text-yellow-800',
        'Tools': 'bg-gray-100 text-gray-800',
        'User Skills': 'bg-indigo-100 text-indigo-800'
      }
      return colors[category] || 'bg-gray-100 text-gray-800'
    }
  }
}
</script>
