<template>
  <div
    v-if="isVisible"
    :style="tooltipStyle"
    class="text-selection-tooltip fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2"
  >
    <button
      @click="askQuestion"
      class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-md transition-colors flex items-center justify-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      Задать вопрос
    </button>
  </div>
</template>

<script>
export default {
  name: 'TextSelectionTooltip',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    selectedText: {
      type: String,
      default: ''
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    }
  },
  computed: {
    tooltipStyle() {
      return {
        left: `${this.position.x}px`,
        top: `${this.position.y - 10}px`, // Поднимаем немного выше курсора
        transform: 'translateY(-100%)' // Размещаем над курсором
      }
    }
  },
  methods: {
    askQuestion() {
      if (this.selectedText.trim()) {
        this.$emit('ask-question', this.selectedText.trim())
        this.closeTooltip()
      }
    },
    closeTooltip() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
/* Дополнительные стили для плавного появления */
.fixed {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-100%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(-100%) scale(1);
  }
}
</style>
