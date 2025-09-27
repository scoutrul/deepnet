<template>
  <div class="live-dictation bg-white rounded-xl border border-slate-200 shadow-sm">
    <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Живая диктовка</h2>
      <div class="flex items-center gap-3">
        <button
          @click="clearChat"
          :disabled="!completedChunks.length && !currentPartial"
          class="px-2 py-1 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1 text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Очистить текст"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          <span class="hidden sm:inline">Очистить</span>
        </button>
        <button
          @click="toggleDictation"
          :class="[
            'px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2',
            isRecording
              ? 'text-white bg-red-500 hover:bg-red-600 shadow'
              : (isInitializing)
                ? 'text-gray-500 bg-gray-100 cursor-not-allowed'
                : 'text-green-600 bg-green-50 hover:bg-green-100 border border-green-200'
          ]"
          :disabled="isInitializing"
        >
          <span :class="['w-2.5 h-2.5 rounded-full', isRecording ? 'bg-white animate-pulse' : isInitializing ? 'bg-gray-400 animate-spin' : 'bg-green-500']"></span>
          <span v-if="isInitializing">Инициализация…</span>
          <span v-else-if="isRecording">Остановить</span>
          <span v-else>Начать</span>
        </button>
      </div>
    </div>
    <div class="px-6 py-6">
      <div :class="['overflow-y-auto rounded-lg border border-slate-200 bg-white', panelHeight]" ref="scrollArea">
        <div class="prose prose-sm max-w-none p-4 whitespace-pre-wrap">
          <p class="leading-7 text-slate-800">
            <span v-for="(chunk, idx) in completedChunks" :key="'c'+idx">
              <br v-if="chunk === '\n'" />
              <span v-else class="mr-1 text-slate-800">{{ chunk }}</span>
            </span>
            <span v-if="currentPartial" class="text-slate-500">
              {{ currentPartial }}
              <span class="ml-1 inline-block w-2 h-5 align-baseline bg-slate-400 animate-pulse"></span>
            </span>
            <span v-else-if="!completedChunks.length" class="text-slate-400">Говорите — текст появится здесь…</span>
          </p>
        </div>
      </div>
      <div class="mt-3 text-xs text-slate-500 flex items-center gap-3">
        <span :class="['w-2 h-2 rounded-full', isRecording ? 'bg-green-500' : 'bg-slate-300']"></span>
        <span>
          {{ isRecording ? 'Диктовка активна' : 'Диктовка неактивна' }}
          <span v-if="!hasDeepGramKey" class="ml-2 text-amber-600">(DeepGram не настроен)</span>
        </span>
      </div>
      <div v-if="errorMessage" class="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import { uiBusinessAdapter } from '../../adapters'
import { websocketTranscriptionService } from '../../services/voice/websocketTranscriptionService'

export default {
  name: 'LiveDictation',
  props: {
    adapter: {
      type: Object,
      default: () => uiBusinessAdapter
    },
    panelHeight: {
      type: String,
      default: 'h-64'
    }
  },
  data() {
    return {
      isRecording: false,
      isInitializing: false,
      errorMessage: '',
      
      // WebSocket распознавание
      mediaStream: null,
      websocketUnsubscribe: null,
      transcriptionChunks: [],
      currentPartial: '', // Промежуточные результаты
      
      // Результаты для отображения
      completedChunks: []
    }
  },
  computed: {
    hasDeepGramKey() {
      try {
        const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY || localStorage.getItem('deepgram_api_key')
        return apiKey && apiKey.length >= 10
      } catch (e) {
        return false
      }
    },
    finalChunks() {
      return this.transcriptionChunks.filter(chunk => chunk.isFinal)
    }
  },
  watch: {
    completedChunks() {
      this.$nextTick(() => this.scrollToBottom())
    }
  },
  beforeDestroy() {
    // Остановка при размонтировании если активна
    if (this.isRecording) {
      this.stopDictation()
    }
  },
  methods: {
    async toggleDictation() {
      if (this.isRecording) {
        await this.stopDictation()
      } else {
        await this.startDictation()
      }
    },
    
    clearChat() {
      // Очищаем все данные
      this.completedChunks = []
      this.transcriptionChunks = []
      this.currentPartial = ''
    },
    
    async startDictation() {
      try {
        this.errorMessage = ''
        this.isInitializing = true

        await this.startWebSocketTranscription()
        this.isRecording = true
        this.$nextTick(() => this.scrollToBottom())
        
      } catch (e) {
        this.errorMessage = 'Не удалось начать диктовку: ' + (e?.message || e)
      } finally {
        this.isInitializing = false
      }
    },
    
    async stopDictation() {
      try {
        this.errorMessage = ''
        await this.stopWebSocketTranscription()
        this.isRecording = false
      } catch (e) {
        this.errorMessage = 'Ошибка при остановке диктовки: ' + (e?.message || e)
      }
    },
    
    async startWebSocketTranscription() {
      try {
        // Получаем аудиопоток напрямую
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000
          } 
        })
        
        if (!this.mediaStream) {
          throw new Error('Не удалось получить аудиопоток')
        }
        
        // Подписываемся на события распознавания
        this.websocketUnsubscribe = websocketTranscriptionService.onTranscription((chunk) => {
          // Преобразуем WebSocket чанк в формат TranscriptionChunk
          const transcriptionChunk = {
            id: chunk.id,
            text: chunk.text,
            confidence: chunk.confidence,
            timestamp: chunk.timestamp,
            duration: 0,
            type: 'websocket',
            isReplaced: false,
            isFinal: chunk.isFinal
          }
          
          // Добавляем только финальные чанки или обновляем последний
          if (chunk.isFinal) {
            this.transcriptionChunks.push(transcriptionChunk)
            this.rebuildWebSocketTranscript()
            this.$nextTick(() => this.scrollToBottom())
          } else {
            // Для промежуточных результатов обновляем currentPartial
            this.currentPartial = chunk.text
          }
        })
        
        // Запускаем WebSocket сервис
        await websocketTranscriptionService.start(this.mediaStream)
        
      } catch (error) {
        console.error('❌ LiveDictation: Ошибка запуска WebSocket распознавания:', error)
        
        // Более понятные сообщения об ошибках
        if (error.name === 'NotAllowedError') {
          throw new Error('Доступ к микрофону запрещен. Разрешите использование микрофона в настройках браузера.')
        } else if (error.name === 'NotFoundError') {
          throw new Error('Микрофон не найден. Подключите микрофон и попробуйте снова.')
        } else if (error.name === 'NotReadableError') {
          throw new Error('Микрофон занят другим приложением.')
        } else if (error.message?.includes('Deepgram')) {
          throw new Error(`Ошибка Deepgram: ${error.message}
          
Для настройки API ключа:
1. Создайте файл .env в корне проекта
2. Добавьте: VITE_DEEPGRAM_API_KEY=ваш-ключ-здесь
3. Или сохраните ключ в localStorage: deepgram_api_key`)
        } else {
          throw error
        }
      }
    },
    
    async stopWebSocketTranscription() {
      if (this.websocketUnsubscribe) {
        this.websocketUnsubscribe()
        this.websocketUnsubscribe = null
      }
      
      await websocketTranscriptionService.stop()
      
      // Останавливаем медиапоток
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop())
        this.mediaStream = null
      }
      
      // Очищаем currentPartial
      this.currentPartial = ''
    },
    
    rebuildWebSocketTranscript() {
      // Строим итоговый текст из финальных чанков
      this.completedChunks = []
      
      const finalChunks = this.transcriptionChunks
        .filter(chunk => chunk.isFinal)
        .sort((a, b) => a.timestamp - b.timestamp)
      
      for (const chunk of finalChunks) {
        if (chunk.text.trim()) {
          this.completedChunks.push(chunk.text.trim())
          
          // Добавляем параграфы между чанками
          this.completedChunks.push('\n')
          this.completedChunks.push('\n') // Двойной перенос = параграф
        }
      }
    },

    scrollToBottom() {
      try {
        const el = this.$refs.scrollArea
        if (el && el.scrollHeight !== undefined) {
          el.scrollTop = el.scrollHeight
        }
      } catch (e) {
        // Игнорируем ошибки скроллинга
      }
    }
  }
}
</script>
