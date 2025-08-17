import { parse as parsePlaylist } from 'iptv-playlist-parser'
import type { StorableMediaItem } from '@/services/storageService'

/**
 * Media Parsing Service
 * Responsible for parsing M3U playlists and converting them to MediaItem format
 */
export class MediaParsingService {
  /**
   * Parse an M3U playlist and return MediaItems
   * @param url URL of the M3U playlist
   * @returns Promise<Omit<StorableMediaItem, 'sourceId'>[]>
   */
  static async parseAndSaveMediaItems(url: string): Promise<Omit<StorableMediaItem, 'sourceId'>[]> {
    try {
      // Fetch M3U content
      const m3uContent = await this.fetchM3UContent(url)

      // Parse M3U content
      const parsed = parsePlaylist(m3uContent)

      if (!parsed.items || parsed.items.length === 0) {
        console.warn('No items found in M3U playlist')
        return []
      }

      // Convert to MediaItem format (excluding sourceId)
      const mediaItems: Omit<StorableMediaItem, 'sourceId'>[] = parsed.items.map((item) => ({
        title: item.name || 'Unknown',
        description: item.group?.title || '',
        thumbnail: item.tvg?.logo || '',
        category: item.group?.title || 'general',
        url: item.url,
        type: 'live' as const, // M3U is typically for live channels
        genre: item.group?.title || '',
        timeRemaining: '',
        tvgName: item.tvg?.name || '',
        groupTitle: item.group?.title || '',
        dateAdded: new Date().toISOString(),
        id: crypto.randomUUID(), // Temporary ID
      }))

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
  static extractCategories(mediaItems: Omit<StorableMediaItem, 'sourceId'>[]): string[] {
    const categoriesSet = new Set<string>()

    mediaItems.forEach((item) => {
      if (item.category && item.category.trim()) {
        // Split categories by semicolon to support multiple categories
        const categories = item.category
          .split(';')
          .map((cat) => cat.trim())
          .filter((cat) => cat.length > 0)

        categories.forEach((cat) => categoriesSet.add(cat))
      }
    })

    // Return sorted array of categories
    return Array.from(categoriesSet).sort()
  }

  /**
   * Add sourceId to MediaItems
   * @param mediaItems Array of MediaItems
   * @param sourceId Source ID
   * @returns StorableMediaItem[] Array of MediaItems with sourceId
   */
  static addSourceIdToMediaItems(
    mediaItems: Omit<StorableMediaItem, 'sourceId'>[],
    sourceId: string,
  ): StorableMediaItem[] {
    return mediaItems.map((item) => ({
      ...item,
      sourceId: sourceId,
    }))
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
