/**
 * IndexedDB Type Definitions for Wizju IPTV Player
 *
 * This file defines the TypeScript interfaces for the IndexedDB schema
 * using the idb library's DBSchema pattern.
 */

import type { DBSchema } from 'idb'
import type { StreamSource, M3UMediaItem, MediaSourceType } from './stream'

/**
 * Extended M3UMediaItem for storage with additional metadata
 */
export interface StorableMediaItem extends M3UMediaItem {
  readonly dateAdded: string
  readonly sourceId: string // Associated StreamSource ID
  readonly category_num: number // For efficient category-based queries
}

/**
 * Favorite item stored in IndexedDB
 * Designed to support multiple media source types (M3U, Xtream Codes, Emby)
 */
export interface FavoriteItem {
  readonly id: string
  readonly itemId: string // Reference to the original media item ID
  readonly sourceId: string // Associated StreamSource ID
  readonly type: MediaSourceType // Media source type
  readonly dateAdded: string

  // Essential fields for display (copied from media item)
  readonly title: string
  readonly description?: string
  readonly thumbnail?: string
  readonly duration?: string
  readonly category: string
  readonly tvgName?: string
  readonly groupTitle?: string
}

/**
 * Recent watching item stored in IndexedDB
 * Designed to support multiple media source types (M3U, Xtream Codes, Emby)
 */
export interface RecentWatchingItem {
  readonly id: string
  readonly itemId: string // Reference to the original media item ID
  readonly sourceId: string // Associated StreamSource ID
  readonly type: MediaSourceType // Media source type
  readonly dateAdded: string // For compatibility with StorableItem
  readonly watchedAt: string
  readonly lastPosition?: number // Playback position in seconds

  // Essential fields for display (copied from media item)
  readonly title: string
  readonly description?: string
  readonly thumbnail?: string
  readonly duration?: string
  readonly category: string
  readonly tvgName?: string
  readonly groupTitle?: string
}

/**
 * Main Database Schema
 *
 * Database Name: WizjuIPTVDB
 * Current Version: 1
 *
 * This schema defines all object stores, their keys, values, and indexes.
 */
export interface WizjuDBSchema extends DBSchema {
  /**
   * StreamSources Store
   *
   * Stores IPTV/M3U/Xtream Codes/Emby stream source configurations
   * Primary Key: id (string, UUID)
   */
  streamSources: {
    key: string
    value: StreamSource
    indexes: {
      /**
       * Index by dateAdded for sorting sources by creation time
       */
      'by-dateAdded': string

      /**
       * Index by isActive for filtering active/inactive sources
       */
      'by-isActive': IDBValidKey
    }
  }

  /**
   * M3UMediaItems Store
   *
   * Stores all M3U media items (live channels, VOD, series) from all sources
   * Primary Key: id (string, UUID)
   *
   * Note: Items are associated with sources via sourceId
   */
  m3uMediaItems: {
    key: string
    value: StorableMediaItem
    indexes: {
      /**
       * Index by sourceId for querying all items from a specific source
       * Most frequently used index
       */
      'by-sourceId': string

      /**
       * Index by dateAdded for sorting items by import time
       */
      'by-dateAdded': string

      /**
       * Index by category_num for filtering by category
       * Used with compound index for efficient category browsing
       */
      'by-category_num': number

      /**
       * Index by type for filtering live/vod/series
       */
      'by-type': string

      /**
       * Compound index [sourceId, category_num] for efficient queries like:
       * "Get all items from source X in category Y"
       * This is the primary access pattern for media browsing
       */
      'by-sourceId-and-category_num': [string, number]

      /**
       * Compound index [sourceId, type] for queries like:
       * "Get all live channels from source X"
       */
      'by-sourceId-and-type': [string, string]
    }
  }

  /**
   * Favorites Store
   *
   * Stores user's favorite media items
   * Primary Key: id (string, UUID)
   *
   * Limited to MAX_FAVORITES (e.g., 20 items)
   */
  favorites: {
    key: string
    value: FavoriteItem
    indexes: {
      /**
       * Index by sourceId for filtering favorites by source
       */
      'by-sourceId': string

      /**
       * Index by dateAdded for sorting favorites by creation time
       * Most recent first
       */
      'by-dateAdded': string

      /**
       * Compound index for checking if an item is already favorited
       * Query: "Is item X from source Y already in favorites?"
       */
      'by-itemId-and-sourceId': [string, string]
    }
  }

  /**
   * RecentWatching Store
   *
   * Stores recently watched media items with playback position
   * Primary Key: id (string, UUID)
   *
   * Limited to MAX_RECENT_ITEMS (e.g., 20 items)
   */
  recentWatching: {
    key: string
    value: RecentWatchingItem
    indexes: {
      /**
       * Index by sourceId for filtering recent items by source
       */
      'by-sourceId': string

      /**
       * Index by watchedAt for sorting by watch time
       * Most recent first (descending order)
       */
      'by-watchedAt': string

      /**
       * Compound index for finding existing watch records
       * Query: "Find existing watch record for item X from source Y"
       */
      'by-itemId-and-sourceId': [string, string]
    }
  }
}

/**
 * Database Configuration Constants
 */
export const DB_CONFIG = {
  name: 'WizjuIPTVDB',
  version: 1,
  stores: {
    streamSources: 'streamSources',
    m3uMediaItems: 'm3uMediaItems',
    favorites: 'favorites',
    recentWatching: 'recentWatching',
  },
} as const

/**
 * Storage Limits
 */
export const STORAGE_LIMITS = {
  maxFavorites: 20,
  maxRecentWatching: 20,
  maxMediaItemsPerBatch: 1000, // For bulk import operations
} as const

/**
 * Type helper for creating new items (without id and dateAdded)
 */
export type CreateStorableMediaItem = Omit<StorableMediaItem, 'id' | 'dateAdded'>
export type CreateFavoriteItem = Omit<FavoriteItem, 'id' | 'dateAdded'>
export type CreateRecentWatchingItem = Omit<RecentWatchingItem, 'id' | 'dateAdded' | 'watchedAt'>
