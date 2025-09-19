<template>
  <div class="context-input-panel bg-white rounded-lg shadow-md p-6">
    <div class="mb-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-2">
        Контекст для интервью
      </h3>
      <p class="text-sm text-gray-600">
        Заполните информацию о роли, навыках и опыте для генерации персональных подсказок
      </p>
    </div>

    <div class="space-y-6">
      <!-- Секция роли -->
      <div class="bg-gray-50 rounded-lg p-4">
        <h4 class="text-lg font-medium text-gray-700 mb-4">Роль и позиция</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Позиция *
            </label>
            <input
              v-model="formData.role.position"
              type="text"
              placeholder="Например: Frontend Developer"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Уровень *
            </label>
            <select
              v-model="formData.role.level"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Выберите уровень</option>
              <option value="junior">Junior</option>
              <option value="middle">Middle</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Компания
            </label>
            <input
              v-model="formData.role.company"
              type="text"
              placeholder="Например: Яндекс"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Отрасль
            </label>
            <input
              v-model="formData.role.industry"
              type="text"
              placeholder="Например: FinTech"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Секция навыков -->
      <div class="bg-gray-50 rounded-lg p-4">
        <h4 class="text-lg font-medium text-gray-700 mb-4">Навыки и технологии</h4>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Основные навыки *
            </label>
            <div class="flex flex-wrap gap-2">
              <input
                v-model="skillInput"
                type="text"
                placeholder="Добавить навык"
                class="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                @keydown.enter.prevent="addSkill('primary')"
              />
              <button
                type="button"
                @click="addSkill('primary')"
                class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Добавить
              </button>
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="(skill, index) in formData.skills.primary"
                :key="index"
                class="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {{ skill }}
                <button
                  type="button"
                  @click="removeSkill('primary', index)"
                  class="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Фреймворки и библиотеки
            </label>
            <div class="flex flex-wrap gap-2">
              <input
                v-model="frameworkInput"
                type="text"
                placeholder="Добавить фреймворк"
                class="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                @keydown.enter.prevent="addSkill('frameworks')"
              />
              <button
                type="button"
                @click="addSkill('frameworks')"
                class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Добавить
              </button>
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="(framework, index) in formData.skills.frameworks"
                :key="index"
                class="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {{ framework }}
                <button
                  type="button"
                  @click="removeSkill('frameworks', index)"
                  class="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>


      <!-- Секция текущего опыта -->
      <div class="bg-gray-50 rounded-lg p-4">
        <h4 class="text-lg font-medium text-gray-700 mb-4">Текущая роль</h4>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Текущая роль *
            </label>
            <input
              v-model="formData.experience.currentRole"
              type="text"
              placeholder="Например: Senior Frontend Developer"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Обязанности
            </label>
            <textarea
              v-model="responsibilitiesText"
              placeholder="Опишите основные обязанности (каждую с новой строки)"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Кнопки действий -->
      <div class="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          type="button"
          @click="loadFromStorage"
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Загрузить сохраненный
        </button>
        <div class="flex space-x-3">
          <button
            type="button"
            @click="saveToStorage"
            class="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>

    <!-- Сообщения об ошибках -->
    <div v-if="errorMessage" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import { interviewContextService } from '@/services/interview/interviewContextService'

export default {
  name: 'ContextInputPanel',
  emits: ['hints-generated', 'form-validation-changed'],
  data() {
    return {
      formData: this.getMockData(),
      skillInput: '',
      frameworkInput: '',
      responsibilitiesText: '',
      errorMessage: ''
    }
  },
  computed: {
    isFormValid() {
      return !!(
        this.formData.role.position &&
        this.formData.role.level &&
        this.formData.skills.primary.length > 0 &&
        this.formData.experience.currentRole
      )
    }
  },
  mounted() {
    this.loadFromStorage()
  },
  watch: {
    isFormValid(newVal) {
      this.$emit('form-validation-changed', newVal)
    }
  },
  methods: {
    getMockData() {
      return {
        id: 'mock-context-1',
        role: {
          position: 'Senior Frontend Developer',
          level: 'senior',
          company: 'TechCorp',
          industry: 'FinTech'
        },
        skills: {
          primary: ['JavaScript', 'TypeScript', 'Vue.js', 'React'],
          secondary: ['Node.js', 'Python'],
          frameworks: ['Vue 3', 'React 18', 'Next.js', 'Nuxt.js'],
          tools: ['Webpack', 'Vite', 'Docker', 'Git']
        },
        background: {
          education: 'МГУ, Факультет ВМК',
          yearsOfExperience: 8,
          previousRoles: ['Middle Frontend Developer', 'Junior Developer'],
          achievements: ['Участие в создании высоконагруженных приложений', 'Менторство junior разработчиков']
        },
        experience: {
          currentRole: 'Senior Frontend Developer',
          company: 'TechCorp',
          years: 3,
          achievements: ['Революционизировал архитектуру фронтенда', 'Внедрил современные практики разработки'],
          responsibilities: [
            'Разработка сложных пользовательских интерфейсов',
            'Архитектурные решения для фронтенда',
            'Менторство команды разработчиков',
            'Код-ревью и техническое планирование'
          ]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    addSkill(category) {
      const input = category === 'primary' ? this.skillInput : this.frameworkInput
      const value = input.trim()
      
      if (value && !this.formData.skills[category].includes(value)) {
        this.formData.skills[category].push(value)
        if (category === 'primary') {
          this.skillInput = ''
        } else {
          this.frameworkInput = ''
        }
      }
    },

    removeSkill(category, index) {
      this.formData.skills[category].splice(index, 1)
    },


    saveToStorage() {
      try {
        interviewContextService.setContext(this.formData)
        console.log('Контекст сохранен')
      } catch (err) {
        this.errorMessage = 'Ошибка при сохранении контекста'
        console.error('Ошибка сохранения:', err)
      }
    },

    loadFromStorage() {
      try {
        const context = interviewContextService.getContext()
        if (context) {
          this.formData = context
          if (context.experience.responsibilities && Array.isArray(context.experience.responsibilities)) {
            this.responsibilitiesText = context.experience.responsibilities.join('\n')
          }
        } else {
          // Если нет сохраненных данных, используем моковые
          this.formData = this.getMockData()
          this.responsibilitiesText = this.formData.experience.responsibilities.join('\n')
        }
      } catch (err) {
        this.errorMessage = 'Ошибка при загрузке контекста'
        console.error('Ошибка загрузки:', err)
        // В случае ошибки используем моковые данные
        this.formData = this.getMockData()
        this.responsibilitiesText = this.formData.experience.responsibilities.join('\n')
      }
    }
  }
}
</script>
