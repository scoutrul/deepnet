<template>
  <div class="goal-settings">
    <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
      <span class="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">🎯</span>
      Цель коммуникации
    </h3>
    
    <div class="space-y-4">
      <!-- Описание цели -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Описание цели</label>
        <textarea
          v-model="localGoal.description"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Опишите цель вашей коммуникации"
          @input="updateGoal"
        />
      </div>
      
      <!-- Критерии успеха -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Критерии успеха</label>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(criterion, index) in localGoal.successCriteria"
            :key="index"
            class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
          >
            {{ criterion }}
            <button
              @click="removeCriterion(index)"
              class="ml-2 text-purple-600 hover:text-purple-800 transition-colors"
              title="Удалить критерий"
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
      
      <!-- Приоритет и дедлайн -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Приоритет</label>
          <select
            v-model="localGoal.priority"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            @change="updateGoal"
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
            v-model="localGoal.deadline"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            @change="updateGoal"
          />
        </div>
      </div>
      
      <!-- Дополнительные настройки -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Тип коммуникации</label>
          <select
            v-model="localGoal.communicationType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            @change="updateGoal"
          >
            <option value="interview">Собеседование</option>
            <option value="meeting">Встреча</option>
            <option value="presentation">Презентация</option>
            <option value="negotiation">Переговоры</option>
            <option value="other">Другое</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Длительность (минуты)</label>
          <input
            v-model.number="localGoal.duration"
            type="number"
            min="5"
            max="480"
            step="5"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="60"
            @input="updateGoal"
          />
        </div>
      </div>
      
      <!-- Дополнительные заметки -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Дополнительные заметки</label>
        <textarea
          v-model="localGoal.notes"
          rows="2"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Дополнительная информация о цели"
          @input="updateGoal"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GoalSettings',
  props: {
    goal: {
      type: Object,
      required: true
    }
  },
  emits: [
    'update:goal'
  ],
  data() {
    return {
      localGoal: {
        description: '',
        successCriteria: [],
        priority: 'medium',
        deadline: null,
        communicationType: 'interview',
        duration: 60,
        notes: '',
        ...this.goal
      },
      newCriterion: ''
    }
  },
  watch: {
    goal: {
      handler(newGoal) {
        this.localGoal = { ...this.localGoal, ...newGoal }
      },
      deep: true
    }
  },
  methods: {
    updateGoal() {
      this.$emit('update:goal', { ...this.localGoal })
    },
    
    addCriterion() {
      if (this.newCriterion.trim()) {
        this.localGoal.successCriteria.push(this.newCriterion.trim())
        this.newCriterion = ''
        this.updateGoal()
      }
    },
    
    removeCriterion(index) {
      this.localGoal.successCriteria.splice(index, 1)
      this.updateGoal()
    }
  }
}
</script>

<style scoped>
.goal-settings {
  /* Стили для настроек цели */
}

/* Стили для тегов критериев */
.goal-settings .inline-flex {
  transition: all 0.2s ease-in-out;
}

.goal-settings .inline-flex:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Стили для кнопок удаления */
.goal-settings button {
  transition: all 0.2s ease-in-out;
}

.goal-settings button:hover {
  transform: scale(1.1);
}

/* Стили для полей ввода */
.goal-settings input,
.goal-settings textarea,
.goal-settings select {
  transition: all 0.2s ease-in-out;
}

.goal-settings input:focus,
.goal-settings textarea:focus,
.goal-settings select:focus {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Анимации */
.goal-settings {
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
.goal-settings h3 {
  position: relative;
}

.goal-settings h3::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 50px;
  height: 2px;
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
  border-radius: 1px;
}

/* Стили для лейблов */
.goal-settings label {
  font-weight: 600;
  color: #374151;
}

/* Стили для плейсхолдеров */
.goal-settings input::placeholder,
.goal-settings textarea::placeholder {
  color: #9ca3af;
  font-style: italic;
}

/* Адаптивность */
@media (max-width: 768px) {
  .goal-settings .grid {
    grid-template-columns: 1fr;
  }
}

/* Стили для состояний валидации */
.goal-settings input:invalid,
.goal-settings textarea:invalid {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.goal-settings input:valid,
.goal-settings textarea:valid {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

/* Стили для приоритетов */
.goal-settings select option[value="low"] {
  color: #6b7280;
}

.goal-settings select option[value="medium"] {
  color: #f59e0b;
}

.goal-settings select option[value="high"] {
  color: #ef4444;
}

.goal-settings select option[value="critical"] {
  color: #dc2626;
  font-weight: bold;
}

/* Стили для типов коммуникации */
.goal-settings select option[value="interview"] {
  color: #3b82f6;
}

.goal-settings select option[value="meeting"] {
  color: #10b981;
}

.goal-settings select option[value="presentation"] {
  color: #8b5cf6;
}

.goal-settings select option[value="negotiation"] {
  color: #f59e0b;
}

.goal-settings select option[value="other"] {
  color: #6b7280;
}
</style>
