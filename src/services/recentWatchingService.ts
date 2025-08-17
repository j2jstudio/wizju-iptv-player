import type { MediaItem } from '@/types/stream'

/**
 * Recent Watching Service
 * Handles the management of recently watched media items
 */

export interface RecentWatchingItem {
  readonly id: string
  readonly mediaItem: MediaItem
  readonly sourceId: string
  readonly watchedAt: string
  readonly lastPosition?: number // Playback position (in seconds)
}

export interface CreateRecentWatchingItem {
  readonly mediaItem: MediaItem
  readonly sourceId: string
  readonly lastPosition?: number
}

class RecentWatchingService {
  private readonly storageKey = 'Wizju_recent_watching'
  private readonly maxItems = 20 // Maximum of 20 recently watched items

  /**
   * Load the recent watching list from localStorage
   */
  loadRecentWatching(): RecentWatchingItem[] {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const items = JSON.parse(stored) as RecentWatchingItem[]
        // Sort by watch time in descending order (newest first)
        return items.sort(
          (a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime(),
        )
      }
      return []
    } catch (error) {
      console.error('Failed to load recent watching items:', error)
      return []
    }
  }

  /**
   * Save the recent watching list to localStorage
   */
  private saveRecentWatching(items: RecentWatchingItem[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items))
    } catch (error) {
      console.error('Failed to save recent watching items:', error)
      throw error
    }
  }

  /**
   * Add a media item to the recent watching list
   * If the media item already exists, update its watch time and position
   */
  addToRecentWatching(data: CreateRecentWatchingItem): RecentWatchingItem[] {
    const items = this.loadRecentWatching()

    // Check if the same media item already exists (based on mediaItem.id and sourceId)
    const existingIndex = items.findIndex(
      (item) => item.mediaItem.id === data.mediaItem.id && item.sourceId === data.sourceId,
    )

    const newItem: RecentWatchingItem = {
      id: existingIndex >= 0 ? items[existingIndex].id : crypto.randomUUID(),
      mediaItem: data.mediaItem,
      sourceId: data.sourceId,
      watchedAt: new Date().toISOString(),
      lastPosition: data.lastPosition,
    }

    let updatedItems: RecentWatchingItem[]

    if (existingIndex >= 0) {
      // If the item already exists, update it and move it to the front
      updatedItems = [newItem, ...items.filter((_, index) => index !== existingIndex)]
    } else {
      // If it's a new item, add it to the front
      updatedItems = [newItem, ...items]
    }

    // Limit the list length
    if (updatedItems.length > this.maxItems) {
      updatedItems = updatedItems.slice(0, this.maxItems)
    }

    this.saveRecentWatching(updatedItems)
    return updatedItems
  }

  /**
   * Remove a specific item from the recent watching list
   */
  removeFromRecentWatching(itemId: string): RecentWatchingItem[] {
    const items = this.loadRecentWatching()
    const updatedItems = items.filter((item) => item.id !== itemId)
    this.saveRecentWatching(updatedItems)
    return updatedItems
  }

  /**
   * Remove all recent watching items related to a specific sourceId
   * Used when deleting a StreamSource
   */
  removeBySourceId(sourceId: string): RecentWatchingItem[] {
    const items = this.loadRecentWatching()
    const updatedItems = items.filter((item) => item.sourceId !== sourceId)
    this.saveRecentWatching(updatedItems)
    return updatedItems
  }

  /**
   * Update the playback position of a specific item
   */
  updatePlayPosition(itemId: string, position: number): RecentWatchingItem[] {
    const items = this.loadRecentWatching()
    const updatedItems = items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            lastPosition: position,
            watchedAt: new Date().toISOString(),
          }
        : item,
    )
    this.saveRecentWatching(updatedItems)
    return updatedItems
  }

  /**
   * Find a recent watching item by mediaItem ID and source ID
   */
  findRecentWatchingItem(mediaItemId: string, sourceId: string): RecentWatchingItem | undefined {
    const items = this.loadRecentWatching()
    return items.find((item) => item.mediaItem.id === mediaItemId && item.sourceId === sourceId)
  }

  /**
   * Clear all recent watching records
   */
  clearAll(): void {
    try {
      localStorage.removeItem(this.storageKey)
    } catch (error) {
      console.error('Failed to clear recent watching items:', error)
    }
  }

  /**
   * Get the storage size of the recent watching list (in bytes)
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
   * Convert RecentWatchingItem to MediaItem (for display purposes)
   * Adds additional display information
   */
  convertToDisplayMediaItems(items: RecentWatchingItem[]): MediaItem[] {
    return items.map((item) => ({
      ...item.mediaItem,
      // Add watch time information to the description
      description: this.formatWatchedInfo(item),
      // If there is a playback position, show the remaining time
      timeRemaining: item.lastPosition ? this.formatTimeRemaining(item.lastPosition) : undefined,
    }))
  }

  /**
   * Filter recent watching items by media type
   */
  getRecentWatchingByType(type: 'live' | 'vod' | 'series'): MediaItem[] {
    const items = this.loadRecentWatching()
    const filteredItems = items.filter((item) => item.mediaItem.type === type)
    return this.convertToDisplayMediaItems(filteredItems)
  }

  /**
   * Get recently watched channels (only "live" type)
   */
  getRecentChannels(): MediaItem[] {
    return this.getRecentWatchingByType('live')
  }

  /**
   * Format watch information
   */
  private formatWatchedInfo(item: RecentWatchingItem): string {
    const watchedDate = new Date(item.watchedAt)
    const now = new Date()
    const diffMs = now.getTime() - watchedDate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    let timeAgo: string
    if (diffDays > 0) {
      timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      timeAgo = 'Recently watched'
    }

    // Combine original description and watch time
    const originalDesc = item.mediaItem.description || ''
    return originalDesc ? `${originalDesc} • ${timeAgo}` : timeAgo
  }

  /**
   * Format remaining time display
   */
  private formatTimeRemaining(position: number): string {
    const minutes = Math.floor(position / 60)
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m played`
    }
    return `${minutes}min played`
  }
}

// Export singleton instance
export const recentWatchingService = new RecentWatchingService()
