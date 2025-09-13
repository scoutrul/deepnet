// Phrase segmentation service for voice transcription
export interface SegmentationRule {
  type: 'punctuation' | 'keyword' | 'timing' | 'semantic'
  pattern: string | RegExp
  weight: number
  action: 'break' | 'soft-break' | 'continue'
  description: string
}

export interface Phrase {
  id: string
  text: string
  confidence: number
  timestamp: number
  isComplete: boolean
  type: 'interim' | 'final' | 'segmented'
  metadata?: {
    rule?: string
    weight?: number
    context?: string
  }
}

export interface SegmentationConfig {
  minPhraseLength: number
  maxPhraseLength: number
  pauseThreshold: number
  confidenceThreshold: number
  enableSemanticBreaks: boolean
  language: string
}

export interface TimingInfo {
  timestamp: number
  duration: number
  pauseBefore: number
}

class PhraseParser {
  private rules: SegmentationRule[] = []
  private config: SegmentationConfig
  private currentBuffer: string = ''
  private lastUpdateTime: number = Date.now()
  private phraseCounter: number = 0

  constructor(config?: Partial<SegmentationConfig>) {
    this.config = {
      minPhraseLength: 3,
      maxPhraseLength: 200,
      pauseThreshold: 1500, // 1.5 seconds
      confidenceThreshold: 0.6,
      enableSemanticBreaks: true,
      language: 'ru-RU',
      ...config
    }
    
    this.initializeRules()
  }

  private initializeRules() {
    // Punctuation-based rules
    this.rules = [
      // Strong breaks - end of sentence
      {
        type: 'punctuation',
        pattern: /[.!?]/,
        weight: 10,
        action: 'break',
        description: 'End of sentence punctuation'
      },
      
      // Medium breaks - clause separators
      {
        type: 'punctuation',
        pattern: /[,;:]/,
        weight: 6,
        action: 'soft-break',
        description: 'Clause separator punctuation'
      },
      
      // Weak breaks - list separators
      {
        type: 'punctuation',
        pattern: /[,]/,
        weight: 4,
        action: 'soft-break',
        description: 'List separator'
      }
    ]

    // Add language-specific rules
    this.addLanguageSpecificRules()
  }

  private addLanguageSpecificRules() {
    if (this.config.language.startsWith('ru')) {
      // Russian-specific semantic break keywords
      this.rules.push(
        {
          type: 'keyword',
          pattern: /\b(это|этот|эта|эти)\b/i,
          weight: 8,
          action: 'break',
          description: 'Russian demonstrative pronoun'
        },
        {
          type: 'keyword',
          pattern: /\b(что такое|что это|как называется)\b/i,
          weight: 9,
          action: 'break',
          description: 'Russian question phrase'
        },
        {
          type: 'keyword',
          pattern: /\b(например|к примеру|скажем)\b/i,
          weight: 7,
          action: 'break',
          description: 'Russian example introduction'
        },
        {
          type: 'keyword',
          pattern: /\b(во-первых|во-вторых|в-третьих)\b/i,
          weight: 8,
          action: 'break',
          description: 'Russian enumeration'
        }
      )
    } else if (this.config.language.startsWith('en')) {
      // English-specific semantic break keywords
      this.rules.push(
        {
          type: 'keyword',
          pattern: /\b(this is|that is|these are)\b/i,
          weight: 8,
          action: 'break',
          description: 'English demonstrative phrase'
        },
        {
          type: 'keyword',
          pattern: /\b(what is|how do|can you)\b/i,
          weight: 9,
          action: 'break',
          description: 'English question phrase'
        },
        {
          type: 'keyword',
          pattern: /\b(for example|such as|like)\b/i,
          weight: 7,
          action: 'break',
          description: 'English example introduction'
        },
        {
          type: 'keyword',
          pattern: /\b(first|second|third|finally)\b/i,
          weight: 8,
          action: 'break',
          description: 'English enumeration'
        }
      )
    }
  }

  // Process incoming transcription text
  processTranscription(text: string, isFinal: boolean, confidence: number): Phrase[] {
    const timestamp = Date.now()
    const phrases: Phrase[] = []

    // Add to current buffer
    this.currentBuffer += text

    // Check if we should segment based on timing
    const timeSinceLastUpdate = timestamp - this.lastUpdateTime
    if (timeSinceLastUpdate > this.config.pauseThreshold && this.currentBuffer.trim()) {
      const pausePhrase = this.createPhrase(
        this.currentBuffer.trim(),
        confidence,
        timestamp,
        'final',
        'timing'
      )
      phrases.push(pausePhrase)
      this.currentBuffer = ''
      this.lastUpdateTime = timestamp
    }

    // Check for rule-based segmentation
    if (isFinal || this.shouldSegmentByRules()) {
      const segmentedPhrases = this.segmentByRules(this.currentBuffer, confidence, timestamp)
      phrases.push(...segmentedPhrases)
      
      if (isFinal) {
        this.currentBuffer = ''
      }
    }

    // Update last update time
    this.lastUpdateTime = timestamp

    // Deduplicate phrases to prevent duplicates
    return this.deduplicatePhrases(phrases)
  }

  // Deduplicate phrases to prevent duplicates
  private deduplicatePhrases(phrases: Phrase[]): Phrase[] {
    const seen = new Set<string>()
    const uniquePhrases: Phrase[] = []
    
    for (const phrase of phrases) {
      const normalizedText = phrase.text.toLowerCase().trim()
      if (!seen.has(normalizedText)) {
        seen.add(normalizedText)
        uniquePhrases.push(phrase)
      }
    }
    
    return uniquePhrases
  }

  private shouldSegmentByRules(): boolean {
    if (this.currentBuffer.length < this.config.minPhraseLength) {
      return false
    }

    // Check if any high-weight rules match
    const highWeightRules = this.rules.filter(rule => rule.weight >= 8)
    return highWeightRules.some(rule => {
      if (typeof rule.pattern === 'string') {
        return this.currentBuffer.includes(rule.pattern)
      }
      return rule.pattern.test(this.currentBuffer)
    })
  }

  private segmentByRules(text: string, confidence: number, timestamp: number): Phrase[] {
    if (!text.trim()) return []

    const phrases: Phrase[] = []
    let currentText = text
    let lastBreakIndex = 0

    // Apply rules in order of weight (highest first)
    const sortedRules = [...this.rules].sort((a, b) => b.weight - a.weight)

    for (const rule of sortedRules) {
      if (typeof rule.pattern === 'string') {
        const index = currentText.indexOf(rule.pattern)
        if (index !== -1) {
          const phraseText = currentText.substring(lastBreakIndex, index + rule.pattern.length).trim()
          if (phraseText && phraseText.length >= this.config.minPhraseLength) {
            const phrase = this.createPhrase(
              phraseText,
              confidence,
              timestamp,
              'segmented',
              rule.description
            )
            phrases.push(phrase)
          }
          lastBreakIndex = index + rule.pattern.length
        }
      } else {
        // RegExp pattern
        let match
        while ((match = rule.pattern.exec(currentText)) !== null) {
          const index = match.index
          const phraseText = currentText.substring(lastBreakIndex, index + match[0].length).trim()
          if (phraseText && phraseText.length >= this.config.minPhraseLength) {
            const phrase = this.createPhrase(
              phraseText,
              confidence,
              timestamp,
              'segmented',
              rule.description
            )
            phrases.push(phrase)
          }
          lastBreakIndex = index + match[0].length
        }
      }
    }

    // Add remaining text if it meets minimum length
    const remainingText = currentText.substring(lastBreakIndex).trim()
    if (remainingText && remainingText.length >= this.config.minPhraseLength) {
      const phrase = this.createPhrase(
        remainingText,
        confidence,
        timestamp,
        'segmented',
        'remaining text'
      )
      phrases.push(phrase)
    }

    return phrases
  }

  private createPhrase(
    text: string,
    confidence: number,
    timestamp: number,
    type: 'interim' | 'final' | 'segmented',
    ruleDescription?: string
  ): Phrase {
    this.phraseCounter++
    
    return {
      id: `phrase_${this.phraseCounter}_${timestamp}`,
      text: text.trim(),
      confidence: Math.max(confidence, this.config.confidenceThreshold),
      timestamp,
      isComplete: type === 'final' || type === 'segmented',
      type,
      metadata: {
        rule: ruleDescription,
        weight: this.getRuleWeight(text),
        context: this.getContext(text)
      }
    }
  }

  private getRuleWeight(text: string): number {
    const matchingRule = this.rules.find(rule => {
      if (typeof rule.pattern === 'string') {
        return text.includes(rule.pattern)
      }
      return rule.pattern.test(text)
    })
    return matchingRule?.weight || 0
  }

  private getContext(text: string): string {
    if (text.length > 50) {
      return text.substring(0, 50) + '...'
    }
    return text
  }

  // Force segmentation of current buffer
  forceSegment(): Phrase[] {
    if (!this.currentBuffer.trim()) return []

    const timestamp = Date.now()
    const phrase = this.createPhrase(
      this.currentBuffer.trim(),
      0.8,
      timestamp,
      'segmented',
      'forced segmentation'
    )

    this.currentBuffer = ''
    this.lastUpdateTime = timestamp

    return [phrase]
  }

  // Get current buffer content
  getCurrentBuffer(): string {
    return this.currentBuffer
  }

  // Clear current buffer
  clearBuffer(): void {
    this.currentBuffer = ''
    this.lastUpdateTime = Date.now()
  }

  // Update configuration
  updateConfig(newConfig: Partial<SegmentationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Reinitialize rules if language changed
    if (newConfig.language && newConfig.language !== this.config.language) {
      this.rules = this.rules.filter(rule => rule.type !== 'keyword')
      this.addLanguageSpecificRules()
    }
  }

  // Get current configuration
  getConfig(): SegmentationConfig {
    return { ...this.config }
  }

  // Get all available rules
  getRules(): SegmentationRule[] {
    return [...this.rules]
  }

  // Add custom rule
  addRule(rule: SegmentationRule): void {
    this.rules.push(rule)
    // Sort by weight for optimal processing
    this.rules.sort((a, b) => b.weight - a.weight)
  }

  // Remove rule by description
  removeRule(description: string): void {
    this.rules = this.rules.filter(rule => rule.description !== description)
  }
}

// Factory function to create phrase parser
export function createPhraseParser(config?: Partial<SegmentationConfig>): PhraseParser {
  return new PhraseParser(config)
}

// Default configurations for common languages
export const DEFAULT_CONFIGS: Record<string, SegmentationConfig> = {
  'ru-RU': {
    minPhraseLength: 3,
    maxPhraseLength: 200,
    pauseThreshold: 1500,
    confidenceThreshold: 0.6,
    enableSemanticBreaks: true,
    language: 'ru-RU'
  },
  'en-US': {
    minPhraseLength: 3,
    maxPhraseLength: 200,
    pauseThreshold: 1200,
    confidenceThreshold: 0.6,
    enableSemanticBreaks: true,
    language: 'en-US'
  },
  'de-DE': {
    minPhraseLength: 3,
    maxPhraseLength: 200,
    pauseThreshold: 1500,
    confidenceThreshold: 0.6,
    enableSemanticBreaks: true,
    language: 'de-DE'
  }
}
