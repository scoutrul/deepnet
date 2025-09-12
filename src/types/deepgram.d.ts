// TypeScript типы для DeepGram SDK интеграции
export interface DeepGramConfig {
  apiKey: string
  model: string
  language: string
  streaming: boolean
  interimResults?: boolean
  punctuate?: boolean
  profanity_filter?: boolean
  redact?: string[]
  diarize?: boolean
  multichannel?: boolean
  alternatives?: number
  numerals?: boolean
  search?: string[]
  replace?: string[]
  keywords?: string[]
  keyword_boost?: 'legacy' | 'latest'
  endpointing?: number
  vad_turnoff?: number
  smart_format?: boolean
  filler_words?: boolean
  tag?: string[]
  tier?: 'nova' | 'base' | 'enhanced'
  version?: string
}

export interface DeepGramTranscriptionResult {
  text: string
  isFinal: boolean
  confidence: number
  timestamp: number
  alternatives: Array<{
    transcript: string
    confidence: number
  }>
  words?: Array<{
    word: string
    start: number
    end: number
    confidence: number
    speaker?: number
  }>
  speaker?: number
  language?: string
  language_confidence?: number
}

export interface DeepGramError {
  type: 'connection' | 'authentication' | 'quota' | 'processing' | 'network' | 'unknown'
  message: string
  code?: string
  details?: any
}

export interface DeepGramStreamingOptions {
  model: string
  language: string
  punctuate: boolean
  interim_results: boolean
  endpointing: number
  vad_turnoff: number
  smart_format: boolean
  filler_words: boolean
  diarize: boolean
  multichannel: boolean
  alternatives: number
  numerals: boolean
  profanity_filter: boolean
  redact: string[]
  search: string[]
  replace: string[]
  keywords: string[]
  keyword_boost: 'legacy' | 'latest'
  tag: string[]
  tier: 'nova' | 'base' | 'enhanced'
  version: string
}

export interface DeepGramConnection {
  on(event: 'open', listener: () => void): void
  on(event: 'transcript', listener: (data: DeepGramTranscriptionResult) => void): void
  on(event: 'error', listener: (error: DeepGramError) => void): void
  on(event: 'close', listener: () => void): void
  send(audioData: ArrayBuffer | Blob): void
  finish(): void
  close(): void
}

export interface DeepGramClient {
  listen: {
    live: (options: DeepGramStreamingOptions) => DeepGramConnection
  }
}

// Экспорт для использования в других модулях
export type { DeepGramConfig, DeepGramTranscriptionResult, DeepGramError, DeepGramStreamingOptions, DeepGramConnection, DeepGramClient }
