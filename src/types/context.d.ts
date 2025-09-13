// TypeScript типы для системы контекстных подсказок

export interface ContextA {
  id: string
  name: string
  role: string
  background: string
  goals: string[]
  skills: string[]
  experience: string
  preferences: string[]
  createdAt: number
  updatedAt: number
}

export interface ContextB {
  id: string
  name: string
  role: string
  company: string
  position: string
  requirements: string[]
  expectations: string[]
  background: string
  preferences: string[]
  createdAt: number
  updatedAt: number
}

export interface CommunicationGoal {
  id: string
  description: string
  successCriteria: string[]
  context: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  deadline?: number
  createdAt: number
  updatedAt: number
}

export interface FullContext {
  contextA: ContextA
  contextB: ContextB
  goal: CommunicationGoal
  sessionId: string
  createdAt: number
  updatedAt: number
  dialogEntries?: DialogEntry[]
}

export interface DialogEntry {
  id: string
  text: string
  speaker: 'A' | 'B' | 'system'
  timestamp: number
  confidence: number
  isFinal: boolean
  topics: string[]
  keywords: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
  importance: 'low' | 'medium' | 'high' | 'critical'
}

export interface DialogSummary {
  id: string
  sessionId: string
  topics: TopicAnalysis[]
  keyPoints: string[]
  summary: string
  sentiment: 'positive' | 'negative' | 'neutral'
  duration: number
  wordCount: number
  createdAt: number
}

export interface TopicAnalysis {
  topic: string
  frequency: number
  importance: number
  keywords: string[]
  sentiment: 'positive' | 'negative' | 'neutral'
  examples: string[]
}

export interface Hint {
  id: string
  text: string
  category: HintCategory
  priority: 'low' | 'medium' | 'high' | 'critical'
  context: string
  source: 'llm' | 'rule' | 'pattern'
  confidence: number
  timestamp: number
  isRead: boolean
  isDismissed: boolean
  relatedTopics: string[]
  actionItems?: string[]
}

export interface HintCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
  priority: number
}

export interface SearchQuery {
  id: string
  text: string
  context?: FullContext
  filters: SearchFilters
  timestamp: number
}

export interface SearchFilters {
  categories: string[]
  timeRange: {
    start: number
    end: number
  }
  priority: ('low' | 'medium' | 'high' | 'critical')[]
  sources: ('llm' | 'rule' | 'pattern')[]
}

export interface SearchResult {
  id: string
  query: string
  results: SearchResultItem[]
  totalCount: number
  processingTime: number
  timestamp: number
}

export interface SearchResultItem {
  id: string
  type: 'hint' | 'dialog' | 'summary' | 'context'
  title: string
  content: string
  relevance: number
  source: string
  timestamp: number
  metadata: Record<string, any>
}

export interface LLMRequest {
  id: string
  type: 'hint' | 'search' | 'summary' | 'analysis'
  prompt: string
  context: FullContext
  options: LLMRequestOptions
  timestamp: number
}

export interface LLMRequestOptions {
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
}

export interface LLMResponse {
  id: string
  requestId: string
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  timestamp: number
  processingTime: number
}

export interface ProcessingState {
  isProcessing: boolean
  currentTask: string
  progress: number
  errors: string[]
  warnings: string[]
  lastUpdate: number
}

// Экспорт для использования в других модулях
export type {
  ContextA,
  ContextB,
  CommunicationGoal,
  FullContext,
  DialogEntry,
  DialogSummary,
  TopicAnalysis,
  Hint,
  HintCategory,
  SearchQuery,
  SearchFilters,
  SearchResult,
  SearchResultItem,
  LLMRequest,
  LLMRequestOptions,
  LLMResponse,
  ProcessingState
}
