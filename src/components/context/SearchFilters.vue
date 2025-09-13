<template>
  <div class="search-filters">
    <!-- Фильтры поиска -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Категории</label>
        <select
          v-model="localFilters.categories"
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
          v-model="localFilters.priority"
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
          v-model="localFilters.sources"
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

    <!-- Кнопки управления фильтрами -->
    <div class="mb-6 flex flex-wrap gap-3">
      <button
        @click="applyFilters"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Применить фильтры
      </button>
      
      <button
        @click="resetFilters"
        class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
      >
        Сбросить фильтры
      </button>
      
      <button
        @click="saveFilters"
        class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
      >
        Сохранить фильтры
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SearchFilters',
  props: {
    filters: {
      type: Object,
      default: () => ({
        categories: [],
        priority: [],
        sources: []
      })
    }
  },
  emits: [
    'update:filters',
    'apply-filters',
    'reset-filters',
    'save-filters'
  ],
  data() {
    return {
      localFilters: { ...this.filters },
      timeRange: 'all',
      customStartTime: '',
      customEndTime: ''
    }
  },
  watch: {
    filters: {
      handler(newFilters) {
        this.localFilters = { ...newFilters }
      },
      deep: true
    },
    localFilters: {
      handler(newFilters) {
        this.$emit('update:filters', newFilters)
      },
      deep: true
    }
  },
  methods: {
    updateTimeRange() {
      if (this.timeRange === 'custom') {
        // Логика для пользовательского диапазона
        this.customStartTime = this.getDefaultStartTime()
        this.customEndTime = this.getDefaultEndTime()
      }
    },
    
    getDefaultStartTime() {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return startOfDay.toISOString().slice(0, 16)
    },
    
    getDefaultEndTime() {
      const now = new Date()
      return now.toISOString().slice(0, 16)
    },
    
    applyFilters() {
      const filters = {
        ...this.localFilters,
        timeRange: this.timeRange,
        customStartTime: this.timeRange === 'custom' ? this.customStartTime : null,
        customEndTime: this.timeRange === 'custom' ? this.customEndTime : null
      }
      this.$emit('apply-filters', filters)
    },
    
    resetFilters() {
      this.localFilters = {
        categories: [],
        priority: [],
        sources: []
      }
      this.timeRange = 'all'
      this.customStartTime = ''
      this.customEndTime = ''
      this.$emit('reset-filters')
    },
    
    saveFilters() {
      const filters = {
        ...this.localFilters,
        timeRange: this.timeRange,
        customStartTime: this.timeRange === 'custom' ? this.customStartTime : null,
        customEndTime: this.timeRange === 'custom' ? this.customEndTime : null
      }
      this.$emit('save-filters', filters)
    }
  }
}
</script>

<style scoped>
.search-filters {
  /* Стили для фильтров поиска */
}

/* Стили для множественного выбора */
select[multiple] {
  min-height: 100px;
}

select[multiple] option {
  padding: 8px 12px;
}

/* Стили для пользовательского временного диапазона */
input[type="datetime-local"] {
  font-family: inherit;
}

/* Анимации */
button {
  transition: all 0.2s ease-in-out;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

button:active:not(:disabled) {
  transform: translateY(0);
}
</style>
