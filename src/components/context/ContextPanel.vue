<template>
  <div class="context-panel bg-white rounded-lg shadow-lg p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Управление контекстом</h2>
      <p class="text-gray-600">Настройте контекст для эффективной коммуникации</p>
    </div>

    <!-- Контекст стороны A -->
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
        <span class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">A</span>
        Сторона A (Вы)
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Имя</label>
          <input
            v-model="contextA.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ваше имя"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Роль</label>
          <input
            v-model="contextA.role"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ваша роль/позиция"
          />
        </div>
        
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Фон и опыт</label>
          <textarea
            v-model="contextA.background"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Опишите ваш опыт и квалификацию"
          />
        </div>
        
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Навыки</label>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(skill, index) in contextA.skills"
              :key="index"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {{ skill }}
              <button
                @click="removeSkill(index)"
                class="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
            <input
              v-model="newSkill"
              @keyup.enter="addSkill"
              type="text"
              class="flex-1 min-w-32 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Добавить навык"
            />
          </div>
        </div>
        
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Цели</label>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(goal, index) in contextA.goals"
              :key="index"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
            >
              {{ goal }}
              <button
                @click="removeGoal(index)"
                class="ml-2 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
            <input
              v-model="newGoal"
              @keyup.enter="addGoal"
              type="text"
              class="flex-1 min-w-32 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Добавить цель"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Контекст стороны B -->
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
        <span class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">B</span>
        Сторона B (Собеседник)
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Имя</label>
          <input
            v-model="contextB.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Имя собеседника"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Роль</label>
          <input
            v-model="contextB.role"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Роль собеседника"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Компания</label>
          <input
            v-model="contextB.company"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Название компании"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Позиция</label>
          <input
            v-model="contextB.position"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Позиция собеседника"
          />
        </div>
        
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Требования к позиции</label>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(requirement, index) in contextB.requirements"
              :key="index"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
            >
              {{ requirement }}
              <button
                @click="removeRequirement(index)"
                class="ml-2 text-orange-600 hover:text-orange-800"
              >
                ×
              </button>
            </span>
            <input
              v-model="newRequirement"
              @keyup.enter="addRequirement"
              type="text"
              class="flex-1 min-w-32 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Добавить требование"
            />
          </div>
        </div>
        
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Ожидания</label>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(expectation, index) in contextB.expectations"
              :key="index"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
            >
              {{ expectation }}
              <button
                @click="removeExpectation(index)"
                class="ml-2 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
            <input
              v-model="newExpectation"
              @keyup.enter="addExpectation"
              type="text"
              class="flex-1 min-w-32 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Добавить ожидание"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Цель коммуникации -->
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
        <span class="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">🎯</span>
        Цель коммуникации
      </h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Описание цели</label>
          <textarea
            v-model="goal.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Опишите цель вашей коммуникации"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Критерии успеха</label>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(criterion, index) in goal.successCriteria"
              :key="index"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
            >
              {{ criterion }}
              <button
                @click="removeCriterion(index)"
                class="ml-2 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
            <input
              v-model="newCriterion"
              @keyup.enter="addCriterion"
              type="text"
              class="flex-1 min-w-32 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Добавить критерий"
            />
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Приоритет</label>
            <select
              v-model="goal.priority"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
              <option value="critical">Критический</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Дедлайн (опционально)</label>
            <input
              v-model="goal.deadline"
              type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>
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
import { contextManager } from '../../services/context'

export default {
  name: 'ContextPanel',
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
        deadline: null
      },
      newSkill: '',
      newGoal: '',
      newRequirement: '',
      newExpectation: '',
      newCriterion: '',
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
    // Загрузка существующего контекста
    loadContext() {
      const contextA = contextManager.getContextA()
      const contextB = contextManager.getContextB()
      const goal = contextManager.getGoal()
      
      if (contextA) {
        this.contextA = {
          name: contextA.name,
          role: contextA.role,
          background: contextA.background,
          skills: [...contextA.skills],
          goals: [...contextA.goals]
        }
      }
      
      if (contextB) {
        this.contextB = {
          name: contextB.name,
          role: contextB.role,
          company: contextB.company,
          position: contextB.position,
          requirements: [...contextB.requirements],
          expectations: [...contextB.expectations]
        }
      }
      
      if (goal) {
        this.goal = {
          description: goal.description,
          successCriteria: [...goal.successCriteria],
          priority: goal.priority,
          deadline: goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 16) : null
        }
      }
    },
    
    // Сохранение контекста
    saveContext() {
      try {
        contextManager.setContextA(this.contextA)
        contextManager.setContextB(this.contextB)
        contextManager.setGoal({
          ...this.goal,
          deadline: this.goal.deadline ? new Date(this.goal.deadline).getTime() : undefined
        })
        
        this.showStatus('Контекст успешно сохранен', 'success')
      } catch (error) {
        this.showStatus('Ошибка при сохранении контекста', 'error')
        console.error('Error saving context:', error)
      }
    },
    
    // Очистка контекста
    clearContext() {
      if (confirm('Вы уверены, что хотите очистить весь контекст?')) {
        contextManager.clearContext()
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
          deadline: null
        }
        this.showStatus('Контекст очищен', 'info')
      }
    },
    
    // Экспорт контекста
    exportContext() {
      try {
        const contextJson = contextManager.exportContext()
        const blob = new Blob([contextJson], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `context_${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        this.showStatus('Контекст экспортирован', 'success')
      } catch (error) {
        this.showStatus('Ошибка при экспорте контекста', 'error')
        console.error('Error exporting context:', error)
      }
    },
    
    // Импорт контекста
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
              const context = contextManager.importContext(e.target.result)
              this.loadContext()
              this.showStatus('Контекст импортирован', 'success')
            } catch (error) {
              this.showStatus('Ошибка при импорте контекста', 'error')
              console.error('Error importing context:', error)
            }
          }
          reader.readAsText(file)
        }
      }
      input.click()
    },
    
    // Добавление навыка
    addSkill() {
      if (this.newSkill.trim()) {
        this.contextA.skills.push(this.newSkill.trim())
        this.newSkill = ''
      }
    },
    
    // Удаление навыка
    removeSkill(index) {
      this.contextA.skills.splice(index, 1)
    },
    
    // Добавление цели
    addGoal() {
      if (this.newGoal.trim()) {
        this.contextA.goals.push(this.newGoal.trim())
        this.newGoal = ''
      }
    },
    
    // Удаление цели
    removeGoal(index) {
      this.contextA.goals.splice(index, 1)
    },
    
    // Добавление требования
    addRequirement() {
      if (this.newRequirement.trim()) {
        this.contextB.requirements.push(this.newRequirement.trim())
        this.newRequirement = ''
      }
    },
    
    // Удаление требования
    removeRequirement(index) {
      this.contextB.requirements.splice(index, 1)
    },
    
    // Добавление ожидания
    addExpectation() {
      if (this.newExpectation.trim()) {
        this.contextB.expectations.push(this.newExpectation.trim())
        this.newExpectation = ''
      }
    },
    
    // Удаление ожидания
    removeExpectation(index) {
      this.contextB.expectations.splice(index, 1)
    },
    
    // Добавление критерия
    addCriterion() {
      if (this.newCriterion.trim()) {
        this.goal.successCriteria.push(this.newCriterion.trim())
        this.newCriterion = ''
      }
    },
    
    // Удаление критерия
    removeCriterion(index) {
      this.goal.successCriteria.splice(index, 1)
    },
    
    // Показ статуса
    showStatus(message, type) {
      this.contextStatus = message
      this.contextStatusClass = {
        success: 'bg-green-100 text-green-800',
        error: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800'
      }[type]
      
      setTimeout(() => {
        this.contextStatus = ''
      }, 3000)
    }
  }
}
</script>

<style scoped>
.context-panel {
  max-height: 80vh;
  overflow-y: auto;
}

/* Стили для скроллбара */
.context-panel::-webkit-scrollbar {
  width: 6px;
}

.context-panel::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.context-panel::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.context-panel::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
