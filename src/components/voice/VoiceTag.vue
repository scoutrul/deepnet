<template>
  <span class="relative inline-flex">
    <button
      ref="tagButton"
      type="button"
      :class="[
        'voice-tag transition-all duration-200',
        'px-4 py-2 rounded-full text-sm font-medium',
        'bg-blue-100 text-blue-700 hover:bg-blue-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        'border border-blue-200',
        selected ? 'ring-2 ring-blue-500 bg-blue-200' : '',
        isHovered ? 'shadow-md' : ''
      ]"
      @click.left="handleLeftClick"
      @contextmenu.prevent="handleRightClick"
      @keydown.enter="handleLeftClick"
      @keydown.space="handleLeftClick"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      :aria-label="`Voice tag: ${tag.text}. Left click to add to input, right click for quick add`"
    >
      <span class="tag-text">{{ tag.displayText || tag.text }}</span>
    </button>
  </span>
</template>

<script>
export default {
  name: 'VoiceTag',
  props: {
    tag: {
      type: Object,
      required: true
    },
    selected: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    isHovered() {
      return this.tag.isHovered || false
    }
  },
  methods: {
    handleLeftClick() {
      this.$emit('tag-click', {
        tagId: this.tag.id,
        action: 'add-to-input',
        text: this.tag.text
      })
    },

    handleRightClick() {
      this.$emit('tag-click', {
        tagId: this.tag.id,
        action: 'quick-add',
        text: this.tag.text
      })
    },

    handleMouseEnter() {
      this.$emit('tag-hover', {
        tagId: this.tag.id,
        isHovered: true
      })
    },

    handleMouseLeave() {
      this.$emit('tag-hover', {
        tagId: this.tag.id,
        isHovered: false
      })
    }
  }
}
</script>

<style scoped>
.voice-tag {
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px; /* Фиксированная высота */
  min-width: fit-content; /* Минимальная ширина по содержимому */
  max-width: none; /* Убираем ограничение максимальной ширины */
  white-space: nowrap; /* Текст не переносится */
  overflow: visible; /* Показываем весь текст */
  text-overflow: unset; /* Убираем многоточие */
}

.tag-text {
  white-space: nowrap; /* Текст в одну строку */
  overflow: visible; /* Показываем весь текст */
}

.voice-tag:hover {
  transform: translateY(-1px);
}

.voice-tag:active {
  transform: translateY(0);
}

/* Focus styles for accessibility */
.voice-tag:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Animation for confidence indicator */
.voice-tag .opacity-60 {
  transition: opacity 0.2s ease-in-out;
}

.voice-tag:hover .opacity-60 {
  opacity: 0.8 !important;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .voice-tag {
    height: 36px; /* Немного меньше на мобильных */
  }
}
</style>
