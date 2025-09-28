<template>
  <div class="llm-response-tabs bg-white rounded-xl border border-slate-200 shadow-sm">
    <!-- Заголовок с вкладками -->
    <div class="px-6 py-4 border-b border-slate-200">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-gray-800">Ответы LLM</h3>
        <div class="text-xs text-slate-500">
          {{ responses.length }} {{ responses.length === 1 ? 'ответ' : 'ответов' }}
        </div>
      </div>
      
      <!-- Вкладки -->
      <div class="flex flex-wrap gap-2">
        <div
          v-for="(response, index) in responses"
          :key="response.id"
          :class="[
            'group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
            activeTabId === response.id
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
          ]"
          @click="setActiveTab(response.id)"
        >
          <span class="whitespace-nowrap" :title="response.query">
            {{ response.query || `Запрос ${index + 1}` }}
          </span>
          <button
            @click.stop="closeTab(response.id)"
            class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-slate-400 hover:text-slate-600"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Содержимое активной вкладки -->
    <div v-if="activeResponse" class="px-6 py-4">
      <div class="mb-3">
        <div class="text-sm text-slate-600 mb-2">
          <strong>Запрос:</strong> "{{ activeResponse.query }}"
        </div>
        <div class="text-xs text-slate-500">
          {{ formatTime(activeResponse.timestamp) }}
        </div>
      </div>
      
      <!-- Ответ с возможностью выбора слов -->
      <div class="prose prose-sm max-w-none text-slate-800">
        <div v-if="activeResponse.isLoading" class="flex items-center gap-2 text-slate-500">
          <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span>Загрузка ответа...</span>
        </div>
        
        <div v-else class="whitespace-pre-wrap">
          <div 
            v-for="(line, lineIdx) in splitIntoLines(activeResponse.response)" 
            :key="'line-'+activeResponse.id+'-'+lineIdx"
            class="mb-1"
          >
            <span 
              v-for="(word, wordIdx) in splitIntoWords(line)" 
              :key="'response-'+activeResponse.id+'-'+lineIdx+'-'+wordIdx"
              :class="[
                'cursor-pointer select-none transition-all duration-200 px-1 py-0.5 rounded',
                isWordSelected(word, 'response', activeResponse.id, lineIdx, wordIdx) 
                  ? 'bg-blue-200 text-blue-800 underline font-medium' 
                  : 'hover:bg-blue-100',
                isWordInMouseSelection('response', activeResponse.id, lineIdx, wordIdx) ? 'bg-blue-100' : ''
              ]"
              @mousedown="startMouseSelection(word, 'response', activeResponse.id, lineIdx, wordIdx, $event)"
              @mouseup="endMouseSelection(word, 'response', activeResponse.id, lineIdx, wordIdx, $event)"
              @mouseenter="handleMouseEnter(word, 'response', activeResponse.id, lineIdx, wordIdx)"
            >
              {{ word }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Пустое состояние -->
    <div v-else class="px-6 py-8 text-center text-slate-500">
      <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
      </svg>
      <p class="text-sm">Нет ответов от LLM</p>
      <p class="text-xs text-slate-400 mt-1">Выберите слова в чате и отправьте запрос</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LLMResponseTabs',
  props: {
    responses: {
      type: Array,
      default: () => []
    },
    selectedWords: {
      type: Array,
      default: () => []
    },
    activeResponseId: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      activeTabId: null,
      
      // Выделение мышью
      isMouseSelecting: false,
      mouseSelectionStart: null,
      mouseSelectionEnd: null
    }
  },
  computed: {
    activeResponse() {
      return this.responses.find(r => r.id === this.activeTabId) || null
    }
  },
  watch: {
    responses: {
      handler(newResponses) {
        // Если передан activeResponseId, используем его
        if (this.activeResponseId && newResponses.some(r => r.id === this.activeResponseId)) {
          this.activeTabId = this.activeResponseId
        }
        // Иначе автоматически активируем первый ответ (новые вкладки в начале)
        else if (newResponses.length > 0 && !this.activeTabId) {
          this.activeTabId = newResponses[0].id
        }
      },
      immediate: true
    },
    activeResponseId: {
      handler(newActiveId) {
        // Обновляем активную вкладку при изменении activeResponseId
        if (newActiveId && this.responses.some(r => r.id === newActiveId)) {
          this.activeTabId = newActiveId
        }
      },
      immediate: true
    }
  },
  methods: {
    setActiveTab(tabId) {
      this.activeTabId = tabId
    },
    
    closeTab(tabId) {
      const index = this.responses.findIndex(r => r.id === tabId)
      if (index > -1) {
        this.$emit('close-tab', tabId)
        
        // Если закрываем активную вкладку, переключаемся на другую
        if (this.activeTabId === tabId) {
          const remainingResponses = this.responses.filter(r => r.id !== tabId)
          if (remainingResponses.length > 0) {
            // Переключаемся на первую оставшуюся вкладку (новые в начале)
            this.activeTabId = remainingResponses[0].id
          } else {
            this.activeTabId = null
          }
        }
      }
    },
    
    splitIntoWords(text) {
      if (!text) return []
      return text.trim().split(/\s+/).filter(word => word.length > 0)
    },
    
    splitIntoLines(text) {
      if (!text) return []
      return text.split('\n').filter(line => line.trim().length > 0)
    },
    
    isWordSelected(word, source, responseId, lineIndex, wordIndex) {
      return this.selectedWords.some(selected => 
        selected.text === word && 
        selected.source === source && 
        selected.responseId === responseId && 
        selected.lineIndex === lineIndex &&
        selected.wordIndex === wordIndex
      )
    },
    
    toggleWordSelection(word, source, responseId, lineIndex, wordIndex) {
      const existingIndex = this.selectedWords.findIndex(selected => 
        selected.text === word && 
        selected.source === source && 
        selected.responseId === responseId && 
        selected.lineIndex === lineIndex &&
        selected.wordIndex === wordIndex
      )
      
      if (existingIndex > -1) {
        // Удаляем слово при повторном клике
        this.$emit('remove-word', this.selectedWords[existingIndex].id)
      } else {
        // Добавляем слово
        this.$emit('add-word', {
          text: word,
          source,
          responseId,
          lineIndex,
          wordIndex
        })
      }
    },
    
    formatTime(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    
    // === Выделение мышью ===
    startMouseSelection(word, source, responseId, lineIndex, wordIndex, event) {
      event.preventDefault()
      this.isMouseSelecting = true
      this.mouseSelectionStart = { word, source, responseId, lineIndex, wordIndex }
      this.mouseSelectionEnd = { word, source, responseId, lineIndex, wordIndex }
    },
    
    endMouseSelection(word, source, responseId, lineIndex, wordIndex, event) {
      if (!this.isMouseSelecting) return
      
      event.preventDefault()
      this.mouseSelectionEnd = { word, source, responseId, lineIndex, wordIndex }
      
      // Проверяем, является ли это простым кликом (без перетаскивания)
      const isSimpleClick = this.mouseSelectionStart && 
        this.mouseSelectionStart.source === this.mouseSelectionEnd.source &&
        this.mouseSelectionStart.responseId === this.mouseSelectionEnd.responseId &&
        this.mouseSelectionStart.lineIndex === this.mouseSelectionEnd.lineIndex &&
        this.mouseSelectionStart.wordIndex === this.mouseSelectionEnd.wordIndex
      
      if (isSimpleClick) {
        // Простой клик - переключаем выделение слова
        this.toggleWordSelection(word, source, responseId, lineIndex, wordIndex)
      } else {
        // Выделение диапазона - выделяем все слова в диапазоне
        this.selectWordsInRange()
      }
      
      // Сбрасываем состояние выделения
      this.isMouseSelecting = false
      this.mouseSelectionStart = null
      this.mouseSelectionEnd = null
    },
    
    handleMouseEnter(word, source, responseId, lineIndex, wordIndex) {
      if (this.isMouseSelecting) {
        this.mouseSelectionEnd = { word, source, responseId, lineIndex, wordIndex }
      }
    },
    
    isWordInMouseSelection(source, responseId, lineIndex, wordIndex) {
      if (!this.isMouseSelecting || !this.mouseSelectionStart || !this.mouseSelectionEnd) {
        return false
      }
      
      const start = this.mouseSelectionStart
      const end = this.mouseSelectionEnd
      
      // Проверяем, находится ли слово в диапазоне выделения
      return this.isWordInRange(source, responseId, lineIndex, wordIndex, start, end)
    },
    
    isWordInRange(source, responseId, lineIndex, wordIndex, start, end) {
      // Если слова в одном ответе
      if (start.responseId === end.responseId && responseId === start.responseId) {
        // Если в одной строке
        if (start.lineIndex === end.lineIndex && lineIndex === start.lineIndex) {
          return wordIndex >= Math.min(start.wordIndex, end.wordIndex) && 
                 wordIndex <= Math.max(start.wordIndex, end.wordIndex)
        }
        
        // Если в разных строках, проверяем порядок
        const currentPos = this.getWordPosition(source, responseId, lineIndex, wordIndex)
        const startPos = this.getWordPosition(start.source, start.responseId, start.lineIndex, start.wordIndex)
        const endPos = this.getWordPosition(end.source, end.responseId, end.lineIndex, end.wordIndex)
        
        return currentPos >= Math.min(startPos, endPos) && currentPos <= Math.max(startPos, endPos)
      }
      
      return false
    },
    
    getWordPosition(source, responseId, lineIndex, wordIndex) {
      // Для ответов LLM вычисляем позицию с учетом строк
      if (source === 'response') {
        const response = this.responses.find(r => r.id === responseId)
        if (!response) return 0
        
        const lines = this.splitIntoLines(response.response)
        let position = 0
        
        for (let i = 0; i < lineIndex; i++) {
          position += this.splitIntoWords(lines[i]).length
        }
        
        return position + wordIndex
      }
      
      return wordIndex
    },
    
    selectWordsInRange() {
      if (!this.mouseSelectionStart || !this.mouseSelectionEnd) return
      
      const start = this.mouseSelectionStart
      const end = this.mouseSelectionEnd
      
      // Получаем все слова в диапазоне
      const wordsInRange = this.getWordsInRange(start, end)
      
      // Добавляем слова в выделение (избегаем дубликатов)
      wordsInRange.forEach(wordData => {
        if (!this.isWordSelected(wordData.word, wordData.source, wordData.responseId, wordData.lineIndex, wordData.wordIndex)) {
          this.$emit('add-word', {
            text: wordData.word,
            source: wordData.source,
            responseId: wordData.responseId,
            lineIndex: wordData.lineIndex,
            wordIndex: wordData.wordIndex
          })
        }
      })
    },
    
    getWordsInRange(start, end) {
      const words = []
      
      // Получаем активный ответ
      const response = this.responses.find(r => r.id === start.responseId)
      if (!response) return words
      
      const lines = this.splitIntoLines(response.response)
      
      const startLine = Math.min(start.lineIndex, end.lineIndex)
      const endLine = Math.max(start.lineIndex, end.lineIndex)
      
      for (let lineIndex = startLine; lineIndex <= endLine; lineIndex++) {
        const line = lines[lineIndex]
        if (!line) continue
        
        const lineWords = this.splitIntoWords(line)
        const startWord = (lineIndex === startLine) ? Math.min(start.wordIndex, end.wordIndex) : 0
        const endWord = (lineIndex === endLine) ? Math.max(start.wordIndex, end.wordIndex) : lineWords.length - 1
        
        for (let wordIndex = startWord; wordIndex <= endWord; wordIndex++) {
          if (lineWords[wordIndex]) {
            words.push({
              word: lineWords[wordIndex],
              source: 'response',
              responseId: response.id,
              lineIndex,
              wordIndex
            })
          }
        }
      }
      
      return words
    }
  }
}
</script>
