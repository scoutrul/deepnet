// Business-Data Adapter - Слой-адаптер для связи Business и Data слоев
import type { BusinessDataInterface } from '../interfaces/layerInterfaces'
import { useStateManager } from '../stores/stateManager'

// Адаптер для связи Business и Data слоев
export class BusinessDataAdapter implements BusinessDataInterface {
  private stateManager: any | null = null
  
  constructor() {
    console.log('🔗 [ADAPTER] Business-Data adapter initialized')
  }
  
  private getStateManager() {
    if (!this.stateManager) {
      this.stateManager = useStateManager()
    }
    return this.stateManager
  }
  
  // ==================== СОХРАНЕНИЕ ДАННЫХ ====================
  
  async saveData(key: string, data: any): Promise<void> {
    try {
      console.log('🔗 [ADAPTER] Saving data:', key, data)
      
      // Сохраняем в localStorage
      localStorage.setItem(`deepnet_${key}`, JSON.stringify(data))
      
      // Обновляем состояние
      this.getStateManager().actions.updateData(key, data)
      
      console.log('🔗 [ADAPTER] Data saved successfully:', key)
    } catch (error) {
      console.error('🔗 [ADAPTER] Error saving data:', key, error)
      throw error
    }
  }
  
  // ==================== ЗАГРУЗКА ДАННЫХ ====================
  
  async loadData(key: string): Promise<any> {
    try {
      console.log('🔗 [ADAPTER] Loading data:', key)
      
      // Загружаем из localStorage
      const stored = localStorage.getItem(`deepnet_${key}`)
      
      if (stored) {
        const data = JSON.parse(stored)
        
        // Обновляем состояние
        this.getStateManager().actions.updateData(key, data)
        
        console.log('🔗 [ADAPTER] Data loaded successfully:', key)
        return data
      }
      
      console.log('🔗 [ADAPTER] No data found for key:', key)
      return null
    } catch (error) {
      console.error('🔗 [ADAPTER] Error loading data:', key, error)
      return null
    }
  }
  
  // ==================== УДАЛЕНИЕ ДАННЫХ ====================
  
  async deleteData(key: string): Promise<void> {
    try {
      console.log('🔗 [ADAPTER] Deleting data:', key)
      
      // Удаляем из localStorage
      localStorage.removeItem(`deepnet_${key}`)
      
      // Очищаем состояние
      this.getStateManager().actions.clearData(key)
      
      console.log('🔗 [ADAPTER] Data deleted successfully:', key)
    } catch (error) {
      console.error('🔗 [ADAPTER] Error deleting data:', key, error)
      throw error
    }
  }
  
  // ==================== ПОДПИСКА НА ИЗМЕНЕНИЯ ====================
  
  subscribe(key: string, callback: (data: any) => void): () => void {
    try {
      console.log('🔗 [ADAPTER] Subscribing to data changes:', key)
      
      // Подписываемся на изменения в state manager
      return this.getStateManager().actions.subscribe(key, callback)
    } catch (error) {
      console.error('🔗 [ADAPTER] Error subscribing to data changes:', key, error)
      return () => {}
    }
  }
  
  // ==================== ПОЛУЧЕНИЕ ВСЕХ ДАННЫХ ====================
  
  async getAllData(): Promise<Record<string, any>> {
    try {
      console.log('🔗 [ADAPTER] Getting all data...')
      
      const allData: Record<string, any> = {}
      
      // Получаем все ключи из localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('deepnet_')) {
          const dataKey = key.replace('deepnet_', '')
          const data = await this.loadData(dataKey)
          if (data) {
            allData[dataKey] = data
          }
        }
      }
      
      console.log('🔗 [ADAPTER] All data retrieved:', Object.keys(allData))
      return allData
    } catch (error) {
      console.error('🔗 [ADAPTER] Error getting all data:', error)
      return {}
    }
  }
  
  // ==================== ОЧИСТКА ВСЕХ ДАННЫХ ====================
  
  async clearAllData(): Promise<void> {
    try {
      console.log('🔗 [ADAPTER] Clearing all data...')
      
      // Очищаем все данные из localStorage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('deepnet_')) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Очищаем состояние
      this.getStateManager().actions.clearAllData()
      
      console.log('🔗 [ADAPTER] All data cleared')
    } catch (error) {
      console.error('🔗 [ADAPTER] Error clearing all data:', error)
      throw error
    }
  }
  
  // ==================== ЭКСПОРТ ДАННЫХ ====================
  
  async exportData(): Promise<string> {
    try {
      console.log('🔗 [ADAPTER] Exporting data...')
      
      const allData = await this.getAllData()
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        data: allData
      }
      
      const jsonString = JSON.stringify(exportData, null, 2)
      
      console.log('🔗 [ADAPTER] Data exported successfully')
      return jsonString
    } catch (error) {
      console.error('🔗 [ADAPTER] Error exporting data:', error)
      throw error
    }
  }
  
  // ==================== ИМПОРТ ДАННЫХ ====================
  
  async importData(jsonString: string): Promise<void> {
    try {
      console.log('🔗 [ADAPTER] Importing data...')
      
      const importData = JSON.parse(jsonString)
      
      if (!importData.data || typeof importData.data !== 'object') {
        throw new Error('Invalid data format')
      }
      
      // Сохраняем все данные
      for (const [key, value] of Object.entries(importData.data)) {
        await this.saveData(key, value)
      }
      
      console.log('🔗 [ADAPTER] Data imported successfully')
    } catch (error) {
      console.error('🔗 [ADAPTER] Error importing data:', error)
      throw error
    }
  }
  
  // ==================== ОЧИСТКА РЕСУРСОВ ====================
  
  cleanup(): void {
    try {
      console.log('🔗 [ADAPTER] Cleaning up Business-Data adapter...')
      
      // Очищаем подписки
      this.getStateManager().actions.clearSubscriptions()
      
      console.log('🔗 [ADAPTER] Business-Data adapter cleaned up')
    } catch (error) {
      console.error('🔗 [ADAPTER] Error cleaning up Business-Data adapter:', error)
    }
  }
}

// Создаем экземпляр адаптера
export const businessDataAdapter = new BusinessDataAdapter()

// Экспортируем для использования в сервисах
export default businessDataAdapter

console.log('🔗 [ADAPTER] Business-Data adapter created')
