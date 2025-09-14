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
                      : (isInitializing || isDiarizationConnecting)
                        ? 'text-gray-500 bg-gray-100 cursor-not-allowed'
                        : 'text-green-600 bg-green-50 hover:bg-green-100 border border-green-200'
                  ]"
                  :disabled="isInitializing || isDiarizationConnecting"
                >
                  <div 
                    :class="[
                      'w-3 h-3 rounded-full',
                      isRecording 
                        ? 'bg-white animate-pulse' 
                        : (isInitializing || isDiarizationConnecting)
                          ? 'bg-gray-400 animate-spin'
                          : 'bg-green-500'
                    ]"
                  ></div>
                  <span v-if="isInitializing">Инициализация...</span>
                  <span v-else-if="isDiarizationConnecting">Подключение...</span>
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
                  <span class="text-sm font-medium text-red-700">
                    Идет запись {{ audioSourcesText }}...
                  </span>
                </div>
                <div v-if="audioMixerState" class="mt-2 text-xs text-gray-600">
                  <div class="flex justify-center gap-4">
                    <span :class="isMicrophoneActive ? 'text-green-600' : 'text-red-500'">
                      🎤 Микрофон: {{ isMicrophoneActive ? 'активен' : 'недоступен' }}
                    </span>
                    <span :class="isSystemAudioActive ? 'text-green-600' : 'text-orange-500'">
                      🔊 Системный звук: {{ isSystemAudioActive ? 'активен' : 'недоступен' }}
                    </span>
                  </div>
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
                <div class="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  💡 Автоматический захват микрофона и системного звука одновременно
                  <div class="mt-1 text-xs text-blue-500">
                    Распознавание речи из всех источников: микрофон + приложения + вкладки
                  </div>
                </div>
                <div v-if="isMacOS" class="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  🍎 macOS: Решение для системного звука
                  <div class="mt-1 text-xs text-blue-500">
                    <strong>Работает:</strong> Откройте Zoom/встречи в другом браузере, а это приложение - в текущем. Тогда микрофон будет захватывать звук из динамиков!
                  </div>
                </div>
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
      isInitializing: false, // Состояние инициализации
      mediaRecorder: null,
      audioStream: null,
      audioBuffer: [], // Буфер для аудио данных до подключения DeepGram
      
      // Состояние микшера
      audioMixerState: null
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
    },

    // Состояние микшера
    isMicrophoneActive() {
      return this.audioMixerState?.microphone?.isActive || false
    },

    isSystemAudioActive() {
      return this.audioMixerState?.systemAudio?.isActive || false
    },

    audioSourcesText() {
      const sources = []
      if (this.isMicrophoneActive) sources.push('микрофон')
      if (this.isSystemAudioActive) sources.push('системный звук')
      return sources.length > 0 ? `(${sources.join(' + ')})` : ''
    },

    // Определение macOS
    isMacOS() {
      return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
    }
  },
  async mounted() {
    await this.initializeApp()
    // Получаем начальное состояние микшера
    this.audioMixerState = this.adapter.getData('audioMixer.state')
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    async initializeApp() {
      try {
        // Инициализируем сервисы через адаптер
        await this.adapter.initializeServices()
        
        // Проверяем доступность DeepGram
        const deepgramApiKey = import.meta.env.VITE_DEEPGRAM_API_KEY || localStorage.getItem('deepgram_api_key')
        this.isDeepGramMode = !!deepgramApiKey
        this.connectionStatus = this.isDeepGramMode ? 'DeepGram доступен' : 'DeepGram недоступен'
        
        // Инициализируем диаризацию если DeepGram доступен
        if (this.isDeepGramMode) {
          await this.initializeDiarization()
        }
        
        // Инициализируем контекст через адаптер
        await this.initializeContext()
        
        // Загружаем существующие сообщения
        this.loadMessages()
      } catch (error) {
        this.connectionStatus = 'Ошибка инициализации'
      }
    },

    async initializeContext() {
      // Получаем контекст через адаптер
      const context = this.adapter.getData('context.context')
      if (!context) {
        return
      }
    },

    loadMessages() {
      // Загружаем сообщения из localStorage или API
      const savedMessages = localStorage.getItem('deepnet_messages')
      if (savedMessages) {
        try {
          this.messages = JSON.parse(savedMessages)
        } catch (error) {
          // Ошибка загрузки сообщений
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
        // Подписываемся на события диаризации
        this.adapter.getChatStore().actions.updateDiarizationState({
          isConnecting: true,
          error: null
        })
        
        // Инициализируем сервис диаризации (но не запускаем)
        // Сервис уже инициализирован при создании, просто проверяем состояние
        const diarizationState = this.adapter.getDiarizationState()
        
        this.adapter.getChatStore().actions.updateDiarizationState({
          isConnecting: false,
          isActive: false,
          error: null
        })
      } catch (error) {
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

    // Запуск записи со всех доступных источников
    async startRecording() {
      try {
        this.isInitializing = true
        console.log('🎧 [UI] Запуск записи со всех источников...')

        // Запускаем диаризацию (если DeepGram доступен)
        if (this.isDeepGramMode) {
          // Проверяем, была ли диаризация приостановлена
          const diarizationState = this.adapter.getChatStore().getters.diarizationState()
          console.log('🎧 [UI] Текущее состояние диаризации:', diarizationState)
          
          if (diarizationState.isPaused) {
            console.log('🎧 [UI] Возобновляем приостановленную диаризацию')
            await this.adapter.resumeDiarization()
          } else {
            console.log('🎧 [UI] Запускаем новую диаризацию')
            await this.adapter.startDiarization()
          }
        }

        // Запускаем микширование аудио (микрофон + системный звук)
        await this.adapter.executeAction('audioMixer.start')

        // Обновляем состояние микшера
        this.audioMixerState = this.adapter.getData('audioMixer.state')

        this.isRecording = true
        this.isInitializing = false
        console.log('🎧 [UI] Запись запущена успешно')
      } catch (error) {
        this.isInitializing = false
        console.error('🎧 [UI] Ошибка запуска записи:', error)
        this.showError('Не удалось начать запись: ' + error.message)
      }
    },

    async stopRecording() {
      try {
        console.log('🎧 [UI] Остановка записи...')

        // Останавливаем микширование
        await this.adapter.executeAction('audioMixer.stop')

        // Приостанавливаем диаризацию (если DeepGram доступен) - сохраняем соединение
        if (this.isDeepGramMode) {
          this.adapter.pauseDiarization()
        }

        // Обновляем состояние микшера
        this.audioMixerState = this.adapter.getData('audioMixer.state')

        this.isRecording = false
        console.log('🎧 [UI] Запись остановлена успешно')
      } catch (error) {
        console.error('🎧 [UI] Ошибка остановки записи:', error)
        this.showError('Ошибка при остановке записи: ' + error.message)
      }
    },

    // Начало записи с микрофона
    async startMicrophoneRecording() {
      try {
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
            break
          }
        }
        
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
          // Запись остановлена
        }
        
        // Запускаем диаризацию (если DeepGram доступен)
        if (this.isDeepGramMode) {
          await this.adapter.startDiarization()
          
          // Ждем небольшую задержку для подключения, затем отправляем буфер
          setTimeout(() => {
            const diarizationState = this.adapter.getDiarizationState()
            if (diarizationState.isActive) {
              this.flushAudioBuffer()
            }
          }, 1000) // Ждем 1 секунду для подключения
        }
        
        // Начинаем запись с чанками 1000мс
        this.mediaRecorder.start(1000) // Отправляем данные каждую секунду
        this.isRecording = true
      } catch (error) {
        this.showError('Не удалось начать запись: ' + error.message)
      }
    },

    // Остановка записи с микрофона
    async stopMicrophoneRecording() {
      try {
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
      } catch (error) {
        this.showError('Ошибка при остановке записи: ' + error.message)
      }
    },

    // Начало записи системного звука
    async startSystemAudioRecording() {
      try {
        console.log('🔊 [UI] Запуск записи системного звука...')
        
        // Запускаем диаризацию (если DeepGram доступен)
        if (this.isDeepGramMode) {
          await this.adapter.startDiarization()
        }
        
        // Запускаем захват системного звука
        await this.adapter.executeAction('systemAudio.start')
        
        this.isRecording = true
        console.log('🔊 [UI] Запись системного звука запущена')
      } catch (error) {
        console.error('🔊 [UI] Ошибка запуска записи системного звука:', error)
        this.showError('Не удалось начать запись системного звука: ' + error.message)
        
        // Автоматический fallback на микрофон при критических ошибках
        if (error.message.includes('отклонил') || error.message.includes('не поддерживается')) {
          console.log('🔊 [UI] Автоматическое переключение на микрофон...')
          this.audioSource = 'microphone'
          setTimeout(async () => {
            try {
              await this.startMicrophoneRecording()
              this.showError('Переключились на запись с микрофона')
            } catch (micError) {
              console.error('🔊 [UI] Ошибка fallback на микрофон:', micError)
            }
          }, 1000)
        }
      }
    },

    // Остановка записи системного звука
    async stopSystemAudioRecording() {
      try {
        console.log('🔊 [UI] Остановка записи системного звука...')
        
        // Останавливаем захват системного звука
        await this.adapter.executeAction('systemAudio.stop')
        
        // Останавливаем диаризацию (если DeepGram доступен)
        if (this.isDeepGramMode) {
          await this.adapter.stopDiarization()
        }
        
        this.isRecording = false
        console.log('🔊 [UI] Запись системного звука остановлена')
      } catch (error) {
        console.error('🔊 [UI] Ошибка остановки записи системного звука:', error)
        this.showError('Ошибка при остановке записи системного звука: ' + error.message)
      }
    },


    // Показ сообщения об успехе
    showSuccess(message) {
      // Можно добавить позже через уведомления
      console.log('✅ [UI]', message)
    },

    // Обработка аудио данных с буферизацией
    async handleAudioData(audioBlob) {
      try {
        if (this.isDeepGramMode) {
          // 🎯 ИСПРАВЛЕНИЕ: Используем Blob напрямую как в официальной документации!
          // Официальный пример: connection.send(event.data) где event.data - это Blob
          
          // Проверяем состояние диаризации
          const diarizationState = this.adapter.getDiarizationState()
          
          if (diarizationState.isActive) {
            // DeepGram активен - сначала отправляем буфер, потом текущие данные
            if (this.audioBuffer.length > 0) {
              await this.flushAudioBuffer()
            }
            
            // Отправляем текущие данные - Blob напрямую!
            await this.adapter.sendAudioToDiarization(audioBlob)
          } else {
            // DeepGram не активен или подключается - буферизуем Blob
            this.audioBuffer.push(audioBlob)
            
            // Ограничиваем размер буфера (максимум 20 чанков = ~5 секунд)
            if (this.audioBuffer.length > 20) {
              this.audioBuffer.shift()
            }
          }
        }
      } catch (error) {
        // Ошибка обработки аудио данных
      }
    },

    // Отправка буферизованных данных
    async flushAudioBuffer() {
      if (this.audioBuffer.length > 0 && this.isDeepGramMode) {
        for (const audioBlob of this.audioBuffer) {
          try {
            await this.adapter.sendAudioToDiarization(audioBlob)
          } catch (error) {
            break
          }
        }
        
        // Очищаем буфер
        this.audioBuffer = []
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
      // Здесь можно добавить уведомления пользователю
    },


    onRetry(message) {
      // Повторяем сообщение
    },

    onClarify(message) {
      // Запрашиваем уточнение
    },

    onWordClick(word) {
      // Обрабатываем клик по слову
    },

    onRespondAsUser(message) {
      // Отвечаем как пользователь
    },

    onContinueAsBot(message) {
      // Продолжаем как бот
    },

    onUseInChat(content) {
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
      this.messages.push(message)
      this.saveMessages()
    },

    async processMessage(text) {
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
