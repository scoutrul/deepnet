<template>
  <div class="hint-panel bg-white rounded-lg shadow-lg p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Подсказки</h2>
      <p class="text-gray-600">Получайте рекомендации для эффективной коммуникации</p>
    </div>

    <!-- Фильтры -->
    <div class="mb-6 flex flex-wrap gap-4">
      <div class="flex items-center space-x-2">
        <label class="text-sm font-medium text-gray-700">Категория:</label>
        <select
          v-model="selectedCategory"
          @change="filterHints"
          class="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все категории</option>
          <option
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
          >
            {{ category.icon }} {{ category.name }}
          </option>
        </select>
      </div>
      
      <div class="flex items-center space-x-2">
        <label class="text-sm font-medium text-gray-700">Приоритет:</label>
        <select
          v-model="selectedPriority"
          @change="filterHints"
          class="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все приоритеты</option>
          <option value="critical">Критический</option>
          <option value="high">Высокий</option>
          <option value="medium">Средний</option>
          <option value="low">Низкий</option>
        </select>
      </div>
      
      <div class="flex items-center space-x-2">
        <label class="text-sm font-medium text-gray-700">Статус:</label>
        <select
          v-model="selectedStatus"
          @change="filterHints"
          class="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все</option>
          <option value="unread">Непрочитанные</option>
          <option value="read">Прочитанные</option>
          <option value="dismissed">Отклоненные</option>
        </select>
      </div>
      
      <button
        @click="refreshHints"
        class="px-4 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Обновить
      </button>
    </div>

    <!-- Статистика -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-blue-50 p-4 rounded-lg">
        <div class="text-2xl font-bold text-blue-600">{{ totalHints }}</div>
        <div class="text-sm text-blue-800">Всего подсказок</div>
      </div>
      <div class="bg-green-50 p-4 rounded-lg">
        <div class="text-2xl font-bold text-green-600">{{ unreadHints }}</div>
        <div class="text-sm text-green-800">Непрочитанных</div>
      </div>
      <div class="bg-yellow-50 p-4 rounded-lg">
        <div class="text-2xl font-bold text-yellow-600">{{ criticalHints }}</div>
        <div class="text-sm text-yellow-800">Критических</div>
      </div>
      <div class="bg-purple-50 p-4 rounded-lg">
        <div class="text-2xl font-bold text-purple-600">{{ categories.length }}</div>
        <div class="text-sm text-purple-800">Категорий</div>
      </div>
    </div>

    <!-- Список подсказок -->
    <div class="space-y-4">
      <TransitionGroup name="hint" tag="div">
        <div
          v-for="hint in filteredHints"
          :key="hint.id"
          class="hint-card border rounded-lg p-4 transition-all duration-300"
          :class="getHintCardClass(hint)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center mb-2">
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mr-2"
                  :class="getCategoryClass(hint.category)"
                >
                  {{ hint.category.icon }} {{ hint.category.name }}
                </span>
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  :class="getPriorityClass(hint.priority)"
                >
                  {{ getPriorityText(hint.priority) }}
                </span>
              </div>
              
              <p class="text-gray-800 mb-3">{{ hint.text }}</p>
              
              <div v-if="hint.relatedTopics.length > 0" class="mb-3">
                <div class="text-xs text-gray-500 mb-1">Связанные темы:</div>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="topic in hint.relatedTopics"
                    :key="topic"
                    class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                  >
                    {{ topic }}
                  </span>
                </div>
              </div>
              
              <div class="flex items-center text-xs text-gray-500">
                <span class="mr-4">Источник: {{ getSourceText(hint.source) }}</span>
                <span class="mr-4">Уверенность: {{ Math.round(hint.confidence * 100) }}%</span>
                <span>{{ formatTime(hint.timestamp) }}</span>
              </div>
            </div>
            
            <div class="flex flex-col space-y-2 ml-4">
              <button
                @click="toggleRead(hint)"
                class="p-2 rounded-md transition-colors"
                :class="hint.isRead ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600'"
                :title="hint.isRead ? 'Отметить как непрочитанную' : 'Отметить как прочитанную'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path v-if="hint.isRead" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                  <path v-else d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/>
                </svg>
              </button>
              
              <button
                @click="dismissHint(hint)"
                class="p-2 rounded-md transition-colors"
                :class="hint.isDismissed ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'"
                :title="hint.isDismissed ? 'Восстановить подсказку' : 'Отклонить подсказку'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path v-if="hint.isDismissed" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L9 8.586l2.293-2.293a1 1 0 011.414 1.414z"/>
                  <path v-else d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
      
      <div v-if="filteredHints.length === 0" class="text-center py-8 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        <p>Подсказки не найдены</p>
        <p class="text-sm">Попробуйте изменить фильтры или обновить список</p>
      </div>
    </div>

    <!-- Кнопки действий -->
    <div class="mt-6 flex flex-wrap gap-3">
      <button
        @click="markAllAsRead"
        class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
      >
        Отметить все как прочитанные
      </button>
      
      <button
        @click="clearDismissed"
        class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
      >
        Очистить отклоненные
      </button>
      
      <button
        @click="exportHints"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Экспорт подсказок
      </button>
    </div>
  </div>
</template>

<script>
import { contextManager, dialogProcessor } from '../../services/context'

export default {
  name: 'HintPanel',
  data() {
    return {
      hints: [],
      categories: [],
      selectedCategory: '',
      selectedPriority: '',
      selectedStatus: '',
      // hintGenerator заменен на contextManager
    }
  },
  computed: {
    filteredHints() {
      let filtered = [...this.hints]
      
      if (this.selectedCategory) {
        filtered = filtered.filter(hint => hint.category.id === this.selectedCategory)
      }
      
      if (this.selectedPriority) {
        filtered = filtered.filter(hint => hint.priority === this.selectedPriority)
      }
      
      if (this.selectedStatus) {
        switch (this.selectedStatus) {
          case 'unread':
            filtered = filtered.filter(hint => !hint.isRead)
            break
          case 'read':
            filtered = filtered.filter(hint => hint.isRead)
            break
          case 'dismissed':
            filtered = filtered.filter(hint => hint.isDismissed)
            break
        }
      }
      
      return filtered
    },
    totalHints() {
      return this.hints.length
    },
    unreadHints() {
      return this.hints.filter(hint => !hint.isRead).length
    },
    criticalHints() {
      return this.hints.filter(hint => hint.priority === 'critical').length
    }
  },
  mounted() {
    this.initializeHintGenerator()
    this.loadHints()
    this.loadCategories()
  },
  methods: {
    // Инициализация генератора подсказок
    initializeHintGenerator() {
      // Используем contextManager вместо hintGenerator
      console.log('🎯 [HINT] Hint generator initialized via contextManager')
    },
    
    // Загрузка подсказок
    loadHints() {
      // Получаем подсказки через contextManager
      this.hints = contextManager.getHints() || []
      this.categories = contextManager.getCategories() || []
    },
    
    // Загрузка категорий
    loadCategories() {
      // Получаем категории через contextManager
      this.categories = contextManager.getCategories() || []
    },
    
    // Фильтрация подсказок
    filterHints() {
      // Фильтрация происходит в computed свойстве
    },
    
    // Обновление подсказок
    async refreshHints() {
      try {
        const context = contextManager.getFullContext()
        const dialog = dialogProcessor.getDialogEntries()
        
        if (context && dialog.length > 0) {
          const newHints = await contextManager.generateHints(dialog, context)
          this.hints = newHints
        }
      } catch (error) {
        console.error('Error refreshing hints:', error)
      }
    },
    
    // Переключение статуса прочтения
    toggleRead(hint) {
      // Отмечаем подсказку как прочитанную через contextManager
      contextManager.markHintAsRead(hint.id)
      hint.isRead = !hint.isRead
    },
    
    // Отклонение подсказки
    dismissHint(hint) {
      // Отклоняем подсказку через contextManager
      contextManager.dismissHint(hint.id)
      hint.isDismissed = !hint.isDismissed
    },
    
    // Отметить все как прочитанные
    markAllAsRead() {
      this.hints.forEach(hint => {
        if (!hint.isRead) {
          this.toggleRead(hint)
        }
      })
    },
    
    // Очистить отклоненные
    clearDismissed() {
      this.hints = this.hints.filter(hint => !hint.isDismissed)
    },
    
    // Экспорт подсказок
    exportHints() {
      const hintsData = {
        hints: this.hints,
        exportDate: new Date().toISOString(),
        totalCount: this.hints.length
      }
      
      const blob = new Blob([JSON.stringify(hintsData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hints_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    
    // Получение класса карточки подсказки
    getHintCardClass(hint) {
      const baseClass = 'border-gray-200 hover:shadow-md'
      
      if (hint.isDismissed) {
        return `${baseClass} opacity-50 bg-gray-50`
      }
      
      if (hint.priority === 'critical') {
        return `${baseClass} border-red-200 bg-red-50`
      }
      
      if (hint.priority === 'high') {
        return `${baseClass} border-orange-200 bg-orange-50`
      }
      
      if (!hint.isRead) {
        return `${baseClass} border-blue-200 bg-blue-50`
      }
      
      return baseClass
    },
    
    // Получение класса категории
    getCategoryClass(category) {
      const colorMap = {
        technical: 'bg-blue-100 text-blue-800',
        communication: 'bg-green-100 text-green-800',
        experience: 'bg-yellow-100 text-yellow-800',
        skills: 'bg-purple-100 text-purple-800',
        motivation: 'bg-red-100 text-red-800',
        teamwork: 'bg-cyan-100 text-cyan-800',
        company: 'bg-lime-100 text-lime-800',
        general: 'bg-gray-100 text-gray-800'
      }
      
      return colorMap[category.id] || 'bg-gray-100 text-gray-800'
    },
    
    // Получение класса приоритета
    getPriorityClass(priority) {
      const priorityMap = {
        critical: 'bg-red-100 text-red-800',
        high: 'bg-orange-100 text-orange-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-gray-100 text-gray-800'
      }
      
      return priorityMap[priority] || 'bg-gray-100 text-gray-800'
    },
    
    // Получение текста приоритета
    getPriorityText(priority) {
      const priorityMap = {
        critical: 'Критический',
        high: 'Высокий',
        medium: 'Средний',
        low: 'Низкий'
      }
      
      return priorityMap[priority] || priority
    },
    
    // Получение текста источника
    getSourceText(source) {
      const sourceMap = {
        llm: 'ИИ',
        rule: 'Правило',
        pattern: 'Паттерн'
      }
      
      return sourceMap[source] || source
    },
    
    // Форматирование времени
    formatTime(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) { // Меньше минуты
        return 'только что'
      } else if (diff < 3600000) { // Меньше часа
        const minutes = Math.floor(diff / 60000)
        return `${minutes} мин назад`
      } else if (diff < 86400000) { // Меньше дня
        const hours = Math.floor(diff / 3600000)
        return `${hours} ч назад`
      } else {
        return date.toLocaleDateString('ru-RU')
      }
    }
  }
}
</script>

<style scoped>
.hint-panel {
  max-height: 80vh;
  overflow-y: auto;
}

/* Анимации для подсказок */
.hint-enter-active, .hint-leave-active {
  transition: all 0.3s ease;
}

.hint-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.hint-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Стили для скроллбара */
.hint-panel::-webkit-scrollbar {
  width: 6px;
}

.hint-panel::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.hint-panel::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.hint-panel::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
