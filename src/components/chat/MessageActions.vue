<template>
  <div class="message-actions" v-if="showActions">
    <div class="pt-2 border-t border-slate-100 flex gap-1.5 flex-wrap">
      <!-- Кнопка уточнения -->
      <button 
        @click="handleClarify"
        class="clarify-button px-2 py-0.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors duration-200 flex items-center gap-1"
        title="Уточнить это сообщение"
      >
        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Уточнить
      </button>
      
      <!-- Кнопка ответа от пользователя -->
      <button 
        @click="handleRespondAsUser"
        class="respond-as-user-button px-2 py-0.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors duration-200 flex items-center gap-1"
        title="Ответить от имени пользователя"
      >
        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        От пользователя
      </button>
      
      <!-- Кнопка продолжения от бота -->
      <button 
        @click="handleContinueAsBot"
        class="continue-as-bot-button px-2 py-0.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors duration-200 flex items-center gap-1"
        title="Продолжить от имени бота"
      >
        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
        От бота
      </button>
      
      <!-- Кнопка копирования -->
      <button 
        @click="handleCopy"
        class="copy-button px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors duration-200 flex items-center gap-1"
        title="Копировать сообщение"
      >
        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        Копировать
      </button>
      
      <!-- Кнопка редактирования (только для пользовательских сообщений) -->
      <button 
        v-if="message.role === 'user'"
        @click="handleEdit"
        class="edit-button px-2 py-0.5 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded transition-colors duration-200 flex items-center gap-1"
        title="Редактировать сообщение"
      >
        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
        Редактировать
      </button>
      
      <!-- Кнопка удаления (только для пользовательских сообщений) -->
      <button 
        v-if="message.role === 'user'"
        @click="handleDelete"
        class="delete-button px-2 py-0.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors duration-200 flex items-center gap-1"
        title="Удалить сообщение"
      >
        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
        Удалить
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MessageActions',
  props: {
    message: {
      type: Object,
      required: true
    },
    showActions: {
      type: Boolean,
      default: true
    }
  },
  emits: [
    'clarify',
    'respond-as-user',
    'continue-as-bot',
    'copy',
    'edit',
    'delete'
  ],
  methods: {
    handleClarify() {
      const text = this.message.parsed?.text || this.message.content
      this.$emit('clarify', text)
    },
    
    handleRespondAsUser() {
      const text = this.message.parsed?.text || this.message.content
      this.$emit('respond-as-user', text)
    },
    
    handleContinueAsBot() {
      const text = this.message.parsed?.text || this.message.content
      this.$emit('continue-as-bot', text)
    },
    
    handleCopy() {
      const text = this.message.parsed?.text || this.message.content
      this.$emit('copy', text)
    },
    
    handleEdit() {
      this.$emit('edit', this.message)
    },
    
    handleDelete() {
      this.$emit('delete', this.message)
    }
  }
}
</script>

<style scoped>
.message-actions {
  /* Стили для действий с сообщением */
}

/* Стили для кнопок действий */
.message-actions button {
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: hidden;
}

.message-actions button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.message-actions button:active {
  transform: translateY(0);
}

/* Эффект ripple для кнопок */
.message-actions button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}

.message-actions button:active::before {
  width: 200px;
  height: 200px;
}

/* Специальные стили для разных типов кнопок */
.clarify-button:hover {
  background-color: #e2e8f0;
  color: #475569;
}

.respond-as-user-button:hover {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.continue-as-bot-button:hover {
  background-color: #dcfce7;
  color: #166534;
}

.copy-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.edit-button:hover {
  background-color: #fef3c7;
  color: #92400e;
}

.delete-button:hover {
  background-color: #fecaca;
  color: #dc2626;
}

/* Анимация появления кнопок */
.message-actions {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Стили для иконок */
.message-actions button svg {
  transition: transform 0.2s ease-in-out;
}

.message-actions button:hover svg {
  transform: scale(1.1);
}

/* Адаптивность для мобильных устройств */
@media (max-width: 640px) {
  .message-actions {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .message-actions button {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }
  
  .message-actions button svg {
    width: 1rem;
    height: 1rem;
  }
}

/* Стили для состояний загрузки */
.message-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.message-actions button:disabled:hover {
  transform: none;
  box-shadow: none;
}
</style>
