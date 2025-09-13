<template>
  <div 
    class="diarized-message mb-4 p-4 rounded-xl border-l-4 shadow-sm transition-all duration-200 hover:shadow-md"
    :style="{ borderLeftColor: message.speakerColor }"
    :class="{
      'bg-slate-50': !message.isActive,
      'bg-blue-50': message.isActive,
      'border-slate-200': !message.isActive,
      'border-blue-200': message.isActive
    }"
  >
    <!-- Заголовок сообщения -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <!-- Индикатор спикера -->
        <div 
          class="w-3 h-3 rounded-full flex-shrink-0"
          :style="{ backgroundColor: message.speakerColor }"
        ></div>
        
        <!-- Имя спикера -->
        <span 
          class="font-semibold text-sm"
          :style="{ color: message.speakerColor }"
        >
          {{ message.speakerName }}
        </span>
        
        <!-- Индикатор активности -->
        <span 
          v-if="message.isActive" 
          class="inline-flex items-center gap-1 text-xs text-blue-600"
        >
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          Говорит...
        </span>
      </div>
      
      <!-- Время -->
      <span class="text-xs text-slate-500">
        {{ formatTime(message.timestamp) }}
      </span>
    </div>
    
    <!-- Содержимое сообщения -->
    <div class="text-slate-800 leading-relaxed">
      {{ message.content }}
      
      <!-- Индикатор печати для активных сообщений -->
      <span 
        v-if="message.isActive" 
        class="inline-block w-2 h-4 bg-slate-400 ml-1 animate-pulse"
      ></span>
    </div>
    
    <!-- Метаданные (опционально) -->
    <div 
      v-if="showMetadata && message.segments.length > 0" 
      class="mt-2 text-xs text-slate-500"
    >
      <span>Сегментов: {{ message.segments.length }}</span>
      <span v-if="message.segments[0]?.confidence" class="ml-2">
        Уверенность: {{ Math.round(message.segments[0].confidence * 100) }}%
      </span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DiarizedMessage',
  props: {
    message: {
      type: Object,
      required: true
    },
    showMetadata: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    formatTime(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.diarized-message {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Анимация для активных сообщений */
.diarized-message.bg-blue-50 {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
