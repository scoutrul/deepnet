<template>
  <div class="voice-recorder">
    <!-- Убираем кнопки управления - они будут в другом месте -->



    <!-- Отображение ошибок -->
    <div v-if="error" class="error-display mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div>
          <div class="text-sm font-medium text-red-800">{{ error.message }}</div>
          <div v-if="error.code" class="text-xs text-red-600 mt-1">Код: {{ error.code }}</div>
        </div>
      </div>
    </div>

    <!-- Предупреждение о поддержке браузера -->
    <div v-if="!voiceService && !error" class="browser-warning mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
        <div class="text-sm text-yellow-800">
          Ваш браузер не поддерживает распознавание речи. Используйте Chrome, Edge или Safari.
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { createVoiceService } from '../../services/voiceService'

export default {
  name: 'VoiceRecorder',
  data() {
    return {
      voiceService: null,
      isRecording: false,
      isPaused: false,
      currentState: 'idle',
      error: null,
      confidence: 0
    }
  },
  mounted() {
    this.initializeVoiceService()
  },
  beforeDestroy() {
    if (this.voiceService) {
      this.voiceService.cleanup()
    }
  },
  methods: {
    initializeVoiceService() {
      try {
        this.voiceService = createVoiceService()
        
        // Подписываемся на события
        this.voiceService.onTranscription(this.handleTranscription.bind(this))
        this.voiceService.onError(this.handleError.bind(this))
        this.voiceService.onStateChange(this.handleStateChange.bind(this))
        this.voiceService.onPhraseComplete(this.handlePhraseComplete.bind(this))
        
      } catch (error) {
        console.error('Failed to initialize voice service:', error)
        
        this.error = {
          type: 'browser',
          message: `Голосовое распознавание не поддерживается в этом браузере: ${error.message}`,
          details: error
        }
      }
    },

    async startRecording() {
      if (!this.voiceService) return
      
      try {
        this.error = null
        await this.voiceService.start()
        this.isRecording = true
        this.isPaused = false
      } catch (error) {
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

    pauseRecording() {
      if (!this.voiceService || !this.isRecording) return
      
      this.voiceService.pause()
      this.isPaused = true
    },

    resumeRecording() {
      if (!this.voiceService || !this.isPaused) return
      
      this.voiceService.resume()
      this.isPaused = false
    },

    handleTranscription(text, isFinal, confidence) {
      // Обновляем confidence для отображения
      if (confidence > 0) {
        this.confidence = confidence
      }
      
      // Эмитим событие с confidence
      this.$emit('transcription', {
        text,
        isFinal,
        confidence,
        timestamp: Date.now()
      })
    },

    handleError(error) {
      this.error = error
      this.isRecording = false
      this.isPaused = false
      
      // Эмитим событие ошибки
      this.$emit('error', error)
    },

    handleStateChange(state) {
      this.currentState = state.status
      this.confidence = state.confidence
      this.phraseCount = state.phraseCount
      this.totalDuration = state.totalDuration
      
      // Эмитим событие изменения состояния
      this.$emit('state-change', state)
    },

    handlePhraseComplete(phrase, confidence) {
      // Увеличиваем счетчик фраз
      this.phraseCount++
      
      // Эмитим событие завершения фразы
      this.$emit('phrase-complete', {
        phrase,
        confidence,
        timestamp: Date.now()
      })
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
    }
  }
}
</script>

<style scoped>
.voice-recorder {
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background-color: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.recording-controls {
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-button, .stop-button, .pause-button, .resume-button {
  min-width: 160px;
  transition: all 0.2s ease-in-out;
}

.record-button:hover:not(:disabled),
.stop-button:hover,
.pause-button:hover,
.resume-button:hover {
  transform: translateY(-2px);
}

.record-button:active:not(:disabled),
.stop-button:active,
.pause-button:active,
.resume-button:active {
  transform: translateY(0);
}

.status-indicators {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.confidence-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem; /* text-sm */
  font-weight: 600; /* font-medium */
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .voice-recorder {
    padding: 1rem;
  }
  
  .record-button, .stop-button, .pause-button, .resume-button {
    min-width: 140px;
  }
  
  .record-button span, .stop-button span, .pause-button span, .resume-button span {
    font-size: 1rem;
  }
  
  .status-indicators {
    grid-template-columns: 1fr;
  }
}
</style>
