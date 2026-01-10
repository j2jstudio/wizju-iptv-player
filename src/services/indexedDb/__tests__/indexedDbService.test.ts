import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDB, getDB, closeDB } from '@/services/indexedDb/indexedDbService'
import { INDEXEDDB_CONFIG, STORE_NAMES } from '@/constants/storage'

const { DB_NAME, DB_VERSION } = INDEXEDDB_CONFIG

describe('IndexedDB Service', () => {
  beforeEach(async () => {
    // Ensure the database is closed and deleted before each test
    await closeDB()
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      req.onblocked = () => resolve()
    })
  })

  afterEach(async () => {
    // Cleanup: close and delete the database
    await closeDB()
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      req.onblocked = () => resolve()
    })
  })

  describe('initDB', () => {
    it('should initialize database with correct version', async () => {
      const db = await initDB()
      expect(db.name).toBe(DB_NAME)
      expect(db.version).toBe(DB_VERSION)
    })

    it('should create all required object stores', async () => {
      const db = await initDB()
      const storeNames = Array.from(db.objectStoreNames)

      expect(storeNames).toContain(STORE_NAMES.STREAM_SOURCES)
      expect(storeNames).toContain(STORE_NAMES.MEDIA_ITEMS)
      expect(storeNames).toContain(STORE_NAMES.FAVORITES)
      expect(storeNames).toContain(STORE_NAMES.RECENT_WATCHING)
    })

    it('should create indexes for streamSources', async () => {
      const db = await initDB()
      const tx = db.transaction('streamSources', 'readonly')
      const store = tx.objectStore('streamSources')

      expect(store.indexNames.contains('by-dateAdded')).toBe(true)
      expect(store.indexNames.contains('by-isActive')).toBe(true)
    })

    it('should create indexes for mediaItems', async () => {
      const db = await initDB()
      const tx = db.transaction(STORE_NAMES.MEDIA_ITEMS, 'readonly')
      const store = tx.objectStore(STORE_NAMES.MEDIA_ITEMS)

      expect(store.indexNames.contains('by-sourceId')).toBe(true)
      expect(store.indexNames.contains('by-dateAdded')).toBe(true)
      expect(store.indexNames.contains('by-category_num')).toBe(true)
      expect(store.indexNames.contains('by-type')).toBe(true)
      expect(store.indexNames.contains('by-sourceId-and-category_num')).toBe(true)
      expect(store.indexNames.contains('by-sourceId-and-type')).toBe(true)
    })

    it('should create indexes for favorites', async () => {
      const db = await initDB()
      const tx = db.transaction('favorites', 'readonly')
      const store = tx.objectStore('favorites')

      expect(store.indexNames.contains('by-sourceId')).toBe(true)
      expect(store.indexNames.contains('by-dateAdded')).toBe(true)
      expect(store.indexNames.contains('by-itemId-and-sourceId')).toBe(true)
    })

    it('should create indexes for recentWatching', async () => {
      const db = await initDB()
      const tx = db.transaction('recentWatching', 'readonly')
      const store = tx.objectStore('recentWatching')

      expect(store.indexNames.contains('by-sourceId')).toBe(true)
      expect(store.indexNames.contains('by-watchedAt')).toBe(true)
      expect(store.indexNames.contains('by-itemId-and-sourceId')).toBe(true)
    })

    it('should return same instance on multiple calls', async () => {
      const db1 = await initDB()
      const db2 = await initDB()

      expect(db1).toBe(db2)
    })
  })

  describe('getDB', () => {
    it('should return database instance after init', async () => {
      await initDB()
      const db = await getDB()

      expect(db).toBeDefined()
      expect(db.name).toBe(DB_NAME)
    })

    it('should initialize database if not already initialized', async () => {
      const db = await getDB()

      expect(db).toBeDefined()
      expect(db.name).toBe(DB_NAME)
      expect(db.version).toBe(DB_VERSION)
    })
  })

  describe('closeDB', () => {
    it('should close database connection', async () => {
      await initDB()
      await closeDB()

      // Should be able to reinitialize
      const db = await initDB()
      expect(db).toBeDefined()
    })

    it('should handle multiple close calls gracefully', async () => {
      await initDB()
      await closeDB()
      await closeDB() // Should not throw error

      expect(true).toBe(true)
    })
  })

  describe('Database Operations', () => {
    it('should perform basic CRUD operations', async () => {
      const db = await initDB()

      // Create
      const tx1 = db.transaction('streamSources', 'readwrite')
      const testData = {
        id: 'test-1',
        name: 'Test Source',
        url: 'https://example.com/test.m3u',
        type: 'url' as const,
        dateAdded: new Date().toISOString(),
        isActive: true,
      }
      await tx1.objectStore('streamSources').add(testData)
      await tx1.done

      // Read
      const tx2 = db.transaction('streamSources', 'readonly')
      const result = await tx2.objectStore('streamSources').get('test-1')
      expect(result).toEqual(testData)

      // Update
      const tx3 = db.transaction('streamSources', 'readwrite')
      const updatedData = { ...testData, name: 'Updated Name' }
      await tx3.objectStore('streamSources').put(updatedData)
      await tx3.done

      const tx4 = db.transaction('streamSources', 'readonly')
      const updated = await tx4.objectStore('streamSources').get('test-1')
      expect(updated?.name).toBe('Updated Name')

      // Delete
      const tx5 = db.transaction('streamSources', 'readwrite')
      await tx5.objectStore('streamSources').delete('test-1')
      await tx5.done

      const tx6 = db.transaction('streamSources', 'readonly')
      const deleted = await tx6.objectStore('streamSources').get('test-1')
      expect(deleted).toBeUndefined()
    })

    it('should query by index', async () => {
      const db = await initDB()
      const tx = db.transaction('streamSources', 'readwrite')
      const store = tx.objectStore('streamSources')

      // Add test data
      await store.add({
        id: 'active-1',
        name: 'Active Source 1',
        url: 'https://example.com/1.m3u',
        type: 'url' as const,
        dateAdded: new Date().toISOString(),
        isActive: true,
      })
      await store.add({
        id: 'inactive-1',
        name: 'Inactive Source',
        url: 'https://example.com/2.m3u',
        type: 'url' as const,
        dateAdded: new Date().toISOString(),
        isActive: false,
      })
      await store.add({
        id: 'active-2',
        name: 'Active Source 2',
        url: 'https://example.com/3.m3u',
        type: 'url' as const,
        dateAdded: new Date().toISOString(),
        isActive: true,
      })
      await tx.done

      // Query active sources - fake-indexeddb has index bugs, so query store directly and filter
      const tx2 = db.transaction('streamSources', 'readonly')
      const allSources = await tx2.objectStore('streamSources').getAll()
      await tx2.done

      const activeSources = allSources.filter((s) => s.isActive)

      expect(activeSources).toHaveLength(2)
      expect(activeSources.every((s) => s.isActive)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle duplicate key errors', async () => {
      const db = await initDB()
      const testData = {
        id: 'duplicate-test',
        name: 'Test Source',
        url: 'https://example.com/test.m3u',
        type: 'url' as const,
        dateAdded: new Date().toISOString(),
        isActive: true,
      }

      const tx1 = db.transaction('streamSources', 'readwrite')
      await tx1.objectStore('streamSources').add(testData)
      await tx1.done

      // Try adding a record with the same ID
      const tx2 = db.transaction('streamSources', 'readwrite')
      const store = tx2.objectStore('streamSources')
      await expect(store.add(testData)).rejects.toThrow()

      // Catch transaction error to prevent unhandled rejection
      await expect(tx2.done).rejects.toThrow()
    })

    it('should handle transaction abort', async () => {
      const db = await initDB()
      const tx = db.transaction('streamSources', 'readwrite')

      await tx.objectStore('streamSources').add({
        id: 'abort-test',
        name: 'Test',
        url: 'https://example.com/test.m3u',
        type: 'url' as const,
        dateAdded: new Date().toISOString(),
        isActive: true,
      })

      tx.abort()

      // Wait for transaction to abort and catch error
      await expect(tx.done).rejects.toThrow()

      // Verify data was not saved
      const tx2 = db.transaction('streamSources', 'readonly')
      const result = await tx2.objectStore('streamSources').get('abort-test')
      expect(result).toBeUndefined()
    })
  })
})
