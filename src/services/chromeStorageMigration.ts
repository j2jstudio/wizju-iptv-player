/**
 * Chrome Storage Migration Service
 *
 * Handles the migration of data from chrome.storage.local to IndexedDB.
 * This is a one-time migration process that runs when the Chrome extension
 * detects old chrome.storage data that needs to be migrated.
 *
 * Migration Process:
 * 1. Detect if chrome.storage.local contains old data
 * 2. Backup existing chrome.storage data metadata
 * 3. Migrate data to IndexedDB with validation
 * 4. Clean up chrome.storage after successful migration
 * 5. Mark migration as complete
 */

import type { StreamSource, M3UMediaItem } from '@/types/stream'
import type { StorableMediaItem } from '@/types/indexeddb'
import { StreamSourcesStorageV2 } from './indexedDb/streamSourcesStorageV2'
import { MediaItemsStorageV2 } from './indexedDb/mediaItemsStorageV2'
import { getDB, initDB } from './indexedDb/indexedDbService'
import { CHROME_STORAGE_KEYS, MIGRATION_KEYS, STORE_NAMES } from '@/constants/storage'

/**
 * Check if Chrome extension APIs are available
 */
export function isChromeExtension(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.storage !== 'undefined' &&
    typeof chrome.storage.local !== 'undefined'
  )
}

/**
 * Migration result interface
 */
export interface ChromeMigrationResult {
  success: boolean
  migratedSources: number
  migratedMediaItems: number
  migratedFavorites: number
  migratedRecents: number
  errors: string[]
}

/**
 * Migration progress callback
 */
export type ChromeMigrationProgressCallback = (progress: {
  stage: string
  current: number
  total: number
  message: string
}) => void

/**
 * Chrome Storage data interface
 */
interface ChromeStorageData {
  streamSources: StreamSource[]
  mediaItems: StorableMediaItem[]
  favorites: OldFavoriteItem[]
  recentWatching: OldRecentWatchingItem[]
}

/**
 * Old favorite item structure from chrome.storage
 */
interface OldFavoriteItem {
  readonly id: string
  readonly mediaItem: M3UMediaItem
  readonly sourceId: string
  readonly dateAdded: string
}

/**
 * Old recent watching item structure from chrome.storage
 */
interface OldRecentWatchingItem {
  readonly id: string
  readonly mediaItem: M3UMediaItem
  readonly sourceId: string
  readonly watchedAt: string
  readonly lastPosition?: number
}

/**
 * Chrome Storage Migration Service
 */
export class ChromeStorageMigrationService {
  private streamSourcesStorage: StreamSourcesStorageV2
  private mediaItemsStorage: MediaItemsStorageV2

  constructor() {
    this.streamSourcesStorage = new StreamSourcesStorageV2()
    this.mediaItemsStorage = new MediaItemsStorageV2()
  }

  /**
   * Check if running in Chrome extension environment
   */
  isAvailable(): boolean {
    return isChromeExtension()
  }

  /**
   * Detect if old chrome.storage data exists
   *
   * @returns true if migration is needed
   */
  async detectOldData(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log('[ChromeMigration] Not running in Chrome extension environment')
      return false
    }

    try {
      // Check if migration has already been completed (stored in chrome.storage)
      const migrationResult = await chrome.storage.local.get(MIGRATION_KEYS.CHROME_STATUS)
      if (migrationResult[MIGRATION_KEYS.CHROME_STATUS] === 'completed') {
        console.log('[ChromeMigration] Migration already completed')
        return false
      }

      // Check if any chrome.storage data exists
      const result = await chrome.storage.local.get(null)

      const hasStreamSources = !!result[CHROME_STORAGE_KEYS.STREAM_SOURCES]
      const hasMediaItems = this.hasMediaItemsInChromeStorage(result)
      const hasFavorites = !!result[CHROME_STORAGE_KEYS.FAVORITES]
      const hasRecentWatching = !!result[CHROME_STORAGE_KEYS.RECENT_WATCHING]

      const hasOldData = hasStreamSources || hasMediaItems || hasFavorites || hasRecentWatching

      if (hasOldData) {
        console.log('[ChromeMigration] Old chrome.storage data detected:', {
          streamSources: hasStreamSources,
          mediaItems: hasMediaItems,
          favorites: hasFavorites,
          recentWatching: hasRecentWatching,
        })
      }

      return hasOldData
    } catch (error) {
      console.error('[ChromeMigration] Error detecting old data:', error)
      return false
    }
  }

  /**
   * Check if there are any media items in chrome.storage
   * Media items are stored with prefix Wizju_media_items_{sourceId}
   */
  private hasMediaItemsInChromeStorage(allStorage: Record<string, unknown>): boolean {
    for (const key in allStorage) {
      if (key.startsWith(CHROME_STORAGE_KEYS.MEDIA_ITEMS_PREFIX)) {
        return true
      }
    }
    return false
  }

  /**
   * Load all media items from chrome.storage
   * Media items are stored with prefix Wizju_media_items_{sourceId}
   */
  private loadMediaItemsFromChromeStorage(
    allStorage: Record<string, unknown>,
  ): StorableMediaItem[] {
    const allItems: StorableMediaItem[] = []

    for (const key in allStorage) {
      if (key.startsWith(CHROME_STORAGE_KEYS.MEDIA_ITEMS_PREFIX)) {
        try {
          const sourceId = key.replace(CHROME_STORAGE_KEYS.MEDIA_ITEMS_PREFIX, '')
          const items = allStorage[key] as StorableMediaItem[]
          if (Array.isArray(items)) {
            // Ensure sourceId is set on each item
            items.forEach((item) => {
              if (!item.sourceId) {
                ;(item as { sourceId: string }).sourceId = sourceId
              }
            })
            allItems.push(...items)
          }
        } catch (error) {
          console.error(`[ChromeMigration] Failed to parse media items from ${key}:`, error)
        }
      }
    }

    return allItems
  }

  /**
   * Get all media items chrome.storage keys
   */
  private getMediaItemsChromeStorageKeys(allStorage: Record<string, unknown>): string[] {
    const keys: string[] = []
    for (const key in allStorage) {
      if (key.startsWith(CHROME_STORAGE_KEYS.MEDIA_ITEMS_PREFIX)) {
        keys.push(key)
      }
    }
    return keys
  }

  /**
   * Read all data from chrome.storage
   *
   * @returns Chrome Storage data or null if no data exists
   */
  private async readChromeStorageData(): Promise<ChromeStorageData | null> {
    try {
      const allStorage = await chrome.storage.local.get(null)

      const streamSourcesRaw = allStorage[CHROME_STORAGE_KEYS.STREAM_SOURCES]
      const favoritesRaw = allStorage[CHROME_STORAGE_KEYS.FAVORITES]
      const recentWatchingRaw = allStorage[CHROME_STORAGE_KEYS.RECENT_WATCHING]

      // Media items are stored per source, need to aggregate them
      const mediaItems = this.loadMediaItemsFromChromeStorage(allStorage)

      const data: ChromeStorageData = {
        streamSources: Array.isArray(streamSourcesRaw) ? streamSourcesRaw : [],
        mediaItems: mediaItems,
        favorites: Array.isArray(favoritesRaw) ? favoritesRaw : [],
        recentWatching: Array.isArray(recentWatchingRaw) ? recentWatchingRaw : [],
      }

      console.log('[ChromeMigration] Read chrome.storage data:', {
        streamSources: data.streamSources.length,
        mediaItems: data.mediaItems.length,
        favorites: data.favorites.length,
        recentWatching: data.recentWatching.length,
      })

      return data
    } catch (error) {
      console.error('[ChromeMigration] Error reading chrome.storage data:', error)
      return null
    }
  }

  /**
   * Backup chrome.storage data before migration
   *
   * Note: Instead of copying all data (which may exceed quota), we just record
   * the keys that contain data. The original data serves as its own backup
   * until migration is validated and cleanup occurs.
   */
  private async backupChromeStorageData(): Promise<void> {
    try {
      const allStorage = await chrome.storage.local.get(null)
      const mediaItemsKeys = this.getMediaItemsChromeStorageKeys(allStorage)

      // Only store metadata about what exists, not the actual data
      // The original chrome.storage data IS the backup until we clean it up
      const backupMetadata = {
        hasStreamSources: !!allStorage[CHROME_STORAGE_KEYS.STREAM_SOURCES],
        mediaItemsKeys: mediaItemsKeys,
        hasFavorites: !!allStorage[CHROME_STORAGE_KEYS.FAVORITES],
        hasRecentWatching: !!allStorage[CHROME_STORAGE_KEYS.RECENT_WATCHING],
        timestamp: new Date().toISOString(),
      }

      await chrome.storage.local.set({
        [MIGRATION_KEYS.CHROME_BACKUP]: JSON.stringify(backupMetadata),
      })
      console.log('[ChromeMigration] Backup metadata created successfully')
    } catch (error) {
      // Even if metadata backup fails, we can proceed since original data is still intact
      console.warn('[ChromeMigration] Failed to create backup metadata:', error)
      console.log(
        '[ChromeMigration] Proceeding without backup metadata - original data is still intact',
      )
    }
  }

  /**
   * Migrate stream sources from chrome.storage to IndexedDB
   *
   * @param sources Array of stream sources to migrate
   * @param onProgress Progress callback
   * @returns Number of successfully migrated sources
   */
  private async migrateStreamSources(
    sources: StreamSource[],
    onProgress?: ChromeMigrationProgressCallback,
  ): Promise<number> {
    if (sources.length === 0) {
      return 0
    }

    console.log(`[ChromeMigration] Migrating ${sources.length} stream sources...`)
    let migratedCount = 0

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i]
      try {
        // Add source to IndexedDB directly with existing ID
        const db = await getDB()
        await db.add(STORE_NAMES.STREAM_SOURCES, source)

        migratedCount++
        onProgress?.({
          stage: 'sources',
          current: i + 1,
          total: sources.length,
          message: `Migrating source: ${source.name}`,
        })
      } catch (error) {
        console.error(`[ChromeMigration] Failed to migrate source ${source.id}:`, error)
      }
    }

    console.log(
      `[ChromeMigration] Successfully migrated ${migratedCount}/${sources.length} sources`,
    )
    return migratedCount
  }

  /**
   * Migrate media items from chrome.storage to IndexedDB
   *
   * @param mediaItems Array of media items to migrate
   * @param onProgress Progress callback
   * @returns Number of successfully migrated media items
   */
  private async migrateMediaItems(
    mediaItems: StorableMediaItem[],
    onProgress?: ChromeMigrationProgressCallback,
  ): Promise<number> {
    if (mediaItems.length === 0) {
      return 0
    }

    console.log(`[ChromeMigration] Migrating ${mediaItems.length} media items...`)

    // Use batch operation for better performance
    try {
      const BATCH_SIZE = 1000
      let migratedCount = 0

      for (let i = 0; i < mediaItems.length; i += BATCH_SIZE) {
        const batch = mediaItems.slice(i, i + BATCH_SIZE)

        // Convert to create format (remove id and dateAdded, will be regenerated)
        const createBatch = batch.map((item) => ({
          title: item.title,
          description: item.description,
          thumbnail: item.thumbnail,
          duration: item.duration,
          category: item.category,
          url: item.url,
          type: item.type,
          genre: item.genre,
          year: item.year,
          rating: item.rating,
          timeRemaining: item.timeRemaining,
          tvgName: item.tvgName,
          groupTitle: item.groupTitle,
          sourceId: item.sourceId,
          category_num: item.category_num,
        }))

        await this.mediaItemsStorage.addItems(createBatch)
        migratedCount += batch.length

        onProgress?.({
          stage: 'mediaItems',
          current: Math.min(i + BATCH_SIZE, mediaItems.length),
          total: mediaItems.length,
          message: `Migrating media items: ${migratedCount}/${mediaItems.length}`,
        })
      }

      console.log(`[ChromeMigration] Successfully migrated ${migratedCount} media items`)
      return migratedCount
    } catch (error) {
      console.error('[ChromeMigration] Failed to migrate media items:', error)
      throw error
    }
  }

  /**
   * Migrate favorites from chrome.storage to IndexedDB
   *
   * @param favorites Array of old favorite items
   * @param onProgress Progress callback
   * @returns Number of successfully migrated favorites
   */
  private async migrateFavorites(
    favorites: OldFavoriteItem[],
    onProgress?: ChromeMigrationProgressCallback,
  ): Promise<number> {
    if (favorites.length === 0) {
      return 0
    }

    console.log(`[ChromeMigration] Migrating ${favorites.length} favorites...`)
    let migratedCount = 0

    try {
      const db = await getDB()
      const tx = db.transaction(STORE_NAMES.FAVORITES, 'readwrite')
      const store = tx.objectStore(STORE_NAMES.FAVORITES)

      for (let i = 0; i < favorites.length; i++) {
        const oldFav = favorites[i]
        try {
          const newFav = {
            id: oldFav.id,
            itemId: oldFav.mediaItem.id,
            sourceId: oldFav.sourceId,
            type: 'm3u' as const,
            dateAdded: oldFav.dateAdded,
            title: oldFav.mediaItem.title,
            description: oldFav.mediaItem.description,
            thumbnail: oldFav.mediaItem.thumbnail,
            duration: oldFav.mediaItem.duration,
            category: oldFav.mediaItem.category,
            tvgName: oldFav.mediaItem.tvgName,
            groupTitle: oldFav.mediaItem.groupTitle,
          }

          await store.add(newFav)
          migratedCount++

          onProgress?.({
            stage: 'favorites',
            current: i + 1,
            total: favorites.length,
            message: `Migrating favorites: ${migratedCount}/${favorites.length}`,
          })
        } catch (error) {
          console.error(`[ChromeMigration] Failed to migrate favorite ${oldFav.id}:`, error)
        }
      }

      await tx.done
      console.log(
        `[ChromeMigration] Successfully migrated ${migratedCount}/${favorites.length} favorites`,
      )
      return migratedCount
    } catch (error) {
      console.error('[ChromeMigration] Failed to migrate favorites:', error)
      throw error
    }
  }

  /**
   * Migrate recent watching from chrome.storage to IndexedDB
   *
   * @param recentItems Array of old recent watching items
   * @param onProgress Progress callback
   * @returns Number of successfully migrated recent watching items
   */
  private async migrateRecentWatching(
    recentItems: OldRecentWatchingItem[],
    onProgress?: ChromeMigrationProgressCallback,
  ): Promise<number> {
    if (recentItems.length === 0) {
      return 0
    }

    console.log(`[ChromeMigration] Migrating ${recentItems.length} recent watching items...`)
    let migratedCount = 0

    try {
      const db = await getDB()
      const tx = db.transaction(STORE_NAMES.RECENT_WATCHING, 'readwrite')
      const store = tx.objectStore(STORE_NAMES.RECENT_WATCHING)

      for (let i = 0; i < recentItems.length; i++) {
        const oldRecent = recentItems[i]
        try {
          const newRecent = {
            id: oldRecent.id,
            itemId: oldRecent.mediaItem.id,
            sourceId: oldRecent.sourceId,
            type: 'm3u' as const,
            watchedAt: oldRecent.watchedAt,
            lastPosition: oldRecent.lastPosition,
            title: oldRecent.mediaItem.title,
            description: oldRecent.mediaItem.description,
            thumbnail: oldRecent.mediaItem.thumbnail,
            duration: oldRecent.mediaItem.duration,
            category: oldRecent.mediaItem.category,
            tvgName: oldRecent.mediaItem.tvgName,
            groupTitle: oldRecent.mediaItem.groupTitle,
            dateAdded: oldRecent.watchedAt, // Use watchedAt as dateAdded for migration
          }

          await store.add(newRecent)
          migratedCount++

          onProgress?.({
            stage: 'recentWatching',
            current: i + 1,
            total: recentItems.length,
            message: `Migrating recent watching: ${migratedCount}/${recentItems.length}`,
          })
        } catch (error) {
          console.error(
            `[ChromeMigration] Failed to migrate recent watching ${oldRecent.id}:`,
            error,
          )
        }
      }

      await tx.done
      console.log(
        `[ChromeMigration] Successfully migrated ${migratedCount}/${recentItems.length} recent watching items`,
      )
      return migratedCount
    } catch (error) {
      console.error('[ChromeMigration] Failed to migrate recent watching:', error)
      throw error
    }
  }

  /**
   * Validate migration by comparing counts
   *
   * @param oldData Original chrome.storage data
   * @param result Migration result
   * @returns true if validation passes
   */
  private async validateMigration(
    oldData: ChromeStorageData,
    result: ChromeMigrationResult,
  ): Promise<boolean> {
    try {
      console.log('[ChromeMigration] Validating migration...')

      // Validate stream sources
      const migratedSources = await this.streamSourcesStorage.loadItems()
      const sourcesMatch = migratedSources.length >= oldData.streamSources.length

      // Validate media items
      const migratedMediaItems = await this.mediaItemsStorage.loadItems()
      const mediaItemsMatch = migratedMediaItems.length >= oldData.mediaItems.length

      // Validate favorites
      const db = await getDB()
      const favoritesCount = await db.count(STORE_NAMES.FAVORITES)
      const favoritesMatch = favoritesCount >= oldData.favorites.length

      // Validate recent watching
      const recentWatchingCount = await db.count(STORE_NAMES.RECENT_WATCHING)
      const recentWatchingMatch = recentWatchingCount >= oldData.recentWatching.length

      const allMatch = sourcesMatch && mediaItemsMatch && favoritesMatch && recentWatchingMatch

      console.log('[ChromeMigration] Validation results:', {
        sources: {
          expected: oldData.streamSources.length,
          actual: migratedSources.length,
          match: sourcesMatch,
        },
        mediaItems: {
          expected: oldData.mediaItems.length,
          actual: migratedMediaItems.length,
          match: mediaItemsMatch,
        },
        favorites: {
          expected: oldData.favorites.length,
          actual: favoritesCount,
          match: favoritesMatch,
        },
        recentWatching: {
          expected: oldData.recentWatching.length,
          actual: recentWatchingCount,
          match: recentWatchingMatch,
        },
      })

      if (!allMatch) {
        result.errors.push('Validation failed: Data counts do not match')
      }

      return allMatch
    } catch (error) {
      console.error('[ChromeMigration] Validation error:', error)
      result.errors.push(`Validation error: ${error}`)
      return false
    }
  }

  /**
   * Clean up chrome.storage after successful migration
   */
  private async cleanupOldStorage(): Promise<void> {
    try {
      console.log('[ChromeMigration] Cleaning up old chrome.storage data...')

      const allStorage = await chrome.storage.local.get(null)
      const keysToRemove: string[] = [
        CHROME_STORAGE_KEYS.STREAM_SOURCES,
        CHROME_STORAGE_KEYS.FAVORITES,
        CHROME_STORAGE_KEYS.RECENT_WATCHING,
      ]

      // Add all media items keys
      const mediaItemsKeys = this.getMediaItemsChromeStorageKeys(allStorage)
      keysToRemove.push(...mediaItemsKeys)

      // Remove old data
      await chrome.storage.local.remove(keysToRemove)

      // Mark migration as complete
      await chrome.storage.local.set({
        [MIGRATION_KEYS.CHROME_STATUS]: 'completed',
      })

      console.log('[ChromeMigration] Cleanup completed successfully')
    } catch (error) {
      console.error('[ChromeMigration] Cleanup error:', error)
      throw new Error('Failed to cleanup old storage')
    }
  }

  /**
   * Restore from backup (in case of migration failure)
   *
   * Note: Since we don't copy data anymore (to avoid quota issues),
   * "restoring" just means the original data is still there.
   * This method now just clears any partial IndexedDB data and
   * removes the migration status so migration can be retried.
   */
  async restoreFromBackup(): Promise<boolean> {
    try {
      console.log('[ChromeMigration] Rolling back - original chrome.storage data is still intact')

      // Clear any partial data that was migrated to IndexedDB
      try {
        const db = await getDB()
        const tx = db.transaction(
          [
            STORE_NAMES.STREAM_SOURCES,
            STORE_NAMES.MEDIA_ITEMS,
            STORE_NAMES.FAVORITES,
            STORE_NAMES.RECENT_WATCHING,
          ],
          'readwrite',
        )
        await Promise.all([
          tx.objectStore(STORE_NAMES.STREAM_SOURCES).clear(),
          tx.objectStore(STORE_NAMES.MEDIA_ITEMS).clear(),
          tx.objectStore(STORE_NAMES.FAVORITES).clear(),
          tx.objectStore(STORE_NAMES.RECENT_WATCHING).clear(),
        ])
        await tx.done
        console.log('[ChromeMigration] Cleared partial IndexedDB data')
      } catch (dbError) {
        console.warn('[ChromeMigration] Failed to clear IndexedDB data:', dbError)
      }

      // Remove migration status so it can be retried
      await chrome.storage.local.remove([
        MIGRATION_KEYS.CHROME_STATUS,
        MIGRATION_KEYS.CHROME_BACKUP,
      ])

      console.log('[ChromeMigration] Rollback completed - original data preserved')
      return true
    } catch (error) {
      console.error('[ChromeMigration] Failed to rollback:', error)
      return false
    }
  }

  /**
   * Execute the full migration process
   *
   * @param onProgress Optional progress callback
   * @returns Migration result
   */
  async executeMigration(
    onProgress?: ChromeMigrationProgressCallback,
  ): Promise<ChromeMigrationResult> {
    const result: ChromeMigrationResult = {
      success: false,
      migratedSources: 0,
      migratedMediaItems: 0,
      migratedFavorites: 0,
      migratedRecents: 0,
      errors: [],
    }

    if (!this.isAvailable()) {
      result.errors.push('Chrome extension APIs not available')
      return result
    }

    try {
      console.log('[ChromeMigration] Starting migration process...')

      // Initialize IndexedDB
      onProgress?.({
        stage: 'initialization',
        current: 0,
        total: 1,
        message: 'Initializing IndexedDB...',
      })

      await initDB()

      // Read chrome.storage data
      onProgress?.({
        stage: 'reading',
        current: 0,
        total: 1,
        message: 'Reading chrome.storage data...',
      })

      const oldData = await this.readChromeStorageData()
      if (!oldData) {
        result.errors.push('Failed to read chrome.storage data')
        return result
      }

      // Create backup
      onProgress?.({
        stage: 'backup',
        current: 0,
        total: 1,
        message: 'Creating backup...',
      })

      await this.backupChromeStorageData()

      // Migrate data
      result.migratedSources = await this.migrateStreamSources(oldData.streamSources, onProgress)
      result.migratedMediaItems = await this.migrateMediaItems(oldData.mediaItems, onProgress)
      result.migratedFavorites = await this.migrateFavorites(oldData.favorites, onProgress)
      result.migratedRecents = await this.migrateRecentWatching(oldData.recentWatching, onProgress)

      // Validate migration
      onProgress?.({
        stage: 'validation',
        current: 0,
        total: 1,
        message: 'Validating migration...',
      })

      const validationPassed = await this.validateMigration(oldData, result)

      if (validationPassed) {
        // Clean up chrome.storage
        onProgress?.({
          stage: 'cleanup',
          current: 0,
          total: 1,
          message: 'Cleaning up old data...',
        })

        await this.cleanupOldStorage()
        result.success = true
        console.log('[ChromeMigration] Migration completed successfully')
      } else {
        result.errors.push('Validation failed, keeping original data')
        console.error('[ChromeMigration] Migration validation failed')
      }
    } catch (error) {
      console.error('[ChromeMigration] Migration failed:', error)
      result.errors.push(`Migration error: ${error}`)
      result.success = false

      // Attempt to restore from backup
      onProgress?.({
        stage: 'rollback',
        current: 0,
        total: 1,
        message: 'Rolling back changes...',
      })

      await this.restoreFromBackup()
    }

    return result
  }

  /**
   * Get migration status
   *
   * @returns Migration status: 'completed', 'pending', or 'none'
   */
  async getMigrationStatus(): Promise<'completed' | 'pending' | 'none'> {
    if (!this.isAvailable()) {
      return 'none'
    }

    try {
      const result = await chrome.storage.local.get(MIGRATION_KEYS.CHROME_STATUS)
      if (result[MIGRATION_KEYS.CHROME_STATUS] === 'completed') {
        return 'completed'
      }

      // Check if old data exists
      const hasOldData = await this.detectOldData()
      return hasOldData ? 'pending' : 'none'
    } catch (error) {
      console.error('[ChromeMigration] Error getting migration status:', error)
      return 'none'
    }
  }
}

// Export singleton instance
export const chromeStorageMigrationService = new ChromeStorageMigrationService()
