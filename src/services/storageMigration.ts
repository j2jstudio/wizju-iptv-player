/**
 * Storage Migration Service
 *
 * Handles the migration of data from localStorage to IndexedDB.
 * This is a one-time migration process that runs when the application
 * detects old localStorage data that needs to be migrated.
 *
 * Migration Process:
 * 1. Detect if localStorage contains old data
 * 2. Backup existing localStorage data
 * 3. Migrate data to IndexedDB with validation
 * 4. Clean up localStorage after successful migration
 * 5. Mark migration as complete
 */

import type { StreamSource, M3UMediaItem } from '@/types/stream'
import type { StorableMediaItem } from '@/types/indexeddb'
import { StreamSourcesStorageV2 } from './indexedDb/streamSourcesStorageV2'
import { MediaItemsStorageV2 } from './indexedDb/mediaItemsStorageV2'
import { getDB, initDB } from './indexedDb/indexedDbService'
import { LOCALSTORAGE_KEYS, MIGRATION_KEYS, STORE_NAMES } from '@/constants/storage'

/**
 * Migration result interface
 */
export interface MigrationResult {
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
export type MigrationProgressCallback = (progress: {
  stage: string
  current: number
  total: number
  message: string
}) => void

/**
 * LocalStorage data interface
 */
interface LocalStorageData {
  streamSources: StreamSource[]
  mediaItems: StorableMediaItem[]
  favorites: OldFavoriteItem[]
  recentWatching: OldRecentWatchingItem[]
}

/**
 * Old favorite item structure from localStorage
 */
interface OldFavoriteItem {
  readonly id: string
  readonly mediaItem: M3UMediaItem
  readonly sourceId: string
  readonly dateAdded: string
}

/**
 * Old recent watching item structure from localStorage
 */
interface OldRecentWatchingItem {
  readonly id: string
  readonly mediaItem: M3UMediaItem
  readonly sourceId: string
  readonly watchedAt: string
  readonly lastPosition?: number
}

/**
 * Storage Migration Service
 */
export class StorageMigrationService {
  private streamSourcesStorage: StreamSourcesStorageV2
  private mediaItemsStorage: MediaItemsStorageV2

  constructor() {
    this.streamSourcesStorage = new StreamSourcesStorageV2()
    this.mediaItemsStorage = new MediaItemsStorageV2()
  }

  /**
   * Detect if old localStorage data exists
   *
   * @returns true if migration is needed
   */
  async detectOldData(): Promise<boolean> {
    try {
      // Check if migration has already been completed
      const migrationStatus = localStorage.getItem(MIGRATION_KEYS.STATUS)
      if (migrationStatus === 'completed') {
        console.log('[Migration] Migration already completed')
        return false
      }

      // Check if any localStorage data exists
      const hasStreamSources = !!localStorage.getItem(LOCALSTORAGE_KEYS.STREAM_SOURCES)
      const hasMediaItems = !!localStorage.getItem(LOCALSTORAGE_KEYS.MEDIA_ITEMS)
      const hasFavorites = !!localStorage.getItem(LOCALSTORAGE_KEYS.FAVORITES)
      const hasRecentWatching = !!localStorage.getItem(LOCALSTORAGE_KEYS.RECENT_WATCHING)

      const hasOldData = hasStreamSources || hasMediaItems || hasFavorites || hasRecentWatching

      if (hasOldData) {
        console.log('[Migration] Old localStorage data detected:', {
          streamSources: hasStreamSources,
          mediaItems: hasMediaItems,
          favorites: hasFavorites,
          recentWatching: hasRecentWatching,
        })
      }

      return hasOldData
    } catch (error) {
      console.error('[Migration] Error detecting old data:', error)
      return false
    }
  }

  /**
   * Read all data from localStorage
   *
   * @returns LocalStorage data or null if no data exists
   */
  private readLocalStorageData(): LocalStorageData | null {
    try {
      const streamSourcesRaw = localStorage.getItem(LOCALSTORAGE_KEYS.STREAM_SOURCES)
      const mediaItemsRaw = localStorage.getItem(LOCALSTORAGE_KEYS.MEDIA_ITEMS)
      const favoritesRaw = localStorage.getItem(LOCALSTORAGE_KEYS.FAVORITES)
      const recentWatchingRaw = localStorage.getItem(LOCALSTORAGE_KEYS.RECENT_WATCHING)

      const data: LocalStorageData = {
        streamSources: streamSourcesRaw ? JSON.parse(streamSourcesRaw) : [],
        mediaItems: mediaItemsRaw ? JSON.parse(mediaItemsRaw) : [],
        favorites: favoritesRaw ? JSON.parse(favoritesRaw) : [],
        recentWatching: recentWatchingRaw ? JSON.parse(recentWatchingRaw) : [],
      }

      return data
    } catch (error) {
      console.error('[Migration] Error reading localStorage data:', error)
      return null
    }
  }

  /**
   * Backup localStorage data before migration
   */
  private backupLocalStorageData(): void {
    try {
      const backup = {
        sources: localStorage.getItem(LOCALSTORAGE_KEYS.STREAM_SOURCES),
        mediaItems: localStorage.getItem(LOCALSTORAGE_KEYS.MEDIA_ITEMS),
        favorites: localStorage.getItem(LOCALSTORAGE_KEYS.FAVORITES),
        recentWatching: localStorage.getItem(LOCALSTORAGE_KEYS.RECENT_WATCHING),
        timestamp: new Date().toISOString(),
      }

      localStorage.setItem(MIGRATION_KEYS.BACKUP, JSON.stringify(backup))
      console.log('[Migration] Backup created successfully')
    } catch (error) {
      console.error('[Migration] Failed to create backup:', error)
      throw new Error('Failed to create backup before migration')
    }
  }

  /**
   * Migrate stream sources from localStorage to IndexedDB
   *
   * @param sources Array of stream sources to migrate
   * @param onProgress Progress callback
   * @returns Number of successfully migrated sources
   */
  private async migrateStreamSources(
    sources: StreamSource[],
    onProgress?: MigrationProgressCallback,
  ): Promise<number> {
    if (sources.length === 0) {
      return 0
    }

    console.log(`[Migration] Migrating ${sources.length} stream sources...`)
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
        console.error(`[Migration] Failed to migrate source ${source.id}:`, error)
      }
    }

    console.log(`[Migration] Successfully migrated ${migratedCount}/${sources.length} sources`)
    return migratedCount
  }

  /**
   * Migrate media items from localStorage to IndexedDB
   *
   * @param mediaItems Array of media items to migrate
   * @param onProgress Progress callback
   * @returns Number of successfully migrated media items
   */
  private async migrateMediaItems(
    mediaItems: StorableMediaItem[],
    onProgress?: MigrationProgressCallback,
  ): Promise<number> {
    if (mediaItems.length === 0) {
      return 0
    }

    console.log(`[Migration] Migrating ${mediaItems.length} media items...`)

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

      console.log(`[Migration] Successfully migrated ${migratedCount} media items`)
      return migratedCount
    } catch (error) {
      console.error('[Migration] Failed to migrate media items:', error)
      throw error
    }
  }

  /**
   * Migrate favorites from localStorage to IndexedDB
   *
   * @param favorites Array of old favorite items
   * @param onProgress Progress callback
   * @returns Number of successfully migrated favorites
   */
  private async migrateFavorites(
    favorites: OldFavoriteItem[],
    onProgress?: MigrationProgressCallback,
  ): Promise<number> {
    if (favorites.length === 0) {
      return 0
    }

    console.log(`[Migration] Migrating ${favorites.length} favorites...`)
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
          console.error(`[Migration] Failed to migrate favorite ${oldFav.id}:`, error)
        }
      }

      await tx.done
      console.log(
        `[Migration] Successfully migrated ${migratedCount}/${favorites.length} favorites`,
      )
      return migratedCount
    } catch (error) {
      console.error('[Migration] Failed to migrate favorites:', error)
      throw error
    }
  }

  /**
   * Migrate recent watching from localStorage to IndexedDB
   *
   * @param recentItems Array of old recent watching items
   * @param onProgress Progress callback
   * @returns Number of successfully migrated recent watching items
   */
  private async migrateRecentWatching(
    recentItems: OldRecentWatchingItem[],
    onProgress?: MigrationProgressCallback,
  ): Promise<number> {
    if (recentItems.length === 0) {
      return 0
    }

    console.log(`[Migration] Migrating ${recentItems.length} recent watching items...`)
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
          console.error(`[Migration] Failed to migrate recent watching ${oldRecent.id}:`, error)
        }
      }

      await tx.done
      console.log(
        `[Migration] Successfully migrated ${migratedCount}/${recentItems.length} recent watching items`,
      )
      return migratedCount
    } catch (error) {
      console.error('[Migration] Failed to migrate recent watching:', error)
      throw error
    }
  }

  /**
   * Validate migration by comparing counts
   *
   * @param oldData Original localStorage data
   * @param result Migration result
   * @returns true if validation passes
   */
  private async validateMigration(
    oldData: LocalStorageData,
    result: MigrationResult,
  ): Promise<boolean> {
    try {
      console.log('[Migration] Validating migration...')

      // Validate stream sources
      const migratedSources = await this.streamSourcesStorage.loadItems()
      const sourcesMatch = migratedSources.length === oldData.streamSources.length

      // Validate media items
      const migratedMediaItems = await this.mediaItemsStorage.loadItems()
      const mediaItemsMatch = migratedMediaItems.length === oldData.mediaItems.length

      // Validate favorites
      const db = await getDB()
      const favoritesCount = await db.count(STORE_NAMES.FAVORITES)
      const favoritesMatch = favoritesCount === oldData.favorites.length

      // Validate recent watching
      const recentWatchingCount = await db.count(STORE_NAMES.RECENT_WATCHING)
      const recentWatchingMatch = recentWatchingCount === oldData.recentWatching.length

      const allMatch = sourcesMatch && mediaItemsMatch && favoritesMatch && recentWatchingMatch

      console.log('[Migration] Validation results:', {
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
      console.error('[Migration] Validation error:', error)
      result.errors.push(`Validation error: ${error}`)
      return false
    }
  }

  /**
   * Clean up localStorage after successful migration
   */
  private cleanupOldStorage(): void {
    try {
      console.log('[Migration] Cleaning up old localStorage data...')

      // Remove old data
      localStorage.removeItem(LOCALSTORAGE_KEYS.STREAM_SOURCES)
      localStorage.removeItem(LOCALSTORAGE_KEYS.MEDIA_ITEMS)
      localStorage.removeItem(LOCALSTORAGE_KEYS.FAVORITES)
      localStorage.removeItem(LOCALSTORAGE_KEYS.RECENT_WATCHING)

      // Mark migration as complete
      localStorage.setItem(MIGRATION_KEYS.STATUS, 'completed')

      console.log('[Migration] Cleanup completed successfully')
    } catch (error) {
      console.error('[Migration] Cleanup error:', error)
      throw new Error('Failed to cleanup old storage')
    }
  }

  /**
   * Restore from backup (in case of migration failure)
   */
  async restoreFromBackup(): Promise<boolean> {
    try {
      const backupRaw = localStorage.getItem(MIGRATION_KEYS.BACKUP)
      if (!backupRaw) {
        console.error('[Migration] No backup found to restore')
        return false
      }

      const backup = JSON.parse(backupRaw)

      // Restore localStorage data
      if (backup.sources) {
        localStorage.setItem(LOCALSTORAGE_KEYS.STREAM_SOURCES, backup.sources)
      }
      if (backup.mediaItems) {
        localStorage.setItem(LOCALSTORAGE_KEYS.MEDIA_ITEMS, backup.mediaItems)
      }
      if (backup.favorites) {
        localStorage.setItem(LOCALSTORAGE_KEYS.FAVORITES, backup.favorites)
      }
      if (backup.recentWatching) {
        localStorage.setItem(LOCALSTORAGE_KEYS.RECENT_WATCHING, backup.recentWatching)
      }

      console.log('[Migration] Backup restored successfully')
      return true
    } catch (error) {
      console.error('[Migration] Failed to restore from backup:', error)
      return false
    }
  }

  /**
   * Execute the full migration process
   *
   * @param onProgress Optional progress callback
   * @returns Migration result
   */
  async executeMigration(onProgress?: MigrationProgressCallback): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedSources: 0,
      migratedMediaItems: 0,
      migratedFavorites: 0,
      migratedRecents: 0,
      errors: [],
    }

    try {
      console.log('[Migration] Starting migration process...')

      // Initialize IndexedDB
      onProgress?.({
        stage: 'initialization',
        current: 0,
        total: 1,
        message: 'Initializing IndexedDB...',
      })

      await initDB()

      // Read localStorage data
      onProgress?.({
        stage: 'reading',
        current: 0,
        total: 1,
        message: 'Reading localStorage data...',
      })

      const oldData = this.readLocalStorageData()
      if (!oldData) {
        result.errors.push('Failed to read localStorage data')
        return result
      }

      // Create backup
      onProgress?.({
        stage: 'backup',
        current: 0,
        total: 1,
        message: 'Creating backup...',
      })

      this.backupLocalStorageData()

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
        // Clean up localStorage
        onProgress?.({
          stage: 'cleanup',
          current: 0,
          total: 1,
          message: 'Cleaning up old data...',
        })

        this.cleanupOldStorage()
        result.success = true
        console.log('[Migration] Migration completed successfully')
      } else {
        result.errors.push('Validation failed, keeping original data')
        console.error('[Migration] Migration validation failed')
      }
    } catch (error) {
      console.error('[Migration] Migration failed:', error)
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
  getMigrationStatus(): 'completed' | 'pending' | 'none' {
    const status = localStorage.getItem(MIGRATION_KEYS.STATUS)
    if (status === 'completed') {
      return 'completed'
    }

    // Check if old data exists
    const hasOldData =
      !!localStorage.getItem(LOCALSTORAGE_KEYS.STREAM_SOURCES) ||
      !!localStorage.getItem(LOCALSTORAGE_KEYS.MEDIA_ITEMS) ||
      !!localStorage.getItem(LOCALSTORAGE_KEYS.FAVORITES) ||
      !!localStorage.getItem(LOCALSTORAGE_KEYS.RECENT_WATCHING)

    return hasOldData ? 'pending' : 'none'
  }
}

// Export singleton instance
export const storageMigrationService = new StorageMigrationService()
