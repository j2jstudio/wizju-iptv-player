import { parse as parsePlaylist } from 'iptv-playlist-parser'
import type { StorableMediaItem } from '@/types/indexeddb'

/**
 * Media Parsing Service
 * Responsible for parsing M3U playlists and converting them to MediaItem format
 * Optimized for large dataset handling with IndexedDB
 */
export class MediaParsingService {
  /**
   * Parse an M3U playlist and return MediaItems
   * @param url URL of the M3U playlist
   * @returns Promise<Omit<StorableMediaItem, 'sourceId' | 'id' | 'dateAdded'>[]>
   */
  static async parseAndSaveMediaItems(
    url: string,
  ): Promise<Omit<StorableMediaItem, 'sourceId' | 'id' | 'dateAdded'>[]> {
    try {
      // Fetch M3U content
      const m3uContent = await this.fetchM3UContent(url)

      // Parse M3U content
      const parsed = parsePlaylist(m3uContent)

      if (!parsed.items || parsed.items.length === 0) {
        console.warn('No items found in M3U playlist')
        return []
      }

      console.log(`Parsing ${parsed.items.length} items from M3U playlist`)

      // Build category to number mapping
      const categoryMap = new Map<string, number>()
      let categoryCounter = 0
      parsed.items.forEach((item: any) => {
        const category = item.group?.title || 'general'
        if (!categoryMap.has(category)) {
          categoryMap.set(category, categoryCounter++)
        }
      })

      // Convert to MediaItem format (excluding sourceId, id, dateAdded)
      // Process in batches for better performance with large playlists
      const batchSize = 1000
      const mediaItems: Omit<StorableMediaItem, 'sourceId' | 'id' | 'dateAdded'>[] = []

      for (let i = 0; i < parsed.items.length; i += batchSize) {
        const batch = parsed.items.slice(i, i + batchSize)
        const batchItems = batch.map((item) => {
          const category = item.group?.title || 'general'
          return {
            title: item.name || 'Unknown',
            description: item.group?.title || '',
            thumbnail: item.tvg?.logo || '',
            category,
            category_num: categoryMap.get(category) || 0,
            url: item.url,
            type: 'live' as const, // M3U is typically for live channels
            genre: item.group?.title || '',
            timeRemaining: '',
            tvgName: item.tvg?.name || '',
            groupTitle: item.group?.title || '',
          }
        })
        mediaItems.push(...batchItems)

        // Log progress for large playlists
        if (parsed.items.length > 5000) {
          console.log(
            `Processed ${Math.min(i + batchSize, parsed.items.length)} / ${parsed.items.length} items`,
          )
        }
      }

      console.log(`Successfully parsed ${mediaItems.length} media items`)
      return mediaItems
    } catch (error) {
      console.error('Failed to parse M3U playlist:', error)
      throw new Error(
        `Failed to parse M3U playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Fetch M3U content from a URL
   * @param url URL of the M3U playlist
   * @returns Promise<string>
   */
  private static async fetchM3UContent(url: string): Promise<string> {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Fetch content from URL
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch M3U: ${response.statusText}`)
      }
      return await response.text()
    } else {
      // Assume it's direct M3U content or an invalid URL
      throw new Error(`Invalid URL format: ${url}`)
    }
  }

  /**
   * Extract unique categories from MediaItems
   * @param mediaItems Array of MediaItems
   * @returns string[] Array of categories
   */
  static extractCategories(
    mediaItems: Omit<StorableMediaItem, 'sourceId' | 'id' | 'dateAdded'>[],
  ): string[] {
    const categoriesSet = new Set<string>()

    mediaItems.forEach((item) => {
      if (item.category && item.category.trim()) {
        // Split categories by semicolon to support multiple categories
        const categories = item.category
          .split(';')
          .map((cat: string) => cat.trim())
          .filter((cat: string) => cat.length > 0)

        categories.forEach((cat: string) => categoriesSet.add(cat))
      }
    })

    // Return sorted array of categories
    return Array.from(categoriesSet).sort()
  }

  /**
   * Add sourceId to MediaItems
   * This prepares items for storage in IndexedDB
   * @param mediaItems Array of MediaItems
   * @param sourceId Source ID
   * @returns Omit<StorableMediaItem, 'id' | 'dateAdded'>[] Array of MediaItems with sourceId
   */
  static addSourceIdToMediaItems(
    mediaItems: Omit<StorableMediaItem, 'sourceId' | 'id' | 'dateAdded'>[],
    sourceId: string,
  ): Omit<StorableMediaItem, 'id' | 'dateAdded'>[] {
    return mediaItems.map((item) => ({
      ...item,
      sourceId: sourceId,
    }))
  }

  /**
   * Estimate the size of media items in bytes
   * Useful for checking storage limits before adding
   * @param mediaItems Array of media items
   * @returns number Size in bytes
   */
  static estimateSize(mediaItems: any[]): number {
    try {
      const jsonString = JSON.stringify(mediaItems)
      return new Blob([jsonString]).size
    } catch (error) {
      console.error('Failed to estimate size:', error)
      return 0
    }
  }

  /**
   * Split large datasets into smaller chunks for batch processing
   * @param mediaItems Array of media items
   * @param chunkSize Size of each chunk
   * @returns Array of chunked media items
   */
  static chunkMediaItems<T>(mediaItems: T[], chunkSize: number = 500): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < mediaItems.length; i += chunkSize) {
      chunks.push(mediaItems.slice(i, i + chunkSize))
    }
    return chunks
  }
}

/**
 * Export utility functions for component usage
 */
export const parseAndSaveMediaItems =
  MediaParsingService.parseAndSaveMediaItems.bind(MediaParsingService)
export const extractCategories = MediaParsingService.extractCategories.bind(MediaParsingService)
export const addSourceIdToMediaItems =
  MediaParsingService.addSourceIdToMediaItems.bind(MediaParsingService)
export const estimateSize = MediaParsingService.estimateSize.bind(MediaParsingService)
export const chunkMediaItems = MediaParsingService.chunkMediaItems.bind(MediaParsingService)
