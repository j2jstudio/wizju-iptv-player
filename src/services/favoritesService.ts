import type { MediaItem } from '@/types/stream'

export interface FavoriteItem {
  readonly id: string
  readonly mediaItem: MediaItem
  readonly sourceId: string
  readonly dateAdded: string
}

class FavoritesService {
  private readonly STORAGE_KEY = 'wizju-favorites'
  private readonly MAX_FAVORITES = 20

  /**
   * Retrieve all favorite items
   */
  getFavorites(): FavoriteItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []

      const favorites = JSON.parse(stored) as FavoriteItem[]
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
  isFavorite(mediaId: string, sourceId: string): boolean {
    const favorites = this.getFavorites()
    return favorites.some((fav) => fav.mediaItem.id === mediaId && fav.sourceId === sourceId)
  }

  /**
   * Add a media item to favorites
   */
  addToFavorites(mediaItem: MediaItem, sourceId: string): boolean {
    try {
      // Check if the item is already a favorite
      if (this.isFavorite(mediaItem.id, sourceId)) {
        console.warn('Media item already in favorites:', mediaItem.title)
        return false
      }

      const favorites = this.getFavorites()

      // Check if the maximum number of favorites is exceeded
      if (favorites.length >= this.MAX_FAVORITES) {
        // Remove the oldest favorite item
        favorites.pop()
      }

      const favoriteItem: FavoriteItem = {
        id: `${sourceId}-${mediaItem.id}-${Date.now()}`,
        mediaItem,
        sourceId,
        dateAdded: new Date().toISOString(),
      }

      favorites.unshift(favoriteItem)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites))

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
  removeFromFavorites(mediaId: string, sourceId: string): boolean {
    try {
      const favorites = this.getFavorites()
      const filteredFavorites = favorites.filter(
        (fav) => !(fav.mediaItem.id === mediaId && fav.sourceId === sourceId),
      )

      if (filteredFavorites.length === favorites.length) {
        console.warn('Media item not found in favorites')
        return false
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredFavorites))
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
  toggleFavorite(mediaItem: MediaItem, sourceId: string): boolean {
    if (this.isFavorite(mediaItem.id, sourceId)) {
      return this.removeFromFavorites(mediaItem.id, sourceId)
    } else {
      return this.addToFavorites(mediaItem, sourceId)
    }
  }

  /**
   * Get the count of favorite items
   */
  getFavoritesCount(): number {
    return this.getFavorites().length
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
  clearFavorites(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      console.log('All favorites cleared')
    } catch (error) {
      console.error('Failed to clear favorites:', error)
    }
  }

  /**
   * Convert favorite items to a displayable array of MediaItems
   */
  getFavoritesAsMediaItems(): MediaItem[] {
    return this.getFavorites().map((fav) => fav.mediaItem)
  }
}

export const favoritesService = new FavoritesService()
