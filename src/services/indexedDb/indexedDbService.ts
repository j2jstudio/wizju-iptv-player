/**
 * IndexedDB Service
 *
 * Provides core database initialization, connection management,
 * and version upgrade handling for the Wizju IPTV Player.
 *
 * Database: WizjuIPTVDB
 * Version: 1
 */

import { openDB, type IDBPDatabase } from 'idb'
import type { WizjuDBSchema } from '@/types/indexeddb'

const DB_NAME = 'WizjuIPTVDB'
const DB_VERSION = 1

/**
 * Singleton database instance
 */
let dbInstance: IDBPDatabase<WizjuDBSchema> | null = null

/**
 * Database initialization promise for preventing concurrent initialization
 */
let dbInitPromise: Promise<IDBPDatabase<WizjuDBSchema>> | null = null

/**
 * Initialize and open the IndexedDB database
 *
 * This function handles database creation and version upgrades.
 * It uses a singleton pattern to ensure only one database connection exists.
 *
 * @returns Promise that resolves to the database instance
 * @throws Error if database initialization fails
 */
export async function initDB(): Promise<IDBPDatabase<WizjuDBSchema>> {
  // Return existing instance if already initialized
  if (dbInstance) {
    return dbInstance
  }

  // Return existing initialization promise if in progress
  if (dbInitPromise) {
    return dbInitPromise
  }

  // Start new initialization
  dbInitPromise = openDB<WizjuDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`[IndexedDB] Upgrading database from version ${oldVersion} to ${newVersion}`)

      // Version 1: Initial database setup
      if (oldVersion < 1) {
        // Create streamSources store
        if (!db.objectStoreNames.contains('streamSources')) {
          const streamSourcesStore = db.createObjectStore('streamSources', {
            keyPath: 'id',
          })
          streamSourcesStore.createIndex('by-dateAdded', 'dateAdded')
          streamSourcesStore.createIndex('by-isActive', 'isActive')
          console.log('[IndexedDB] Created streamSources store with indexes')
        }

        // Create m3uMediaItems store
        if (!db.objectStoreNames.contains('m3uMediaItems')) {
          const mediaItemsStore = db.createObjectStore('m3uMediaItems', {
            keyPath: 'id',
          })
          mediaItemsStore.createIndex('by-sourceId', 'sourceId')
          mediaItemsStore.createIndex('by-dateAdded', 'dateAdded')
          mediaItemsStore.createIndex('by-category_num', 'category_num')
          mediaItemsStore.createIndex('by-type', 'type')
          mediaItemsStore.createIndex('by-sourceId-and-category_num', ['sourceId', 'category_num'])
          mediaItemsStore.createIndex('by-sourceId-and-type', ['sourceId', 'type'])
          console.log('[IndexedDB] Created m3uMediaItems store with indexes')
        }

        // Create favorites store
        if (!db.objectStoreNames.contains('favorites')) {
          const favoritesStore = db.createObjectStore('favorites', {
            keyPath: 'id',
          })
          favoritesStore.createIndex('by-sourceId', 'sourceId')
          favoritesStore.createIndex('by-dateAdded', 'dateAdded')
          favoritesStore.createIndex('by-itemId-and-sourceId', ['itemId', 'sourceId'])
          console.log('[IndexedDB] Created favorites store with indexes')
        }

        // Create recentWatching store
        if (!db.objectStoreNames.contains('recentWatching')) {
          const recentWatchingStore = db.createObjectStore('recentWatching', {
            keyPath: 'id',
          })
          recentWatchingStore.createIndex('by-sourceId', 'sourceId')
          recentWatchingStore.createIndex('by-watchedAt', 'watchedAt')
          recentWatchingStore.createIndex('by-itemId-and-sourceId', ['itemId', 'sourceId'])
          console.log('[IndexedDB] Created recentWatching store with indexes')
        }
      }

      // Future version upgrades can be added here
      // if (oldVersion < 2) { ... }
    },

    blocked(currentVersion, blockedVersion) {
      console.warn(
        `[IndexedDB] Database upgrade blocked. Current: ${currentVersion}, Blocked: ${blockedVersion}`,
      )
      console.warn('[IndexedDB] Please close all other tabs with this app open to allow upgrade')
    },

    blocking(currentVersion, blockedVersion) {
      console.warn(`[IndexedDB] This connection is blocking upgrade to version ${blockedVersion}`)
      // Close the database to allow upgrade
      if (dbInstance) {
        dbInstance.close()
        dbInstance = null
      }
    },

    terminated() {
      console.error('[IndexedDB] Database connection was unexpectedly terminated')
      dbInstance = null
      dbInitPromise = null
    },
  })

  try {
    dbInstance = await dbInitPromise
    console.log(`[IndexedDB] Database initialized successfully: ${DB_NAME} v${DB_VERSION}`)
    return dbInstance
  } catch (error) {
    console.error('[IndexedDB] Failed to initialize database:', error)
    dbInstance = null
    dbInitPromise = null
    throw new Error(
      `Failed to initialize IndexedDB: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Get the database instance
 *
 * If the database is not initialized, it will be initialized automatically.
 *
 * @returns Promise that resolves to the database instance
 * @throws Error if database initialization fails
 */
export async function getDB(): Promise<IDBPDatabase<WizjuDBSchema>> {
  if (!dbInstance) {
    return initDB()
  }
  return dbInstance
}

/**
 * Close the database connection
 *
 * Should be called when the application is closing or when you need to
 * force a reconnection (e.g., after an error).
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    dbInitPromise = null
    console.log('[IndexedDB] Database connection closed')
  }
}

/**
 * Check if IndexedDB is supported in the current browser
 *
 * @returns true if IndexedDB is supported, false otherwise
 */
export function isIndexedDBSupported(): boolean {
  try {
    return 'indexedDB' in window && window.indexedDB !== null
  } catch {
    return false
  }
}

/**
 * Delete the entire database
 *
 * WARNING: This will permanently delete all data!
 * Should only be used for testing or complete data reset.
 *
 * @returns Promise that resolves when the database is deleted
 */
export async function deleteDB(): Promise<void> {
  closeDB()

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)

    request.onsuccess = () => {
      console.log(`[IndexedDB] Database ${DB_NAME} deleted successfully`)
      resolve()
    }

    request.onerror = (event) => {
      console.error(`[IndexedDB] Failed to delete database ${DB_NAME}:`, event)
      reject(new Error('Failed to delete database'))
    }

    request.onblocked = () => {
      console.warn(`[IndexedDB] Delete blocked. Close all tabs with ${DB_NAME} open.`)
    }
  })
}

/**
 * Get database information
 *
 * @returns Object containing database name and version
 */
export function getDBInfo(): { name: string; version: number } {
  return {
    name: DB_NAME,
    version: DB_VERSION,
  }
}

/**
 * Estimate storage usage (if supported by browser)
 *
 * @returns Promise that resolves to storage estimate or null if not supported
 */
export async function getStorageEstimate(): Promise<{
  usage: number
  quota: number
  percentage: number
} | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage || 0
      const quota = estimate.quota || 0
      const percentage = quota > 0 ? (usage / quota) * 100 : 0

      return {
        usage,
        quota,
        percentage,
      }
    } catch (error) {
      console.error('[IndexedDB] Failed to estimate storage:', error)
      return null
    }
  }
  return null
}
