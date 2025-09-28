<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <div class="mx-auto max-w-7xl px-4 py-4">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">DeepNet Chat System</h1>
        <p class="text-gray-600">Система живой диктовки с LLM интеграцией</p>
      </div>

      <!-- Chat Content -->
      <div class="space-y-6">
        <LiveDictation />
      </div>
    </div>
  </div>
</template>

<script>
import LiveDictation from './chat/LiveDictation.vue'

export default {
  name: 'MainApp',
  components: {
    LiveDictation
  },
  data() {
    return {
      // Простое приложение только с чатом
    }
  },
  computed: {
    // Простое приложение без дополнительных вычисляемых свойств
  }
  // Простое приложение без дополнительных хуков
}
</script>

<style scoped>
/* Стили для скроллбара */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Анимации */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>