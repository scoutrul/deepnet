<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <div class="mx-auto max-w-7xl px-4 py-4">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">DeepNet Context System</h1>
        <p class="text-gray-600">Система распознавания голоса с контекстными подсказками</p>
      </div>


      <!-- Main Content - Single Column -->
      <div class="space-y-6">
          <!-- Chat Messages -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-800">Диалог</h2>
              <div class="flex items-center gap-3">
                <!-- Кнопка записи -->
                <button
                  @click="toggleRecording"
                  :class="[
                    'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2',
                    isRecording 
                      ? 'text-white bg-red-500 hover:bg-red-600 shadow-lg' 
                      : 'text-green-600 bg-green-50 hover:bg-green-100 border border-green-200'
                  ]"
                  :disabled="isDiarizationConnecting"
                >
                  <div 
                    :class="[
                      'w-3 h-3 rounded-full',
                      isRecording ? 'bg-white animate-pulse' : 'bg-green-500'
                    ]"
                  ></div>
                  <span v-if="isDiarizationConnecting">Подключение...</span>
                  <span v-else-if="isRecording">Остановить запись</span>
                  <span v-else>Начать запись</span>
                </button>
                
                <!-- Кнопка очистки -->
                <button
                  @click="clearDialog"
                  class="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200 border border-red-200"
                  :disabled="!hasDiarizedMessages"
                >
                  Очистить диалог
                </button>
              </div>
            </div>
            <div class="px-6 py-4 space-y-3 max-h-96 overflow-y-auto">
              <!-- Диаризованные сообщения -->
              <div v-if="hasDiarizedMessages" class="space-y-2">
                <DiarizedMessage 
                  v-for="message in diarizedMessages" 
                  :key="message.id" 
                  :message="message"
                  :show-metadata="false"
                />
              </div>
              
              <!-- Обычные сообщения (если есть) -->
              <div v-if="messages.length > 0" class="space-y-2">
                <div class="text-gray-500 text-xs mb-2 border-t border-slate-200 pt-2">
                  Обычные сообщения: {{ messages.length }}
                </div>
              <Message 
                v-for="m in messages" 
                :key="m.id" 
                :message="m" 
                :queued="queuedTerms"
                @retry="onRetry" 
                @clarify="onClarify"
                @word-click="onWordClick" 
                @respond-as-user="onRespondAsUser" 
                @continue-as-bot="onContinueAsBot" 
              />
              </div>
              
              <!-- Индикатор записи -->
              <div v-if="isRecording" class="text-center py-4">
                <div class="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span class="text-sm font-medium text-red-700">Идет запись...</span>
                </div>
                <div v-if="!hasDeepGramKey" class="mt-2 text-xs text-amber-600">
                  ⚠️ Запись без диаризации (DeepGram не настроен)
                </div>
                <div v-if="diarizationError" class="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                  ❌ Ошибка диаризации: {{ diarizationError }}
                </div>
              </div>
              
              <!-- Пустое состояние -->
              <div v-if="!hasDiarizedMessages && messages.length === 0 && !isRecording" class="text-gray-500 text-sm text-center py-8">
                <div class="mb-2">🎭 Диаризация диалогов</div>
                <div class="text-xs">Нажмите "Начать запись" для распознавания речи</div>
                <div v-if="!hasDeepGramKey" class="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                  ⚠️ DeepGram API ключ не настроен - запись будет работать без диаризации
                  <div class="mt-1 text-xs text-amber-500">
                    Проверьте VITE_DEEPGRAM_API_KEY в .env файле
                  </div>
                </div>
              </div>
              <div v-if="draft" class="w-full flex justify-end">
                <div class="max-w-[80%] rounded-2xl px-3 py-2 shadow-sm border bg-slate-900 text-slate-50 border-slate-800">
                  <div class="flex items-center gap-1 text-sm">
                    <span class="animate-pulse">●</span>
                    <span class="animate-pulse delay-150">●</span>
                    <span class="animate-pulse delay-300">●</span>
                  </div>
                </div>
              </div>
              <div v-else class="h-4"></div>
            </div>
            <div class="border-t border-slate-200 px-6 py-4">
              <ChatInput 
                ref="chatInput" 
                :loading="loading" 
                @submit="onSubmit"
                @draft-change="onDraftChange" 
              />
              <p class="mt-2 text-xs text-slate-500">
                Подсказки: ЛКМ — сразу спросить. ПКМ/⌃-клик — добавить в запрос. Enter — отправить.
              </p>
            </div>
          </div>

        </div>

        <!-- Context Management -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div class="px-6 py-4 border-b border-slate-200">
            <h2 class="text-lg font-semibold text-gray-800">Контекст</h2>
          </div>
          <div class="px-6 py-4">
            <ContextPanel ref="contextPanel" />
          </div>
        </div>

        <!-- Hints Panel -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div class="px-6 py-4 border-b border-slate-200">
            <h2 class="text-lg font-semibold text-gray-800">Подсказки</h2>
          </div>
          <div class="px-6 py-4">
            <HintPanel ref="hintPanel" />
          </div>
        </div>

        <!-- Search Panel -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div class="px-6 py-4 border-b border-slate-200">
            <h2 class="text-lg font-semibold text-gray-800">Поиск</h2>
          </div>
          <div class="px-6 py-4">
            <SearchPanel 
              ref="searchPanel"
              @use-in-chat="onUseInChat"
            />
          </div>
        </div>
      </div>

      <!-- Status Bar -->
      <div class="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div class="px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 rounded-full" :class="connectionStatusClass"></div>
                <span class="text-sm text-gray-600">{{ connectionStatus }}</span>
              </div>
              <div class="text-sm text-gray-600">
                Режим: {{ isDeepGramMode ? 'DeepGram' : 'Web Speech API' }}
              </div>
            </div>
            <div class="text-sm text-gray-500">
              Сообщений: {{ messages.length }} | Фраз: {{ phraseCount }}
          </div>
        </div>
      </div>
    </div>
  </div>
  
</template>

<script>
import Message from './chat/Message.vue'
import DiarizedMessage from './chat/DiarizedMessage.vue'
import ChatInput from './chat/ChatInput.vue'
import ContextPanel from './context/ContextPanel.vue'
import HintPanel from './context/HintPanel.vue'
import SearchPanel from './context/SearchPanel.vue'
import { uiBusinessAdapter } from '../adapters'
// Используем адаптер для связи с сервисами

export default {
  name: 'MainApp',
  components: {
    Message,
    DiarizedMessage,
    ChatInput,
    ContextPanel,
    HintPanel,
    SearchPanel
  },
  data() {
    return {
      // Используем адаптер для получения данных
      adapter: uiBusinessAdapter,
      messages: [],
      queuedTerms: [],
      draft: '',
      loading: false,
      phraseCount: 0,
      connectionStatus: 'Подключение...',
      isDeepGramMode: false,
      
      // Состояние записи диаризации
      isRecording: false,
      mediaRecorder: null,
      audioStream: null,
      audioBuffer: [] // Буфер для аудио данных до подключения DeepGram
    }
  },
  computed: {
    connectionStatusClass() {
      switch (this.connectionStatus) {
        case 'Подключено':
          return 'bg-green-500'
        case 'Ошибка':
          return 'bg-red-500'
        case 'Подключение...':
          return 'bg-yellow-500'
        default:
          return 'bg-gray-500'
      }
    },
    
    // Диаризация геттеры
    diarizedMessages() {
      return this.adapter.getChatStore().getters.diarizedMessages()
    },
    
    hasDiarizedMessages() {
      return this.adapter.getChatStore().getters.hasDiarizedMessages()
    },
    
    isDiarizationActive() {
      return this.adapter.getChatStore().getters.isDiarizationActive()
    },
    
    diarizationError() {
      return this.adapter.getChatStore().getters.diarizationError()
    },
    
    isDiarizationConnecting() {
      return this.adapter.getChatStore().getters.isDiarizationConnecting()
    },
    
    hasDeepGramKey() {
      const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY || localStorage.getItem('deepgram_api_key')
      return apiKey && apiKey.length >= 10
    }
  },
  async mounted() {
    await this.initializeApp()
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    async initializeApp() {
      console.log('🚀 [APP] Initializing DeepNet Context System...')
      
      try {
        // Инициализируем сервисы через адаптер
        await this.adapter.initializeServices()
        
        // Проверяем доступность DeepGram
        const deepgramApiKey = import.meta.env.VITE_DEEPGRAM_API_KEY || localStorage.getItem('deepgram_api_key')
        this.isDeepGramMode = !!deepgramApiKey
        this.connectionStatus = this.isDeepGramMode ? 'DeepGram доступен' : 'DeepGram недоступен'
        
        // Инициализируем диаризацию если DeepGram доступен
        if (this.isDeepGramMode) {
          console.log('🎭 [APP] Initializing diarization service...')
          await this.initializeDiarization()
        }
        
        // Инициализируем контекст через адаптер
        await this.initializeContext()
        
        // Загружаем существующие сообщения
        this.loadMessages()
        
        console.log('🚀 [APP] App initialized successfully')
      } catch (error) {
        console.error('🚀 [APP] Failed to initialize app:', error)
        this.connectionStatus = 'Ошибка инициализации'
      }
    },

    async initializeContext() {
      // Получаем контекст через адаптер
      const context = this.adapter.getData('context.context')
      if (!context) {
        console.log('🎯 [APP] No context found, user needs to set up context')
        return
      }
      
      console.log('🎯 [APP] Context loaded:', context)
    },

    loadMessages() {
      // Загружаем сообщения из localStorage или API
      const savedMessages = localStorage.getItem('deepnet_messages')
      if (savedMessages) {
        try {
          this.messages = JSON.parse(savedMessages)
        } catch (error) {
          console.error('Failed to load messages:', error)
        }
      }
    },

    saveMessages() {
      // Сохраняем сообщения в localStorage
      localStorage.setItem('deepnet_messages', JSON.stringify(this.messages))
    },

    // Инициализация диаризации
    async initializeDiarization() {
      try {
        console.log('🎭 [APP] Initializing diarization...')
        
        // Подписываемся на события диаризации
        this.adapter.getChatStore().actions.updateDiarizationState({
          isConnecting: true,
          error: null
        })
        
        // Инициализируем сервис диаризации (но не запускаем)
        // Сервис уже инициализирован при создании, просто проверяем состояние
        const diarizationState = this.adapter.getDiarizationState()
        console.log('🎭 [APP] Diarization state:', diarizationState)
        
        this.adapter.getChatStore().actions.updateDiarizationState({
          isConnecting: false,
          isActive: false,
          error: null
        })
        
        console.log('🎭 [APP] Diarization initialized successfully')
      } catch (error) {
        console.error('🎭 [APP] Error initializing diarization:', error)
        this.adapter.getChatStore().actions.updateDiarizationState({
          isConnecting: false,
          isActive: false,
          error: error.message
        })
      }
    },

    // Chat event handlers
    onSubmit(text) {
      if (!text.trim()) return
      
      this.addMessage({
        id: Date.now().toString(),
        text: text,
        content: text,
        role: 'user',
        isUser: true,
        timestamp: Date.now()
      })
      
      // Обрабатываем сообщение
      this.processMessage(text)
    },

    onDraftChange(draft) {
      this.draft = draft
    },

    // ==================== ДИАРИЗАЦИЯ ДИАЛОГОВ ====================

    clearDialog() {
      console.log('🎭 [APP] Clearing dialog...')
      this.adapter.getChatStore().actions.clearDialog()
    },

    // Переключение записи
    async toggleRecording() {
      if (this.isRecording) {
        await this.stopRecording()
      } else {
        await this.startRecording()
      }
    },

    // Начало записи
    async startRecording() {
      try {
        console.log('🎤 [APP] Starting recording...')
        
        // Запрашиваем доступ к микрофону
        this.audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          } 
        })
        
        // 🔧 ОКОНЧАТЕЛЬНОЕ ИСПРАВЛЕНИЕ: Принудительно MP4 (работает с DeepGram)
        const supportedTypes = [
          'audio/mp4',               // MP4 - ПРИОРИТЕТ! Работает с DeepGram
          'audio/webm;codecs=opus',  // WebM Opus - может работать
          'audio/webm',              // WebM - базовый
          // ИСКЛЮЧАЕМ ПРОБЛЕМНЫЕ:
          // 'audio/webm;codecs=pcm' - НЕ РАБОТАЕТ С DEEPGRAM!
          // 'audio/wav' - не поддерживается браузером
          // 'audio/ogg;codecs=opus' - не поддерживается браузером
        ]
        
        let mimeType = 'audio/webm;codecs=opus' // fallback
        for (const type of supportedTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type
            console.log('🎤 [APP] Selected MIME type:', mimeType)
            break
          }
        }
        
        console.log('🎤 [APP] Using MIME type:', mimeType)
        console.log('🎤 [APP] Supported types:', supportedTypes.filter(type => MediaRecorder.isTypeSupported(type)))
        
        this.mediaRecorder = new MediaRecorder(this.audioStream, {
          mimeType: mimeType
        })
        
        // Обработчик данных
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.handleAudioData(event.data)
          }
        }
        
        // Обработчик остановки
        this.mediaRecorder.onstop = () => {
          console.log('🎤 [APP] Recording stopped')
        }
        
        // Запускаем диаризацию (если DeepGram доступен)
        if (this.isDeepGramMode) {
          await this.adapter.startDiarization()
          
          // Ждем небольшую задержку для подключения, затем отправляем буфер
          setTimeout(() => {
            const diarizationState = this.adapter.getDiarizationState()
            console.log('🎤 [APP] 🎭 Checking diarization state after delay:', diarizationState)
            if (diarizationState.isActive) {
              this.flushAudioBuffer()
            }
          }, 1000) // Ждем 1 секунду для подключения
        } else {
          console.log('🎤 [APP] DeepGram not available - recording without diarization')
        }
        
        // Начинаем запись с чанками 1000мс
        this.mediaRecorder.start(1000) // Отправляем данные каждую секунду
        this.isRecording = true
        
        console.log('🎤 [APP] Recording started successfully')
      } catch (error) {
        console.error('🎤 [APP] Error starting recording:', error)
        this.showError('Не удалось начать запись: ' + error.message)
      }
    },

    // Остановка записи
    async stopRecording() {
      try {
        console.log('🎤 [APP] Stopping recording...')
        
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop()
        }
        
        if (this.audioStream) {
          this.audioStream.getTracks().forEach(track => track.stop())
          this.audioStream = null
        }
        
        // Останавливаем диаризацию (если DeepGram доступен)
        if (this.isDeepGramMode) {
          await this.adapter.stopDiarization()
        }
        
        this.isRecording = false
        this.mediaRecorder = null
        
        // Очищаем буфер аудио данных
        this.audioBuffer = []
        console.log('🎤 [APP] 🧹 Audio buffer cleared on stop')
        
        console.log('🎤 [APP] Recording stopped successfully')
      } catch (error) {
        console.error('🎤 [APP] Error stopping recording:', error)
        this.showError('Ошибка при остановке записи: ' + error.message)
      }
    },

    // Обработка аудио данных с буферизацией
    async handleAudioData(audioBlob) {
      try {
        console.log('🎤 [APP] 📦 Audio blob received, size:', audioBlob.size, 'bytes, type:', audioBlob.type)
        
        if (this.isDeepGramMode) {
          // 🎯 ИСПРАВЛЕНИЕ: Используем Blob напрямую как в официальной документации!
          // Официальный пример: connection.send(event.data) где event.data - это Blob
          console.log('🎤 [APP] 📦 Using Blob directly for DeepGram (official way), type:', audioBlob.type, 'size:', audioBlob.size)
          
          // Проверяем состояние диаризации
          const diarizationState = this.adapter.getDiarizationState()
          console.log('🎤 [APP] 🎭 Diarization state:', diarizationState.isActive, diarizationState.isConnecting)
          
          if (diarizationState.isActive) {
            // DeepGram активен - сначала отправляем буфер, потом текущие данные
            if (this.audioBuffer.length > 0) {
              console.log('🎤 [APP] 🚀 Flushing buffer before sending new data...')
              await this.flushAudioBuffer()
            }
            
            // Отправляем текущие данные - Blob напрямую!
            console.log('🎤 [APP] 🎭 Sending Blob to active DeepGram connection...')
            await this.adapter.sendAudioToDiarization(audioBlob)
          } else {
            // DeepGram не активен или подключается - буферизуем Blob
            console.log('🎤 [APP] 📦 Buffering Blob (DeepGram not ready)...')
            this.audioBuffer.push(audioBlob)
            console.log('🎤 [APP] 📦 Buffer size:', this.audioBuffer.length, 'chunks')
            
            // Ограничиваем размер буфера (максимум 20 чанков = ~5 секунд)
            if (this.audioBuffer.length > 20) {
              console.log('🎤 [APP] 🗑️ Buffer overflow, removing oldest chunk')
              this.audioBuffer.shift()
            }
          }
        } else {
          console.log('🎤 [APP] Audio data received but DeepGram not available')
        }
      } catch (error) {
        console.error('🎤 [APP] Error handling audio data:', error)
      }
    },

    // Отправка буферизованных данных
    async flushAudioBuffer() {
      if (this.audioBuffer.length > 0 && this.isDeepGramMode) {
        console.log('🎤 [APP] 🚀 Flushing audio buffer:', this.audioBuffer.length, 'chunks')
        
        for (const audioBlob of this.audioBuffer) {
          try {
            await this.adapter.sendAudioToDiarization(audioBlob)
            console.log('🎤 [APP] ✅ Sent buffered audio Blob, size:', audioBlob.size)
          } catch (error) {
            console.error('🎤 [APP] ❌ Failed to send buffered audio:', error)
            break
          }
        }
        
        // Очищаем буфер
        this.audioBuffer = []
        console.log('🎤 [APP] 🧹 Audio buffer cleared')
      }
    },

    // Конвертация WebM в PCM для DeepGram
    async convertWebMToPCM(audioBlob) {
      try {
        // Создаем AudioContext для конвертации
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        
        // Декодируем аудио
        const arrayBuffer = await audioBlob.arrayBuffer()
        
        // Проверяем, можем ли мы декодировать данные
        if (arrayBuffer.byteLength === 0) {
          console.warn('🎤 [APP] Empty audio data')
          await audioContext.close()
          return null
        }
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        
        // Конвертируем в PCM
        const pcmData = this.audioBufferToPCM(audioBuffer)
        
        // Закрываем AudioContext
        await audioContext.close()
        
        return pcmData
      } catch (error) {
        console.error('🎤 [APP] Error converting WebM to PCM:', error)
        console.log('🎤 [APP] Blob details:', {
          size: audioBlob.size,
          type: audioBlob.type
        })
        return null
      }
    },

    // Конвертация AudioBuffer в PCM
    audioBufferToPCM(audioBuffer) {
      const length = audioBuffer.length
      const sampleRate = audioBuffer.sampleRate
      const channels = audioBuffer.numberOfChannels
      
      // Целевая частота дискретизации для DeepGram
      const targetSampleRate = 16000
      
      // Если частота дискретизации не 16kHz, нужно ресемплировать
      let processedData = audioBuffer.getChannelData(0)
      
      if (sampleRate !== targetSampleRate) {
        console.log('🎤 [APP] Resampling from', sampleRate, 'to', targetSampleRate)
        processedData = this.resampleAudio(processedData, sampleRate, targetSampleRate)
      }
      
      // Создаем PCM данные (16-bit, mono)
      const pcmLength = processedData.length * 2 // 16-bit = 2 bytes per sample
      const pcmData = new ArrayBuffer(pcmLength)
      const pcmView = new Int16Array(pcmData)
      
      // Конвертируем float32 в int16
      for (let i = 0; i < processedData.length; i++) {
        const sample = Math.max(-1, Math.min(1, processedData[i]))
        pcmView[i] = sample * 0x7FFF
      }
      
      console.log('🎤 [APP] PCM conversion: length=', processedData.length, 'sampleRate=', targetSampleRate, 'channels=1')
      
      return pcmData
    },

    // Простое ресемплирование аудио
    resampleAudio(inputData, inputSampleRate, outputSampleRate) {
      const ratio = inputSampleRate / outputSampleRate
      const outputLength = Math.floor(inputData.length / ratio)
      const outputData = new Float32Array(outputLength)
      
      for (let i = 0; i < outputLength; i++) {
        const inputIndex = Math.floor(i * ratio)
        outputData[i] = inputData[inputIndex] || 0
      }
      
      return outputData
    },

    // Показ ошибки
    showError(message) {
      console.error('❌ [APP] Error:', message)
      // Здесь можно добавить уведомления пользователю
    },


    onRetry(message) {
      console.log('🔄 [APP] Retry message:', message)
      // Повторяем сообщение
    },

    onClarify(message) {
      console.log('❓ [APP] Clarify message:', message)
      // Запрашиваем уточнение
    },

    onWordClick(word) {
      console.log('🔍 [APP] Word clicked:', word)
      // Обрабатываем клик по слову
    },

    onRespondAsUser(message) {
      console.log('👤 [APP] Respond as user:', message)
      // Отвечаем как пользователь
    },

    onContinueAsBot(message) {
      console.log('🤖 [APP] Continue as bot:', message)
      // Продолжаем как бот
    },

    onUseInChat(content) {
      console.log('💬 [APP] Use in chat:', content)
      // Используем контент в чате
      this.addMessage({
        id: Date.now().toString(),
        text: content,
        content: content,
        role: 'user',
        isUser: true,
        timestamp: Date.now()
      })
    },

    // Message management
    addMessage(message) {
      console.log('💬 [APP] Adding message:', message)
      this.messages.push(message)
      console.log('💬 [APP] Total messages:', this.messages.length)
      this.saveMessages()
    },

    async processMessage(text) {
      console.log('💬 [APP] Processing message:', text)
      
      // Показываем индикатор загрузки
      this.loading = true
      
      try {
        // Отправляем сообщение через адаптер
        const response = await this.adapter.executeAction('chat.sendMessage', {
          text,
          options: {
          detailLevel: 'extended',
          usePreviousContext: true,
          previousAssistantText: this.messages.filter(m => !m.isUser).slice(-1)[0]?.text || ''
          }
        })
        
        console.log('💬 [APP] LLM response:', response)
        
        // Добавляем ответ бота
        this.addMessage({
          id: Date.now().toString(),
          text: response.parsed?.content || response.raw || 'Ошибка обработки',
          content: response.parsed?.content || response.raw || 'Ошибка обработки',
          role: 'assistant',
          isUser: false,
          timestamp: Date.now()
        })
        
      } catch (error) {
        console.error('💬 [APP] Error processing message:', error)
        
        // Добавляем сообщение об ошибке
        this.addMessage({
          id: Date.now().toString(),
          text: `Ошибка: ${error.message}`,
          content: `Ошибка: ${error.message}`,
          role: 'assistant',
          isUser: false,
          error: true,
          timestamp: Date.now()
        })
      } finally {
        this.loading = false
      }
    },

    cleanup() {
      console.log('🚀 [APP] Cleaning up app...')
      
      // Останавливаем запись если активна
      if (this.isRecording) {
        this.stopRecording()
      }
      
      // Очищаем аудио ресурсы
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop())
        this.audioStream = null
      }
      
      if (this.mediaRecorder) {
        this.mediaRecorder = null
      }
      
      // Очищаем ресурсы через адаптер
      this.adapter.cleanup()
      
      console.log('🚀 [APP] App cleaned up')
    }
  }
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
