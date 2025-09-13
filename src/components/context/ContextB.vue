<template>
  <div class="context-b">
    <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
      <span class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">B</span>
      Сторона B (Собеседник)
    </h3>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Имя -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Имя</label>
        <input
          v-model="localContext.name"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Имя собеседника"
          @input="updateContext"
        />
      </div>
      
      <!-- Роль -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Роль</label>
        <input
          v-model="localContext.role"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Роль собеседника"
          @input="updateContext"
        />
      </div>
      
      <!-- Компания -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Компания</label>
        <input
          v-model="localContext.company"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Название компании"
          @input="updateContext"
        />
      </div>
      
      <!-- Позиция -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Позиция</label>
        <input
          v-model="localContext.position"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Позиция собеседника"
          @input="updateContext"
        />
      </div>
      
      <!-- Требования к позиции -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">Требования к позиции</label>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(requirement, index) in localContext.requirements"
            :key="index"
            class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
          >
            {{ requirement }}
            <button
              @click="removeRequirement(index)"
              class="ml-2 text-orange-600 hover:text-orange-800 transition-colors"
              title="Удалить требование"
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
      
      <!-- Ожидания -->
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">Ожидания</label>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(expectation, index) in localContext.expectations"
            :key="index"
            class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
          >
            {{ expectation }}
            <button
              @click="removeExpectation(index)"
              class="ml-2 text-purple-600 hover:text-purple-800 transition-colors"
              title="Удалить ожидание"
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
</template>

<script>
export default {
  name: 'ContextB',
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
      newRequirement: '',
      newExpectation: ''
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
    
    addRequirement() {
      if (this.newRequirement.trim()) {
        this.localContext.requirements.push(this.newRequirement.trim())
        this.newRequirement = ''
        this.updateContext()
      }
    },
    
    removeRequirement(index) {
      this.localContext.requirements.splice(index, 1)
      this.updateContext()
    },
    
    addExpectation() {
      if (this.newExpectation.trim()) {
        this.localContext.expectations.push(this.newExpectation.trim())
        this.newExpectation = ''
        this.updateContext()
      }
    },
    
    removeExpectation(index) {
      this.localContext.expectations.splice(index, 1)
      this.updateContext()
    }
  }
}
</script>

<style scoped>
.context-b {
  /* Стили для контекста стороны B */
}

/* Стили для тегов требований и ожиданий */
.context-b .inline-flex {
  transition: all 0.2s ease-in-out;
}

.context-b .inline-flex:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Стили для кнопок удаления */
.context-b button {
  transition: all 0.2s ease-in-out;
}

.context-b button:hover {
  transform: scale(1.1);
}

/* Стили для полей ввода */
.context-b input {
  transition: all 0.2s ease-in-out;
}

.context-b input:focus {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Анимации */
.context-b {
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
.context-b h3 {
  position: relative;
}

.context-b h3::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 50px;
  height: 2px;
  background: linear-gradient(90deg, #10b981, #059669);
  border-radius: 1px;
}

/* Стили для лейблов */
.context-b label {
  font-weight: 600;
  color: #374151;
}

/* Стили для плейсхолдеров */
.context-b input::placeholder {
  color: #9ca3af;
  font-style: italic;
}

/* Адаптивность */
@media (max-width: 768px) {
  .context-b .grid {
    grid-template-columns: 1fr;
  }
  
  .context-b .md\\:col-span-2 {
    grid-column: span 1;
  }
}

/* Стили для состояний валидации */
.context-b input:invalid {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.context-b input:valid {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

/* Специальные стили для разных типов тегов */
.context-b .bg-orange-100 {
  background-color: #fed7aa;
  color: #9a3412;
}

.context-b .bg-purple-100 {
  background-color: #e9d5ff;
  color: #7c3aed;
}

.context-b .text-orange-600:hover {
  color: #c2410c;
}

.context-b .text-purple-600:hover {
  color: #6d28d9;
}
</style>
