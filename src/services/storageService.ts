import type { StreamSource, CreateStreamSource, MediaItem } from '@/types/stream'

export interface StorageItem {
  readonly id: string
  readonly dateAdded: string
}

export interface CreateStorageItem {
  [key: string]: unknown
}

/**
 * Extend MediaItem to include dateAdded and sourceId for storage compatibility
 */
export interface StorableMediaItem extends MediaItem {
  readonly dateAdded: string
  readonly sourceId: string // Associated StreamSource ID
}

class StorageService<T extends StorageItem, C extends CreateStorageItem> {
  private storageKey: string

  constructor(storageKey: string) {
    this.storageKey = storageKey
  }

  /**
   * Load items from localStorage
   */
  loadItems(): T[] {
    try {
      const storedItems = localStorage.getItem(this.storageKey)
      if (storedItems) {
        return JSON.parse(storedItems) as T[]
      }
      return []
    } catch (error) {
      console.error(`Failed to load items from ${this.storageKey}:`, error)
      return []
    }
  }

  /**
   * Save items to localStorage
   */
  saveItems(items: T[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items))
    } catch (error) {
      console.error(`Failed to save items to ${this.storageKey}:`, error)
      throw error
    }
  }

  /**
   * Add a new item
   */
  addItem(items: T[], itemData: C): T[] {
    const newItem = {
      ...itemData,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString(),
    } as unknown as T

    const updatedItems = [...items, newItem]
    this.saveItems(updatedItems)
    return updatedItems
  }

  /**
   * Remove an item by id
   */
  removeItem(items: T[], id: string): T[] {
    const updatedItems = items.filter((item) => item.id !== id)
    this.saveItems(updatedItems)
    return updatedItems
  }

  /**
   * Update an item by id
   */
  updateItem(items: T[], id: string, updates: Partial<T>): T[] {
    const updatedItems = items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    this.saveItems(updatedItems)
    return updatedItems
  }

  /**
   * Get item by id
   */
  getItemById(items: T[], id: string): T | undefined {
    return items.find((item) => item.id === id)
  }

  /**
   * Check storage usage in bytes
   */
  getStorageUsage(): number {
    try {
      const data = localStorage.getItem(this.storageKey) || ''
      return new Blob([data]).size
    } catch {
      return 0
    }
  }

  /**
   * Check if adding new data would exceed storage limit
   */
  checkStorageLimit(items: T[], newItemData: C, limitBytes: number = 5 * 1024 * 1024): boolean {
    const testItem = {
      ...newItemData,
      id: 'test-id',
      dateAdded: new Date().toISOString(),
    } as unknown as T

    const testItems = [...items, testItem]
    const testData = JSON.stringify(testItems)

    return new Blob([testData]).size <= limitBytes
  }

  /**
   * Clear all items
   */
  clearAll(): void {
    try {
      localStorage.removeItem(this.storageKey)
    } catch {
      console.error(`Failed to clear ${this.storageKey}`)
    }
  }
}

// Stream Sources Storage Service
export const streamSourcesStorage = new StorageService<StreamSource, CreateStreamSource>(
  'Wizju_sources',
)

// Media Items Storage Service - Each Source is stored independently
class MediaItemsStorageService {
  private getStorageKey(sourceId: string): string {
    return `Wizju_media_items_${sourceId}`
  }

  /**
   * Get the storage service instance for a specific source
   */
  private getStorageService(
    sourceId: string,
  ): StorageService<StorableMediaItem, Omit<StorableMediaItem, 'id' | 'dateAdded'>> {
    return new StorageService<StorableMediaItem, Omit<StorableMediaItem, 'id' | 'dateAdded'>>(
      this.getStorageKey(sourceId),
    )
  }

  /**
   * Load all MediaItems for a specific source
   */
  loadItemsBySource(sourceId: string): StorableMediaItem[] {
    const storage = this.getStorageService(sourceId)
    return storage.loadItems()
  }

  /**
   * Load MediaItems for all sources
   */
  loadAllItems(): StorableMediaItem[] {
    const allItems: StorableMediaItem[] = []

    // Iterate through localStorage to find all keys related to media items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('Wizju_media_items_')) {
        const sourceId = key.replace('Wizju_media_items_', '')
        const items = this.loadItemsBySource(sourceId)
        allItems.push(...items)
      }
    }

    return allItems
  }

  /**
   * Add a MediaItem to a specific source
   */
  addItem(
    sourceId: string,
    items: StorableMediaItem[],
    itemData: Omit<StorableMediaItem, 'id' | 'dateAdded'>,
  ): StorableMediaItem[] {
    const storage = this.getStorageService(sourceId)
    return storage.addItem(items, itemData)
  }

  /**
   * Remove a MediaItem from a specific source
   */
  removeItem(sourceId: string, items: StorableMediaItem[], itemId: string): StorableMediaItem[] {
    const storage = this.getStorageService(sourceId)
    return storage.removeItem(items, itemId)
  }

  /**
   * Update a MediaItem for a specific source
   */
  updateItem(
    sourceId: string,
    items: StorableMediaItem[],
    itemId: string,
    updates: Partial<StorableMediaItem>,
  ): StorableMediaItem[] {
    const storage = this.getStorageService(sourceId)
    return storage.updateItem(items, itemId, updates)
  }

  /**
   * Get a MediaItem by ID for a specific source
   */
  getItemById(
    sourceId: string,
    items: StorableMediaItem[],
    itemId: string,
  ): StorableMediaItem | undefined {
    const storage = this.getStorageService(sourceId)
    return storage.getItemById(items, itemId)
  }

  /**
   * Check the storage usage for a specific source
   */
  getStorageUsage(sourceId: string): number {
    const storage = this.getStorageService(sourceId)
    return storage.getStorageUsage()
  }

  /**
   * Check the storage limit for a specific source
   */
  checkStorageLimit(
    sourceId: string,
    items: StorableMediaItem[],
    newItemData: Omit<StorableMediaItem, 'id' | 'dateAdded'>,
    limitBytes: number = 5 * 1024 * 1024,
  ): boolean {
    const storage = this.getStorageService(sourceId)
    return storage.checkStorageLimit(items, newItemData, limitBytes)
  }

  /**
   * Clear all MediaItems for a specific source
   */
  clearBySource(sourceId: string): void {
    const storage = this.getStorageService(sourceId)
    storage.clearAll()
  }

  /**
   * Clear all MediaItems for all sources
   */
  clearAll(): void {
    // Find all keys related to media items and delete them
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('Wizju_media_items_')) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`Failed to remove ${key}:`, error)
      }
    })
  }

  /**
   * Get a list of all source IDs with existing MediaItems
   */
  getAllSourceIds(): string[] {
    const sourceIds: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('Wizju_media_items_')) {
        const sourceId = key.replace('Wizju_media_items_', '')
        sourceIds.push(sourceId)
      }
    }
    return sourceIds
  }

  /**
   * Get the total number of MediaItems for a specific source
   */
  getItemCountBySource(sourceId: string): number {
    const items = this.loadItemsBySource(sourceId)
    return items.length
  }

  /**
   * Save MediaItems in bulk for a specific source
   */
  saveItemsBySource(sourceId: string, items: StorableMediaItem[]): void {
    const storage = this.getStorageService(sourceId)
    storage.saveItems(items)
  }
}

export const mediaItemsStorage = new MediaItemsStorageService()

// Export the base class for creating custom storage services
export { StorageService }
