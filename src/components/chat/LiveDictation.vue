<template>
  <div class="live-dictation bg-white rounded-xl border border-slate-200 shadow-sm mb-20">
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
          <p class="leading-4 text-slate-800">
            <span v-for="(chunk, idx) in completedChunks" :key="'c'+idx">
              <br v-if="chunk === '\n'" />
              <span v-else class="mr-1 text-slate-800">
                <span 
                  v-for="(word, wordIdx) in splitIntoWords(chunk)" 
                  :key="'w'+idx+'-'+wordIdx"
                  :class="[
                    'cursor-pointer select-none transition-all duration-200 px-1 py-0.5 rounded',
                    isWordSelected(word, idx, wordIdx)  
                      ? 'bg-green-200 text-green-800 underline font-medium' 
                      : 'hover:bg-gray-100',
                    isWordInMouseSelection(idx, wordIdx) ? 'bg-blue-100' : ''
                  ]"
                  @mousedown="startMouseSelection(word, idx, wordIdx, $event)"
                  @mouseup="endMouseSelection(word, idx, wordIdx, $event)"
                  @mouseenter="handleMouseEnter(word, idx, wordIdx)"
                >
                  {{ word }}
                </span>
              </span>
            </span>
            <span v-if="currentPartial" class="text-slate-500">
              <span 
                v-for="(word, wordIdx) in splitIntoWords(currentPartial)" 
                :key="'partial-'+wordIdx"
                :class="[
                  'cursor-pointer select-none transition-all duration-200 px-1 py-0.5 rounded',
                  isWordSelected(word, 'partial', wordIdx)  
                    ? 'bg-green-200 text-green-800 underline font-medium' 
                    : 'hover:bg-gray-100',
                  isWordInMouseSelection('partial', wordIdx) ? 'bg-blue-100' : ''
                ]"
                @mousedown="startMouseSelection(word, 'partial', wordIdx, $event)"
                @mouseup="endMouseSelection(word, 'partial', wordIdx, $event)"
                @mouseenter="handleMouseEnter(word, 'partial', wordIdx)"
              >
                {{ word }}
              </span>
              <span class="ml-1 inline-block w-2 h-5 align-baseline bg-slate-400 animate-pulse"></span>
            </span>
            <span v-else-if="!completedChunks.length" class="text-slate-400">Говорите — текст появится здесь…</span>
          </p>
        </div>
      </div>
      
      <!-- Контекстные блоки -->
      <div class="mt-4 space-y-3">
        <!-- Контекст стороны А -->
        <div class="bg-blue-50 rounded-lg border border-blue-200">
          <button
            @click="toggleContextA"
            class="w-full flex items-center justify-between p-3 text-left hover:bg-blue-100 transition-colors rounded-lg"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-blue-800">Контекст стороны "А"</span>
              <span v-if="contextA" class="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded">
                {{ contextA.length }} символов
              </span>
              <button
                v-if="contextA"
                @click.stop="clearContextA"
                class="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                title="Очистить контекст А"
              >
                Очистить
              </button>
            </div>
            <svg 
              :class="['w-4 h-4 text-blue-600 transition-transform', isContextAExpanded ? 'rotate-180' : '']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          
          <div v-if="isContextAExpanded" class="px-3 pb-3">
            <textarea
              v-model="contextA"
              placeholder="Введите контекст стороны А (например, резюме, навыки, опыт работы)..."
              class="w-full h-32 p-3 text-sm border border-blue-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>
        </div>
        
        <!-- Контекст стороны Б -->
        <div class="bg-green-50 rounded-lg border border-green-200">
          <button
            @click="toggleContextB"
            class="w-full flex items-center justify-between p-3 text-left hover:bg-green-100 transition-colors rounded-lg"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-green-800">Контекст стороны "Б"</span>
              <span v-if="contextB" class="text-xs text-green-600 bg-green-200 px-2 py-1 rounded">
                {{ contextB.length }} символов
              </span>
              <button
                v-if="contextB"
                @click.stop="clearContextB"
                class="text-xs text-green-500 hover:text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                title="Очистить контекст Б"
              >
                Очистить
              </button>
            </div>
            <svg 
              :class="['w-4 h-4 text-green-600 transition-transform', isContextBExpanded ? 'rotate-180' : '']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          
          <div v-if="isContextBExpanded" class="px-3 pb-3">
            <textarea
              v-model="contextB"
              placeholder="Введите контекст стороны Б (например, требования к позиции, компания, вопросы интервьюера)..."
              class="w-full h-32 p-3 text-sm border border-green-300 rounded-md resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            ></textarea>
          </div>
        </div>
      </div>
      
      <!-- Кнопка очистки всех ответов LLM -->
      <div v-if="llmResponses.length > 0" class="mt-4 flex justify-end">
        <button
          @click="clearAllLLMResponses"
          class="px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
          title="Очистить все ответы LLM"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          <span class="hidden sm:inline">Очистить все ответы</span>
        </button>
      </div>
      
      <!-- Вкладки ответов LLM -->
      <LLMResponseTabs
        v-if="llmResponses.length > 0"
        :responses="llmResponses"
        :selected-words="selectedWords"
        :active-response-id="activeResponseId"
        @close-tab="closeLLMResponse"
        @add-word="addWordFromResponse"
        @remove-word="removeWord"
        class="mt-4"
      />
      
      <!-- Ошибка запроса -->
      <div v-if="queryError" class="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
        <div class="flex items-center gap-2">
          <span class="text-red-600 text-sm">❌ Ошибка:</span>
          <span class="text-red-700 text-sm">{{ queryError }}</span>
          <button
            @click="queryError = null"
            class="ml-auto text-red-500 hover:text-red-700 text-xs"
          >
            ✕
          </button>
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
    
    <!-- Фиксированный плавающий блок конструктора запросов -->
    <div 
      class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg"
    >
      <div class="max-w-4xl mx-auto p-3">
        <div class="flex items-center gap-3">
          <!-- Выбранные слова (компактно) -->
          <div v-if="selectedWords.length > 0" class="flex items-center gap-1 flex-shrink-0">
            <span class="text-xs text-slate-500">📝</span>
            <div class="flex gap-1">
              <span
                v-for="(word, idx) in selectedWords.slice(0, 3)"
                :key="word.id"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded border border-green-200"
              >
                {{ word.text }}
                <button
                  @click="removeWord(word.id)"
                  class="ml-0.5 text-green-600 hover:text-green-800 text-xs"
                >
                  ×
                </button>
              </span>
              <span v-if="selectedWords.length > 3" class="text-xs text-slate-500 px-1">
                +{{ selectedWords.length - 3 }}
              </span>
            </div>
          </div>
          
          <!-- Ручной ввод (адаптивно) -->
          <div class="min-w-32">
            <input
              v-model="manualQuery"
              type="text"
              placeholder="Введите запрос..."
              class="py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <!-- Кнопки -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              v-if="selectedWords.length > 0 || manualQuery.length > 0"
              @click="clearQueryConstructor"
              class="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              title="Очистить"
            >
              🗑️
            </button>
            <button
              @click="sendQuery"
              :disabled="isQueryLoading || (!finalQuery.trim())"
              class="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span v-if="isQueryLoading" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span v-if="isQueryLoading">...</span>
              <span v-else>Отправить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { uiBusinessAdapter } from '../../adapters'
import { websocketTranscriptionService } from '../../services/voice/websocketTranscriptionService'
import { chatService } from '../../services/chat/chatService'
import LLMResponseTabs from './LLMResponseTabs.vue'

export default {
  name: 'LiveDictation',
  components: {
    LLMResponseTabs
  },
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
      completedChunks: [],
      
      // Выбор слов для поиска
      selectedWords: [],
      wordIdCounter: 0,
      
      // Выделение мышью
      isMouseSelecting: false,
      mouseSelectionStart: null,
      mouseSelectionEnd: null,
      
      // LLM ответы
      llmResponses: [], // Массив всех ответов LLM
      activeResponseId: null, // ID активного ответа
      isQueryLoading: false,
      queryError: null,
      
      // Автоматический перезапуск
      recognitionStartTime: null, // Время начала распознавания
      recognitionTimeout: null, // Таймер для перезапуска
      hasReceivedRecognition: false, // Флаг получения первого распознавания
      
      // Контекстные блоки
      contextA: '', // Контекст стороны А
      contextB: '', // Контекст стороны Б
      isContextAExpanded: false, // Развернут ли блок А
      isContextBExpanded: false, // Развернут ли блок Б
      
      // Дебаунсинг для сохранения
      saveTimeout: null,
      
      // Кэш для проверки выделения слов
      wordSelectionCache: null,
      
      // Ручной ввод запроса
      manualQuery: ''
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
    },
    finalQuery() {
      // Объединяем выбранные слова и ручной ввод
      const selectedText = this.selectedWords.map(w => w.text).join(' ')
      const manualText = this.manualQuery.trim()
      
      if (selectedText && manualText) {
        return `${selectedText} ${manualText}`
      } else if (selectedText) {
        return selectedText
      } else if (manualText) {
        return manualText
      }
      return ''
    }
  },
  mounted() {
    // Загружаем данные из localStorage при монтировании
    this.loadFromLocalStorage()
  },
  watch: {
    completedChunks() {
      this.$nextTick(() => this.scrollToBottom())
      // Сохраняем изменения в localStorage
      this.saveToLocalStorage()
    },
    transcriptionChunks() {
      // Сохраняем изменения в localStorage
      this.saveToLocalStorage()
    },
    currentPartial() {
      // Сохраняем изменения в localStorage
      this.saveToLocalStorage()
    },
    contextA() {
      // Сохраняем изменения в localStorage
      this.saveToLocalStorage()
    },
    contextB() {
      // Сохраняем изменения в localStorage
      this.saveToLocalStorage()
    },
    llmResponses: {
      handler() {
        // Сохраняем изменения в localStorage
        this.saveToLocalStorage()
      },
      deep: false // Не отслеживаем изменения внутри объектов
    },
    manualQuery() {
      // Сохраняем изменения в localStorage
      this.saveToLocalStorage()
    }
  },
  beforeDestroy() {
    // Очищаем таймер перезапуска
    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout)
      this.recognitionTimeout = null
    }
    
    // Очищаем таймер сохранения
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
    
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
      // Используем новый метод для полной очистки
      this.clearAllData()
    },
    
    // === Управление контекстными блоками ===
    toggleContextA() {
      this.isContextAExpanded = !this.isContextAExpanded
    },
    
    toggleContextB() {
      this.isContextBExpanded = !this.isContextBExpanded
    },
    
    // === Сохранение в localStorage ===
    saveToLocalStorage() {
      // Дебаунсинг - сохраняем только если прошло время с последнего сохранения
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }
      
      this.saveTimeout = setTimeout(() => {
        try {
          localStorage.setItem('liveDictation_contextA', this.contextA)
          localStorage.setItem('liveDictation_contextB', this.contextB)
          localStorage.setItem('liveDictation_completedChunks', JSON.stringify(this.completedChunks))
          localStorage.setItem('liveDictation_transcriptionChunks', JSON.stringify(this.transcriptionChunks))
          localStorage.setItem('liveDictation_currentPartial', this.currentPartial)
          localStorage.setItem('liveDictation_llmResponses', JSON.stringify(this.llmResponses))
          localStorage.setItem('liveDictation_manualQuery', this.manualQuery)
        } catch (e) {
          console.warn('Не удалось сохранить данные в localStorage:', e)
        }
      }, 100) // Сохраняем через 100мс после последнего изменения
    },
    
    loadFromLocalStorage() {
      try {
        this.contextA = localStorage.getItem('liveDictation_contextA') || ''
        this.contextB = localStorage.getItem('liveDictation_contextB') || ''
        
        const savedCompletedChunks = localStorage.getItem('liveDictation_completedChunks')
        if (savedCompletedChunks) {
          this.completedChunks = JSON.parse(savedCompletedChunks)
        }
        
        const savedTranscriptionChunks = localStorage.getItem('liveDictation_transcriptionChunks')
        if (savedTranscriptionChunks) {
          this.transcriptionChunks = JSON.parse(savedTranscriptionChunks)
        }
        
        this.currentPartial = localStorage.getItem('liveDictation_currentPartial') || ''
        
        const savedLLMResponses = localStorage.getItem('liveDictation_llmResponses')
        if (savedLLMResponses) {
          this.llmResponses = JSON.parse(savedLLMResponses)
        }
        
        this.manualQuery = localStorage.getItem('liveDictation_manualQuery') || ''
      } catch (e) {
        console.warn('Не удалось загрузить данные из localStorage:', e)
      }
    },
    
    clearChat() {
      // Очищаем только диалог чата, не трогая контекстные блоки
      this.clearChatOnly()
    },
    
    clearChatOnly() {
      // Очищаем только данные чата
      this.completedChunks = []
      this.transcriptionChunks = []
      this.currentPartial = ''
      this.selectedWords = []
      
      // Очищаем только localStorage чата
      try {
        localStorage.removeItem('liveDictation_completedChunks')
        localStorage.removeItem('liveDictation_transcriptionChunks')
        localStorage.removeItem('liveDictation_currentPartial')
      } catch (e) {
        console.warn('Не удалось очистить localStorage чата:', e)
      }
    },
    
    clearContextA() {
      this.contextA = ''
      try {
        localStorage.removeItem('liveDictation_contextA')
      } catch (e) {
        console.warn('Не удалось очистить localStorage для контекста А:', e)
      }
    },
    
    clearContextB() {
      this.contextB = ''
      try {
        localStorage.removeItem('liveDictation_contextB')
      } catch (e) {
        console.warn('Не удалось очистить localStorage для контекста Б:', e)
      }
    },
    
    clearAllData() {
      // Очищаем все данные
      this.completedChunks = []
      this.transcriptionChunks = []
      this.currentPartial = ''
      this.selectedWords = []
      this.contextA = ''
      this.contextB = ''
      this.llmResponses = []
      this.activeResponseId = null
      this.queryError = null
      
      // Очищаем localStorage
      try {
        localStorage.removeItem('liveDictation_contextA')
        localStorage.removeItem('liveDictation_contextB')
        localStorage.removeItem('liveDictation_completedChunks')
        localStorage.removeItem('liveDictation_transcriptionChunks')
        localStorage.removeItem('liveDictation_currentPartial')
        localStorage.removeItem('liveDictation_llmResponses')
      } catch (e) {
        console.warn('Не удалось очистить localStorage:', e)
      }
    },
    
    clearAllLLMResponses() {
      // Очищаем все ответы LLM
      this.llmResponses = []
      this.activeResponseId = null
      this.queryError = null
      
      // Очищаем localStorage
      try {
        localStorage.removeItem('liveDictation_llmResponses')
      } catch (e) {
        console.warn('Не удалось очистить localStorage для ответов LLM:', e)
      }
    },
    
    // Методы для работы с выбором слов
    splitIntoWords(text) {
      if (!text) return []
      return text.trim().split(/\s+/).filter(word => word.length > 0)
    },
    
    isWordSelected(word, chunkIndex, wordIndex, source, responseId, lineIndex) {
      // Создаем ключ для кэширования
      const key = source ? `${source}-${responseId}-${lineIndex}-${wordIndex}` : `${chunkIndex}-${wordIndex}`
      
      // Проверяем кэш
      if (!this.wordSelectionCache) {
        this.wordSelectionCache = new Map()
      }
      
      if (this.wordSelectionCache.has(key)) {
        return this.wordSelectionCache.get(key)
      }
      
      const result = this.selectedWords.some(selected => {
        // Для слов из чата
        if (chunkIndex !== undefined && wordIndex !== undefined) {
          return selected.text === word && 
                 selected.chunkIndex === chunkIndex && 
                 selected.wordIndex === wordIndex
        }
        // Для слов из ответов LLM
        if (source && responseId !== undefined && lineIndex !== undefined) {
          return selected.text === word && 
                 selected.source === source && 
                 selected.responseId === responseId && 
                 selected.lineIndex === lineIndex &&
                 selected.wordIndex === wordIndex
        }
        return false
      })
      
      // Сохраняем в кэш
      this.wordSelectionCache.set(key, result)
      return result
    },
    
    toggleWordSelection(word, chunkIndex, wordIndex) {
      const existingIndex = this.selectedWords.findIndex(selected => 
        selected.text === word && 
        selected.chunkIndex === chunkIndex && 
        selected.wordIndex === wordIndex
      )
      
      if (existingIndex > -1) {
        // Удаляем слово при повторном клике
        this.selectedWords.splice(existingIndex, 1)
      } else {
        // Добавляем слово
        this.selectedWords.push({
          id: ++this.wordIdCounter,
          text: word,
          chunkIndex,
          wordIndex
        })
      }
      
      // Очищаем кэш при изменении выделения
      this.wordSelectionCache = null
    },
    
    removeWord(wordId) {
      const index = this.selectedWords.findIndex(word => word.id === wordId)
      if (index > -1) {
        this.selectedWords.splice(index, 1)
        // Очищаем кэш при изменении выделения
        this.wordSelectionCache = null
      }
    },
    
    clearSelectedWords() {
      this.selectedWords = []
      // Очищаем кэш при изменении выделения
      this.wordSelectionCache = null
    },
    
    clearQueryConstructor() {
      this.selectedWords = []
      this.manualQuery = ''
      // Очищаем кэш при изменении выделения
      this.wordSelectionCache = null
    },
    
    clearLLMResponse() {
      this.llmResponses = []
      this.activeResponseId = null
      this.queryError = null
    },
    
    closeLLMResponse(responseId) {
      const index = this.llmResponses.findIndex(r => r.id === responseId)
      if (index > -1) {
        this.llmResponses.splice(index, 1)
        
        // Если закрываем активный ответ, переключаемся на другой
        if (this.activeResponseId === responseId) {
          if (this.llmResponses.length > 0) {
            // Переключаемся на первую оставшуюся вкладку (новые в начале)
            this.activeResponseId = this.llmResponses[0].id
          } else {
            this.activeResponseId = null
          }
        }
      }
    },
    
    addWordFromResponse(wordData) {
      // Добавляем слово из ответа LLM
      this.selectedWords.push({
        id: ++this.wordIdCounter,
        text: wordData.text,
        source: wordData.source,
        responseId: wordData.responseId,
        lineIndex: wordData.lineIndex,
        wordIndex: wordData.wordIndex
      })
    },
    
    // === Выделение мышью ===
    startMouseSelection(word, chunkIndex, wordIndex, event) {
      event.preventDefault()
      this.isMouseSelecting = true
      this.mouseSelectionStart = { word, chunkIndex, wordIndex }
      this.mouseSelectionEnd = { word, chunkIndex, wordIndex }
    },
    
    endMouseSelection(word, chunkIndex, wordIndex, event) {
      if (!this.isMouseSelecting) return
      
      event.preventDefault()
      this.mouseSelectionEnd = { word, chunkIndex, wordIndex }
      
      // Проверяем, является ли это простым кликом (без перетаскивания)
      const isSimpleClick = this.mouseSelectionStart && 
        this.mouseSelectionStart.chunkIndex === this.mouseSelectionEnd.chunkIndex &&
        this.mouseSelectionStart.wordIndex === this.mouseSelectionEnd.wordIndex
      
      if (isSimpleClick) {
        // Простой клик - переключаем выделение слова
        this.toggleWordSelection(word, chunkIndex, wordIndex)
      } else {
        // Выделение диапазона - выделяем все слова в диапазоне
        this.selectWordsInRange()
      }
      
      // Сбрасываем состояние выделения
      this.isMouseSelecting = false
      this.mouseSelectionStart = null
      this.mouseSelectionEnd = null
    },
    
    handleMouseEnter(word, chunkIndex, wordIndex) {
      if (this.isMouseSelecting) {
        this.mouseSelectionEnd = { word, chunkIndex, wordIndex }
      }
    },
    
    isWordInMouseSelection(chunkIndex, wordIndex) {
      if (!this.isMouseSelecting || !this.mouseSelectionStart || !this.mouseSelectionEnd) {
        return false
      }
      
      const start = this.mouseSelectionStart
      const end = this.mouseSelectionEnd
      
      // Проверяем, находится ли слово в диапазоне выделения
      return this.isWordInRange(chunkIndex, wordIndex, start, end)
    },
    
    isWordInRange(chunkIndex, wordIndex, start, end) {
      // Если слова в одном чанке
      if (start.chunkIndex === end.chunkIndex && chunkIndex === start.chunkIndex) {
        return wordIndex >= Math.min(start.wordIndex, end.wordIndex) && 
               wordIndex <= Math.max(start.wordIndex, end.wordIndex)
      }
      
      // Если слова в разных чанках, проверяем порядок
      const currentPos = this.getWordPosition(chunkIndex, wordIndex)
      const startPos = this.getWordPosition(start.chunkIndex, start.wordIndex)
      const endPos = this.getWordPosition(end.chunkIndex, end.wordIndex)
      
      return currentPos >= Math.min(startPos, endPos) && currentPos <= Math.max(startPos, endPos)
    },
    
    getWordPosition(chunkIndex, wordIndex) {
      // Вычисляем абсолютную позицию слова в тексте
      let position = 0
      
      for (let i = 0; i < this.completedChunks.length; i++) {
        if (i === chunkIndex) {
          const words = this.splitIntoWords(this.completedChunks[i])
          return position + wordIndex
        }
        position += this.splitIntoWords(this.completedChunks[i]).length
      }
      
      // Если это partial
      if (chunkIndex === 'partial') {
        for (let i = 0; i < this.completedChunks.length; i++) {
          position += this.splitIntoWords(this.completedChunks[i]).length
        }
        return position + wordIndex
      }
      
      return position
    },
    
    selectWordsInRange() {
      if (!this.mouseSelectionStart || !this.mouseSelectionEnd) return
      
      const start = this.mouseSelectionStart
      const end = this.mouseSelectionEnd
      
      // Получаем все слова в диапазоне
      const wordsInRange = this.getWordsInRange(start, end)
      
      // Добавляем слова в выделение (избегаем дубликатов)
      wordsInRange.forEach(wordData => {
        if (!this.isWordSelected(wordData.word, wordData.chunkIndex, wordData.wordIndex)) {
          const newWord = {
            id: ++this.wordIdCounter,
            text: wordData.word,
            chunkIndex: wordData.chunkIndex,
            wordIndex: wordData.wordIndex
          }
          this.selectedWords.push(newWord)
        }
      })
    },
    
    getWordsInRange(start, end) {
      const words = []
      
      // Получаем все чанки в порядке
      const allChunks = [...this.completedChunks]
      if (this.currentPartial) {
        allChunks.push(this.currentPartial)
      }
      
      const startPos = this.getWordPosition(start.chunkIndex, start.wordIndex)
      const endPos = this.getWordPosition(end.chunkIndex, end.wordIndex)
      
      let currentPos = 0
      
      for (let chunkIndex = 0; chunkIndex < allChunks.length; chunkIndex++) {
        const chunk = allChunks[chunkIndex]
        const chunkWords = this.splitIntoWords(chunk)
        
        for (let wordIndex = 0; wordIndex < chunkWords.length; wordIndex++) {
          if (currentPos >= Math.min(startPos, endPos) && currentPos <= Math.max(startPos, endPos)) {
            words.push({
              word: chunkWords[wordIndex],
              chunkIndex: chunkIndex === allChunks.length - 1 && this.currentPartial ? 'partial' : chunkIndex,
              wordIndex
            })
          }
          currentPos++
        }
      }
      
      return words
    },
    
    async sendQuery() {
      const query = this.finalQuery
      console.log('🔍 Отправка запроса:', query)
      
      if (!query.trim()) {
        console.warn('⚠️ Пустой запрос')
        return
      }
      
      try {
        this.isQueryLoading = true
        this.queryError = null
        
        // Создаем временный ответ для предварительной активации вкладки
        const tempResponseId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const tempResponse = {
          id: tempResponseId,
          query,
          response: 'Загрузка...',
          timestamp: Date.now(),
          isLoading: true
        }
        
        // Добавляем временный ответ в начало и активируем его
        this.llmResponses.unshift(tempResponse)
        this.activeResponseId = tempResponseId
        
        // Получаем весь текст стенографии для контекста
        const fullTranscript = this.completedChunks
          .filter(chunk => chunk !== '\n')
          .join(' ')
          .trim()
        
        console.log('📝 Контекст стенографии:', fullTranscript.substring(0, 100) + '...')
        
        // Формируем системный промпт с контекстом стенографии
        const systemPrompt = `Вы - эксперт по прохождению собеседований, помогаете стороне "А" пройти собеседование против стороны "Б".

${this.contextA ? `КОНТЕКСТ СТОРОНЫ "А":
${this.contextA}

` : ''}${this.contextB ? `КОНТЕКСТ СТОРОНЫ "Б":
${this.contextB}

` : ''}Цель: эффективно пройти собеседование, получить работу. Помогать подсказками и рекомендациями в соответствии с контекстом стороны "А" и "Б" и текущего диалога. Давать подсказки по запросу, а также прикладывать список смежных тем и навыков для раскрытия темы.

КОНТЕКСТ ДИАЛОГА:
${fullTranscript}
`

        // Формируем пользовательский запрос
        const userQuery = `Дай дополнительную информацию по этому запросу, учитывая контекст разговора: "${query}" и контекст стороны "А" и "Б". 
Отвечайте на русском языке. Будьте конкретными и информативными. Стараться отвечать кратко и понятно так, как этого требует ситуация и вопросы собеседника. БЕЗ обсуждений, только ответы на вопросы и список ключевых фраз по текущему вопросу не менее 10 штук через запятую.`
        
        console.log('🤖 Отправка к LLM:', { userQuery: userQuery.substring(0, 100) + '...', systemPrompt: systemPrompt.substring(0, 100) + '...' })
        
        // Отправляем запрос к LLM
        const result = await chatService.ask(userQuery, {
          systemPrompt,
          detailLevel: 'extended'
        })
        
        console.log('📊 Результат LLM:', { isError: result.isError, isTimeout: result.isTimeout, hasContent: !!result.raw })
        
        if (result.isError) {
          throw new Error('Ошибка при обращении к LLM')
        }
        
        if (result.isTimeout) {
          throw new Error('Превышено время ожидания ответа')
        }
        
        // Заменяем временный ответ на финальный
        const finalResponse = {
          id: tempResponseId, // Используем тот же ID
          query,
          response: result.raw,
          timestamp: Date.now(),
          isLoading: false
        }
        
        // Находим и заменяем временный ответ
        const tempIndex = this.llmResponses.findIndex(r => r.id === tempResponseId)
        if (tempIndex !== -1) {
          this.llmResponses.splice(tempIndex, 1, finalResponse)
        }
        
        // Активируем финальный ответ (ID уже установлен)
        this.activeResponseId = tempResponseId
        
        console.log('✅ Получен ответ от LLM:', result.raw)
        
        // Очищаем конструктор запроса после успешной отправки
        this.clearQueryConstructor()
        
      } catch (error) {
        console.error('❌ Ошибка отправки запроса:', error)
        console.error('❌ Детали ошибки:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
        this.queryError = error.message || 'Неизвестная ошибка'
        
        // Удаляем временный ответ при ошибке
        const tempIndex = this.llmResponses.findIndex(r => r.id === tempResponseId)
        if (tempIndex !== -1) {
          this.llmResponses.splice(tempIndex, 1)
          // Если удаляли активную вкладку, переключаемся на другую
          if (this.activeResponseId === tempResponseId) {
            this.activeResponseId = this.llmResponses.length > 0 ? this.llmResponses[0].id : null
          }
        }
      } finally {
        this.isQueryLoading = false
      }
    },
    
    async startDictation() {
      try {
        this.errorMessage = ''
        this.isInitializing = true

        // Сбрасываем флаги для нового запуска
        this.hasReceivedRecognition = false
        this.recognitionStartTime = Date.now()
        
        // Очищаем предыдущий таймер если есть
        if (this.recognitionTimeout) {
          clearTimeout(this.recognitionTimeout)
          this.recognitionTimeout = null
        }

        await this.startWebSocketTranscription()
        this.isRecording = true
        this.$nextTick(() => this.scrollToBottom())
        
        // Запускаем таймер для проверки распознавания
        this.startRecognitionTimeout()
        
      } catch (e) {
        this.errorMessage = 'Не удалось начать диктовку: ' + (e?.message || e)
      } finally {
        this.isInitializing = false
      }
    },
    
    async stopDictation() {
      try {
        this.errorMessage = ''
        
        // Очищаем таймер перезапуска
        if (this.recognitionTimeout) {
          clearTimeout(this.recognitionTimeout)
          this.recognitionTimeout = null
        }
        
        // Сбрасываем флаги
        this.hasReceivedRecognition = false
        this.recognitionStartTime = null
        
        await this.stopWebSocketTranscription()
        this.isRecording = false
      } catch (e) {
        this.errorMessage = 'Ошибка при остановке диктовки: ' + (e?.message || e)
      }
    },
    
    // === Автоматический перезапуск распознавания ===
    startRecognitionTimeout() {
      // Очищаем предыдущий таймер
      if (this.recognitionTimeout) {
        clearTimeout(this.recognitionTimeout)
      }
      
      // Устанавливаем таймер на 5 секунд
      this.recognitionTimeout = setTimeout(async () => {
        if (this.isRecording && !this.hasReceivedRecognition) {
          console.log('🔄 Перезапуск распознавания - не получено данных за 5 секунд')
          await this.restartRecognition()
        }
      }, 5000)
    },
    
    async restartRecognition() {
      try {
        console.log('🔄 Перезапускаем соединение...')
        
        // Останавливаем текущее соединение
        await this.stopWebSocketTranscription()
        
        // Небольшая пауза перед перезапуском
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Перезапускаем
        await this.startWebSocketTranscription()
        
        // Сбрасываем флаги и запускаем новый таймер
        this.hasReceivedRecognition = false
        this.recognitionStartTime = Date.now()
        this.startRecognitionTimeout()
        
        console.log('✅ Соединение перезапущено')
        
      } catch (e) {
        console.error('❌ Ошибка при перезапуске:', e)
        this.errorMessage = 'Ошибка перезапуска: ' + (e?.message || e)
      }
    },
    
    onRecognitionReceived() {
      // Отмечаем, что получили распознавание
      this.hasReceivedRecognition = true
      
      // Очищаем таймер перезапуска
      if (this.recognitionTimeout) {
        clearTimeout(this.recognitionTimeout)
        this.recognitionTimeout = null
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
          // Отмечаем, что получили распознавание
          this.onRecognitionReceived()
          
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
            // Проверяем, нет ли уже такого чанка (по ID или тексту)
            const existingChunk = this.transcriptionChunks.find(existing => 
              existing.id === transcriptionChunk.id || 
              (existing.text === transcriptionChunk.text && existing.timestamp === transcriptionChunk.timestamp)
            )
            
            if (!existingChunk) {
              console.log('✅ Добавляем новый чанк:', transcriptionChunk.text.substring(0, 50) + '...')
              this.transcriptionChunks.push(transcriptionChunk)
              this.rebuildWebSocketTranscript()
              this.$nextTick(() => this.scrollToBottom())
            } else {
              console.log('⚠️ Пропускаем дубликат чанка:', transcriptionChunk.text.substring(0, 50) + '...')
            }
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
      
      // Используем Set для отслеживания уникальных текстов
      const seenTexts = new Set()
      
      for (const chunk of finalChunks) {
        const text = chunk.text.trim()
        if (text && !seenTexts.has(text)) {
          seenTexts.add(text)
          this.completedChunks.push(text)
          
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
