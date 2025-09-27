<template>
  <div class="live-dictation bg-white rounded-xl border border-slate-200 shadow-sm">
    <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Живая диктовка</h2>
      <div class="flex items-center gap-3">
        <div class="text-xs text-slate-500 hidden sm:block">Реальное время • DeepGram</div>
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
          <span v-if="useDualMode && useWebSocket" class="ml-2">
            • Режим: 🌐 WebSocket (реальное время)
            <span v-if="transcriptionChunks.length" class="ml-1">
              • Чанков: {{ transcriptionChunks.length }}
            </span>
            <span class="ml-1 text-green-600 font-medium">✓ АКТИВЕН</span>
          </span>
          <span v-else-if="useDualMode" class="ml-2">
            • Режим: 🎭 Двухуровневый (⚡300мс + 🎯30с)
            <span v-if="transcriptionChunks.length" class="ml-1">
              • Чанков: {{ quickChunks.length }}⚡ + {{ qualityChunks.length }}🎯
            </span>
          </span>
          <span v-else-if="useVAD && vadState" class="ml-2">
            • VAD: {{ vadState.isSpeaking ? '🎤 речь' : '🔇 тишина' }} 
            ({{ Math.round(vadState.currentVolume * 1000) }})
            <span v-if="vadState.hadSufficientPause && !vadState.isSpeaking" class="text-blue-600">✓ пауза</span>
            <span v-if="vadState.shouldFlushBatch" class="text-orange-600 font-medium">⚡ отправка</span>
          </span>
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
import { voiceActivityDetector } from '../../services/voice/voiceActivityDetector'
import { dualTranscriptionService } from '../../services/voice/dualTranscriptionService'
import { websocketTranscriptionService } from '../../services/voice/websocketTranscriptionService'
import { appConfig } from '../../config/appConfig'

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
      completedSentences: [],
      currentPartial: '',
      lastSnapshotKey: '',
      isRecording: false,
      isInitializing: false,
      errorMessage: '',
      lastCommittedText: '',
      // Поток кусочков для рендера
      completedChunks: [],
      // Настройки batch
      batchMode: true,
      batchMs: 10000,
      mediaStream: null,
      mediaRecorder: null,
      batchChunks: [],
      batchTimer: null,
      // VAD состояние
      vadUnsubscribe: null,
      vadState: null,
      useVAD: appConfig.voice.vad?.enabled || false,
      // Адаптивное окно для стриминга
      windowDurations: [1000, 3000, 5000, 10000],
      windowIndex: 0,
      windowStartTs: 0,
      pendingBuffer: '',
      // Двухуровневое распознавание
      useDualMode: true,
      dualUnsubscribe: null,
      transcriptionChunks: [],
      
      // Режимы подключения
      useWebSocket: true, // true = WebSocket, false = HTTP POST
      currentPartial: '', // Промежуточные результаты для WebSocket
    }
  },
  computed: {
    diarizedMessages() {
      try {
        return this.adapter.getChatStore().getters.diarizedMessages() || []
      } catch (e) {
        return []
      }
    },
    hasDeepGramKey() {
      try {
        const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY || localStorage.getItem('deepgram_api_key')
        return apiKey && apiKey.length >= 10
      } catch (e) {
        return false
      }
    },
    quickChunks() {
      return this.transcriptionChunks.filter(chunk => chunk.type === 'quick' && !chunk.isReplaced)
    },
    qualityChunks() {
      return this.transcriptionChunks.filter(chunk => chunk.type === 'quality')
    }
  },
  watch: {
    completedChunks() {
      this.$nextTick(() => this.scrollToBottom())
    },
    diarizedMessages: {
      handler() {
        if (!this.batchMode) this.rebuildTranscriptIncremental()
      },
      deep: true,
      immediate: true
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
    async startDictation() {
      try {
        this.errorMessage = ''
        this.isInitializing = true

        if (this.useDualMode && this.useWebSocket) {
          await this.startWebSocketTranscription()
          this.isRecording = true
          this.$nextTick(() => this.scrollToBottom())
          return
        } else if (this.useDualMode) {
          await this.startDualTranscription()
          this.isRecording = true
          this.$nextTick(() => this.scrollToBottom())
          return
        } else if (this.batchMode) {
          await this.startBatchRecording()
          this.isRecording = true
          this.$nextTick(() => this.scrollToBottom())
          return
        }

        // Streaming путь
        try {
          const stateGetter = this.adapter.getChatStore()?.getters?.diarizationState
          const state = typeof stateGetter === 'function' ? stateGetter() : null
          if (state?.isPaused && this.adapter?.resumeDiarization) {
            await this.adapter.resumeDiarization()
          } else if (this.adapter?.startDiarization) {
            await this.adapter.startDiarization()
          }
        } catch (e) {}
        await this.waitForDiarizationReady(2000)
        await this.adapter.executeAction('audioMixer.start')
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
        if (this.useDualMode && this.useWebSocket) {
          await this.stopWebSocketTranscription()
          this.isRecording = false
          return
        } else if (this.useDualMode) {
          await this.stopDualTranscription()
          this.isRecording = false
          return
        } else if (this.batchMode) {
          await this.stopBatchRecording()
          this.isRecording = false
          return
        }
        await this.adapter.executeAction('audioMixer.stop')
        try { if (this.adapter?.pauseDiarization) await this.adapter.pauseDiarization() } catch(e) {}
        this.isRecording = false
      } catch (e) {
        this.errorMessage = 'Ошибка при остановке диктовки: ' + (e?.message || e)
      }
    },
    
    // WebSocket распознавание
    async startWebSocketTranscription() {
      console.log('🌐 [LiveDictation] Запуск WebSocket распознавания')
      
      try {
        // Получаем аудиопоток напрямую
        console.log('🌐 [LiveDictation] Запрос доступа к микрофону...')
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
        
        console.log('✅ [LiveDictation] Аудиопоток получен для WebSocket, треков:', this.mediaStream.getAudioTracks().length)
        
        // Подписываемся на события распознавания
        this.dualUnsubscribe = websocketTranscriptionService.onTranscription((chunk) => {
          console.log(`🌐 [LiveDictation] Получен WebSocket чанк:`, chunk.text, `(final: ${chunk.isFinal}, confidence: ${chunk.confidence.toFixed(2)})`)
          
          // Преобразуем WebSocket чанк в формат TranscriptionChunk
          const transcriptionChunk = {
            id: chunk.id,
            text: chunk.text,
            confidence: chunk.confidence,
            timestamp: chunk.timestamp,
            duration: 0, // WebSocket не предоставляет длительность
            type: 'quick', // WebSocket чанки считаем быстрыми
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
        console.log('🌐 [LiveDictation] Запуск WebSocket сервиса с медиапотоком...')
        await websocketTranscriptionService.start(this.mediaStream)
        
        console.log('✅ [LiveDictation] WebSocket распознавание запущено')
      } catch (error) {
        console.error('❌ [LiveDictation] Ошибка запуска WebSocket распознавания:', error)
        
        // Более понятные сообщения об ошибках
        if (error.name === 'NotAllowedError') {
          throw new Error('Доступ к микрофону запрещен. Разрешите использование микрофона в настройках браузера.')
        } else if (error.name === 'NotFoundError') {
          throw new Error('Микрофон не найден. Подключите микрофон и попробуйте снова.')
        } else if (error.name === 'NotReadableError') {
          throw new Error('Микрофон занят другим приложением.')
        } else if (error.message?.includes('Deepgram')) {
          // Специальная обработка ошибок Deepgram
          throw new Error(`Ошибка Deepgram: ${error.message}
          
Для настройки API ключа:
1. Создайте файл .env в корне проекта
2. Добавьте: VITE_DEEPGRAM_API_KEY=sk-ваш-ключ-здесь
3. Или сохраните ключ в localStorage: deepgram_api_key`)
        } else {
          throw error
        }
      }
    },
    
    async stopWebSocketTranscription() {
      console.log('🌐 [LiveDictation] Остановка WebSocket распознавания')
      
      if (this.dualUnsubscribe) {
        this.dualUnsubscribe()
        this.dualUnsubscribe = null
      }
      
      await websocketTranscriptionService.stop()
      
      // Останавливаем медиапоток
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop())
        this.mediaStream = null
      }
      
      // Очищаем currentPartial
      this.currentPartial = ''
      
      console.log('✅ [LiveDictation] WebSocket распознавание остановлено')
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
      
      console.log(`🌐 [LiveDictation] Обновлен WebSocket транскрипт: ${finalChunks.length} чанков, ${this.completedChunks.length} элементов`)
    },
    
    // Двухуровневое распознавание
    async startDualTranscription() {
      console.log('🎭 [LiveDictation] Запуск двухуровневого распознавания')
      
      try {
        // Получаем аудиопоток напрямую (как в batch режиме)
        console.log('🎭 [LiveDictation] Запрос доступа к микрофону...')
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
        
        console.log('✅ [LiveDictation] Аудиопоток получен, треков:', this.mediaStream.getAudioTracks().length)
        
        // Подписываемся на события распознавания
        this.dualUnsubscribe = dualTranscriptionService.onTranscription((chunk) => {
          console.log(`🎭 [LiveDictation] Получен ${chunk.type} чанк:`, chunk.text, `(${chunk.confidence.toFixed(2)})`)
          
          this.transcriptionChunks.push(chunk)
          this.rebuildDualTranscript()
          this.$nextTick(() => this.scrollToBottom())
        })
        
        // Запускаем сервис
        await dualTranscriptionService.start(this.mediaStream)
        
        console.log('✅ [LiveDictation] Двухуровневое распознавание запущено')
      } catch (error) {
        console.error('❌ [LiveDictation] Ошибка запуска двухуровневого распознавания:', error)
        
        // Более понятные сообщения об ошибках
        if (error.name === 'NotAllowedError') {
          throw new Error('Доступ к микрофону запрещен. Разрешите использование микрофона в настройках браузера.')
        } else if (error.name === 'NotFoundError') {
          throw new Error('Микрофон не найден. Подключите микрофон и попробуйте снова.')
        } else if (error.name === 'NotReadableError') {
          throw new Error('Микрофон занят другим приложением.')
        } else {
          throw error
        }
      }
    },
    
    async stopDualTranscription() {
      console.log('🎭 [LiveDictation] Остановка двухуровневого распознавания')
      
      if (this.dualUnsubscribe) {
        this.dualUnsubscribe()
        this.dualUnsubscribe = null
      }
      
      await dualTranscriptionService.stop()
      
      // Останавливаем медиапоток
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop())
        this.mediaStream = null
      }
      
      console.log('✅ [LiveDictation] Двухуровневое распознавание остановлено')
    },
    
    rebuildDualTranscript() {
      // Строим итоговый текст из активных чанков
      this.completedChunks = []
      
      // Группируем чанки по времени и выбираем лучшие
      const activeChunks = this.transcriptionChunks
        .filter(chunk => !chunk.isReplaced)
        .sort((a, b) => a.timestamp - b.timestamp)
      
      for (const chunk of activeChunks) {
        if (chunk.text.trim()) {
          this.completedChunks.push(chunk.text.trim())
          
          // Добавляем параграфы между всеми чанками для лучшей читаемости
          this.completedChunks.push('\n')
          this.completedChunks.push('\n') // Двойной перенос = параграф
        }
      }
      
      console.log(`🎭 [LiveDictation] Обновлен транскрипт: ${activeChunks.length} чанков, ${this.completedChunks.length} элементов`)
    },

    async startBatchRecording() {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const supported = [ 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mp4;codecs=opus' ]
      let mimeType = 'audio/webm;codecs=opus'
      for (const t of supported) { if (MediaRecorder.isTypeSupported(t)) { mimeType = t; break } }
      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType })
      this.batchChunks = []
      
      // Настройка VAD если включен
      if (this.useVAD) {
        try {
          const vadConfig = appConfig.voice.vad || {}
          voiceActivityDetector.updateConfig(vadConfig)
          await voiceActivityDetector.connect(this.mediaStream)
          
          this.vadUnsubscribe = voiceActivityDetector.onStateChange((state) => {
            this.vadState = state
            // Отправляем батч когда VAD определяет готовность
            if (state.shouldFlushBatch && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
              console.log('🎤 [VAD] Отправляем батч по сигналу VAD')
              this.mediaRecorder.stop()
            }
          })
          
          console.log('🎤 [LiveDictation] VAD подключен для умной отправки батчей')
        } catch (e) {
          console.warn('🎤 [LiveDictation] Не удалось подключить VAD, используем таймер:', e)
          this.useVAD = false
        }
      }
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.batchChunks.push(e.data)
      }
      
      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.batchChunks, { type: mimeType })
          console.log(`🎤 [LiveDictation] Отправляем батч размером ${Math.round(blob.size/1024)}KB`)
          
          const { transcribeBlobWithDeepgram } = await import('../../services/voice/batchTranscriptionService')
          const result = await transcribeBlobWithDeepgram(blob)
          
          console.log(`🎤 [LiveDictation] Получен результат: "${result?.transcript}", confidence=${result?.confidence}`)
          
          if (result?.transcript) {
            // Добавляем все результаты без фильтрации по confidence
            this.completedChunks.push(result.transcript)
            this.completedChunks.push('\n')
            this.completedChunks.push('\n') // Двойной перенос = параграф
            this.$emit('use-in-chat', result.transcript)
            console.log(`✅ [LiveDictation] Добавлен текст: "${result.transcript}" (confidence: ${result.confidence})`)
            this.$nextTick(() => this.scrollToBottom())
          } else {
            console.log(`❌ [LiveDictation] Пустой результат распознавания`)
          }
        } catch (e) {
          console.error('🎤 [LiveDictation] Ошибка батч-распознавания:', e)
          this.errorMessage = 'Ошибка батч-распознавания: ' + (e?.message || e)
        } finally {
          this.batchChunks = []
          
          // Сбрасываем VAD состояние после отправки
          if (this.useVAD && voiceActivityDetector) {
            voiceActivityDetector.resetBatch()
          }
          
          if (this.isRecording) {
            this.mediaRecorder.start()
            
            // Устанавливаем таймер как fallback (максимальное время)
            if (this.batchTimer) clearTimeout(this.batchTimer)
            const maxTime = this.useVAD ? (appConfig.voice.vad?.maxBatchDuration || 15000) : this.batchMs
            this.batchTimer = setTimeout(() => {
              try { 
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                  console.log('🎤 [LiveDictation] Принудительная отправка батча по максимальному времени')
                  this.mediaRecorder.stop() 
                }
              } catch (e) {}
            }, maxTime)
          }
        }
      }
      
      this.mediaRecorder.start()
      console.log(`🎤 [LiveDictation] Начата запись батча, VAD: ${this.useVAD ? 'включен (пауза 300мс)' : 'выключен'}`)
      
      // Устанавливаем fallback таймер
      if (this.batchTimer) clearTimeout(this.batchTimer)
      const maxTime = this.useVAD ? (appConfig.voice.vad?.maxBatchDuration || 15000) : this.batchMs
      this.batchTimer = setTimeout(() => {
        try { 
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            console.log('🎤 [LiveDictation] Принудительная отправка батча по таймеру')
            this.mediaRecorder.stop() 
          }
        } catch (e) {}
      }, maxTime)
      
      this.isRecording = true
    },

    async stopBatchRecording() {
      try {
        // Отключаем VAD
        if (this.vadUnsubscribe) {
          this.vadUnsubscribe()
          this.vadUnsubscribe = null
        }
        if (this.useVAD) {
          voiceActivityDetector.disconnect()
        }
        
        if (this.batchTimer) {
          clearTimeout(this.batchTimer)
          this.batchTimer = null
        }
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop()
        }
      } catch (e) {}
      try {
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach(t => t.stop())
        }
      } catch (e) {}
      this.mediaRecorder = null
      this.mediaStream = null
      this.batchChunks = []
      this.vadState = null
    },

    async waitForDiarizationReady(timeoutMs) {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        try {
          const getter = this.adapter.getChatStore()?.getters?.diarizationState
          const st = typeof getter === 'function' ? getter() : null
          if (st?.isActive || st?.isConnecting) return
        } catch (e) {}
        await new Promise(r => setTimeout(r, 100))
      }
    },

    rebuildTranscriptIncremental() {
      if (!this.diarizedMessages || this.diarizedMessages.length === 0) {
        this.currentPartial = ''
        return
      }
      const last = this.diarizedMessages[this.diarizedMessages.length - 1]
      const text = (last && (last.text || last.content) || '').trim()
      if (!text) return

      // Инициализация окна
      if (!this.windowStartTs) {
        this.windowStartTs = Date.now()
        this.windowIndex = 0
        this.pendingBuffer = ''
      }

      // Добавляем любые новые символы в буфер
      const delta = this.diffNewText(this.lastCommittedText, text)
      if (delta) {
        this.pendingBuffer += (this.pendingBuffer && !this.pendingBuffer.endsWith(' ') ? ' ' : '') + delta
        this.lastCommittedText = text
      }

      const elapsed = Date.now() - this.windowStartTs
      const currentWindow = this.windowDurations[Math.min(this.windowIndex, this.windowDurations.length - 1)]

      // Критерии флаша: истекло окно или есть завершающая пунктуация
      const hasPunctuation = /[.!?]$/.test(text)
      if (this.pendingBuffer && (elapsed >= currentWindow || hasPunctuation)) {
        this.completedChunks.push(this.pendingBuffer.trim())
        this.completedChunks.push('\n')
        this.completedChunks.push('\n') // Двойной перенос = параграф
        this.$emit('use-in-chat', this.pendingBuffer.trim())
        this.pendingBuffer = ''
        this.windowStartTs = Date.now()
        if (this.windowIndex < this.windowDurations.length - 1) {
          this.windowIndex += 1
        }
        this.$nextTick(() => this.scrollToBottom())
      }

      // Серая строка не используем
      this.currentPartial = ''
    },

    diffNewText(prev, current) {
      if (!prev) return current
      if (current.startsWith(prev)) return current.slice(prev.length).trim()
      return current
    },

    scrollToBottom() {
      try {
        const el = this.$refs.scrollArea
        if (el && el.scrollHeight !== undefined) {
          el.scrollTop = el.scrollHeight
        }
      } catch (e) {}
    }
  }
}
</script>

<style scoped>
.prose p { margin: 0; }
</style>
