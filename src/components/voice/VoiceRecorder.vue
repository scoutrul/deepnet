<template>
  <div class="voice-recorder">
    <!-- Статус и управление -->
    <div class="voice-controls mb-4">
      <!-- Статус -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 rounded-full" :class="statusClass"></div>
            <span class="text-sm font-medium">{{ statusText }}</span>
          </div>
          <div v-if="isDeepGramMode" class="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
            DeepGram
          </div>
          <div v-else class="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
            Web Speech API
          </div>
        </div>
        
        <!-- Кнопки управления -->
        <div class="flex items-center space-x-2">
          <button
            v-if="!isRecording"
            @click="startRecording"
            :disabled="!voiceService || error"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd"/>
            </svg>
            <span>Начать запись</span>
          </button>
          
          <button
            v-else
            @click="stopRecording"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <span>Остановить</span>
          </button>
        </div>
      </div>
      
      <!-- Индикатор записи -->
      <div v-if="isRecording" class="flex items-center space-x-2 text-red-600">
        <div class="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
        <span class="text-sm">Запись в процессе...</span>
        <span v-if="confidence > 0" class="text-xs text-gray-500">
          Уверенность: {{ Math.round(confidence * 100) }}%
        </span>
      </div>
    </div>

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
import { DeepGramVoiceService } from '../../services/voice/voiceService'
import { contextManager, dialogProcessor } from '../../services/context'
import { appConfig } from '../../config/appConfig'

export default {
  name: 'VoiceRecorder',
  data() {
    return {
      voiceService: null,
      isRecording: false,
      isPaused: false,
      currentState: 'idle',
      error: null,
      confidence: 0,
      mediaRecorder: null,
      audioStream: null,
      isDeepGramMode: false
    }
  },
  computed: {
    statusClass() {
      if (this.error) return 'bg-red-500'
      if (this.isRecording) return 'bg-red-500 animate-pulse'
      if (this.voiceService) return 'bg-green-500'
      return 'bg-yellow-500'
    },
    statusText() {
      if (this.error) return 'Ошибка'
      if (this.isRecording) return 'Запись...'
      if (this.voiceService) return 'Готов к записи'
      return 'Инициализация...'
    }
  },
  mounted() {
    this.initializeVoiceService()
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    async initializeVoiceService() {
      try {
        console.log('🎤 [VOICE] Initializing voice service...')
        
        // Проверяем доступность DeepGram
        const deepgramConfig = this.getDeepGramConfig()
        console.log('🎤 [VOICE] DeepGram config:', deepgramConfig)
        
        if (deepgramConfig && deepgramConfig.apiKey) {
          this.isDeepGramMode = true
          console.log('🎤 [VOICE] Using DeepGram mode with API key:', deepgramConfig.apiKey.substring(0, 10) + '...')
          
          this.voiceService = new DeepGramVoiceService(deepgramConfig)
          console.log('🎤 [VOICE] DeepGram voice service created:', this.voiceService)
        } else {
          console.log('🎤 [VOICE] DeepGram API key not found, voice service will not be available')
          return
        }
        
        // Подписываемся на события
        this.voiceService.onTranscription(this.handleTranscription.bind(this))
        this.voiceService.onError(this.handleError.bind(this))
        this.voiceService.onStateChange(this.handleStateChange.bind(this))
        this.voiceService.onPhraseComplete(this.handlePhraseComplete.bind(this))
        
        // Если используем DeepGram, инициализируем аудио поток
        if (this.isDeepGramMode) {
          console.log('🎤 [VOICE] Initializing DeepGram audio stream...')
          await this.initializeAudioStream()
        }
        
        console.log('🎤 [VOICE] Voice service initialized successfully')
        
      } catch (error) {
        console.error('🎤 [VOICE] Failed to initialize voice service:', error)
        
        this.error = {
          type: 'browser',
          message: `Голосовое распознавание не поддерживается в этом браузере: ${error.message}`,
          details: error
        }
      }
    },

    getDeepGramConfig() {
      // Получаем конфигурацию DeepGram из appConfig
      const config = appConfig.deepgram
      
      if (!config.apiKey) {
        console.warn('🎤 [VOICE] DeepGram API key not found')
        return null
      }
      
      return {
        apiKey: config.apiKey,
        model: config.model,
        language: config.language,
        streaming: config.streaming,
        interimResults: config.interimResults,
        punctuate: config.punctuate,
        profanity_filter: config.profanity_filter,
        diarize: config.diarize,
        multichannel: config.multichannel,
        alternatives: config.alternatives,
        numerals: config.numerals,
        smart_format: config.smart_format,
        filler_words: config.filler_words
      }
    },

    async initializeAudioStream() {
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          }
        })
        
        this.mediaRecorder = new MediaRecorder(this.audioStream, {
          mimeType: 'audio/webm;codecs=opus'
        })
        
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.voiceService && this.voiceService.sendAudioData) {
            this.voiceService.sendAudioData(event.data)
          }
        }
        
        console.log('🎤 [VOICE] Audio stream initialized for DeepGram')
      } catch (error) {
        console.error('🎤 [VOICE] Failed to initialize audio stream:', error)
        this.handleError({
          type: 'permission',
          message: 'Не удалось получить доступ к микрофону',
          details: error
        })
      }
    },

    async startRecording() {
      if (!this.voiceService) return
      
      try {
        this.error = null
        await this.voiceService.start()
        
        // Если используем DeepGram, запускаем MediaRecorder
        if (this.isDeepGramMode && this.mediaRecorder) {
          this.mediaRecorder.start(100) // Отправляем данные каждые 100мс
        }
        
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
      
      // Если используем DeepGram, останавливаем MediaRecorder
      if (this.isDeepGramMode && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop()
      }
      
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

    handleTranscription(data) {
      console.log('🎤 [VOICE] Transcription received:', data)
      
      // Обновляем confidence для отображения
      if (data.confidence > 0) {
        this.confidence = data.confidence
      }
      
      // Добавляем запись в диалог
      if (data.text && data.text.trim()) {
        const dialogEntry = dialogProcessor.addDialogEntry({
          text: data.text,
          speaker: 'A', // Пользователь всегда сторона A
          confidence: data.confidence,
          isFinal: data.isFinal
        })
        // Добавляем в contextManager для передачи в контекст
        contextManager.addDialogEntry(dialogEntry)
      }
      
      // Эмитим событие с confidence
      this.$emit('transcription', data)
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
      this.confidence = state.confidence || 0
      this.phraseCount = state.phraseCount || 0
      this.totalDuration = state.totalDuration || 0
      
      // Обновляем состояние записи
      if (state.status === 'recording') {
        this.isRecording = true
      } else if (state.status === 'stopped' || state.status === 'idle') {
        this.isRecording = false
      }
      
      console.log('🎤 [VOICE] State changed:', state)
      
      // Эмитим событие изменения состояния
      this.$emit('state-change', state)
    },

    handlePhraseComplete(data) {
      console.log('🎤 [VOICE] Phrase complete:', data)
      
      // Если фраза завершена, добавляем в диалог
      if (data.phrase && data.phrase.trim()) {
        const dialogEntry = dialogProcessor.addDialogEntry({
          text: data.phrase,
          speaker: 'A',
          confidence: data.confidence,
          isFinal: true
        })
        // Добавляем в contextManager для передачи в контекст
        contextManager.addDialogEntry(dialogEntry)
      }
      
      // Эмитим событие завершения фразы
      this.$emit('phrase-complete', data)
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

    // Методы управления записью
    async startRecording() {
      if (!this.voiceService) {
        console.error('🎤 [VOICE] Voice service not initialized')
        return
      }
      
      try {
        console.log('🎤 [VOICE] Starting recording...')
        this.isRecording = true
        this.error = null
        
        // Запускаем запись через voice service
        await this.voiceService.start()
        
        console.log('🎤 [VOICE] Recording started successfully')
      } catch (error) {
        console.error('🎤 [VOICE] Failed to start recording:', error)
        this.error = {
          type: 'recording',
          message: `Не удалось начать запись: ${error.message}`,
          details: error
        }
        this.isRecording = false
      }
    },

    async stopRecording() {
      if (!this.voiceService) {
        console.error('🎤 [VOICE] Voice service not initialized')
        return
      }
      
      try {
        console.log('🎤 [VOICE] Stopping recording...')
        this.isRecording = false
        
        // Останавливаем запись через voice service
        await this.voiceService.stop()
        
        console.log('🎤 [VOICE] Recording stopped successfully')
      } catch (error) {
        console.error('🎤 [VOICE] Failed to stop recording:', error)
        this.error = {
          type: 'recording',
          message: `Не удалось остановить запись: ${error.message}`,
          details: error
        }
      }
    },

    cleanup() {
      console.log('🎤 [VOICE] Cleaning up voice recorder...')
      
      if (this.voiceService) {
        this.voiceService.cleanup()
      }
      
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop()
      }
      
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop())
      }
      
      console.log('🎤 [VOICE] Voice recorder cleaned up')
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
