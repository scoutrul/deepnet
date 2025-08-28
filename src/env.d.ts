/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_CHAT_MODEL: string
  readonly VITE_REQUEST_TIMEOUT_MS: string
  readonly VITE_APP_TITLE: string
  readonly VITE_HTTP_REFERRER: string
  readonly VITE_HTTP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
