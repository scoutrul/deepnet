<template>
  <div class="context-a">
    <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
      <span class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">A</span>
      Сторона A (Вы)
    </h3>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Имя -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Имя</label>
        <input
          v-model="localContext.name"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ваше имя"
          @input="updateContext"
        />
      </div>
      
      <!-- Роль -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Роль</label>
        <input
          v-model="localContext.role"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ваша роль/позиция"
          @input="updateContext"
        />
      </div>
      
      <!-- Фон и опыт -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">Фон и опыт</label>
        <textarea
          v-model="localContext.background"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Опишите ваш опыт и квалификацию"
          @input="updateContext"
        />
      </div>
      
      <!-- Навыки -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">Навыки</label>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(skill, index) in localContext.skills"
            :key="index"
            class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
          >
            {{ skill }}
            <button
              @click="removeSkill(index)"
              class="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
              title="Удалить навык"
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
      
      <!-- Цели -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">Цели</label>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(goal, index) in localContext.goals"
            :key="index"
            class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
          >
            {{ goal }}
            <button
              @click="removeGoal(index)"
              class="ml-2 text-green-600 hover:text-green-800 transition-colors"
              title="Удалить цель"
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
</template>

<script>
export default {
  name: 'ContextA',
  props: {
    context: {
      type: Object,
      required: true
    }
  },
  emits: [
    'update:context'
  ],
  data() {
    return {
      localContext: { ...this.context },
      newSkill: '',
      newGoal: ''
    }
  },
  watch: {
    context: {
      handler(newContext) {
        this.localContext = { ...newContext }
      },
      deep: true
    }
  },
  methods: {
    updateContext() {
      this.$emit('update:context', { ...this.localContext })
    },
    
    addSkill() {
      if (this.newSkill.trim()) {
        this.localContext.skills.push(this.newSkill.trim())
        this.newSkill = ''
        this.updateContext()
      }
    },
    
    removeSkill(index) {
      this.localContext.skills.splice(index, 1)
      this.updateContext()
    },
    
    addGoal() {
      if (this.newGoal.trim()) {
        this.localContext.goals.push(this.newGoal.trim())
        this.newGoal = ''
        this.updateContext()
      }
    },
    
    removeGoal(index) {
      this.localContext.goals.splice(index, 1)
      this.updateContext()
    }
  }
}
</script>

<style scoped>
.context-a {
  /* Стили для контекста стороны A */
}

/* Стили для тегов навыков и целей */
.context-a .inline-flex {
  transition: all 0.2s ease-in-out;
}

.context-a .inline-flex:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Стили для кнопок удаления */
.context-a button {
  transition: all 0.2s ease-in-out;
}

.context-a button:hover {
  transform: scale(1.1);
}

/* Стили для полей ввода */
.context-a input,
.context-a textarea {
  transition: all 0.2s ease-in-out;
}

.context-a input:focus,
.context-a textarea:focus {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Анимации */
.context-a {
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
.context-a h3 {
  position: relative;
}

.context-a h3::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 50px;
  height: 2px;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 1px;
}

/* Стили для лейблов */
.context-a label {
  font-weight: 600;
  color: #374151;
}

/* Стили для плейсхолдеров */
.context-a input::placeholder,
.context-a textarea::placeholder {
  color: #9ca3af;
  font-style: italic;
}

/* Адаптивность */
@media (max-width: 768px) {
  .context-a .grid {
    grid-template-columns: 1fr;
  }
  
  .context-a .md\\:col-span-2 {
    grid-column: span 1;
  }
}

/* Стили для состояний валидации */
.context-a input:invalid,
.context-a textarea:invalid {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.context-a input:valid,
.context-a textarea:valid {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}
</style>
