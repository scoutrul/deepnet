// UI Store - Простое управление UI состоянием
import { stateActions } from './stateManager'

// Простое состояние без Composition API
const uiState = {
  // Навигация
  activePanel: 'chat' as 'chat' | 'context' | 'search' | 'settings' | 'voice',
  lastActivePanel: 'chat' as 'chat' | 'context' | 'search' | 'settings' | 'voice',
  
  // Боковая панель
  sidebarOpen: true,
  sidebarWidth: 300,
  sidebarCollapsed: false,
  
  // Тема и внешний вид
  theme: 'light' as 'light' | 'dark',
  themeSettings: {
    mode: 'light' as 'light' | 'dark' | 'auto',
    primaryColor: '#3b82f6',
    accentColor: '#8b5cf6',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    fontFamily: 'Inter, sans-serif'
  },
  
  // Уведомления
  notifications: [] as any[],
  maxNotifications: 5,
  
  // Модальные окна
  modals: [] as any[],
  activeModal: null as any,
  
  // Состояние загрузки
  loading: false,
  loadingMessage: '',
  loadingProgress: 0,
  
  // Ошибки
  error: null as string | null,
  errorDetails: null as any,
  
  // Дополнительные UI состояния
  isFullscreen: false,
  isOnline: true,
  lastActivity: null as number | null,
  
  // Статистика
  totalNotifications: 0,
  totalModals: 0,
  sessionStartTime: null as number | null
}

// UI действия
export const uiActions = {
  // Установка активной панели
  setActivePanel(panel: 'chat' | 'context' | 'search' | 'settings' | 'voice') {
    uiState.lastActivePanel = uiState.activePanel
    uiState.activePanel = panel
    uiState.lastActivity = Date.now()
    
    if (panel !== 'settings') {
      stateActions.setActivePanel(panel as 'chat' | 'context' | 'search' | 'voice')
    }
    
    console.log('🎨 [UI] Active panel set:', panel)
  },
  
  // Возврат к предыдущей панели
  goBack() {
    const lastPanel = uiState.lastActivePanel
    if (lastPanel && lastPanel !== uiState.activePanel) {
      this.setActivePanel(lastPanel)
    }
  },
  
  // Переключение боковой панели
  toggleSidebar() {
    uiState.sidebarOpen = !uiState.sidebarOpen
    uiState.lastActivity = Date.now()
    stateActions.setSidebarOpen(uiState.sidebarOpen)
    console.log('🎨 [UI] Sidebar toggled:', uiState.sidebarOpen)
  },
  
  // Установка состояния боковой панели
  setSidebarOpen(open: boolean) {
    uiState.sidebarOpen = open
    uiState.lastActivity = Date.now()
    stateActions.setSidebarOpen(open)
    console.log('🎨 [UI] Sidebar open:', open)
  },
  
  // Установка ширины боковой панели
  setSidebarWidth(width: number) {
    uiState.sidebarWidth = Math.max(200, Math.min(600, width))
    console.log('🎨 [UI] Sidebar width set:', uiState.sidebarWidth)
  },
  
  // Сворачивание боковой панели
  setSidebarCollapsed(collapsed: boolean) {
    uiState.sidebarCollapsed = collapsed
    console.log('🎨 [UI] Sidebar collapsed:', collapsed)
  },
  
  // Установка темы
  setTheme(theme: 'light' | 'dark') {
    uiState.theme = theme
    uiState.lastActivity = Date.now()
    stateActions.setTheme(theme)
    console.log('🎨 [UI] Theme set:', theme)
  },
  
  // Переключение темы
  toggleTheme() {
    const newTheme = uiState.theme === 'light' ? 'dark' : 'light'
    this.setTheme(newTheme)
  },
  
  // Обновление настроек темы
  updateThemeSettings(settings: any) {
    uiState.themeSettings = { ...uiState.themeSettings, ...settings }
    console.log('🎨 [UI] Theme settings updated:', settings)
  },
  
  // Добавление уведомления
  addNotification(notification: any) {
    const newNotification = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...notification
    }
    
    uiState.notifications.push(newNotification)
    uiState.totalNotifications++
    
    if (uiState.notifications.length > uiState.maxNotifications) {
      uiState.notifications.shift()
    }
    
    if (newNotification.duration && !newNotification.persistent) {
      setTimeout(() => {
        this.removeNotification(newNotification.id)
      }, newNotification.duration)
    }
    
    console.log('🎨 [UI] Notification added:', newNotification.message)
  },

  // Показ ошибки (через уведомления)
  showError(message: string) {
    this.addNotification({
      type: 'error',
      message: message,
      duration: 5000,
      persistent: false
    })
    console.error('🎨 [UI] Error shown:', message)
  },
  
  // Удаление уведомления
  removeNotification(id: string) {
    const index = uiState.notifications.findIndex((n: any) => n.id === id)
    if (index > -1) {
      uiState.notifications.splice(index, 1)
      console.log('🎨 [UI] Notification removed:', id)
    }
  },
  
  // Очистка всех уведомлений
  clearNotifications() {
    uiState.notifications = []
    console.log('🎨 [UI] All notifications cleared')
  },
  
  // Открытие модального окна
  openModal(modal: any) {
    const newModal = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...modal
    }
    
    uiState.modals.push(newModal)
    uiState.activeModal = newModal
    uiState.totalModals++
    
    console.log('🎨 [UI] Modal opened:', newModal.title)
  },
  
  // Закрытие модального окна
  closeModal(id?: string) {
    if (id) {
      const index = uiState.modals.findIndex((m: any) => m.id === id)
      if (index > -1) {
        uiState.modals.splice(index, 1)
        console.log('🎨 [UI] Modal closed:', id)
      }
    } else if (uiState.activeModal) {
      this.closeModal(uiState.activeModal.id)
    }
    
    uiState.activeModal = uiState.modals[uiState.modals.length - 1] || null
  },
  
  // Закрытие всех модальных окон
  closeAllModals() {
    uiState.modals = []
    uiState.activeModal = null
    console.log('🎨 [UI] All modals closed')
  },
  
  // Установка состояния загрузки
  setLoading(loading: boolean, message?: string) {
    uiState.loading = loading
    if (message) {
      uiState.loadingMessage = message
    }
    console.log('🎨 [UI] Loading state:', loading, message)
  },
  
  // Установка прогресса загрузки
  setLoadingProgress(progress: number) {
    uiState.loadingProgress = Math.max(0, Math.min(100, progress))
    console.log('🎨 [UI] Loading progress:', uiState.loadingProgress)
  },
  
  // Установка ошибки
  setError(message: string | null, details?: any) {
    uiState.error = message
    uiState.errorDetails = details
    console.log('🎨 [UI] Error set:', message, details)
  },
  
  // Очистка ошибки
  clearError() {
    uiState.error = null
    uiState.errorDetails = null
    console.log('🎨 [UI] Error cleared')
  },
  
  // Установка полноэкранного режима
  setFullscreen(fullscreen: boolean) {
    uiState.isFullscreen = fullscreen
    console.log('🎨 [UI] Fullscreen:', fullscreen)
  },
  
  // Установка онлайн статуса
  setOnline(online: boolean) {
    uiState.isOnline = online
    console.log('🎨 [UI] Online status:', online)
  },
  
  // Обновление активности
  updateActivity() {
    uiState.lastActivity = Date.now()
  },
  
  // Генерация уникального ID
  generateId(): string {
    return `ui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Инициализация
  initialize() {
    uiState.sessionStartTime = Date.now()
    console.log('🎨 [UI] UI store initialized')
  },
  
  // Очистка
  cleanup() {
    this.clearNotifications()
    this.closeAllModals()
    this.clearError()
    console.log('🎨 [UI] UI store cleaned up')
  }
}

// Простые геттеры
export const uiGetters = {
  activePanel: () => uiState.activePanel,
  lastActivePanel: () => uiState.lastActivePanel,
  isSidebarOpen: () => uiState.sidebarOpen,
  sidebarWidth: () => uiState.sidebarWidth,
  isSidebarCollapsed: () => uiState.sidebarCollapsed,
  currentTheme: () => uiState.theme,
  themeSettings: () => uiState.themeSettings,
  notifications: () => uiState.notifications,
  hasNotifications: () => uiState.notifications.length > 0,
  notificationCount: () => uiState.notifications.length,
  modals: () => uiState.modals,
  activeModal: () => uiState.activeModal,
  hasModals: () => uiState.modals.length > 0,
  modalCount: () => uiState.modals.length,
  isLoading: () => uiState.loading,
  loadingMessage: () => uiState.loadingMessage,
  loadingProgress: () => uiState.loadingProgress,
  hasError: () => uiState.error !== null,
  errorMessage: () => uiState.error,
  errorDetails: () => uiState.errorDetails,
  isFullscreen: () => uiState.isFullscreen,
  isOnline: () => uiState.isOnline,
  lastActivity: () => uiState.lastActivity,
  totalNotifications: () => uiState.totalNotifications,
  totalModals: () => uiState.totalModals,
  sessionDuration: () => {
    if (uiState.sessionStartTime) {
      return Date.now() - uiState.sessionStartTime
    }
    return 0
  }
}

// Хук для использования в компонентах
export const useUiStore = () => ({
  state: uiState,
  actions: uiActions,
  getters: uiGetters
})

// Экспорт состояния для прямого доступа
export { uiState }

console.log('🎨 [UI] UI store initialized')