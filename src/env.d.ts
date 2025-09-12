/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Keys
  readonly VITE_OPENROUTER_API_KEY: string
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_DEEPGRAM_API_KEY: string
  
  // API Configuration
  readonly VITE_API_BASE_URL: string
  readonly VITE_CHAT_MODEL: string
  
  // App Settings
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DEBUG: string
  
  // Request Settings
  readonly VITE_REQUEST_TIMEOUT_MS: string
  readonly VITE_HTTP_REFERRER: string
  readonly VITE_HTTP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
