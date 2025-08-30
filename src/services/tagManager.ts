// Tag management service for voice transcription phrases
import type { Phrase } from './phraseParser'

export interface Tag {
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
  isSelected: boolean
  isHovered: boolean
  isVisible: boolean
}

export interface TagSelection {
  tagId: string
  action: 'add-to-input' | 'quick-add' | 'info'
  timestamp: number
}

export interface TagManagerConfig {
  maxTags: number
  autoScroll: boolean
  selectionMode: 'single' | 'multiple'
  enableHistory: boolean
  historySize: number
}

export interface TagUpdate {
  type: 'add' | 'remove' | 'update' | 'clear'
  tags?: Tag[]
  tag?: Tag
  timestamp: number
}

class TagManager {
  private tags: Tag[] = []
  private selectedTags: Set<string> = new Set()
  private config: TagManagerConfig
  private updateQueue: TagUpdate[] = []
  private updateTimer: ReturnType<typeof setTimeout> | null = null
  private updateCallbacks: Array<(update: TagUpdate) => void> = []
  private selectionCallbacks: Array<(selection: TagSelection[]) => void> = []

  constructor(config?: Partial<TagManagerConfig>) {
    this.config = {
      maxTags: 100,
      autoScroll: true,
      selectionMode: 'multiple',
      enableHistory: true,
      historySize: 50,
      ...config
    }
  }

  addTags(phrases: Phrase[]): void {
    const newTags: Tag[] = phrases.map(phrase => ({
      ...phrase,
      isSelected: false,
      isHovered: false,
      isVisible: true
    }))

    this.updateQueue.push({
      type: 'add',
      tags: newTags,
      timestamp: Date.now()
    })

    this.scheduleUpdate()
  }

  removeTags(tagIds: string[]): void {
    this.updateQueue.push({
      type: 'remove',
      tags: this.tags.filter(tag => tagIds.includes(tag.id)),
      timestamp: Date.now()
    })

    this.scheduleUpdate()
  }

  updateTag(tagId: string, updates: Partial<Tag>): void {
    const tag = this.tags.find(t => t.id === tagId)
    if (tag) {
      const updatedTag = { ...tag, ...updates }
      this.updateQueue.push({
        type: 'update',
        tag: updatedTag,
        timestamp: Date.now()
      })

      this.scheduleUpdate()
    }
  }

  clearTags(): void {
    this.updateQueue.push({
      type: 'clear',
      timestamp: Date.now()
    })

    this.scheduleUpdate()
  }

  selectTag(tagId: string, action: TagSelection['action']): void {
    const tag = this.tags.find(t => t.id === tagId)
    if (!tag) return

    if (this.config.selectionMode === 'single') {
      this.selectedTags.clear()
      this.tags.forEach(t => t.isSelected = false)
    }

    if (this.selectedTags.has(tagId)) {
      this.selectedTags.delete(tagId)
      tag.isSelected = false
    } else {
      this.selectedTags.add(tagId)
      tag.isSelected = true
    }

    const selection: TagSelection = {
      tagId,
      action,
      timestamp: Date.now()
    }

    this.notifySelectionChange([selection])
  }

  getSelectedTags(): Tag[] {
    return this.tags.filter(tag => this.selectedTags.has(tag.id))
  }

  getSelectedTagTexts(): string[] {
    return this.getSelectedTags().map(tag => tag.text)
  }

  clearSelection(): void {
    this.selectedTags.clear()
    this.tags.forEach(tag => tag.isSelected = false)
    this.notifySelectionChange([])
  }

  setTagHover(tagId: string, isHovered: boolean): void {
    this.updateTag(tagId, { isHovered })
  }

  getTags(options?: {
    filter?: 'all' | 'selected' | 'complete' | 'interim'
    sortBy?: 'timestamp' | 'confidence' | 'text'
    sortOrder?: 'asc' | 'desc'
    limit?: number
  }): Tag[] {
    let filteredTags = [...this.tags]

    if (options?.filter) {
      switch (options.filter) {
        case 'selected':
          filteredTags = filteredTags.filter(tag => tag.isSelected)
          break
        case 'complete':
          filteredTags = filteredTags.filter(tag => tag.isComplete)
          break
        case 'interim':
          filteredTags = filteredTags.filter(tag => !tag.isComplete)
          break
      }
    }

    if (options?.sortBy) {
      filteredTags.sort((a, b) => {
        let aValue: any, bValue: any

        switch (options.sortBy) {
          case 'timestamp':
            aValue = a.timestamp
            bValue = b.timestamp
            break
          case 'confidence':
            aValue = a.confidence
            bValue = b.confidence
            break
          case 'text':
            aValue = a.text.toLowerCase()
            bValue = b.text.toLowerCase()
            break
          default:
            return 0
        }

        if (options.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1
        } else {
          return aValue > bValue ? 1 : -1
        }
      })
    }

    if (options?.limit) {
      filteredTags = filteredTags.slice(0, options.limit)
    }

    return filteredTags
  }

  getTagStats(): {
    total: number
    selected: number
    complete: number
    interim: number
    averageConfidence: number
  } {
    const total = this.tags.length
    const selected = this.selectedTags.size
    const complete = this.tags.filter(tag => tag.isComplete).length
    const interim = total - complete
    const averageConfidence = total > 0 
      ? this.tags.reduce((sum, tag) => sum + tag.confidence, 0) / total
      : 0

    return {
      total,
      selected,
      complete,
      interim,
      averageConfidence: Math.round(averageConfidence * 100) / 100
    }
  }

  private scheduleUpdate(): void {
    if (this.updateTimer) return

    const frequency = this.calculateUpdateFrequency()
    const delay = frequency > 10 ? 100 : 50

    this.updateTimer = setTimeout(() => {
      this.processUpdateQueue()
      this.updateTimer = null
    }, delay)
  }

  private calculateUpdateFrequency(): number {
    const now = Date.now()
    const recentUpdates = this.updateQueue.filter(
      update => now - update.timestamp < 1000
    )
    return recentUpdates.length
  }

  private processUpdateQueue(): void {
    const updates = this.updateQueue.splice(0)
    
    for (const update of updates) {
      switch (update.type) {
        case 'add':
          if (update.tags) {
            this.tags.push(...update.tags)
            if (this.tags.length > this.config.maxTags) {
              this.tags = this.tags.slice(-this.config.maxTags)
            }
          }
          break

        case 'remove':
          if (update.tags) {
            const tagIds = update.tags.map(tag => tag.id)
            this.tags = this.tags.filter(tag => !tagIds.includes(tag.id))
            tagIds.forEach(id => this.selectedTags.delete(id))
          }
          break

        case 'update':
          if (update.tag) {
            const index = this.tags.findIndex(tag => tag.id === update.tag!.id)
            if (index !== -1) {
              this.tags[index] = { ...this.tags[index], ...update.tag }
            }
          }
          break

        case 'clear':
          this.tags = []
          this.selectedTags.clear()
          break
      }
    }

    this.notifyUpdateCallbacks(updates)
  }

  onUpdate(callback: (update: TagUpdate) => void): void {
    this.updateCallbacks.push(callback)
  }

  onSelectionChange(callback: (selection: TagSelection[]) => void): void {
    this.selectionCallbacks.push(callback)
  }

  private notifyUpdateCallbacks(updates: TagUpdate[]): void {
    updates.forEach(update => {
      this.updateCallbacks.forEach(callback => {
        try {
          callback(update)
        } catch (error) {
          console.error('Error in update callback:', error)
        }
      })
    })
  }

  private notifySelectionChange(selection: TagSelection[]): void {
    this.selectionCallbacks.forEach(callback => {
      try {
        callback(selection)
      } catch (error) {
        console.error('Error in selection callback:', error)
      }
    })
  }

  updateConfig(newConfig: Partial<TagManagerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.maxTags && this.tags.length > newConfig.maxTags) {
      this.tags = this.tags.slice(-newConfig.maxTags)
    }
  }

  getConfig(): TagManagerConfig {
    return { ...this.config }
  }

  cleanup(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
      this.updateTimer = null
    }

    this.updateQueue = []
    this.updateCallbacks = []
    this.selectionCallbacks = []
    this.selectedTags.clear()
  }
}

export function createTagManager(config?: Partial<TagManagerConfig>): TagManager {
  return new TagManager(config)
}

export const DEFAULT_TAG_MANAGER_CONFIG: TagManagerConfig = {
  maxTags: 100,
  autoScroll: true,
  selectionMode: 'multiple',
  enableHistory: true,
  historySize: 50
}
