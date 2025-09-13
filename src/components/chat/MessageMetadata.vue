<template>
  <div class="message-metadata" v-if="showMetadata">
    <div class="flex items-center justify-between text-xs text-gray-500 mt-2">
      <!-- Информация о времени -->
      <div class="flex items-center gap-2">
        <span class="message-time">{{ formattedTime }}</span>
        <span v-if="message.role === 'assistant'" class="message-role">AI</span>
        <span v-else class="message-role">Пользователь</span>
      </div>
      
      <!-- Статус сообщения -->
      <div class="flex items-center gap-2">
        <!-- Индикатор статуса -->
        <div v-if="messageStatus" class="flex items-center gap-1">
          <div 
            class="w-2 h-2 rounded-full"
            :class="statusClass"
          ></div>
          <span class="status-text">{{ statusText }}</span>
        </div>
        
        <!-- Индикатор загрузки -->
        <div v-if="message.typing" class="flex items-center gap-1">
          <div class="animate-spin w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full"></div>
          <span>Отправка...</span>
        </div>
        
        <!-- Индикатор ошибки -->
        <div v-if="message.error" class="flex items-center gap-1 text-red-500">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Ошибка</span>
        </div>
        
        <!-- Индикатор таймаута -->
        <div v-if="message.isTimeout" class="flex items-center gap-1 text-orange-500">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Таймаут</span>
        </div>
      </div>
    </div>
    
    <!-- Дополнительная информация -->
    <div v-if="showAdditionalInfo" class="mt-1 text-xs text-gray-400">
      <!-- Информация о парсинге -->
      <div v-if="message.parsed" class="flex items-center gap-2">
        <span>Парсинг: {{ message.parsed.confidence ? Math.round(message.parsed.confidence * 100) + '%' : 'OK' }}</span>
        <span v-if="message.parsed.tokens">Токены: {{ message.parsed.tokens }}</span>
      </div>
      
      <!-- Информация о модели -->
      <div v-if="message.model" class="flex items-center gap-2">
        <span>Модель: {{ message.model }}</span>
      </div>
      
      <!-- Информация о контексте -->
      <div v-if="message.contextId" class="flex items-center gap-2">
        <span>Контекст: {{ message.contextId }}</span>
      </div>
    </div>
    
    <!-- Индикатор очереди -->
    <div v-if="isQueued" class="mt-1 text-xs text-blue-500 flex items-center gap-1">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>В очереди ({{ queuePosition }})</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MessageMetadata',
  props: {
    message: {
      type: Object,
      required: true
    },
    queued: {
      type: Array,
      default: () => []
    },
    showMetadata: {
      type: Boolean,
      default: true
    },
    showAdditionalInfo: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    formattedTime() {
      if (!this.message.timestamp) return ''
      
      const date = new Date(this.message.timestamp)
      const now = new Date()
      const diff = now - date
      
      // Если сообщение отправлено менее минуты назад
      if (diff < 60000) {
        return 'только что'
      }
      
      // Если сообщение отправлено менее часа назад
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000)
        return `${minutes} мин назад`
      }
      
      // Если сообщение отправлено сегодня
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
      
      // Если сообщение отправлено вчера
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      if (date.toDateString() === yesterday.toDateString()) {
        return 'вчера ' + date.toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
      
      // Для более старых сообщений показываем дату
      return date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    messageStatus() {
      if (this.message.typing) return 'typing'
      if (this.message.error) return 'error'
      if (this.message.isTimeout) return 'timeout'
      if (this.message.parsed) return 'parsed'
      return 'sent'
    },
    
    statusText() {
      const statusMap = {
        typing: 'Отправка...',
        error: 'Ошибка',
        timeout: 'Таймаут',
        parsed: 'Обработано',
        sent: 'Отправлено'
      }
      return statusMap[this.messageStatus] || 'Неизвестно'
    },
    
    statusClass() {
      const classMap = {
        typing: 'bg-blue-500 animate-pulse',
        error: 'bg-red-500',
        timeout: 'bg-orange-500',
        parsed: 'bg-green-500',
        sent: 'bg-gray-400'
      }
      return classMap[this.messageStatus] || 'bg-gray-400'
    },
    
    isQueued() {
      return this.queued.some(item => item.id === this.message.id)
    },
    
    queuePosition() {
      const index = this.queued.findIndex(item => item.id === this.message.id)
      return index + 1
    }
  }
}
</script>

<style scoped>
.message-metadata {
  /* Стили для метаданных сообщения */
}

/* Анимации */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Стили для статусных индикаторов */
.status-text {
  font-weight: 500;
}

/* Стили для времени */
.message-time {
  font-weight: 500;
}

/* Стили для роли */
.message-role {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

/* Стили для дополнительной информации */
.message-metadata .flex {
  align-items: center;
}

/* Адаптивность */
@media (max-width: 640px) {
  .message-metadata {
    font-size: 0.75rem;
  }
  
  .message-metadata .flex {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}

/* Стили для состояний */
.message-metadata .text-red-500 {
  color: #ef4444;
}

.message-metadata .text-orange-500 {
  color: #f97316;
}

.message-metadata .text-blue-500 {
  color: #3b82f6;
}

.message-metadata .text-gray-400 {
  color: #9ca3af;
}

.message-metadata .text-gray-500 {
  color: #6b7280;
}

/* Стили для индикаторов */
.message-metadata .w-2.h-2 {
  width: 0.5rem;
  height: 0.5rem;
}

.message-metadata .w-3.h-3 {
  width: 0.75rem;
  height: 0.75rem;
}

/* Стили для анимации появления */
.message-metadata {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
