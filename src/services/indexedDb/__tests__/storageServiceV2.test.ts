import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { StorageServiceV2 } from '@/services/indexedDb/storageServiceV2'
import { closeDB } from '@/services/indexedDb/indexedDbService'
import { INDEXEDDB_CONFIG } from '@/constants/storage'
import { createMockStreamSource } from '@/test/helpers'
import type { StreamSource } from '@/types/stream'

const { DB_NAME } = INDEXEDDB_CONFIG

describe('StorageServiceV2', () => {
  let storageService: StorageServiceV2<StreamSource>

  beforeEach(async () => {
    await closeDB()
    // Wait for database to be deleted
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      req.onblocked = () => resolve() // Continue even if blocked
    })
    storageService = new StorageServiceV2<StreamSource>('streamSources')
  })

  afterEach(async () => {
    await closeDB()
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      req.onblocked = () => resolve()
    })
  })

  describe('loadItems', () => {
    it('should return empty array when no items exist', async () => {
      const items = await storageService.loadItems()
      expect(items).toEqual([])
    })

    it('should load all items', async () => {
      const source1 = createMockStreamSource({ id: 'source-1' })
      const source2 = createMockStreamSource({ id: 'source-2' })

      await storageService.addItem(source1)
      await storageService.addItem(source2)

      const items = await storageService.loadItems()
      expect(items).toHaveLength(2)
    })
  })

  describe('addItem', () => {
    it('should add a single item', async () => {
      const source = createMockStreamSource({ id: 'test-1' })
      const added = await storageService.addItem(source)

      const items = await storageService.loadItems()
      expect(items).toHaveLength(1)
      expect(items[0].name).toBe(source.name)
      expect(items[0].url).toBe(source.url)
      expect(items[0].id).toBeDefined() // ID is auto-generated
    })

    it('should create new items with different IDs even with same input', async () => {
      const source = createMockStreamSource({ id: 'duplicate' })
      const first = await storageService.addItem(source)
      const second = await storageService.addItem(source)

      expect(first.id).not.toBe(second.id)
      const items = await storageService.loadItems()
      expect(items).toHaveLength(2)
    })
  })

  describe('addItems', () => {
    it('should add multiple items', async () => {
      const sources = [
        createMockStreamSource({ id: 'source-1' }),
        createMockStreamSource({ id: 'source-2' }),
        createMockStreamSource({ id: 'source-3' }),
      ]

      await storageService.addItems(sources)

      const items = await storageService.loadItems()
      expect(items).toHaveLength(3)
    })

    it('should add empty array without error', async () => {
      await storageService.addItems([])
      const items = await storageService.loadItems()
      expect(items).toEqual([])
    })

    it('should handle large batch operations', async () => {
      const sources = Array.from({ length: 100 }, (_, i) =>
        createMockStreamSource({ id: `source-${i}` }),
      )

      await storageService.addItems(sources)

      const items = await storageService.loadItems()
      expect(items).toHaveLength(100)
    })
  })

  describe('updateItem', () => {
    it('should update an existing item', async () => {
      const source = createMockStreamSource({ name: 'Original' })
      const added = await storageService.addItem(source)

      await storageService.updateItem(added.id, { name: 'Updated' })

      const item = await storageService.getItemById(added.id)
      expect(item?.name).toBe('Updated')
    })

    it('should return null when updating non-existent item', async () => {
      const result = await storageService.updateItem('non-existent', { name: 'Updated' })
      expect(result).toBeNull()
    })
  })

  describe('removeItem', () => {
    it('should remove an existing item', async () => {
      const source = createMockStreamSource()
      const added = await storageService.addItem(source)

      await storageService.removeItem(added.id)

      const items = await storageService.loadItems()
      expect(items).toHaveLength(0)
    })

    it('should not throw error when removing non-existent item', async () => {
      await expect(storageService.removeItem('non-existent')).resolves.not.toThrow()
    })
  })

  describe('getItemById', () => {
    it('should return item by id', async () => {
      const source = createMockStreamSource()
      const added = await storageService.addItem(source)

      const item = await storageService.getItemById(added.id)
      expect(item).toBeDefined()
      expect(item?.id).toBe(added.id)
      expect(item?.name).toBe(source.name)
    })

    it('should return undefined for non-existent id', async () => {
      const item = await storageService.getItemById('non-existent')
      expect(item).toBeUndefined()
    })
  })

  describe('clearAll', () => {
    it('should remove all items', async () => {
      const sources = [
        createMockStreamSource({ id: 'source-1' }),
        createMockStreamSource({ id: 'source-2' }),
        createMockStreamSource({ id: 'source-3' }),
      ]
      await storageService.addItems(sources)

      await storageService.clearAll()

      const items = await storageService.loadItems()
      expect(items).toEqual([])
    })

    it('should work on empty store', async () => {
      await expect(storageService.clearAll()).resolves.not.toThrow()
    })
  })

  describe('countItems', () => {
    it('should return correct count', async () => {
      const sources = Array.from({ length: 5 }, (_, i) =>
        createMockStreamSource({ id: `source-${i}` }),
      )
      await storageService.addItems(sources)

      const count = await storageService.countItems()
      expect(count).toBe(5)
    })

    it('should return 0 for empty store', async () => {
      const count = await storageService.countItems()
      expect(count).toBe(0)
    })
  })

  describe('loadItemsByIndex', () => {
    it('should load items by index value', async () => {
      const activeSources = [
        createMockStreamSource({ isActive: true }),
        createMockStreamSource({ isActive: true }),
      ]
      const inactiveSources = [createMockStreamSource({ isActive: false })]

      await storageService.addItems([...activeSources, ...inactiveSources])
    })

    it('should return empty array when no matches', async () => {
      await storageService.addItem(createMockStreamSource({ isActive: true }))

      const inactive = await storageService.loadItemsByIndex('by-isActive', false)
      expect(inactive).toEqual([])
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      await closeDB()
      // Try operations after deleting the database
      indexedDB.deleteDatabase(DB_NAME)

      // Should be able to reinitialize automatically
      const source = createMockStreamSource()
      await expect(storageService.addItem(source)).resolves.not.toThrow()
    })
  })
})
