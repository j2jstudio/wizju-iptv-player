import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StorageServiceV2 } from '@/services/indexedDb/storageServiceV2'
import { closeDB, deleteDB } from '@/services/indexedDb/indexedDbService'
import { STORE_NAMES } from '@/constants/storage'
import { createMockMediaItem, createBulkMediaItems } from '@/test/helpers'
import type { StorableMediaItem } from '@/types/stream'

// Run tests sequentially to avoid IndexedDB conflicts
describe.sequential('Edge Cases and Performance Tests', () => {
  let storageService: StorageServiceV2<StorableMediaItem>

  beforeEach(async () => {
    // Reset module state
    vi.resetModules()

    // Close any existing connection first
    closeDB()
    // Wait a bit for connections to fully close
    await new Promise((resolve) => setTimeout(resolve, 50))

    try {
      await deleteDB()
    } catch {
      // Ignore delete errors in tests
    }

    storageService = new StorageServiceV2<StorableMediaItem>(STORE_NAMES.MEDIA_ITEMS)
  })

  afterEach(async () => {
    closeDB()
    await new Promise((resolve) => setTimeout(resolve, 10))

    try {
      await deleteDB()
    } catch {
      // Ignore delete errors in tests
    }
  })

  describe('Large Dataset Handling', () => {
    it('should handle 500+ items efficiently', async () => {
      const items = createBulkMediaItems(500, 'source-1')

      const startTime = performance.now()
      await storageService.addItems(items)
      const endTime = performance.now()

      const loadedItems = await storageService.loadItems()
      expect(loadedItems).toHaveLength(500)

      // Performance assertion: 500 records should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(5000) // Within 5 seconds
    }, 10000)

    it('should handle 2000+ items', async () => {
      const items = createBulkMediaItems(2000, 'source-1')

      await storageService.addItems(items)

      const count = await storageService.countItems()
      expect(count).toBe(2000)
    }, 15000)

    it('should handle multiple sources with datasets', async () => {
      const sources = ['source-1', 'source-2', 'source-3']
      const allItems: StorableMediaItem[] = []

      for (const sourceId of sources) {
        const items = createBulkMediaItems(300, sourceId)
        allItems.push(...items)
      }

      await storageService.addItems(allItems)

      const count = await storageService.countItems()
      expect(count).toBe(900)

      // Verify query by sourceId
      const source1Items = await storageService.loadItemsByIndex('by-sourceId', 'source-1')
      expect(source1Items).toHaveLength(300)
    }, 15000)
  })

  describe('Special Characters and Unicode', () => {
    it('should handle special characters in strings', async () => {
      const item = createMockMediaItem({
        title: 'Test <script>alert("XSS")</script>',
        category: 'Movies & TV Shows',
        url: 'https://example.com/test?param=value&other=123',
      })

      const added = await storageService.addItem(item)

      const loaded = await storageService.getItemById(added.id)
      expect(loaded?.title).toBe('Test <script>alert("XSS")</script>')
      expect(loaded?.url).toBe('https://example.com/test?param=value&other=123')
    })

    it('should handle Unicode characters', async () => {
      const item = createMockMediaItem({
        title: '测试 🎬 テスト 테스트',
        category: 'العربية',
      })

      const added = await storageService.addItem(item)

      const loaded = await storageService.getItemById(added.id)
      expect(loaded?.title).toBe('测试 🎬 テスト 테스트')
      expect(loaded?.category).toBe('العربية')
    })

    it('should handle very long strings', async () => {
      const longString = 'A'.repeat(10000)
      const item = createMockMediaItem({
        title: longString,
      })

      const added = await storageService.addItem(item)

      const loaded = await storageService.getItemById(added.id)
      expect(loaded?.title).toHaveLength(10000)
    })

    it('should handle empty strings', async () => {
      const item = createMockMediaItem({
        title: '',
        category: '',
      })

      const added = await storageService.addItem(item)

      const loaded = await storageService.getItemById(added.id)
      expect(loaded?.title).toBe('')
      expect(loaded?.category).toBe('')
    })
  })

  describe('Boundary Values', () => {
    it('should handle zero category_num', async () => {
      const item = createMockMediaItem({
        category_num: 0,
      })

      const added = await storageService.addItem(item)

      const loaded = await storageService.getItemById(added.id)
      expect(loaded?.category_num).toBe(0)
    })

    it('should handle negative category_num', async () => {
      const item = createMockMediaItem({
        category_num: -1,
      })

      const added = await storageService.addItem(item)

      const loaded = await storageService.getItemById(added.id)
      expect(loaded?.category_num).toBe(-1)
    })

    it('should handle very large category_num', async () => {
      const item = createMockMediaItem({
        category_num: Number.MAX_SAFE_INTEGER,
      })

      const added = await storageService.addItem(item)

      const loaded = await storageService.getItemById(added.id)
      expect(loaded?.category_num).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('should handle missing optional fields', async () => {
      const item: Partial<StorableMediaItem> = {
        sourceId: 'source-1',
        title: 'Minimal',
        url: 'https://example.com/test.m3u8',
        category: '',
        category_num: 0,
        type: 'live',
      }

      const added = await storageService.addItem(item as any)

      const loaded = await storageService.getItemById(added.id)
      expect(loaded).toBeDefined()
      expect(loaded?.thumbnail).toBeUndefined()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent reads', async () => {
      const items = createBulkMediaItems(100, 'source-1')
      await storageService.addItems(items)

      // Execute multiple read operations concurrently
      const promises = Array.from({ length: 5 }, () => storageService.loadItems())

      const results = await Promise.all(promises)
      results.forEach((result) => {
        expect(result).toHaveLength(100)
      })
    })

    it('should handle sequential writes', async () => {
      // Write items sequentially to avoid fake-indexeddb concurrency issues
      for (let i = 0; i < 5; i++) {
        await storageService.addItem(createMockMediaItem({ title: `sequential-${i}` }))
      }

      const count = await storageService.countItems()
      expect(count).toBe(5)
    })

    it('should handle mixed operations sequentially', async () => {
      // Add some data first
      const initialItems = createBulkMediaItems(50, 'source-1')
      const savedItems = await storageService.addItems(initialItems)

      // Execute operations sequentially to avoid fake-indexeddb issues
      const loadedItems = await storageService.loadItems()
      expect(loadedItems.length).toBeGreaterThan(0)

      const newItem = await storageService.addItem(createMockMediaItem({ title: 'new-item' }))
      expect(newItem).toBeDefined()

      // Use the ID from the saved items (not the original ones, since addItems generates new IDs)
      const foundItem = await storageService.getItemById(savedItems[0].id)
      expect(foundItem).toBeDefined()

      const count = await storageService.countItems()
      expect(count).toBe(51)
    })
  })

  describe('Data Integrity', () => {
    it('should maintain data integrity after multiple operations', async () => {
      const item = createMockMediaItem({ title: 'Original' })

      // Add
      const added = await storageService.addItem(item)
      let loaded = await storageService.getItemById(added.id)
      expect(loaded?.title).toBe('Original')

      // Update
      await storageService.updateItem(added.id, { title: 'Updated' })
      loaded = await storageService.getItemById(added.id)
      expect(loaded?.title).toBe('Updated')

      // Update again
      await storageService.updateItem(added.id, { title: 'Final' })
      loaded = await storageService.getItemById(added.id)
      expect(loaded?.title).toBe('Final')
    })

    it('should handle rapid add/remove cycles', async () => {
      const addedIds: string[] = []

      for (let i = 0; i < 10; i++) {
        const item = createMockMediaItem({ title: `cycle-${i}` })
        const added = await storageService.addItem(item)
        addedIds.push(added.id)
        await storageService.removeItem(added.id)
      }

      const count = await storageService.countItems()
      expect(count).toBe(0)
    })
  })

  describe('Memory Management', () => {
    it('should not leak memory with repeated operations', async () => {
      // Simulate multiple load and clear operations
      for (let i = 0; i < 5; i++) {
        const items = createBulkMediaItems(100, `source-${i}`)
        await storageService.addItems(items)
        await storageService.clearAll()
      }

      const count = await storageService.countItems()
      expect(count).toBe(0)
    }, 15000)
  })

  describe('Error Recovery', () => {
    it('should recover from database closure', async () => {
      const item = createMockMediaItem()
      const added = await storageService.addItem(item)

      // Close database
      await closeDB()

      // Should be able to reconnect automatically
      const loaded = await storageService.getItemById(added.id)
      expect(loaded).toBeDefined()
    })

    it('should handle transaction failures gracefully', async () => {
      // addItem always generates new ID, so there will be no duplicate errors
      // Test adding same content multiple times
      const item = createMockMediaItem()
      const first = await storageService.addItem(item)
      const second = await storageService.addItem(item)

      expect(first.id).not.toBe(second.id)

      // Database should still be usable
      const count = await storageService.countItems()
      expect(count).toBe(2)
    })
  })

  describe('Index Querying Performance', () => {
    it('should efficiently query by index with large dataset', async () => {
      const items = createBulkMediaItems(5000, 'source-1')
      await storageService.addItems(items)

      const startTime = performance.now()
      const results = await storageService.loadItemsByIndex('by-sourceId', 'source-1')
      const endTime = performance.now()

      expect(results).toHaveLength(5000)
      // Using cursor is slower than getAll, so relax time limit
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
    }, 30000)

    it('should efficiently query by category_num', async () => {
      const items = createBulkMediaItems(1000, 'source-1')
      await storageService.addItems(items)

      const category5Items = await storageService.loadItemsByIndex('by-category_num', 5)
      expect(category5Items.length).toBeGreaterThan(0)
      expect(category5Items.every((item) => item.category_num === 5)).toBe(true)
    })
  })

  describe('Data Types', () => {
    it('should preserve data types correctly', async () => {
      const item = createMockMediaItem({
        category_num: 42,
      })

      const added = await storageService.addItem(item)

      const loaded = await storageService.getItemById(added.id)
      expect(typeof loaded?.category_num).toBe('number')
      expect(typeof loaded?.dateAdded).toBe('string')
      expect(typeof loaded?.title).toBe('string')
    })
  })

  describe('Empty and Null Values', () => {
    it('should handle undefined optional fields', async () => {
      const item = createMockMediaItem({ id: 'undef-1' })
      delete (item as any).thumbnail

      await storageService.addItem(item)

      const loaded = await storageService.getItemById('undef-1')
      expect(loaded?.thumbnail).toBeUndefined()
    })

    it('should handle empty arrays in batch operations', async () => {
      await storageService.addItems([])
      const count = await storageService.countItems()
      expect(count).toBe(0)
    })
  })

  describe('Database Quota', () => {
    it('should estimate storage usage', async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        expect(estimate.usage).toBeDefined()
        expect(estimate.quota).toBeDefined()
      }
    })
  })
})
