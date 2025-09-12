// Voice Service Factory - Создание сервисов распознавания голоса
import { DeepGramVoiceService } from './deepgramVoiceService'
import { WebSpeechVoiceService } from './voiceService'
import type { DeepGramConfig } from '../types/deepgram'
import type { VoiceRecognitionService } from './voiceService'

class VoiceServiceFactory {
  private static deepgramConfig: DeepGramConfig | null = null

  static setDeepGramConfig(config: DeepGramConfig): void {
    this.deepgramConfig = config
    console.log('🎤 [FACTORY] DeepGram config set')
  }

  static createVoiceService(): VoiceRecognitionService {
    console.log('🎤 [FACTORY] Creating voice service...')

    // Try DeepGram first if config is available and valid
    if (this.deepgramConfig && this.deepgramConfig.apiKey && this.deepgramConfig.apiKey.startsWith('sk-')) {
      try {
        console.log('🎤 [FACTORY] Creating DeepGram voice service')
        const deepgramService = new DeepGramVoiceService(this.deepgramConfig)

        // Проверяем, что DeepGram инициализировался без ошибок
        if (deepgramService) {
          console.log('🎤 [FACTORY] DeepGram service created successfully')
          return deepgramService
        }
      } catch (error) {
        console.warn('🎤 [FACTORY] Failed to create DeepGram service, falling back to Web Speech API:', error)
      }
    } else {
      if (this.deepgramConfig && this.deepgramConfig.apiKey) {
        console.log('🎤 [FACTORY] DeepGram API key format invalid, using Web Speech API')
      } else {
        console.log('🎤 [FACTORY] No DeepGram config available, using Web Speech API')
      }
    }

    // Fallback to Web Speech API
    console.log('🎤 [FACTORY] Creating Web Speech API voice service')
    return this.createWebSpeechService()
  }

  static isDeepGramAvailable(): boolean {
    return !!(this.deepgramConfig && this.deepgramConfig.apiKey)
  }

  static isWebSpeechAvailable(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  private static createWebSpeechService(): VoiceRecognitionService {
    // Use the imported WebSpeechVoiceService
    return new WebSpeechVoiceService()
  }
}

// Export the factory as the default service creator
export const createVoiceService = VoiceServiceFactory.createVoiceService.bind(VoiceServiceFactory)

// Export the factory class
export { VoiceServiceFactory }
