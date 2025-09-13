// Stores - Простая система управления состоянием для Vue 2.7
export { useStateManager, stateActions, stateGetters, state } from './stateManager'
export { useVoiceStore, voiceActions, voiceGetters, voiceState } from './voiceStore'
export { useContextStore, contextActions, contextGetters, contextState } from './contextStore'
export { useChatStore, chatActions, chatGetters, chatState } from './chatStore'
export { useUiStore, uiActions, uiGetters, uiState } from './uiStore'

console.log('🏪 [STORES] All stores initialized')