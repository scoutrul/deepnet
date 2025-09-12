// Application Configuration
export const appConfig = {
  // DeepGram Configuration
  deepgram: {
    apiKey: import.meta.env.VITE_DEEPGRAM_API_KEY || localStorage.getItem('deepgram_api_key'),
    model: 'nova-3',
    language: 'ru-RU',
    streaming: true,
    interimResults: true,
    punctuate: true,
    profanity_filter: false,
    diarize: false,
    multichannel: false,
    alternatives: 1,
    numerals: true,
    smart_format: true,
    filler_words: false
  },

  // LLM Configuration (OpenRouter)
  llm: {
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || localStorage.getItem('openrouter_api_key'),
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://openrouter.ai/api/v1',
    model: import.meta.env.VITE_CHAT_MODEL || 'anthropic/claude-3.5-sonnet',
    temperature: 0.7,
    maxTokens: 1000,
    topP: 0.9,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1
  },

  // Anthropic Configuration
  anthropic: {
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || localStorage.getItem('anthropic_api_key'),
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 1000
  },

  // Application Settings
  app: {
    name: import.meta.env.VITE_APP_TITLE || 'DeepNet Context System',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    debug: import.meta.env.VITE_DEBUG === 'true' || false
  },

  // Request Settings
  request: {
    timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 10000),
    referrer: import.meta.env.VITE_HTTP_REFERRER || 'http://localhost:5173',
    title: import.meta.env.VITE_HTTP_TITLE || 'DeepNet Context System'
  },

  // Voice Recognition Settings
  voice: {
    language: 'ru-RU',
    continuous: true,
    interimResults: true,
    maxAlternatives: 1,
    wordTimeout: 1500,
    quickWordTimeout: 800,
    minWordLength: 3
  },

  // Context Settings
  context: {
    maxDialogEntries: 1000,
    hintCacheTimeout: 300000, // 5 minutes
    searchCacheTimeout: 600000, // 10 minutes
    summaryCacheTimeout: 1800000 // 30 minutes
  },

  // UI Settings
  ui: {
    maxHints: 10,
    maxSearchResults: 20,
    animationDuration: 300,
    debounceDelay: 500
  }
}

// Helper functions
export const getDeepGramConfig = () => {
  if (!appConfig.deepgram.apiKey) {
    console.warn('DeepGram API key not found')
    return null
  }
  return appConfig.deepgram
}

export const getLLMConfig = () => {
  if (!appConfig.llm.apiKey) {
    console.warn('LLM API key not found')
    return null
  }
  return appConfig.llm
}

export const isDebugMode = () => {
  return appConfig.app.debug
}

export const log = (message: string, ...args: any[]) => {
  if (isDebugMode()) {
    console.log(`[DeepNet] ${message}`, ...args)
  }
}

export const logError = (message: string, ...args: any[]) => {
  console.error(`[DeepNet] ${message}`, ...args)
}

export const logWarn = (message: string, ...args: any[]) => {
  console.warn(`[DeepNet] ${message}`, ...args)
}
