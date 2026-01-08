import type { M3UMediaItem, MediaSourceType } from '@/types/stream'
import type { FavoriteItem } from '@/types/indexeddb'
import { StorageServiceV2 } from './indexedDb/storageServiceV2'
import { STORE_NAMES } from '@/constants/storage'

/**
 * Type for creating a favorite item
 */
type CreateFavoriteItem = Omit<FavoriteItem, 'id' | 'dateAdded'>

class FavoritesService {
  private readonly storageService: StorageServiceV2<FavoriteItem, CreateFavoriteItem>
  private readonly MAX_FAVORITES = 20

  constructor() {
    this.storageService = new StorageServiceV2(STORE_NAMES.FAVORITES)
  }

  /**
   * Retrieve all favorite items
   */
  async getFavorites(): Promise<FavoriteItem[]> {
    try {
      const favorites = await this.storageService.loadItems()
      return favorites.sort(
        (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
      )
    } catch (error) {
      console.error('Failed to load favorites:', error)
      return []
    }
  }

  /**
   * Check if a media item is already a favorite
   */
  async isFavorite(mediaId: string, sourceId: string): Promise<boolean> {
    const favorites = await this.getFavorites()
    return favorites.some((fav) => fav.itemId === mediaId && fav.sourceId === sourceId)
  }

  /**
   * Add a media item to favorites
   */
  async addToFavorites(mediaItem: M3UMediaItem, sourceId: string): Promise<boolean> {
    try {
      // Check if the item is already a favorite
      if (await this.isFavorite(mediaItem.id, sourceId)) {
        console.warn('Media item already in favorites:', mediaItem.title)
        return false
      }

      const favorites = await this.getFavorites()

      // Check if the maximum number of favorites is exceeded
      if (favorites.length >= this.MAX_FAVORITES) {
        // Remove the oldest favorite item
        const oldestFavorite = favorites[favorites.length - 1]
        await this.storageService.removeItem(oldestFavorite.id)
      }

      const favoriteData: CreateFavoriteItem = {
        itemId: mediaItem.id,
        sourceId,
        type: 'm3u' as MediaSourceType,
        title: mediaItem.title,
        description: mediaItem.description,
        thumbnail: mediaItem.thumbnail,
        category: mediaItem.category,
        duration: mediaItem.duration,
        tvgName: mediaItem.tvgName,
        groupTitle: mediaItem.groupTitle,
      }

      await this.storageService.addItem(favoriteData)

      console.log('Added to favorites:', mediaItem.title)
      return true
    } catch (error) {
      console.error('Failed to add to favorites:', error)
      return false
    }
  }

  /**
   * Remove a media item from favorites
   */
  async removeFromFavorites(mediaId: string, sourceId: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites()
      const favoriteToRemove = favorites.find(
        (fav) => fav.itemId === mediaId && fav.sourceId === sourceId,
      )

      if (!favoriteToRemove) {
        console.warn('Media item not found in favorites')
        return false
      }

      await this.storageService.removeItem(favoriteToRemove.id)
      console.log('Removed from favorites:', mediaId)
      return true
    } catch (error) {
      console.error('Failed to remove from favorites:', error)
      return false
    }
  }

  /**
   * Toggle the favorite status of a media item
   */
  async toggleFavorite(mediaItem: M3UMediaItem, sourceId: string): Promise<boolean> {
    if (await this.isFavorite(mediaItem.id, sourceId)) {
      return await this.removeFromFavorites(mediaItem.id, sourceId)
    } else {
      return await this.addToFavorites(mediaItem, sourceId)
    }
  }

  /**
   * Get the count of favorite items
   */
  async getFavoritesCount(): Promise<number> {
    const favorites = await this.getFavorites()
    return favorites.length
  }

  /**
   * Get the maximum number of favorite items allowed
   */
  getMaxFavorites(): number {
    return this.MAX_FAVORITES
  }

  /**
   * Clear all favorite items
   */
  async clearFavorites(): Promise<void> {
    try {
      await this.storageService.clearAll()
      console.log('All favorites cleared')
    } catch (error) {
      console.error('Failed to clear favorites:', error)
    }
  }

  /**
   * Convert favorite items to a displayable array of MediaItems
   */
  async getFavoritesAsMediaItems(): Promise<M3UMediaItem[]> {
    const favorites = await this.getFavorites()
    return favorites.map((fav) => ({
      id: fav.itemId,
      title: fav.title,
      description: fav.description,
      thumbnail: fav.thumbnail,
      category: fav.category,
      url: '', // Not stored in favorites
      type: 'live', // Default type
      genre: fav.category,
      timeRemaining: fav.duration,
      tvgName: fav.tvgName,
      groupTitle: fav.groupTitle,
      duration: fav.duration,
    }))
  }

  /**
   * Get favorites for a specific source
   */
  async getFavoritesBySource(sourceId: string): Promise<FavoriteItem[]> {
    try {
      const favorites = await this.getFavorites()
      return favorites.filter((fav) => fav.sourceId === sourceId)
    } catch (error) {
      console.error('Failed to get favorites by source:', error)
      return []
    }
  }

  /**
   * Remove all favorites for a specific source
   */
  async removeFavoritesBySource(sourceId: string): Promise<void> {
    try {
      const favorites = await this.getFavoritesBySource(sourceId)
      await Promise.all(favorites.map((fav) => this.storageService.removeItem(fav.id)))
      console.log(`Removed all favorites for source ${sourceId}`)
    } catch (error) {
      console.error('Failed to remove favorites by source:', error)
    }
  }
}

export const favoritesService = new FavoritesService()
