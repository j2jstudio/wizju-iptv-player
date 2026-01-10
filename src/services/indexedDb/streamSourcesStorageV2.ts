/**
 * StreamSources Storage Service V2 (IndexedDB-based)
 *
 * Provides specialized storage operations for StreamSource items.
 * This service extends the generic StorageServiceV2 with StreamSource-specific queries.
 */

import type { StreamSource, CreateStreamSource } from '@/types/stream'
import { StorageServiceV2 } from './storageServiceV2'
import { STORE_NAMES, INDEX_NAMES } from '@/constants/storage'

/**
 * StreamSources Storage Service
 *
 * Handles all storage operations for stream sources (M3U, Xtream Codes, Emby).
 */
export class StreamSourcesStorageV2 extends StorageServiceV2<StreamSource, CreateStreamSource> {
  constructor() {
    super(STORE_NAMES.STREAM_SOURCES)
  }

  /**
   * Get all active stream sources
   *
   * @returns Promise that resolves to an array of active stream sources
   */
  async getActiveSources(): Promise<StreamSource[]> {
    try {
      return await this.loadItemsByIndex(
        INDEX_NAMES.STREAM_SOURCES_BY_IS_ACTIVE,
        IDBKeyRange.only(true),
      )
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to get active sources:', error)
      throw error
    }
  }

  /**
   * Get all inactive stream sources
   *
   * @returns Promise that resolves to an array of inactive stream sources
   */
  async getInactiveSources(): Promise<StreamSource[]> {
    try {
      return await this.loadItemsByIndex(
        INDEX_NAMES.STREAM_SOURCES_BY_IS_ACTIVE,
        IDBKeyRange.only(false),
      )
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to get inactive sources:', error)
      throw error
    }
  }

  /**
   * Get stream sources sorted by date added (most recent first)
   *
   * @returns Promise that resolves to an array of stream sources sorted by date
   */
  async getSourcesSortedByDate(): Promise<StreamSource[]> {
    try {
      const sources = await this.loadItemsByIndex(INDEX_NAMES.STREAM_SOURCES_BY_DATE_ADDED)
      // Sort in descending order (most recent first)
      return sources.sort(
        (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
      )
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to get sources sorted by date:', error)
      throw error
    }
  }

  /**
   * Toggle the active status of a stream source
   *
   * @param id The id of the stream source
   * @returns Promise that resolves to the updated stream source, or null if not found
   */
  async toggleSourceActive(id: string): Promise<StreamSource | null> {
    try {
      const source = await this.getItemById(id)
      if (!source) {
        return null
      }

      return await this.updateItem(id, { isActive: !source.isActive })
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to toggle source active:', error)
      throw error
    }
  }

  /**
   * Set a stream source as active (and optionally deactivate all others)
   *
   * @param id The id of the stream source to activate
   * @param deactivateOthers If true, deactivate all other sources
   * @returns Promise that resolves to the updated stream source
   */
  async setActiveSource(
    id: string,
    deactivateOthers: boolean = false,
  ): Promise<StreamSource | null> {
    try {
      if (deactivateOthers) {
        // Deactivate all sources first
        const allSources = await this.loadItems()
        for (const source of allSources) {
          if (source.id !== id && source.isActive) {
            await this.updateItem(source.id, { isActive: false })
          }
        }
      }

      // Activate the target source
      return await this.updateItem(id, { isActive: true })
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to set active source:', error)
      throw error
    }
  }

  /**
   * Update the categories of a stream source
   *
   * @param id The id of the stream source
   * @param categories The new categories array
   * @returns Promise that resolves to the updated stream source, or null if not found
   */
  async updateSourceCategories(id: string, categories: string[]): Promise<StreamSource | null> {
    try {
      return await this.updateItem(id, { categories })
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to update source categories:', error)
      throw error
    }
  }

  /**
   * Find stream sources by name (case-insensitive partial match)
   *
   * @param searchTerm The search term to match against source names
   * @returns Promise that resolves to an array of matching stream sources
   */
  async findSourcesByName(searchTerm: string): Promise<StreamSource[]> {
    try {
      const allSources = await this.loadItems()
      const lowerSearchTerm = searchTerm.toLowerCase()
      return allSources.filter((source) => source.name.toLowerCase().includes(lowerSearchTerm))
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to find sources by name:', error)
      throw error
    }
  }

  /**
   * Get stream sources by type
   *
   * @param type The media source type ('m3u', 'xtreamcode', or 'emby')
   * @returns Promise that resolves to an array of stream sources of the specified type
   */
  async getSourcesByType(type: 'm3u' | 'xtreamcode' | 'emby'): Promise<StreamSource[]> {
    try {
      const allSources = await this.loadItems()
      return allSources.filter((source) => source.type === type)
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to get sources by type:', error)
      throw error
    }
  }

  /**
   * Check if a source with the given URL already exists
   *
   * @param url The URL to check
   * @returns Promise that resolves to true if a source with this URL exists
   */
  async sourceExistsByUrl(url: string): Promise<boolean> {
    try {
      const allSources = await this.loadItems()
      return allSources.some((source) => source.url === url)
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to check source existence by URL:', error)
      throw error
    }
  }

  /**
   * Get the first active source (if any)
   *
   * @returns Promise that resolves to the first active source, or undefined
   */
  async getFirstActiveSource(): Promise<StreamSource | undefined> {
    try {
      const activeSources = await this.getActiveSources()
      return activeSources[0]
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to get first active source:', error)
      throw error
    }
  }

  /**
   * Count active sources
   *
   * @returns Promise that resolves to the count of active sources
   */
  async countActiveSources(): Promise<number> {
    try {
      return await this.countItemsByIndex(
        INDEX_NAMES.STREAM_SOURCES_BY_IS_ACTIVE,
        IDBKeyRange.only(true),
      )
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to count active sources:', error)
      throw error
    }
  }

  /**
   * Validate and add a new stream source
   *
   * Ensures no duplicate URLs and provides better error messages.
   *
   * @param sourceData The stream source data to add
   * @returns Promise that resolves to the created stream source
   * @throws Error if a source with the same URL already exists
   */
  async addValidatedSource(sourceData: CreateStreamSource): Promise<StreamSource> {
    try {
      // Check for duplicate URL
      const exists = await this.sourceExistsByUrl(sourceData.url)
      if (exists) {
        throw new Error(`A stream source with URL "${sourceData.url}" already exists`)
      }

      // Add the source
      return await this.addItem(sourceData)
    } catch (error) {
      console.error('[StreamSourcesStorageV2] Failed to add validated source:', error)
      throw error
    }
  }
}

/**
 * Create a singleton instance of StreamSourcesStorageV2
 */
export const streamSourcesStorage = new StreamSourcesStorageV2()
