<template>
  <div class="tag-feed-container">
    <!-- Кнопка "Очистить всё" в правом верхнем углу -->
    <div v-if="stats.total > 0" class="clear-all-button-container absolute top-2 right-2 z-10">
      <button
        @click="$emit('clear-all')"
        class="clear-all-button flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 hover:border-red-300 transition-colors"
        title="Очистить все теги"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
        Очистить всё
      </button>
    </div>

    <!-- Tags container with flex-wrap and scroll -->
    <div 
      ref="tagsContainer"
      class="tags-container relative"
      :class="{ 'has-tags': stats.total > 0 }"
    >
      <div v-if="stats.total === 0" class="empty-state">
        <div class="text-center py-12">
          <!-- Placeholder "Начните говорить" при записи -->
          <div v-if="isRecording" class="text-center py-8">
            <div class="text-2xl font-medium text-slate-400 mb-4">🎤</div>
            <p class="text-lg font-medium text-slate-500">Начните говорить</p>
            <p class="text-sm text-slate-400 mt-2">Система распознает вашу речь</p>
          </div>
          
          <!-- Placeholder "Запись остановлена" когда есть теги, но запись не идет -->
          <div v-else-if="!isRecording && stats.total > 0" class="text-center py-8">
            <div class="text-2xl font-medium text-slate-400 mb-4">⏸️</div>
            <p class="text-lg font-medium text-slate-500">Запись остановлена</p>
            <p class="text-sm text-slate-400 mt-2">Нажмите "Начать заново" для новой записи</p>
          </div>
          
          <!-- Кнопка "Начать запись" когда не записываем и нет тегов -->
          <button
            v-else-if="!isRecording && stats.total === 0"
            @click="startRecording"
            :disabled="!!error"
            :class="[
              'record-button flex items-center justify-center gap-3 px-8 py-6 rounded-xl font-medium transition-all duration-200',
              'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md hover:shadow-lg',
              error ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
            ]"
            title="Начать голосовую запись"
          >
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
            <span class="text-xl">Начать запись</span>
          </button>
        </div>
      </div>

      <div v-else class="tags-grid">
        <VoiceTag
          v-for="tag in displayTags"
          :key="tag.id"
          :tag="tag"
          :selected="tag.isSelected"
          @tag-click="handleTagClick"
          @tag-hover="handleTagHover"
        />
      </div>
    </div>

    <!-- Scroll to bottom button -->
    <div v-if="showScrollButton" class="scroll-controls mt-4 text-center">
      <button
        @click="scrollToBottom"
        class="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
        title="Прокрутить к последним тегам"
      >
        <svg class="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </svg>
        К последним
      </button>
    </div>
  </div>
</template>

<script>
import VoiceTag from './VoiceTag.vue'

export default {
  name: 'TagFeed',
  components: {
    VoiceTag
  },
  props: {
    tags: {
      type: Array,
      default: () => []
    },
    autoScroll: {
      type: Boolean,
      default: true
    },
    error: {
      type: Object,
      default: null
    },
    isRecording: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      showScrollButton: false,
      isScrolling: false,
      scrollThreshold: 100
    }
  },
  computed: {
    // Стакан на 10 последних тегов с дедупликацией
    displayTags() {
      // Создаем Map для отслеживания уникальных фраз
      const uniquePhrases = new Map()
      
      // Обрабатываем теги в хронологическом порядке (новые последние)
      const processedTags = this.tags
        .filter(tag => tag && tag.isVisible !== false)
        .filter(tag => {
          // Проверяем, что tag.text существует и является строкой
          if (!tag.text || typeof tag.text !== 'string') return false
          const textLength = tag.text.trim().length
          return textLength >= 5 && textLength <= 50
        })
        .map(tag => ({
          ...tag,
          displayText: this.mergeCyclicWords(tag.text)
        }))
        .reverse() // Разворачиваем для обработки от старых к новым
      
      // Собираем уникальные фразы, сохраняя только последние вхождения
      for (const tag of processedTags) {
        const normalizedText = this.normalizePhrase(tag.displayText)
        if (!uniquePhrases.has(normalizedText)) {
          uniquePhrases.set(normalizedText, tag)
        }
      }
      
      // Берем только последние 10 уникальных тегов
      const uniqueTags = Array.from(uniquePhrases.values())
        .slice(-10)
        .reverse() // Возвращаем к порядку: новые сверху
      
      return uniqueTags
    },

    stats() {
      const total = this.displayTags.length
      const selected = this.displayTags.filter(tag => tag.isSelected).length
      
      return {
        total,
        selected
      }
    },

    // Метод для слияния циклично повторяющихся слов
    mergeCyclicWords() {
      return (text) => {
        if (!text || typeof text !== 'string') return text
        
        const words = text.trim().split(/\s+/)
        if (words.length <= 1) return text
        
        const result = []
        let currentWord = words[0]
        
        for (let i = 1; i < words.length; i++) {
          const nextWord = words[i]
          
          // Проверяем, является ли следующее слово продолжением текущего
          if (this.isWordContinuation(currentWord, nextWord)) {
            // Если это продолжение, обновляем текущее слово
            currentWord = this.findLongestCommonWord(currentWord, nextWord)
          } else {
            // Если это новое слово, добавляем предыдущее в результат
            result.push(currentWord)
            currentWord = nextWord
          }
        }
        
        // Добавляем последнее слово
        result.push(currentWord)
        
        return result.join(' ')
      }
    },

    // Проверяет, является ли nextWord продолжением currentWord
    isWordContinuation() {
      return (currentWord, nextWord) => {
        if (!currentWord || !nextWord) return false
        
        // Проверяем, начинается ли nextWord с currentWord
        if (nextWord.startsWith(currentWord)) return true
        
        // Проверяем, заканчивается ли currentWord на nextWord
        if (currentWord.endsWith(nextWord)) return true
        
        // Проверяем общие префиксы (например: "диалек" -> "диалекти")
        const minLength = Math.min(currentWord.length, nextWord.length)
        for (let i = 1; i <= minLength; i++) {
          const prefix = currentWord.slice(0, i)
          if (nextWord.startsWith(prefix) && prefix.length > 2) {
            return true
          }
        }
        
        return false
      }
    },

    // Находит самое длинное общее слово между двумя словами
    findLongestCommonWord() {
      return (word1, word2) => {
        if (!word1 || !word2) return word1 || word2
        
        // Если одно слово полностью содержится в другом, возвращаем длинное
        if (word1.includes(word2)) return word1
        if (word2.includes(word1)) return word2
        
        // Ищем общий префикс
        let commonPrefix = ''
        const minLength = Math.min(word1.length, word2.length)
        
        for (let i = 0; i < minLength; i++) {
          if (word1[i] === word2[i]) {
            commonPrefix += word1[i]
          } else {
            break
          }
        }
        
        // Если общий префикс достаточно длинный, используем его
        if (commonPrefix.length > 2) {
          return commonPrefix
        }
        
        // Иначе возвращаем более длинное слово
        return word1.length >= word2.length ? word1 : word2
      }
    }
  },
  watch: {
    tags: {
      handler(newTags, oldTags) {
        if (newTags.length > oldTags.length && this.autoScroll) {
          this.$nextTick(() => {
            this.scrollToBottom()
          })
        }
      },
      deep: true
    }
  },
  mounted() {
    this.setupScrollDetection()
  },
  methods: {
    handleTagClick(event) {
      this.$emit('tag-click', event)
    },

    handleTagHover(event) {
      this.$emit('tag-hover', event)
    },

    clearAll() {
      this.$emit('clear-all')
    },



    scrollToBottom() {
      if (!this.$refs.tagsContainer) return

      this.isScrolling = true
      this.$refs.tagsContainer.scrollTo({
        top: this.$refs.tagsContainer.scrollHeight,
        behavior: 'smooth'
      })

      // Reset scrolling flag after animation
      setTimeout(() => {
        this.isScrolling = false
      }, 500)
    },

    setupScrollDetection() {
      if (!this.$refs.tagsContainer) return

      this.$refs.tagsContainer.addEventListener('scroll', this.handleScroll)
    },

    handleScroll() {
      if (this.isScrolling) return

      const container = this.$refs.tagsContainer
      if (!container) return

      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight

      // Show scroll button if not at bottom
      this.showScrollButton = scrollTop + clientHeight < scrollHeight - this.scrollThreshold
    },

    // Public method to scroll to a specific tag
    scrollToTag(tagId) {
      const tagElement = this.$el.querySelector(`[data-tag-id="${tagId}"]`)
      if (tagElement && this.$refs.tagsContainer) {
        tagElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    },

    // Нормализация фразы для дедупликации
    normalizePhrase(text) {
      if (!text || typeof text !== 'string') return ''
      return text.trim().toLowerCase().replace(/\s+/g, ' ')
    },

    // Запуск записи
    startRecording() {
      this.$emit('start-recording')
    }
  },

  beforeDestroy() {
    if (this.$refs.tagsContainer) {
      this.$refs.tagsContainer.removeEventListener('scroll', this.handleScroll)
    }
  }
}
</script>

<style scoped>
.tag-feed-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tags-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 300px;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background-color: #f8fafc;
}

.tags-container.has-tags {
  background-color: white;
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1.5rem;
  min-height: 100%;
  align-items: flex-start; /* Выравниваем теги по верхнему краю */
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}

.scroll-controls {
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
}

/* Custom scrollbar */
.tags-container::-webkit-scrollbar {
  width: 8px;
}

.tags-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.tags-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.tags-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Smooth transitions */
.tags-grid {
  transition: all 0.2s ease-in-out;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .tags-grid {
    gap: 0.5rem;
    padding: 1rem;
  }
  
  .tags-container {
    min-height: 250px;
  }
}

@media (max-width: 640px) {
  .tags-grid {
    gap: 0.375rem;
    padding: 0.75rem;
  }
  
  .tag-feed-container {
    min-height: 250px;
  }
  
  .tags-container {
    min-height: 200px;
  }
}
</style>
