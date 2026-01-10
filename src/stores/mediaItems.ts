import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MediaItemsStorageV2 } from '@/services/indexedDb/mediaItemsStorageV2'
import type { StorableMediaItem } from '@/types/indexeddb'

// Initialize storage service
const mediaItemsStorage = new MediaItemsStorageV2()

export const useMediaItemsStore = defineStore('mediaItems', () => {
  // Store all MediaItems, grouped by source ID
  const mediaItemsBySource = ref<Record<string, StorableMediaItem[]>>({})
  const isLoading = ref(false)

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
      isLoading.value = true
      const allItems = await mediaItemsStorage.loadItems()

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
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load MediaItems for a specific source
   */
  const loadMediaItemsBySource = async (sourceId: string): Promise<void> => {
    try {
      const items = await mediaItemsStorage.getItemsBySourceId(sourceId)
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
    itemData: Omit<StorableMediaItem, 'id' | 'dateAdded' | 'sourceId'>,
  ): Promise<StorableMediaItem> => {
    try {
      const newItem = await mediaItemsStorage.addItem({ ...itemData, sourceId })

      if (!mediaItemsBySource.value[sourceId]) {
        mediaItemsBySource.value[sourceId] = []
      }
      mediaItemsBySource.value[sourceId].push(newItem)

      return newItem
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
      await mediaItemsStorage.removeItem(itemId)

      if (mediaItemsBySource.value[sourceId]) {
        mediaItemsBySource.value[sourceId] = mediaItemsBySource.value[sourceId].filter(
          (item) => item.id !== itemId,
        )
      }
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
      const updatedItem = await mediaItemsStorage.updateItem(itemId, updates)

      if (updatedItem && mediaItemsBySource.value[sourceId]) {
        const index = mediaItemsBySource.value[sourceId].findIndex((item) => item.id === itemId)
        if (index !== -1) {
          mediaItemsBySource.value[sourceId][index] = updatedItem
        }
      }
    } catch (error) {
      console.error('Failed to update media item:', error)
      throw error
    }
  }

  /**
   * Get a MediaItem by ID (requires specifying the source ID)
   */
  const getMediaItemById = async (
    sourceId: string,
    itemId: string,
  ): Promise<StorableMediaItem | undefined> => {
    // First try from cache
    const items = mediaItemsBySource.value[sourceId] || []
    const cachedItem = items.find((item) => item.id === itemId)
    if (cachedItem) {
      return cachedItem
    }

    // Fallback to database
    return await mediaItemsStorage.getItemById(itemId)
  }

  /**
   * Get the storage usage for a specific source
   */
  const getStorageUsageBySource = async (sourceId: string): Promise<number> => {
    try {
      const items = await mediaItemsStorage.getItemsBySourceId(sourceId)
      return new Blob([JSON.stringify(items)]).size
    } catch (error) {
      console.error('Failed to get storage usage by source:', error)
      return 0
    }
  }

  /**
   * Get the total storage usage
   */
  const getTotalStorageUsage = async (): Promise<number> => {
    try {
      const estimate = await navigator.storage.estimate()
      return estimate.usage || 0
    } catch (error) {
      console.error('Failed to get total storage usage:', error)
      return 0
    }
  }

  /**
   * Clear all MediaItems for a specific source
   */
  const clearMediaItemsBySource = async (sourceId: string): Promise<void> => {
    try {
      const items = await mediaItemsStorage.getItemsBySourceId(sourceId)
      // Remove all items for this source
      await Promise.all(items.map((item) => mediaItemsStorage.removeItem(item.id)))
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
    itemsData: Omit<StorableMediaItem, 'id' | 'dateAdded' | 'sourceId'>[],
  ): Promise<void> => {
    try {
      // Add sourceId to all items
      const itemsWithSource = itemsData.map((item) => ({ ...item, sourceId }))

      // Batch add to database
      const newItems = await mediaItemsStorage.addItems(itemsWithSource)

      // Update local state
      if (!mediaItemsBySource.value[sourceId]) {
        mediaItemsBySource.value[sourceId] = []
      }
      mediaItemsBySource.value[sourceId].push(...newItems)

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
    return Object.keys(mediaItemsBySource.value)
  }

  /**
   * Get the number of MediaItems for a specific source
   */
  const getItemCountBySource = (sourceId: string): number => {
    return mediaItemsBySource.value[sourceId]?.length || 0
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
    isLoading: computed(() => isLoading.value),

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
