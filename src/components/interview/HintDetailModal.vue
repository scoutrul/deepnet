<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 overflow-y-auto"
    @click.self="close"
  >
    <!-- Overlay -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

    <!-- Modal -->
    <div class="relative min-h-screen flex items-center justify-center p-4">
      <div
        class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <div class="flex items-center space-x-3">
            <div
              :class="[
                'w-3 h-3 rounded-full',
                getCategoryColor(hint?.category || '')
              ]"
            ></div>
            <h3 class="text-lg font-semibold text-gray-800">
              {{ hint?.name }}
            </h3>
            <span
              :class="[
                'px-2 py-1 text-xs rounded-full',
                getCategoryColor(hint?.category || '')
              ]"
            >
              {{ hint?.category }}
            </span>
          </div>
          <button
            @click="close"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <!-- Loading state -->
          <div v-if="isLoading" class="flex items-center justify-center py-8">
            <div class="text-center">
              <svg class="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="text-gray-600">Загружаем детальную информацию...</p>
            </div>
          </div>

          <!-- Error state -->
          <div v-else-if="error" class="text-center py-8">
            <div class="text-red-500 mb-4">
              <svg class="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h4 class="text-lg font-medium text-gray-700 mb-2">Ошибка загрузки</h4>
            <p class="text-gray-600 mb-4">{{ error }}</p>
            <button
              @click="loadDetails"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Попробовать снова
            </button>
          </div>

          <!-- Content -->
          <div v-else-if="details" class="space-y-6">
            <!-- Основная информация -->
            <div>
              <h4 class="text-lg font-medium text-gray-800 mb-3">Описание</h4>
              <p class="text-gray-700 leading-relaxed">{{ details.details }}</p>
            </div>

            <!-- Контекстная информация -->
            <div v-if="details.contextualInfo">
              <h4 class="text-lg font-medium text-gray-800 mb-3">Контекст для вашей роли</h4>
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-blue-800 leading-relaxed">{{ details.contextualInfo }}</p>
              </div>
            </div>

            <!-- Примеры -->
            <div v-if="details.examples && details.examples.length > 0">
              <h4 class="text-lg font-medium text-gray-800 mb-3">Примеры вопросов</h4>
              <ul class="space-y-2">
                <li
                  v-for="(example, index) in details.examples"
                  :key="index"
                  class="flex items-start space-x-2"
                >
                  <span class="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {{ index + 1 }}
                  </span>
                  <span class="text-gray-700">{{ example }}</span>
                </li>
              </ul>
            </div>

            <!-- Связанные темы -->
            <div v-if="details.relatedTopics && details.relatedTopics.length > 0">
              <h4 class="text-lg font-medium text-gray-800 mb-3">Связанные темы</h4>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="topic in details.relatedTopics"
                  :key="topic"
                  class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 cursor-pointer transition-colors"
                  @click="searchRelatedTopic(topic)"
                >
                  {{ topic }}
                </span>
              </div>
            </div>

            <!-- Релевантность -->
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">Релевантность для вашей роли</span>
                <span class="text-sm font-medium text-gray-900">
                  {{ Math.round((hint?.relevance || 0) * 100) }}%
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${(hint?.relevance || 0) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Fallback content -->
          <div v-else class="text-center py-8">
            <div class="text-gray-400 mb-4">
              <svg class="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
            </div>
            <h4 class="text-lg font-medium text-gray-700 mb-2">Информация недоступна</h4>
            <p class="text-gray-600 mb-4">
              Детальная информация по этой подсказке временно недоступна
            </p>
            <button
              @click="loadDetails"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Загрузить информацию
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div class="flex items-center space-x-2 text-sm text-gray-600">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Нажмите на связанную тему для поиска</span>
          </div>
          <div class="flex space-x-3">
            <button
              @click="close"
              class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Закрыть
            </button>
            <button
              @click="addToChat"
              :disabled="!details"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Добавить в чат
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { hintDetailService } from '@/services/interview/hintDetailService'

export default {
  name: 'HintDetailModal',
  props: {
    hint: {
      type: Object,
      default: null
    },
    context: {
      type: Object,
      default: null
    },
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'add-to-chat', 'search-topic'],
  data() {
    return {
      details: null,
      isLoading: false,
      error: null
    }
  },
  computed: {
    shouldLoadDetails() {
      return this.show && this.hint && this.context && !this.details && !this.isLoading
    }
  },
  watch: {
    shouldLoadDetails: {
      handler(shouldLoad) {
        if (shouldLoad) {
          this.loadDetails()
        }
      },
      immediate: true
    },
    show: {
      handler(show) {
        if (!show) {
          this.details = null
          this.error = null
          this.isLoading = false
        }
      }
    }
  },
  methods: {
    async loadDetails() {
      if (!this.hint || !this.context) return

      try {
        this.isLoading = true
        this.error = null

        const response = await hintDetailService.getHintDetails({
          hintId: this.hint.id,
          context: this.context
        })

        this.details = response
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Ошибка загрузки деталей'
        console.error('Ошибка загрузки деталей:', err)
      } finally {
        this.isLoading = false
      }
    },

    close() {
      this.$emit('close')
    },

    addToChat() {
      if (this.hint) {
        this.$emit('add-to-chat', this.hint)
      }
    },

    searchRelatedTopic(topic) {
      this.$emit('search-topic', topic)
    },

    getCategoryColor(category) {
      const colors = {
        'Frontend': 'bg-blue-500',
        'Backend': 'bg-green-500',
        'Database': 'bg-purple-500',
        'DevOps': 'bg-orange-500',
        'Cloud': 'bg-cyan-500',
        'API': 'bg-pink-500',
        'Testing': 'bg-yellow-500',
        'Tools': 'bg-gray-500',
        'User Skills': 'bg-indigo-500'
      }
      return colors[category] || 'bg-gray-500'
    }
  }
}
</script>
