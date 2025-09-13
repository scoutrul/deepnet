<template>
  <div class="voice-panel">
    <div class="panel-header mb-6">
      <button
        @click="toggleCollapse"
        class="flex items-center justify-between w-full text-left hover:bg-slate-50 rounded-lg p-3 transition-colors"
      >
        <div>
          <h3 class="text-xl font-semibold text-slate-900">🎤 Голосовая стенография</h3>
          <p class="text-sm text-slate-600 mt-2">
            Говорите свободно - система автоматически разобьет речь на фразы и создаст интерактивные теги
          </p>
        </div>
        <svg
          class="w-6 h-6 text-slate-500 transition-transform duration-200"
          :class="{ 'rotate-180': !isCollapsed }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
    </div>

    <!-- Tag Feed and Controls in a column layout -->
    <div v-if="!isCollapsed" class="flex flex-col gap-6">
      <!-- Tag Feed - Main Content -->
      <div>
        <TagFeed
          :tags="tags"
          :auto-scroll="true"
          :error="error"
          :is-recording="isRecording"
          @tag-click="handleTagClick"
          @tag-hover="handleTagHover"
          @clear-all="clearAll"
          @start-recording="startRecording"
        />
      </div>
    </div>

                  <!-- Управление записью - отдельная строка -->
              <div v-if="!isCollapsed && (isRecording || (tags.length > 0 && !isRecording))" class="recording-controls-row mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div class="flex items-center justify-between">
                  <!-- Кнопка остановки/перезапуска слева -->
                  <button
                    v-if="isRecording"
                    @click="stopRecording"
                    class="stop-button flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-md hover:shadow-lg cursor-pointer"
                    title="Остановить запись"
                  >
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                    <span class="text-base">Остановить запись</span>
                  </button>
                  
                  <button
                    v-else
                    @click="restartRecording"
                    class="restart-button flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md hover:shadow-lg cursor-pointer"
                    title="Начать заново"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    <span class="text-base">Начать заново</span>
                  </button>
            
                  <!-- Индикатор качества речи справа -->
                  <div v-if="confidence > 0" class="confidence-indicator flex items-center gap-2 px-3 py-2 text-sm font-medium" :class="getConfidenceColor()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Качество: {{ getConfidenceText() }}
                  </div>
                </div>
              </div>


  </div>
</template>

<script>
import TagFeed from './TagFeed.vue'
import { createPhraseParser } from '../../services/voice/phraseParser'
import { createTagManager } from '../../services/voice/tagManager'
import { DeepGramVoiceService } from '../../services/voice/voiceService'

export default {
  name: 'VoicePanel',
  components: {
    TagFeed
  },
  data() {
    return {
      phraseParser: null,
      tagManager: null,
      voiceService: null,
      tags: [],

      isRecording: false,
      isPaused: false,
      error: null,
      confidence: 0,
      isCollapsed: true // Изначально закрыт
    }
  },
  mounted() {
    this.initializeServices()
  },
  methods: {
    initializeServices() {
      try {
        // Initialize phrase parser with Russian language
        this.phraseParser = createPhraseParser({ language: 'ru-RU' })
        
        // Initialize tag manager
        this.tagManager = createTagManager({
          maxTags: 100,
          autoScroll: true,
          selectionMode: 'multiple'
        })

        // Initialize voice service
        this.voiceService = new DeepGramVoiceService({
          apiKey: import.meta.env.VITE_DEEPGRAM_API_KEY || localStorage.getItem('deepgram_api_key'),
          model: 'nova-3',
          language: 'ru-RU',
          streaming: true,
          interimResults: true
        })

        // Set up event handlers
        this.tagManager.onUpdate(this.handleTagUpdate)
        
        // Set up voice service callbacks
        this.voiceService.onTranscription(this.handleTranscription.bind(this))
        this.voiceService.onError(this.handleError.bind(this))
        this.voiceService.onStateChange(this.handleStateChange.bind(this))
        this.voiceService.onPhraseComplete(this.handlePhraseComplete.bind(this))
        
      } catch (error) {
        console.error('Failed to initialize voice services:', error)
      }
    },

    handleTranscription(event) {
      // Обрабатываем транскрипцию с новым API
      const { text, isFinal, confidence, timestamp } = event
      
      // Проверяем, что text существует и является строкой
      if (!text || typeof text !== 'string') {
        console.warn('handleTranscription: text is undefined or not a string:', text)
        return
      }
      
      // Передаем в phraseParser для сегментации
      const phrases = this.phraseParser.processTranscription(text, isFinal, confidence)
      
      if (phrases.length > 0) {
        // Добавляем новые фразы в tagManager
        const tagsToAdd = phrases.map(phrase => {
          // Проверяем, что phrase.text существует
          if (!phrase.text || typeof phrase.text !== 'string') {
            console.warn('handleTranscription: phrase.text is undefined or not a string:', phrase)
            return null
          }
          
          return {
            id: phrase.id,
            text: phrase.text,
            confidence: phrase.confidence || 0,
            timestamp: phrase.timestamp || Date.now(),
            isComplete: phrase.isComplete || false,
            isVisible: true,
            isSelected: false,
            isHovered: false
          }
        }).filter(Boolean) // Убираем null значения
        
        this.tagManager.addTags(tagsToAdd)
      }
    },

    handleError(error) {
      console.error('Voice recognition error:', error)
      this.error = error
      // Можно добавить уведомление пользователю об ошибке
    },

    handleStateChange(state) {
      // Обновляем состояние записи
      this.isRecording = state.status === 'recording'
      this.isPaused = state.status === 'paused'
      this.confidence = state.confidence || 0
    },

    handlePhraseComplete(event) {
      // Обрабатываем завершение фразы
      const { phrase, confidence } = event
      
      // Проверяем, что phrase существует и является строкой
      if (!phrase || typeof phrase !== 'string') {
        console.warn('handlePhraseComplete: phrase is undefined or not a string:', phrase)
        return
      }
      
      // Создаем завершенную фразу
      const completedPhrase = {
        id: `phrase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: phrase,
        confidence: confidence || 0,
        timestamp: Date.now(),
        isComplete: true,
        isVisible: true,
        isSelected: false,
        isHovered: false
      }
      
      // Добавляем в tagManager
      this.tagManager.addTags([completedPhrase])
    },

    handleTagUpdate(update) {
      // Update local tags array
      this.tags = this.tagManager.getTags()
    },



    handleTagClick(event) {
      const { tagId, action, text } = event
      
      if (action === 'add-to-input') {
        // Добавляем в чат
        this.$emit('tag-selected', { tagId, text, action })
      } else if (action === 'quick-add') {
        // Быстрое добавление
        this.$emit('add-selected-to-input', [{ id: tagId, text }])
      }
    },

    handleTagHover(event) {
      const { tagId, isHovered } = event
      this.tagManager.setTagHover(tagId, isHovered)
    },

    clearAll() {
      this.tagManager.clearTags()
    },



    startRecording() {
      if (!this.voiceService) {
        console.error('startRecording: voiceService is null')
        return
      }
      
      try {
        this.error = null
        this.voiceService.start()
        this.isRecording = true
        this.isPaused = false
      } catch (error) {
        console.error('Failed to start recording:', error)
        this.handleError({
          type: 'unknown',
          message: 'Не удалось запустить запись',
          details: error
        })
      }
    },

    stopRecording() {
      if (!this.voiceService) return
      
      this.voiceService.stop()
      this.isRecording = false
      this.isPaused = false
    },

    restartRecording() {
      if (!this.voiceService) return
      
      try {
        // Очищаем все теги
        this.tagManager.clearTags()
        
        // Сбрасываем ошибки
        this.error = null
        
        // Запускаем новую запись
        this.voiceService.start()
        this.isRecording = true
        this.isPaused = false
      } catch (error) {
        console.error('Failed to restart recording:', error)
        this.handleError({
          type: 'unknown',
          message: 'Не удалось перезапустить запись',
          details: error
        })
      }
    },

    getConfidenceColor() {
      if (this.confidence >= 0.8) {
        return 'text-green-600'
      } else if (this.confidence >= 0.5) {
        return 'text-yellow-600'
      } else {
        return 'text-red-600'
      }
    },

    getConfidenceText() {
      if (this.confidence >= 0.8) {
        return 'Хороший'
      } else if (this.confidence >= 0.5) {
        return 'Средний'
      } else {
        return 'Плохой'
      }
    },

    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed
    }
  },

  beforeDestroy() {
    if (this.tagManager) {
      this.tagManager.cleanup()
    }
    if (this.voiceService) {
      this.voiceService.cleanup()
    }
  }
}
</script>

<style scoped>
.voice-panel {
  padding: 1.5rem;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.panel-header {
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1.5rem;
}

.recording-controls-row {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}



/* Responsive adjustments */
@media (max-width: 1024px) {
  .voice-panel {
    padding: 1rem;
  }
  
  .panel-header {
    padding-bottom: 1rem;
  }
}

@media (max-width: 640px) {
  .voice-panel {
    padding: 0.75rem;
  }
  

}
</style>
