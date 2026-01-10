/**
 * Generic Storage Service V2 (IndexedDB-based)
 *
 * Provides a generic storage layer for IndexedDB operations.
 * This is the IndexedDB equivalent of the original localStorage-based StorageService.
 *
 * Features:
 * - Type-safe CRUD operations
 * - Batch operations support
 * - Index-based queries
 * - Cursor-based iteration for large datasets
 */

import type { IDBPDatabase, StoreNames } from 'idb'
import type { WizjuDBSchema } from '@/types/indexeddb'
import { getDB } from './indexedDbService'

/**
 * Base interface for storable items
 * All items must have an id and dateAdded field
 */
export interface StorableItem {
  readonly id: string
  readonly dateAdded: string
}

/**
 * Generic Storage Service class
 *
 * @template T The type of items stored (must extend StorableItem)
 * @template C The type for creating new items (typically Omit<T, 'id' | 'dateAdded'>)
 */
export class StorageServiceV2<T extends StorableItem, C extends Omit<T, 'id' | 'dateAdded'>> {
  private storeName: StoreNames<WizjuDBSchema>

  /**
   * @param storeName The name of the IndexedDB object store
   */
  constructor(storeName: StoreNames<WizjuDBSchema>) {
    this.storeName = storeName
  }

  /**
   * Get the database instance
   */
  private async getDatabase(): Promise<IDBPDatabase<WizjuDBSchema>> {
    return getDB()
  }

  /**
   * Load all items from the store
   *
   * @returns Promise that resolves to an array of all items
   */
  async loadItems(): Promise<T[]> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = await db.getAll(this.storeName as any)
      return items as T[]
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to load items from ${this.storeName}:`, error)
      throw error
    }
  }

  /**
   * Load items by index
   *
   * NOTE: Uses manual filtering for boolean queries due to fake-indexeddb limitations.
   * Real IndexedDB properly supports boolean values, but fake-indexeddb (used in tests)
   * does not handle boolean values in index cursors correctly.
   *
   * @param indexName The name of the index to query
   * @param query The query value or range (undefined returns all items via index)
   * @returns Promise that resolves to an array of matching items
   */
  async loadItemsByIndex(indexName: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = db.transaction(this.storeName as any, 'readonly')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = tx.objectStore(this.storeName as any)

      const items: T[] = []

      // Check if query is a boolean (fake-indexeddb doesn't support booleans properly)
      const isBooleanQuery = typeof query === 'boolean'

      if (isBooleanQuery) {
        // Workaround for fake-indexeddb: get all items and filter manually
        const allItems = await store.getAll()

        // Extract property name from index name (by-xxx -> xxx, by-is-active -> isActive)
        const propName = indexName.startsWith('by-')
          ? indexName.substring(3).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
          : indexName

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = allItems.filter((item: any) => item[propName] === query)
        items.push(...(filtered as T[]))
      } else {
        // Use native IndexedDB index query for other types (strings, numbers, dates, IDBKeyRange)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const index = (store as any).index(indexName)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let cursor = await index.openCursor(query as any)

        while (cursor) {
          items.push(cursor.value as T)
          cursor = await cursor.continue()
        }
      }

      await tx.done
      return items
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to load items by index ${indexName}:`, error)
      throw error
    }
  }

  /**
   * Add a new item to the store
   *
   * @param itemData The data for the new item (without id and dateAdded)
   * @returns Promise that resolves to the created item
   */
  async addItem(itemData: C): Promise<T> {
    try {
      const db = await this.getDatabase()
      const newItem = {
        ...itemData,
        id: crypto.randomUUID(),
        dateAdded: new Date().toISOString(),
      } as unknown as T

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.add(this.storeName as any, newItem as any)
      return newItem
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to add item to ${this.storeName}:`, error)
      throw error
    }
  }

  /**
   * Add multiple items in a single transaction (batch operation)
   *
   * @param itemsData Array of items to add
   * @returns Promise that resolves to an array of created items
   */
  async addItems(itemsData: C[]): Promise<T[]> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = db.transaction(this.storeName as any, 'readwrite')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = tx.objectStore(this.storeName as any)

      const newItems: T[] = []
      for (const itemData of itemsData) {
        const newItem = {
          ...itemData,
          id: crypto.randomUUID(),
          dateAdded: new Date().toISOString(),
        } as unknown as T

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await store.add(newItem as any)
        newItems.push(newItem)
      }

      await tx.done
      return newItems
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to batch add items to ${this.storeName}:`, error)
      throw error
    }
  }

  /**
   * Update an existing item by id
   *
   * @param id The id of the item to update
   * @param updates Partial updates to apply
   * @returns Promise that resolves to the updated item, or null if not found
   */
  async updateItem(id: string, updates: Partial<T>): Promise<T | null> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingItem = await db.get(this.storeName as any, id)

      if (!existingItem) {
        console.warn(`[StorageServiceV2] Item with id ${id} not found in ${this.storeName}`)
        return null
      }

      const updatedItem = {
        ...existingItem,
        ...updates,
        id, // Ensure id is not changed
      } as T

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.put(this.storeName as any, updatedItem as any)
      return updatedItem
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to update item in ${this.storeName}:`, error)
      throw error
    }
  }

  /**
   * Remove an item by id
   *
   * @param id The id of the item to remove
   * @returns Promise that resolves to true if item was removed, false if not found
   */
  async removeItem(id: string): Promise<boolean> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingItem = await db.get(this.storeName as any, id)

      if (!existingItem) {
        console.warn(`[StorageServiceV2] Item with id ${id} not found in ${this.storeName}`)
        return false
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.delete(this.storeName as any, id)
      return true
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to remove item from ${this.storeName}:`, error)
      throw error
    }
  }

  /**
   * Remove multiple items in a single transaction
   *
   * @param ids Array of item ids to remove
   * @returns Promise that resolves to the count of removed items
   */
  async removeItems(ids: string[]): Promise<number> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = db.transaction(this.storeName as any, 'readwrite')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = tx.objectStore(this.storeName as any)

      let removedCount = 0
      for (const id of ids) {
        try {
          await store.delete(id)
          removedCount++
        } catch {
          console.warn(`[StorageServiceV2] Failed to delete item ${id}`)
        }
      }

      await tx.done
      return removedCount
    } catch (error) {
      console.error(
        `[StorageServiceV2] Failed to batch remove items from ${this.storeName}:`,
        error,
      )
      throw error
    }
  }

  /**
   * Clear all items from the store
   *
   * WARNING: This will permanently delete all items in the store!
   *
   * @returns Promise that resolves when the store is cleared
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.clear(this.storeName as any)
      console.log(`[StorageServiceV2] Cleared all items from ${this.storeName}`)
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to clear ${this.storeName}:`, error)
      throw error
    }
  }

  /**
   * Get an item by id
   *
   * @param id The id of the item to retrieve
   * @returns Promise that resolves to the item, or undefined if not found
   */
  async getItemById(id: string): Promise<T | undefined> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = await db.get(this.storeName as any, id)
      return item as T | undefined
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to get item by id from ${this.storeName}:`, error)
      throw error
    }
  }

  /**
   * Get multiple items by their ids
   *
   * @param ids Array of item ids
   * @returns Promise that resolves to an array of found items
   */
  async getItemsByIds(ids: string[]): Promise<T[]> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = db.transaction(this.storeName as any, 'readonly')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = tx.objectStore(this.storeName as any)

      const items: T[] = []
      for (const id of ids) {
        const item = await store.get(id)
        if (item) {
          items.push(item as T)
        }
      }

      await tx.done
      return items
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to get items by ids from ${this.storeName}:`, error)
      throw error
    }
  }

  /**
   * Count all items in the store
   *
   * @returns Promise that resolves to the count of items
   */
  async countItems(): Promise<number> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const count = await db.count(this.storeName as any)
      return count
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to count items in ${this.storeName}:`, error)
      throw error
    }
  }

  /**
   * Count items by index
   *
   * @param indexName The name of the index to query
   * @param query The query value or range
   * @returns Promise that resolves to the count of matching items
   */
  async countItemsByIndex(indexName: string, query?: IDBValidKey | IDBKeyRange): Promise<number> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const count = await (db as any).countFromIndex(this.storeName, indexName, query)
      return count
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to count items by index ${indexName}:`, error)
      throw error
    }
  }

  /**
   * Check if an item exists by id
   *
   * @param id The id of the item to check
   * @returns Promise that resolves to true if the item exists, false otherwise
   */
  async itemExists(id: string): Promise<boolean> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = await db.get(this.storeName as any, id)
      return item !== undefined
    } catch (error) {
      console.error(`[StorageServiceV2] Failed to check item existence:`, error)
      throw error
    }
  }

  /**
   * Get items with pagination support
   *
   * @param offset The number of items to skip
   * @param limit The maximum number of items to return
   * @returns Promise that resolves to an array of items
   */
  async getItemsPaginated(offset: number, limit: number): Promise<T[]> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = db.transaction(this.storeName as any, 'readonly')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = tx.objectStore(this.storeName as any)

      const items: T[] = []
      let cursor = await store.openCursor()
      let currentIndex = 0

      while (cursor) {
        if (currentIndex >= offset && items.length < limit) {
          items.push(cursor.value as T)
        }

        if (items.length >= limit) {
          break
        }

        currentIndex++
        cursor = await cursor.continue()
      }

      await tx.done
      return items
    } catch (error) {
      console.error(
        `[StorageServiceV2] Failed to get paginated items from ${this.storeName}:`,
        error,
      )
      throw error
    }
  }

  /**
   * Get items by index with pagination support
   *
   * @param indexName The name of the index to query
   * @param query The query value or range
   * @param offset The number of items to skip
   * @param limit The maximum number of items to return
   * @returns Promise that resolves to an array of items
   */
  async getItemsByIndexPaginated(
    indexName: string,
    query: IDBValidKey | IDBKeyRange | undefined,
    offset: number,
    limit: number,
  ): Promise<T[]> {
    try {
      const db = await this.getDatabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = (db as any).transaction(this.storeName, 'readonly')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = (tx as any).objectStore(this.storeName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const index = (store as any).index(indexName)

      const items: T[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cursor = await index.openCursor(query as any)
      let currentIndex = 0

      while (cursor) {
        if (currentIndex >= offset && items.length < limit) {
          items.push(cursor.value as T)
        }

        if (items.length >= limit) {
          break
        }

        currentIndex++
        cursor = await cursor.continue()
      }

      await tx.done
      return items
    } catch (error) {
      console.error(
        `[StorageServiceV2] Failed to get paginated items by index ${indexName}:`,
        error,
      )
      throw error
    }
  }
}
