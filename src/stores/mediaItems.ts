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
  const loadAllMediaItems = (): void => {
    try {
      const allItems = mediaItemsStorage.loadAllItems()

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
  const loadMediaItemsBySource = (sourceId: string): void => {
    try {
      const items = mediaItemsStorage.loadItemsBySource(sourceId)
      mediaItemsBySource.value[sourceId] = items
    } catch (error) {
      console.error(`Failed to load media items for source ${sourceId}:`, error)
    }
  }

  /**
   * Add a MediaItem to a specific source
   */
  const addMediaItem = (
    sourceId: string,
    itemData: Omit<StorableMediaItem, 'id' | 'dateAdded'>,
  ): void => {
    try {
      const currentItems = mediaItemsBySource.value[sourceId] || []

      // Check storage limit before adding
      if (!mediaItemsStorage.checkStorageLimit(sourceId, currentItems, itemData)) {
        throw new Error('Storage limit exceeded')
      }

      const updatedItems = mediaItemsStorage.addItem(sourceId, currentItems, itemData)
      mediaItemsBySource.value[sourceId] = updatedItems
    } catch (error) {
      console.error('Failed to add media item:', error)
      throw error
    }
  }

  /**
   * Remove a MediaItem from a specific source
   */
  const removeMediaItem = (sourceId: string, itemId: string): void => {
    try {
      const currentItems = mediaItemsBySource.value[sourceId] || []
      const updatedItems = mediaItemsStorage.removeItem(sourceId, currentItems, itemId)
      mediaItemsBySource.value[sourceId] = updatedItems
    } catch (error) {
      console.error('Failed to remove media item:', error)
      throw error
    }
  }

  /**
   * Update a MediaItem in a specific source
   */
  const updateMediaItem = (
    sourceId: string,
    itemId: string,
    updates: Partial<StorableMediaItem>,
  ): void => {
    try {
      const currentItems = mediaItemsBySource.value[sourceId] || []
      const updatedItems = mediaItemsStorage.updateItem(sourceId, currentItems, itemId, updates)
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
  const getStorageUsageBySource = (sourceId: string): number => {
    return mediaItemsStorage.getStorageUsage(sourceId)
  }

  /**
   * Get the total storage usage
   */
  const getTotalStorageUsage = (): number => {
    const sourceIds = mediaItemsStorage.getAllSourceIds()
    return sourceIds.reduce((total, sourceId) => {
      return total + mediaItemsStorage.getStorageUsage(sourceId)
    }, 0)
  }

  /**
   * Clear all MediaItems for a specific source
   */
  const clearMediaItemsBySource = (sourceId: string): void => {
    try {
      mediaItemsStorage.clearBySource(sourceId)
      delete mediaItemsBySource.value[sourceId]
    } catch (error) {
      console.error('Failed to clear media items by source:', error)
      throw error
    }
  }

  /**
   * Clear all MediaItems
   */
  const clearAllMediaItems = (): void => {
    try {
      mediaItemsStorage.clearAll()
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
  const addMediaItemsBatch = (
    sourceId: string,
    itemsData: Omit<StorableMediaItem, 'id' | 'dateAdded'>[],
  ): void => {
    try {
      const currentItems = mediaItemsBySource.value[sourceId] || []

      // Batch create new MediaItems
      const newItems: StorableMediaItem[] = itemsData.map((itemData) => ({
        ...itemData,
        id: crypto.randomUUID(),
        dateAdded: new Date().toISOString(),
      }))

      // Merge existing and new items
      const allItems = [...currentItems, ...newItems]

      // Check the total storage limit
      const testData = JSON.stringify(allItems)
      const totalSize = new Blob([testData]).size
      const limitBytes = 5 * 1024 * 1024 // 5MB default limit

      if (totalSize > limitBytes) {
        throw new Error(
          `Storage limit exceeded. Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB, Limit: ${(limitBytes / 1024 / 1024).toFixed(2)}MB`,
        )
      }

      // Batch save to storage
      mediaItemsStorage.saveItemsBySource(sourceId, allItems)

      // Update local state
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
  const getAllSourceIds = (): string[] => {
    return mediaItemsStorage.getAllSourceIds()
  }

  /**
   * Get the number of MediaItems for a specific source
   */
  const getItemCountBySource = (sourceId: string): number => {
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
