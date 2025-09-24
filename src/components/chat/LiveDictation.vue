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
              <span v-else class="mr-1">{{ chunk }}</span>
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
      // Адаптивное окно для стриминга
      windowDurations: [1000, 3000, 5000, 10000],
      windowIndex: 0,
      windowStartTs: 0,
      pendingBuffer: ''
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

        if (this.batchMode) {
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
        if (this.batchMode) {
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

    async startBatchRecording() {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const supported = [ 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mp4;codecs=opus' ]
      let mimeType = 'audio/webm;codecs=opus'
      for (const t of supported) { if (MediaRecorder.isTypeSupported(t)) { mimeType = t; break } }
      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType })
      this.batchChunks = []
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.batchChunks.push(e.data)
      }
      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.batchChunks, { type: mimeType })
          const { transcribeBlobWithDeepgram } = await import('../../services/voice/batchTranscriptionService')
          const result = await transcribeBlobWithDeepgram(blob)
          const threshold = Number((this.adapter?.getConfig && this.adapter.getConfig('voice.confidenceThreshold')) || 0.6)
          if (result?.transcript && (result.confidence || 0) >= threshold) {
            // Добавляем завершённый блок в поток и делаем авто-абзац
            this.completedChunks.push(result.transcript)
            this.completedChunks.push('\n')
            this.$emit('use-in-chat', result.transcript)
            this.$nextTick(() => this.scrollToBottom())
          }
        } catch (e) {
          this.errorMessage = 'Ошибка батч-распознавания: ' + (e?.message || e)
        } finally {
          this.batchChunks = []
          if (this.isRecording) {
            this.mediaRecorder.start()
            if (this.batchTimer) clearTimeout(this.batchTimer)
            this.batchTimer = setTimeout(() => {
              try { if (this.mediaRecorder && this.mediaRecorder.state === 'recording') this.mediaRecorder.stop() } catch (e) {}
            }, this.batchMs)
          }
        }
      }
      this.mediaRecorder.start()
      if (this.batchTimer) clearTimeout(this.batchTimer)
      this.batchTimer = setTimeout(() => {
        try { if (this.mediaRecorder && this.mediaRecorder.state === 'recording') this.mediaRecorder.stop() } catch (e) {}
      }, this.batchMs)
      this.isRecording = true
    },

    async stopBatchRecording() {
      try {
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
