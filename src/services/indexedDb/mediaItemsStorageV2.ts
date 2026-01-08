/**
 * MediaItems Storage Service V2 (IndexedDB-based)
 *
 * Provides specialized storage operations for M3U media items.
 * This service handles large datasets efficiently using cursors and pagination.
 */

import type { M3UMediaItem } from '@/types/stream'
import type { StorableMediaItem } from '@/types/indexeddb'
import { StorageServiceV2 } from './storageServiceV2'
import { getDB } from './indexedDbService'

/**
 * Type for creating a new media item
 */
export type CreateMediaItem = Omit<StorableMediaItem, 'id' | 'dateAdded'>

/**
 * MediaItems Storage Service
 *
 * Handles all storage operations for media items (live channels, VOD, series).
 * Optimized for large datasets with efficient querying and batch operations.
 */
export class MediaItemsStorageV2 extends StorageServiceV2<StorableMediaItem, CreateMediaItem> {
  constructor() {
    super('m3uMediaItems')
  }

  /**
   * Get all media items for a specific source
   *
   * @param sourceId The stream source id
   * @returns Promise that resolves to an array of media items
   */
  async getItemsBySourceId(sourceId: string): Promise<StorableMediaItem[]> {
    try {
      return await this.loadItemsByIndex('by-sourceId', sourceId)
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to get items by source id:', error)
      throw error
    }
  }

  /**
   * Get media items by source and category
   *
   * @param sourceId The stream source id
   * @param categoryNum The category number
   * @returns Promise that resolves to an array of media items
   */
  async getItemsBySourceAndCategory(
    sourceId: string,
    categoryNum: number,
  ): Promise<StorableMediaItem[]> {
    try {
      const query = IDBKeyRange.only([sourceId, categoryNum])
      return await this.loadItemsByIndex('by-sourceId-and-category_num', query)
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to get items by source and category:', error)
      throw error
    }
  }

  /**
   * Get media items by source and type
   *
   * @param sourceId The stream source id
   * @param type The media type ('live', 'vod', or 'series')
   * @returns Promise that resolves to an array of media items
   */
  async getItemsBySourceAndType(
    sourceId: string,
    type: 'live' | 'vod' | 'series',
  ): Promise<StorableMediaItem[]> {
    try {
      const query = IDBKeyRange.only([sourceId, type])
      return await this.loadItemsByIndex('by-sourceId-and-type', query)
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to get items by source and type:', error)
      throw error
    }
  }

  /**
   * Get paginated media items by source
   *
   * Efficient for large datasets - uses cursors instead of loading all items.
   *
   * @param sourceId The stream source id
   * @param offset The number of items to skip
   * @param limit The maximum number of items to return
   * @returns Promise that resolves to an array of media items
   */
  async getItemsBySourcePaginated(
    sourceId: string,
    offset: number,
    limit: number,
  ): Promise<StorableMediaItem[]> {
    try {
      return await this.getItemsByIndexPaginated('by-sourceId', sourceId, offset, limit)
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to get paginated items by source:', error)
      throw error
    }
  }

  /**
   * Get paginated media items by source and category
   *
   * @param sourceId The stream source id
   * @param categoryNum The category number
   * @param offset The number of items to skip
   * @param limit The maximum number of items to return
   * @returns Promise that resolves to an array of media items
   */
  async getItemsBySourceAndCategoryPaginated(
    sourceId: string,
    categoryNum: number,
    offset: number,
    limit: number,
  ): Promise<StorableMediaItem[]> {
    try {
      const query = IDBKeyRange.only([sourceId, categoryNum])
      return await this.getItemsByIndexPaginated(
        'by-sourceId-and-category_num',
        query,
        offset,
        limit,
      )
    } catch (error) {
      console.error(
        '[MediaItemsStorageV2] Failed to get paginated items by source and category:',
        error,
      )
      throw error
    }
  }

  /**
   * Get paginated media items by source and type
   *
   * @param sourceId The stream source id
   * @param type The media type
   * @param offset The number of items to skip
   * @param limit The maximum number of items to return
   * @returns Promise that resolves to an array of media items
   */
  async getItemsBySourceAndTypePaginated(
    sourceId: string,
    type: 'live' | 'vod' | 'series',
    offset: number,
    limit: number,
  ): Promise<StorableMediaItem[]> {
    try {
      const query = IDBKeyRange.only([sourceId, type])
      return await this.getItemsByIndexPaginated('by-sourceId-and-type', query, offset, limit)
    } catch (error) {
      console.error(
        '[MediaItemsStorageV2] Failed to get paginated items by source and type:',
        error,
      )
      throw error
    }
  }

  /**
   * Count media items by source
   *
   * @param sourceId The stream source id
   * @returns Promise that resolves to the count
   */
  async countItemsBySourceId(sourceId: string): Promise<number> {
    try {
      return await this.countItemsByIndex('by-sourceId', sourceId)
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to count items by source:', error)
      throw error
    }
  }

  /**
   * Count media items by source and type
   *
   * @param sourceId The stream source id
   * @param type The media type
   * @returns Promise that resolves to the count
   */
  async countItemsBySourceAndType(
    sourceId: string,
    type: 'live' | 'vod' | 'series',
  ): Promise<number> {
    try {
      const query = IDBKeyRange.only([sourceId, type])
      return await this.countItemsByIndex('by-sourceId-and-type', query)
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to count items by source and type:', error)
      throw error
    }
  }

  /**
   * Count media items by source and category
   *
   * @param sourceId The stream source id
   * @param categoryNum The category number
   * @returns Promise that resolves to the count
   */
  async countItemsBySourceAndCategory(sourceId: string, categoryNum: number): Promise<number> {
    try {
      const query = IDBKeyRange.only([sourceId, categoryNum])
      return await this.countItemsByIndex('by-sourceId-and-category_num', query)
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to count items by source and category:', error)
      throw error
    }
  }

  /**
   * Remove all media items for a specific source
   *
   * Useful when removing a stream source or re-importing data.
   *
   * @param sourceId The stream source id
   * @returns Promise that resolves to the count of removed items
   */
  async removeItemsBySourceId(sourceId: string): Promise<number> {
    try {
      const items = await this.getItemsBySourceId(sourceId)
      const ids = items.map((item) => item.id)
      return await this.removeItems(ids)
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to remove items by source:', error)
      throw error
    }
  }

  /**
   * Batch import media items for a source
   *
   * Optimized for large imports - uses a single transaction.
   *
   * @param sourceId The stream source id
   * @param mediaItems Array of M3U media items to import
   * @param categoryMap Map of category names to category numbers
   * @returns Promise that resolves to the count of imported items
   */
  async batchImportItems(
    sourceId: string,
    mediaItems: M3UMediaItem[],
    categoryMap: Map<string, number>,
  ): Promise<number> {
    try {
      const db = await getDB()
      const tx = db.transaction('m3uMediaItems', 'readwrite')
      const store = tx.objectStore('m3uMediaItems')

      const dateAdded = new Date().toISOString()
      let importedCount = 0

      for (const item of mediaItems) {
        const categoryNum = categoryMap.get(item.category) ?? 0
        const storableItem: StorableMediaItem = {
          ...item,
          sourceId,
          category_num: categoryNum,
          dateAdded,
        }

        try {
          await store.add(storableItem)
          importedCount++
        } catch (error) {
          console.warn(`[MediaItemsStorageV2] Failed to import item ${item.id}:`, error)
        }
      }

      await tx.done
      console.log(`[MediaItemsStorageV2] Imported ${importedCount} items for source ${sourceId}`)
      return importedCount
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to batch import items:', error)
      throw error
    }
  }

  /**
   * Replace all items for a source (remove old + import new)
   *
   * Useful when re-parsing a stream source.
   *
   * @param sourceId The stream source id
   * @param mediaItems Array of new media items
   * @param categoryMap Map of category names to category numbers
   * @returns Promise that resolves to the count of imported items
   */
  async replaceItemsForSource(
    sourceId: string,
    mediaItems: M3UMediaItem[],
    categoryMap: Map<string, number>,
  ): Promise<number> {
    try {
      console.log(`[MediaItemsStorageV2] Replacing items for source ${sourceId}`)

      // Remove old items
      const removedCount = await this.removeItemsBySourceId(sourceId)
      console.log(`[MediaItemsStorageV2] Removed ${removedCount} old items`)

      // Import new items
      const importedCount = await this.batchImportItems(sourceId, mediaItems, categoryMap)
      console.log(`[MediaItemsStorageV2] Imported ${importedCount} new items`)

      return importedCount
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to replace items for source:', error)
      throw error
    }
  }

  /**
   * Search media items by title (case-insensitive partial match)
   *
   * Note: This is not indexed, so it's slower for large datasets.
   * Consider using a full-text search solution for better performance.
   *
   * @param sourceId The stream source id
   * @param searchTerm The search term
   * @returns Promise that resolves to an array of matching items
   */
  async searchItemsByTitle(sourceId: string, searchTerm: string): Promise<StorableMediaItem[]> {
    try {
      const items = await this.getItemsBySourceId(sourceId)
      const lowerSearchTerm = searchTerm.toLowerCase()
      return items.filter((item) => item.title.toLowerCase().includes(lowerSearchTerm))
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to search items by title:', error)
      throw error
    }
  }

  /**
   * Get unique categories for a source
   *
   * @param sourceId The stream source id
   * @returns Promise that resolves to an array of unique category names
   */
  async getCategoriesBySource(sourceId: string): Promise<string[]> {
    try {
      const items = await this.getItemsBySourceId(sourceId)
      const uniqueCategories = new Set(items.map((item) => item.category))
      return Array.from(uniqueCategories).sort()
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to get categories by source:', error)
      throw error
    }
  }

  /**
   * Get media items sorted by date (most recent first)
   *
   * @param sourceId Optional source id to filter by
   * @param limit Optional limit on the number of items
   * @returns Promise that resolves to an array of media items
   */
  async getItemsSortedByDate(sourceId?: string, limit?: number): Promise<StorableMediaItem[]> {
    try {
      let items: StorableMediaItem[]

      if (sourceId) {
        items = await this.getItemsBySourceId(sourceId)
      } else {
        items = await this.loadItemsByIndex('by-dateAdded')
      }

      // Sort in descending order (most recent first)
      items.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())

      if (limit) {
        return items.slice(0, limit)
      }

      return items
    } catch (error) {
      console.error('[MediaItemsStorageV2] Failed to get items sorted by date:', error)
      throw error
    }
  }
}

/**
 * Create a singleton instance of MediaItemsStorageV2
 */
export const mediaItemsStorage = new MediaItemsStorageV2()
