<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <div class="mx-auto max-w-7xl px-4 py-4">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">DeepNet Context System</h1>
        <p class="text-gray-600">Система распознавания голоса с контекстными подсказками</p>
      </div>

      <!-- Voice Panel -->
      <div class="mb-6">
        <VoicePanel 
          ref="voicePanel" 
          @tag-selected="onTagSelected"
          @add-selected-to-input="onAddSelectedToInput" 
        />
      </div>

      <!-- Main Content - Single Column -->
      <div class="space-y-6">
          <!-- Chat Messages -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div class="px-6 py-4 border-b border-slate-200">
              <h2 class="text-lg font-semibold text-gray-800">Диалог</h2>
            </div>
            <div class="px-6 py-4 space-y-3 max-h-96 overflow-y-auto">
              <!-- Debug info -->
              <div v-if="messages.length === 0" class="text-gray-500 text-sm text-center py-4">
                Нет сообщений. Всего сообщений: {{ messages.length }}
              </div>
              <div v-else class="text-gray-500 text-xs mb-2">
                Всего сообщений: {{ messages.length }}
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

          <!-- Voice Recorder -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div class="px-6 py-4 border-b border-slate-200">
              <h2 class="text-lg font-semibold text-gray-800">Голосовое управление</h2>
            </div>
            <div class="px-6 py-4">
              <VoiceRecorder 
                ref="voiceRecorder"
                @transcription="onTranscription"
                @phrase-complete="onPhraseComplete"
                @error="onVoiceError"
                @state-change="onVoiceStateChange"
              />
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
import VoicePanel from './voice/VoicePanel.vue'
import VoiceRecorder from './voice/VoiceRecorder.vue'
import Message from './Message.vue'
import ChatInput from './ChatInput.vue'
import ContextPanel from './context/ContextPanel.vue'
import HintPanel from './context/HintPanel.vue'
import SearchPanel from './context/SearchPanel.vue'
import { contextManager, dialogProcessor } from '../services/context'
import { VoiceServiceFactory } from '../services/voiceServiceFactory'

export default {
  name: 'MainApp',
  components: {
    VoicePanel,
    VoiceRecorder,
    Message,
    ChatInput,
    ContextPanel,
    HintPanel,
    SearchPanel
  },
  data() {
    return {
      messages: [],
      queuedTerms: [],
      draft: '',
      loading: false,
      phraseCount: 0,
      connectionStatus: 'Подключение...',
      isDeepGramMode: false
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
    }
  },
  mounted() {
    this.initializeApp()
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    async initializeApp() {
      console.log('🚀 [APP] Initializing DeepNet Context System...')
      
      try {
        // Проверяем доступность сервисов
        this.isDeepGramMode = VoiceServiceFactory.isDeepGramAvailable()
        this.connectionStatus = this.isDeepGramMode ? 'DeepGram доступен' : 'Web Speech API'
        
        // Инициализируем контекст
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
      // Проверяем, есть ли сохраненный контекст
      const context = contextManager.getFullContext()
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

    // Voice event handlers
    onTranscription(data) {
      console.log('🎤 [APP] Transcription received:', data)
      
      // Добавляем транскрипцию как сообщение пользователя
      if (data.isFinal && data.text.trim()) {
        this.addMessage({
          id: Date.now().toString(),
          text: data.text,
          content: data.text,
          role: 'user',
          isUser: true,
          timestamp: data.timestamp,
          confidence: data.confidence
        })
      }
    },

    onPhraseComplete(data) {
      console.log('🎤 [APP] Phrase complete:', data)
      this.phraseCount++
      
      // Добавляем завершенную фразу как сообщение
      if (data.phrase.trim()) {
        this.addMessage({
          id: Date.now().toString(),
          text: data.phrase,
          content: data.phrase,
          role: 'user',
          isUser: true,
          timestamp: Date.now(),
          confidence: data.confidence
        })
      }
    },

    onVoiceError(error) {
      console.error('🎤 [APP] Voice error:', error)
      this.connectionStatus = 'Ошибка голоса'
    },

    onVoiceStateChange(state) {
      console.log('🎤 [APP] Voice state changed:', state)
      
      if (state.status === 'recording') {
        this.connectionStatus = 'Запись...'
      } else if (state.status === 'stopped') {
        this.connectionStatus = this.isDeepGramMode ? 'DeepGram готов' : 'Web Speech API готов'
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

    onTagSelected(tag) {
      console.log('🏷️ [APP] Tag selected:', tag)
      // Обрабатываем выбранный тег
    },

    onAddSelectedToInput(text) {
      console.log('➕ [APP] Add to input:', text)
      // Добавляем текст в поле ввода
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
        // Импортируем chatService
        const { chatService } = await import('../services/chatService')
        
        // Отправляем запрос к LLM
        const response = await chatService.ask(text, {
          detailLevel: 'extended',
          usePreviousContext: true,
          previousAssistantText: this.messages.filter(m => !m.isUser).slice(-1)[0]?.text || ''
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
      
      // Очищаем ресурсы
      if (this.$refs.voiceRecorder) {
        this.$refs.voiceRecorder.cleanup()
      }
      
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
