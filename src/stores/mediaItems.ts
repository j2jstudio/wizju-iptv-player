import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mediaItemsStorage, type StorableMediaItem } from '@/services/storageService'

export const useMediaItemsStore = defineStore('mediaItems', () => {
  // Store all MediaItems, grouped by source ID
  const mediaItemsBySource = ref<Record<string, StorableMediaItem[]>>({})

  // Computed property: get all MediaItems
  const allMediaItems = computed(() => {
    const allItems: StorableMediaItem[] = []
    Object.values(mediaItemsBySource.value).forEach((items) => {
      allItems.push(...items)
    })
    return allItems
  })

  const liveItems = computed(() => allMediaItems.value.filter((item) => item.type === 'live'))

  const vodItems = computed(() => allMediaItems.value.filter((item) => item.type === 'vod'))

  const seriesItems = computed(() => allMediaItems.value.filter((item) => item.type === 'series'))

  const getItemsByCategory = (category: string) =>
    computed(() => allMediaItems.value.filter((item) => item.category === category))

  /**
   * Get MediaItems for a specific source
   */
  const getItemsBySource = (sourceId: string) =>
    computed(() => mediaItemsBySource.value[sourceId] || [])

  /**
   * Load all MediaItems
   */
  const loadAllMediaItems = async (): Promise<void> => {
    try {
      const allItems = await mediaItemsStorage.loadAllItems()

      // Group by source ID
      const itemsBySource: Record<string, StorableMediaItem[]> = {}
      allItems.forEach((item: StorableMediaItem) => {
        if (!itemsBySource[item.sourceId]) {
          itemsBySource[item.sourceId] = []
        }
        itemsBySource[item.sourceId].push(item)
      })

      mediaItemsBySource.value = itemsBySource
    } catch (error) {
      console.error('Failed to load all media items:', error)
    }
  }

  /**
   * Load MediaItems for a specific source
   */
  const loadMediaItemsBySource = async (sourceId: string): Promise<void> => {
    try {
      const items = await mediaItemsStorage.loadItemsBySource(sourceId)
      mediaItemsBySource.value[sourceId] = items
    } catch (error) {
      console.error(`Failed to load media items for source ${sourceId}:`, error)
    }
  }

  /**
   * Add a MediaItem to a specific source
   */
  const addMediaItem = async (
    sourceId: string,
    itemData: Omit<StorableMediaItem, 'id' | 'dateAdded'>,
  ): Promise<void> => {
    try {
      const currentItems = mediaItemsBySource.value[sourceId] || []

      // Check storage limit before adding
      const withinLimit = await mediaItemsStorage.checkStorageLimit(
        sourceId,
        currentItems,
        itemData,
      )
      if (!withinLimit) {
        throw new Error('Storage limit exceeded')
      }

      const updatedItems = await mediaItemsStorage.addItem(sourceId, currentItems, itemData)
      mediaItemsBySource.value[sourceId] = updatedItems
    } catch (error) {
      console.error('Failed to add media item:', error)
      throw error
    }
  }

  /**
   * Remove a MediaItem from a specific source
   */
  const removeMediaItem = async (sourceId: string, itemId: string): Promise<void> => {
    try {
      const currentItems = mediaItemsBySource.value[sourceId] || []
      const updatedItems = await mediaItemsStorage.removeItem(sourceId, currentItems, itemId)
      mediaItemsBySource.value[sourceId] = updatedItems
    } catch (error) {
      console.error('Failed to remove media item:', error)
      throw error
    }
  }

  /**
   * Update a MediaItem in a specific source
   */
  const updateMediaItem = async (
    sourceId: string,
    itemId: string,
    updates: Partial<StorableMediaItem>,
  ): Promise<void> => {
    try {
      const currentItems = mediaItemsBySource.value[sourceId] || []
      const updatedItems = await mediaItemsStorage.updateItem(
        sourceId,
        currentItems,
        itemId,
        updates,
      )
      mediaItemsBySource.value[sourceId] = updatedItems
    } catch (error) {
      console.error('Failed to update media item:', error)
      throw error
    }
  }

  /**
   * Get a MediaItem by ID (requires specifying the source ID)
   */
  const getMediaItemById = (sourceId: string, itemId: string): StorableMediaItem | undefined => {
    const items = mediaItemsBySource.value[sourceId] || []
    return mediaItemsStorage.getItemById(sourceId, items, itemId)
  }

  /**
   * Get the storage usage for a specific source
   */
  const getStorageUsageBySource = async (sourceId: string): Promise<number> => {
    return mediaItemsStorage.getStorageUsage(sourceId)
  }

  /**
   * Get the total storage usage
   */
  const getTotalStorageUsage = async (): Promise<number> => {
    const sourceIds = await mediaItemsStorage.getAllSourceIds()
    const usages = await Promise.all(sourceIds.map((id) => mediaItemsStorage.getStorageUsage(id)))
    return usages.reduce((sum, u) => sum + u, 0)
  }

  /**
   * Clear all MediaItems for a specific source
   */
  const clearMediaItemsBySource = async (sourceId: string): Promise<void> => {
    try {
      await mediaItemsStorage.clearBySource(sourceId)
      delete mediaItemsBySource.value[sourceId]
    } catch (error) {
      console.error('Failed to clear media items by source:', error)
      throw error
    }
  }

  /**
   * Clear all MediaItems
   */
  const clearAllMediaItems = async (): Promise<void> => {
    try {
      await mediaItemsStorage.clearAll()
      mediaItemsBySource.value = {}
    } catch (error) {
      console.error('Failed to clear all media items:', error)
      throw error
    }
  }

  /**
   * Search MediaItems (optionally for a specific source)
   */
  const searchMediaItems = (query: string, sourceId?: string) =>
    computed(() => {
      const lowerQuery = query.toLowerCase()
      const itemsToSearch = sourceId
        ? mediaItemsBySource.value[sourceId] || []
        : allMediaItems.value

      return itemsToSearch.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery) ||
          item.category.toLowerCase().includes(lowerQuery) ||
          item.genre?.toLowerCase().includes(lowerQuery),
      )
    })

  /**
   * Batch add MediaItems to a specific source
   */
  const addMediaItemsBatch = async (
    sourceId: string,
    itemsData: Omit<StorableMediaItem, 'id' | 'dateAdded'>[],
  ): Promise<void> => {
    try {
      const currentItems = mediaItemsBySource.value[sourceId] || []

      const newItems: StorableMediaItem[] = itemsData.map((itemData) => ({
        ...itemData,
        id: crypto.randomUUID(),
        dateAdded: new Date().toISOString(),
      }))

      const allItems = [...currentItems, ...newItems]
      const testData = JSON.stringify(allItems)
      const totalSize = new Blob([testData]).size
      const limitBytes = 5 * 1024 * 1024

      if (totalSize > limitBytes) {
        throw new Error(
          `Storage limit exceeded. Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB, Limit: ${(limitBytes / 1024 / 1024).toFixed(2)}MB`,
        )
      }

      await mediaItemsStorage.saveItemsBySource(sourceId, allItems)
      mediaItemsBySource.value[sourceId] = allItems
      console.log(`Successfully batch added ${newItems.length} media items to source ${sourceId}`)
    } catch (error) {
      console.error('Failed to add media items batch:', error)
      throw error
    }
  }

  /**
   * Get a list of all source IDs that have data
   */
  const getAllSourceIds = async (): Promise<string[]> => {
    return mediaItemsStorage.getAllSourceIds()
  }

  /**
   * Get the number of MediaItems for a specific source
   */
  const getItemCountBySource = async (sourceId: string): Promise<number> => {
    return mediaItemsStorage.getItemCountBySource(sourceId)
  }

  // Load all data on initialization
  loadAllMediaItems()

  return {
    // Reactive data
    mediaItemsBySource: computed(() => mediaItemsBySource.value),
    allMediaItems,
    liveItems,
    vodItems,
    seriesItems,

    // Query methods
    getItemsByCategory,
    getItemsBySource,
    getMediaItemById,
    searchMediaItems,

    // Data manipulation methods
    loadAllMediaItems,
    loadMediaItemsBySource,
    addMediaItem,
    addMediaItemsBatch,
    removeMediaItem,
    updateMediaItem,
    clearMediaItemsBySource,
    clearAllMediaItems,

    // Utility methods
    getStorageUsageBySource,
    getTotalStorageUsage,
    getAllSourceIds,
    getItemCountBySource,
  }
})
