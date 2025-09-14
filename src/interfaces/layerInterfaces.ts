// Layer Interfaces - Четкие интерфейсы между слоями архитектуры

// ==================== UI LAYER INTERFACES ====================

// Интерфейс для UI компонентов
export interface UIComponent {
  // Методы жизненного цикла
  mounted?(): void
  beforeDestroy?(): void
  
  // Методы для работы с данными
  loadData?(): Promise<void>
  saveData?(): Promise<void>
  
  // Методы для работы с UI
  showLoading?(loading: boolean): void
  showError?(error: string): void
  showSuccess?(message: string): void
}

// Интерфейс для работы с состоянием в UI
export interface UIStateManager {
  // Получение состояния
  getState(): any
  getGetters(): any
  
  // Подписка на изменения
  subscribe(callback: (state: any) => void): () => void
  
  // Обновление состояния
  updateState(updates: any): void
}

// ==================== BUSINESS LAYER INTERFACES ====================

// Интерфейс для бизнес-сервисов
export interface BusinessService {
  // Инициализация
  initialize(): Promise<void>
  
  // Очистка ресурсов
  cleanup(): void
  
  // Получение состояния
  getState(): any
  
  // Обработка событий
  handleEvent(event: string, data?: any): Promise<any>
}

// Интерфейс для голосовых сервисов
export interface VoiceServiceInterface extends BusinessService {
  // Управление записью
  startRecording(): Promise<void>
  stopRecording(): void
  pauseRecording(): void
  resumeRecording(): void
  
  // Обработка аудио
  processAudio(audioData: Blob): Promise<string>
  
  // События
  onTranscription(callback: (text: string) => void): void
  onError(callback: (error: Error) => void): void
  onStateChange(callback: (state: string) => void): void
}

// Интерфейс для системного аудио
export interface SystemAudioInterface extends BusinessService {
  // Управление записью системного звука
  startSystemAudioCapture(): Promise<void>
  stopSystemAudioCapture(): void
  
  // Проверка поддержки
  isSupported(): boolean
  
  // Получение состояния
  isCapturing(): boolean
  getAudioStream(): MediaStream | null
  
  // События
  onAudioData(callback: (audioBlob: Blob) => void): void
  onError(callback: (error: any) => void): void
  onStateChange(callback: (isCapturing: boolean) => void): void
}

// Интерфейс для чат сервисов
export interface ChatServiceInterface extends BusinessService {
  // Отправка сообщений
  sendMessage(message: string, options?: any): Promise<any>
  
  // Получение истории
  getHistory(): any[]
  
  // Очистка истории
  clearHistory(): void
  
  // События
  onMessage(callback: (message: any) => void): void
  onError(callback: (error: Error) => void): void
}

// Интерфейс для контекстных сервисов
export interface ContextServiceInterface extends BusinessService {
  // Управление контекстом
  setContext(context: any): void
  getContext(): any
  
  // Генерация подсказок
  generateHints(query: string): Promise<any[]>
  
  // Поиск
  search(query: string, filters?: any): Promise<any[]>
  
  // События
  onContextChange(callback: (context: any) => void): void
  onHintGenerated(callback: (hints: any[]) => void): void
}

// ==================== DATA LAYER INTERFACES ====================

// Интерфейс для stores
export interface StoreInterface {
  // Состояние
  state: any
  
  // Действия
  actions: any
  
  // Геттеры
  getters: any
  
  // Подписка на изменения
  subscribe(callback: (state: any) => void): () => void
  
  // Обновление состояния
  dispatch(action: string, payload?: any): void
}

// Интерфейс для API
export interface APIService {
  // HTTP запросы
  get(url: string, options?: any): Promise<any>
  post(url: string, data: any, options?: any): Promise<any>
  put(url: string, data: any, options?: any): Promise<any>
  delete(url: string, options?: any): Promise<any>
  
  // WebSocket
  connect(url: string): Promise<void>
  disconnect(): void
  send(data: any): void
  onMessage(callback: (data: any) => void): void
}

// ==================== LAYER COMMUNICATION INTERFACES ====================

// Интерфейс для связи UI -> Business
export interface UIBusinessInterface {
  // Инициализация сервисов
  initializeServices(): Promise<void>
  
  // Выполнение действий
  executeAction(action: string, data?: any): Promise<any>
  
  // Получение данных
  getData(key: string): any
  
  // Обновление данных
  updateData(key: string, value: any): void
}

// Интерфейс для связи Business -> Data
export interface BusinessDataInterface {
  // Сохранение данных
  saveData(key: string, data: any): Promise<void>
  
  // Загрузка данных
  loadData(key: string): Promise<any>
  
  // Удаление данных
  deleteData(key: string): Promise<void>
  
  // Подписка на изменения
  subscribe(key: string, callback: (data: any) => void): () => void
}

// Интерфейс для связи UI -> Data
export interface UIDataInterface {
  // Получение состояния
  getState(): any
  
  // Обновление состояния
  updateState(updates: any): void
  
  // Подписка на изменения
  subscribe(callback: (state: any) => void): () => void
}

// ==================== ERROR HANDLING INTERFACES ====================

// Интерфейс для обработки ошибок
export interface ErrorHandler {
  // Обработка ошибок
  handleError(error: Error, context?: string): void
  
  // Логирование ошибок
  logError(error: Error, context?: string): void
  
  // Показ ошибок пользователю
  showError(error: Error, context?: string): void
}

// Интерфейс для валидации
export interface Validator {
  // Валидация данных
  validate(data: any, schema: any): boolean
  
  // Получение ошибок валидации
  getValidationErrors(data: any, schema: any): string[]
}

// ==================== EVENT SYSTEM INTERFACES ====================

// Интерфейс для системы событий
export interface EventSystem {
  // Подписка на события
  on(event: string, callback: (data: any) => void): void
  
  // Отписка от событий
  off(event: string, callback: (data: any) => void): void
  
  // Отправка событий
  emit(event: string, data?: any): void
  
  // Очистка всех подписок
  clear(): void
}

// ==================== CONFIGURATION INTERFACES ====================

// Интерфейс для конфигурации
export interface ConfigInterface {
  // Получение конфигурации
  get(key: string): any
  
  // Установка конфигурации
  set(key: string, value: any): void
  
  // Загрузка конфигурации
  load(): Promise<void>
  
  // Сохранение конфигурации
  save(): Promise<void>
}

console.log('🏗️ [INTERFACES] Layer interfaces defined')
