import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ChromeStorageMigrationService, isChromeExtension } from '@/services/chromeStorageMigration'
import { closeDB } from '@/services/indexedDb/indexedDbService'
import { INDEXEDDB_CONFIG, CHROME_STORAGE_KEYS, MIGRATION_KEYS } from '@/constants/storage'
import type { StreamSource } from '@/types/stream'
import type { StorableMediaItem } from '@/types/indexeddb'

// Mock chrome.storage.local
const mockChromeStorage: Record<string, unknown> = {}

const mockChromeStorageLocal = {
  get: vi.fn((keys: string | string[] | null) => {
    if (keys === null) {
      return Promise.resolve({ ...mockChromeStorage })
    }
    if (typeof keys === 'string') {
      return Promise.resolve({ [keys]: mockChromeStorage[keys] })
    }
    const result: Record<string, unknown> = {}
    keys.forEach((key) => {
      if (mockChromeStorage[key] !== undefined) {
        result[key] = mockChromeStorage[key]
      }
    })
    return Promise.resolve(result)
  }),
  set: vi.fn((items: Record<string, unknown>) => {
    Object.assign(mockChromeStorage, items)
    return Promise.resolve()
  }),
  remove: vi.fn((keys: string | string[]) => {
    const keysToRemove = Array.isArray(keys) ? keys : [keys]
    keysToRemove.forEach((key) => {
      delete mockChromeStorage[key]
    })
    return Promise.resolve()
  }),
}

// Setup global chrome mock
vi.stubGlobal('chrome', {
  storage: {
    local: mockChromeStorageLocal,
  },
})

describe('Chrome Storage Migration', () => {
  let service: ChromeStorageMigrationService

  beforeEach(async () => {
    await closeDB()
    // Clear mock storage
    Object.keys(mockChromeStorage).forEach((key) => delete mockChromeStorage[key])
    vi.clearAllMocks()
    service = new ChromeStorageMigrationService()
  })

  afterEach(async () => {
    await closeDB()
    indexedDB.deleteDatabase(INDEXEDDB_CONFIG.DB_NAME)
    Object.keys(mockChromeStorage).forEach((key) => delete mockChromeStorage[key])
  })

  describe('isChromeExtension', () => {
    it('should return true when chrome.storage.local is available', () => {
      expect(isChromeExtension()).toBe(true)
    })
  })

  describe('isAvailable', () => {
    it('should return true in Chrome extension environment', () => {
      expect(service.isAvailable()).toBe(true)
    })
  })

  describe('detectOldData', () => {
    it('should return false when no old data exists', async () => {
      const result = await service.detectOldData()
      expect(result).toBe(false)
    })

    it('should return false when migration is already completed', async () => {
      mockChromeStorage[MIGRATION_KEYS.CHROME_STATUS] = 'completed'
      mockChromeStorage[CHROME_STORAGE_KEYS.STREAM_SOURCES] = [{ id: '1' }]

      const result = await service.detectOldData()
      expect(result).toBe(false)
    })

    it('should detect old streamSources data', async () => {
      const oldData: StreamSource[] = [
        {
          id: 'source-1',
          name: 'Test Source',
          url: 'https://example.com/test.m3u',
          type: 'url',
          dateAdded: new Date().toISOString(),
          isActive: true,
        },
      ]
      mockChromeStorage[CHROME_STORAGE_KEYS.STREAM_SOURCES] = oldData

      const result = await service.detectOldData()
      expect(result).toBe(true)
    })

    it('should detect old mediaItems data', async () => {
      const sourceId = 'source-1'
      const oldData: StorableMediaItem[] = [
        {
          id: 'media-1',
          sourceId: sourceId,
          title: 'Test Media',
          url: 'https://example.com/stream.m3u8',
          category: 'Movies',
          category_num: 1,
          type: 'live',
          dateAdded: new Date().toISOString(),
        },
      ]
      mockChromeStorage[`${CHROME_STORAGE_KEYS.MEDIA_ITEMS_PREFIX}${sourceId}`] = oldData

      const result = await service.detectOldData()
      expect(result).toBe(true)
    })

    it('should detect old favorites data', async () => {
      mockChromeStorage[CHROME_STORAGE_KEYS.FAVORITES] = [{ id: 'fav-1' }]

      const result = await service.detectOldData()
      expect(result).toBe(true)
    })

    it('should detect old recentWatching data', async () => {
      mockChromeStorage[CHROME_STORAGE_KEYS.RECENT_WATCHING] = [{ id: 'recent-1' }]

      const result = await service.detectOldData()
      expect(result).toBe(true)
    })
  })

  describe('getMigrationStatus', () => {
    it('should return none when no data exists', async () => {
      const status = await service.getMigrationStatus()
      expect(status).toBe('none')
    })

    it('should return completed when migration is done', async () => {
      mockChromeStorage[MIGRATION_KEYS.CHROME_STATUS] = 'completed'

      const status = await service.getMigrationStatus()
      expect(status).toBe('completed')
    })

    it('should return pending when old data exists', async () => {
      mockChromeStorage[CHROME_STORAGE_KEYS.STREAM_SOURCES] = [{ id: '1' }]

      const status = await service.getMigrationStatus()
      expect(status).toBe('pending')
    })
  })
})
