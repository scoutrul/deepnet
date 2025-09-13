<template>
  <div class="context-panel bg-white rounded-lg shadow-lg p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Управление контекстом</h2>
      <p class="text-gray-600">Настройте контекст для эффективной коммуникации</p>
    </div>

    <!-- Контекст стороны A -->
    <div class="mb-8">
      <ContextA
        :context="contextA"
        @update:context="updateContextA"
      />
    </div>

    <!-- Контекст стороны B -->
    <div class="mb-8">
      <ContextB
        :context="contextB"
        @update:context="updateContextB"
      />
    </div>

    <!-- Настройки цели -->
    <div class="mb-8">
      <GoalSettings
        :goal="goal"
        @update:goal="updateGoal"
      />
    </div>

    <!-- Кнопки действий -->
    <div class="flex flex-wrap gap-3">
      <button
        @click="saveContext"
        :disabled="!isContextValid"
        class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Сохранить контекст
      </button>
      
      <button
        @click="clearContext"
        class="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
      >
        Очистить
      </button>
      
      <button
        @click="exportContext"
        class="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
      >
        Экспорт
      </button>
      
      <button
        @click="importContext"
        class="px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
      >
        Импорт
      </button>
    </div>

    <!-- Статус контекста -->
    <div v-if="contextStatus" class="mt-4 p-3 rounded-md" :class="contextStatusClass">
      {{ contextStatus }}
    </div>
  </div>
</template>

<script>
import ContextA from './ContextA.vue'
import ContextB from './ContextB.vue'
import GoalSettings from './GoalSettings.vue'
import { contextManager } from '../../services/context'

export default {
  name: 'ContextPanel',
  components: {
    ContextA,
    ContextB,
    GoalSettings
  },
  data() {
    return {
      contextA: {
        name: 'Алексей Петров',
        role: 'Senior Frontend Developer',
        background: 'Опыт разработки 8+ лет, специализация на Vue.js, React, TypeScript. Работал в крупных IT-компаниях, участвовал в создании высоконагруженных веб-приложений.',
        skills: ['Vue.js', 'React', 'TypeScript', 'Node.js', 'GraphQL', 'Docker'],
        goals: ['Получить позицию Tech Lead', 'Увеличить зарплату на 30%', 'Работать с современными технологиями']
      },
      contextB: {
        name: 'Мария Иванова',
        role: 'HR Manager',
        company: 'TechCorp',
        position: 'Senior Frontend Developer',
        requirements: ['Vue.js 3+', 'TypeScript', 'Опыт 5+ лет', 'Знание архитектуры', 'Опыт с командой'],
        expectations: ['Быстрое вхождение в проект', 'Менторство junior разработчиков', 'Участие в архитектурных решениях']
      },
      goal: {
        description: 'Успешно пройти техническое собеседование на позицию Senior Frontend Developer',
        successCriteria: ['Продемонстрировать глубокие знания Vue.js', 'Показать опыт с TypeScript', 'Объяснить архитектурные решения', 'Показать лидерские качества'],
        priority: 'high',
        deadline: null,
        communicationType: 'interview',
        duration: 60,
        notes: ''
      },
      contextStatus: '',
      contextStatusClass: ''
    }
  },
  computed: {
    isContextValid() {
      return this.contextA.name && this.contextA.role && 
             this.contextB.name && this.contextB.role && 
             this.goal.description
    }
  },
  mounted() {
    this.loadContext()
  },
  methods: {
    updateContextA(newContext) {
      this.contextA = { ...newContext }
    },
    
    updateContextB(newContext) {
      this.contextB = { ...newContext }
    },
    
    updateGoal(newGoal) {
      this.goal = { ...newGoal }
    },
    
    async loadContext() {
      try {
        const savedContext = await contextManager.getContext()
        if (savedContext) {
          this.contextA = { ...this.contextA, ...savedContext.contextA }
          this.contextB = { ...this.contextB, ...savedContext.contextB }
          this.goal = { ...this.goal, ...savedContext.goal }
        }
      } catch (error) {
        console.error('Error loading context:', error)
        this.showStatus('Ошибка загрузки контекста', 'error')
      }
    },
    
    async saveContext() {
      if (!this.isContextValid) {
        this.showStatus('Заполните все обязательные поля', 'error')
        return
      }
      
      try {
        const contextData = {
          contextA: this.contextA,
          contextB: this.contextB,
          goal: this.goal
        }
        
        await contextManager.saveContext(contextData)
        this.showStatus('Контекст сохранен успешно', 'success')
      } catch (error) {
        console.error('Error saving context:', error)
        this.showStatus('Ошибка сохранения контекста', 'error')
      }
    },
    
    clearContext() {
      this.contextA = {
        name: '',
        role: '',
        background: '',
        skills: [],
        goals: []
      }
      this.contextB = {
        name: '',
        role: '',
        company: '',
        position: '',
        requirements: [],
        expectations: []
      }
      this.goal = {
        description: '',
        successCriteria: [],
        priority: 'medium',
        deadline: null,
        communicationType: 'interview',
        duration: 60,
        notes: ''
      }
      this.showStatus('Контекст очищен', 'info')
    },
    
    exportContext() {
      try {
        const contextData = {
          contextA: this.contextA,
          contextB: this.contextB,
          goal: this.goal,
          exportedAt: new Date().toISOString()
        }
        
        const dataStr = JSON.stringify(contextData, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `context-${new Date().toISOString().split('T')[0]}.json`
        link.click()
        
        URL.revokeObjectURL(url)
        this.showStatus('Контекст экспортирован', 'success')
      } catch (error) {
        console.error('Error exporting context:', error)
        this.showStatus('Ошибка экспорта контекста', 'error')
      }
    },
    
    importContext() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (event) => {
        const file = event.target.files[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              const contextData = JSON.parse(e.target.result)
              this.contextA = { ...this.contextA, ...contextData.contextA }
              this.contextB = { ...this.contextB, ...contextData.contextB }
              this.goal = { ...this.goal, ...contextData.goal }
              this.showStatus('Контекст импортирован', 'success')
            } catch (error) {
              console.error('Error importing context:', error)
              this.showStatus('Ошибка импорта контекста', 'error')
            }
          }
          reader.readAsText(file)
        }
      }
      input.click()
    },
    
    showStatus(message, type) {
      this.contextStatus = message
      this.contextStatusClass = this.getStatusClass(type)
      
      setTimeout(() => {
        this.contextStatus = ''
        this.contextStatusClass = ''
      }, 3000)
    },
    
    getStatusClass(type) {
      const classes = {
        success: 'bg-green-100 text-green-800 border border-green-200',
        error: 'bg-red-100 text-red-800 border border-red-200',
        info: 'bg-blue-100 text-blue-800 border border-blue-200'
      }
      return classes[type] || classes.info
    }
  }
}
</script>

<style scoped>
.context-panel {
  /* Стили для панели контекста */
}

/* Стили для кнопок */
.context-panel button {
  transition: all 0.2s ease-in-out;
}

.context-panel button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.context-panel button:active:not(:disabled) {
  transform: translateY(0);
}

/* Стили для статуса */
.context-panel .mt-4 {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Анимации */
.context-panel {
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

/* Стили для заголовка */
.context-panel h2 {
  position: relative;
}

.context-panel h2::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 100px;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 2px;
}

/* Адаптивность */
@media (max-width: 640px) {
  .context-panel .flex {
    flex-direction: column;
  }
  
  .context-panel button {
    width: 100%;
    margin-bottom: 0.5rem;
  }
}
</style>