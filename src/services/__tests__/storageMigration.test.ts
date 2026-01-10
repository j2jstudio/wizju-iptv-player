import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { storageMigrationService } from '@/services/storageMigration'
import { closeDB } from '@/services/indexedDb/indexedDbService'
import { INDEXEDDB_CONFIG, LOCALSTORAGE_KEYS } from '@/constants/storage'
import type { StreamSource } from '@/types/stream'
import type { StorableMediaItem } from '@/types/indexeddb'

describe('Storage Migration', () => {
  beforeEach(async () => {
    await closeDB()
    // 清空 localStorage
    localStorage.clear()
  })

  afterEach(async () => {
    await closeDB()
    indexedDB.deleteDatabase(INDEXEDDB_CONFIG.DB_NAME)
    localStorage.clear()
  })

  describe('detectOldData', () => {
    it('should return false when no old data exists', async () => {
      const result = await storageMigrationService.detectOldData()
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
      localStorage.setItem(LOCALSTORAGE_KEYS.STREAM_SOURCES, JSON.stringify(oldData))

      const result = await storageMigrationService.detectOldData()
      expect(result).toBe(true)
    })

    it('should detect old mediaItems data', async () => {
      const oldData: Record<string, StorableMediaItem[]> = {
        'source-1': [
          {
            id: 'media-1',
            sourceId: 'source-1',
            name: 'Test Media',
            url: 'https://example.com/stream.m3u8',
            group: 'Movies',
            category_num: 1,
            type: 'live',
            dateAdded: new Date().toISOString(),
          },
        ],
      }
      localStorage.setItem(
        LOCALSTORAGE_KEYS.MEDIA_ITEMS_PREFIX + 'source-1',
        JSON.stringify(oldData['source-1']),
      )

      const result = await storageMigrationService.detectOldData()
      expect(result).toBe(true)
    })

    it('should detect data even with invalid JSON', async () => {
      localStorage.setItem(LOCALSTORAGE_KEYS.STREAM_SOURCES, 'invalid-json')

      const result = await storageMigrationService.detectOldData()
      expect(result).toBe(true) // detectOldData只检查存在性，不验证JSON
    })
  })

  describe('getMigrationStatus', () => {
    it('should return none status initially', () => {
      const status = storageMigrationService.getMigrationStatus()
      expect(status).toBe('none')
    })
  })
})
