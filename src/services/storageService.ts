/// <reference types="chrome" />
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
   * Load items from chrome.storage.local
   */
  async loadItems(): Promise<T[]> {
    try {
      const result = await chrome.storage.local.get(this.storageKey)
      return (result[this.storageKey] || []) as T[]
    } catch (error) {
      console.error(`Failed to load items from ${this.storageKey}:`, error)
      return []
    }
  }

  /**
   * Save items to chrome.storage.local
   */
  async saveItems(items: T[]): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.storageKey]: items })
    } catch (error) {
      console.error(`Failed to save items to ${this.storageKey}:`, error)
      throw error
    }
  }

  /**
   * Add a new item
   */
  async addItem(items: T[], itemData: C): Promise<T[]> {
    const newItem = {
      ...itemData,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString(),
    } as unknown as T

    const updatedItems = [...items, newItem]
    await this.saveItems(updatedItems)
    return updatedItems
  }

  /**
   * Remove an item by id
   */
  async removeItem(items: T[], id: string): Promise<T[]> {
    const updatedItems = items.filter((item) => item.id !== id)
    await this.saveItems(updatedItems)
    return updatedItems
  }

  /**
   * Update an item by id
   */
  async updateItem(items: T[], id: string, updates: Partial<T>): Promise<T[]> {
    const updatedItems = items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    await this.saveItems(updatedItems)
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
  async getStorageUsage(): Promise<number> {
    try {
      const items = await this.loadItems()
      const data = JSON.stringify(items)
      return new Blob([data]).size
    } catch {
      return 0
    }
  }

  /**
   * Check if adding new data would exceed storage limit
   */
  async checkStorageLimit(
    items: T[],
    newItemData: C,
    limitBytes: number = 5 * 1024 * 1024,
  ): Promise<boolean> {
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
  async clearAll(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.storageKey)
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
  async loadItemsBySource(sourceId: string): Promise<StorableMediaItem[]> {
    const storage = this.getStorageService(sourceId)
    return storage.loadItems()
  }

  /**
   * Load MediaItems for all sources
   */
  async loadAllItems(): Promise<StorableMediaItem[]> {
    const allItems: StorableMediaItem[] = []
    const allStorage = await chrome.storage.local.get(null)

    for (const key in allStorage) {
      if (key.startsWith('Wizju_media_items_')) {
        const items = allStorage[key] as StorableMediaItem[]
        allItems.push(...items)
      }
    }

    return allItems
  }

  /**
   * Add a MediaItem to a specific source
   */
  async addItem(
    sourceId: string,
    items: StorableMediaItem[],
    itemData: Omit<StorableMediaItem, 'id' | 'dateAdded'>,
  ): Promise<StorableMediaItem[]> {
    const storage = this.getStorageService(sourceId)
    return storage.addItem(items, itemData)
  }

  /**
   * Remove a MediaItem from a specific source
   */
  async removeItem(
    sourceId: string,
    items: StorableMediaItem[],
    itemId: string,
  ): Promise<StorableMediaItem[]> {
    const storage = this.getStorageService(sourceId)
    return storage.removeItem(items, itemId)
  }

  /**
   * Update a MediaItem for a specific source
   */
  async updateItem(
    sourceId: string,
    items: StorableMediaItem[],
    itemId: string,
    updates: Partial<StorableMediaItem>,
  ): Promise<StorableMediaItem[]> {
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
  async getStorageUsage(sourceId: string): Promise<number> {
    const storage = this.getStorageService(sourceId)
    return storage.getStorageUsage()
  }

  /**
   * Check the storage limit for a specific source
   */
  async checkStorageLimit(
    sourceId: string,
    items: StorableMediaItem[],
    newItemData: Omit<StorableMediaItem, 'id' | 'dateAdded'>,
    limitBytes: number = 5 * 1024 * 1024,
  ): Promise<boolean> {
    const storage = this.getStorageService(sourceId)
    return storage.checkStorageLimit(items, newItemData, limitBytes)
  }

  /**
   * Clear all MediaItems for a specific source
   */
  async clearBySource(sourceId: string): Promise<void> {
    const storage = this.getStorageService(sourceId)
    await storage.clearAll()
  }

  /**
   * Clear all MediaItems for all sources
   */
  async clearAll(): Promise<void> {
    const allStorage = await chrome.storage.local.get(null)
    const keysToRemove: string[] = []
    for (const key in allStorage) {
      if (key.startsWith('Wizju_media_items_')) {
        keysToRemove.push(key)
      }
    }
    await chrome.storage.local.remove(keysToRemove)
  }

  /**
   * Get a list of all source IDs with existing MediaItems
   */
  async getAllSourceIds(): Promise<string[]> {
    const allStorage = await chrome.storage.local.get(null)
    const sourceIds: string[] = []
    for (const key in allStorage) {
      if (key.startsWith('Wizju_media_items_')) {
        const sourceId = key.replace('Wizju_media_items_', '')
        sourceIds.push(sourceId)
      }
    }
    return sourceIds
  }

  /**
   * Get the total number of MediaItems for a specific source
   */
  async getItemCountBySource(sourceId: string): Promise<number> {
    const items = await this.loadItemsBySource(sourceId)
    return items.length
  }

  /**
   * Save MediaItems in bulk for a specific source
   */
  async saveItemsBySource(sourceId: string, items: StorableMediaItem[]): Promise<void> {
    const storage = this.getStorageService(sourceId)
    await storage.saveItems(items)
  }
}

export const mediaItemsStorage = new MediaItemsStorageService()

// Export the base class for creating custom storage services
export { StorageService }
