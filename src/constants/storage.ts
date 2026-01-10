/**
 * Storage Constants
 *
 * Centralized storage-related constants used across the application.
 * This includes IndexedDB store names, localStorage keys, and database configurations.
 */

/**
 * IndexedDB Configuration
 */
export const INDEXEDDB_CONFIG = {
  /** Database name */
  DB_NAME: 'WizjuIPTVDB',
  /** Database version */
  DB_VERSION: 1,
} as const

// Export shorthand for convenience
export const { DB_NAME, DB_VERSION } = INDEXEDDB_CONFIG

/**
 * IndexedDB Object Store Names
 */
export const STORE_NAMES = {
  /** Stream sources store */
  STREAM_SOURCES: 'streamSources',
  /** Media items store (M3U media items) */
  MEDIA_ITEMS: 'm3uMediaItems',
  /** Favorites store */
  FAVORITES: 'favorites',
  /** Recent watching history store */
  RECENT_WATCHING: 'recentWatching',
} as const

/**
 * IndexedDB Index Names
 */
export const INDEX_NAMES = {
  // StreamSources indexes
  STREAM_SOURCES_BY_DATE_ADDED: 'by-dateAdded',
  STREAM_SOURCES_BY_IS_ACTIVE: 'by-isActive',

  // MediaItems indexes
  MEDIA_ITEMS_BY_SOURCE_ID: 'by-sourceId',
  MEDIA_ITEMS_BY_DATE_ADDED: 'by-dateAdded',
  MEDIA_ITEMS_BY_CATEGORY_NUM: 'by-category_num',
  MEDIA_ITEMS_BY_TYPE: 'by-type',
  MEDIA_ITEMS_BY_SOURCE_AND_CATEGORY: 'by-sourceId-and-category_num',
  MEDIA_ITEMS_BY_SOURCE_AND_TYPE: 'by-sourceId-and-type',

  // Favorites indexes
  FAVORITES_BY_SOURCE_ID: 'by-sourceId',
  FAVORITES_BY_DATE_ADDED: 'by-dateAdded',
  FAVORITES_BY_ITEM_AND_SOURCE: 'by-itemId-and-sourceId',

  // RecentWatching indexes
  RECENT_WATCHING_BY_SOURCE_ID: 'by-sourceId',
  RECENT_WATCHING_BY_WATCHED_AT: 'by-watchedAt',
  RECENT_WATCHING_BY_ITEM_AND_SOURCE: 'by-itemId-and-sourceId',
} as const

/**
 * LocalStorage Keys (Legacy)
 * Used for backward compatibility and migration
 */
export const LOCALSTORAGE_KEYS = {
  /** Legacy stream sources key */
  STREAM_SOURCES: 'Wizju_sources',
  /** Legacy media items key prefix (actual key is Wizju_media_items_{sourceId}) */
  MEDIA_ITEMS_PREFIX: 'Wizju_media_items_',
  /** Legacy favorites key */
  FAVORITES: 'Wizju_favorites',
  /** Legacy recent watching key */
  RECENT_WATCHING: 'Wizju_recent_watching',
} as const

/**
 * Migration-related LocalStorage Keys
 */
export const MIGRATION_KEYS = {
  /** Migration status key */
  STATUS: 'wizju-migration-status',
  /** Migration backup key */
  BACKUP: 'wizju-migration-backup',
} as const

/**
 * Type-safe store name type
 */
export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES]

/**
 * Type-safe index name type
 */
export type IndexName = (typeof INDEX_NAMES)[keyof typeof INDEX_NAMES]

/**
 * Type-safe localStorage key type
 */
export type LocalStorageKey = (typeof LOCALSTORAGE_KEYS)[keyof typeof LOCALSTORAGE_KEYS]

/**
 * Type-safe migration key type
 */
export type MigrationKey = (typeof MIGRATION_KEYS)[keyof typeof MIGRATION_KEYS]
