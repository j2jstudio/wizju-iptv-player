import type { StreamSource } from '@/types/stream'
import type { StorableMediaItem, FavoriteItem, RecentWatchingItem } from '@/types/indexeddb'

/**
 * 创建测试用的 StreamSource
 */
export function createMockStreamSource(overrides?: Partial<StreamSource>): StreamSource {
  return {
    id: `source-${Date.now()}`,
    name: 'Test Stream Source',
    url: 'https://example.com/playlist.m3u',
    type: 'm3u',
    dateAdded: new Date().toISOString(),
    isActive: true,
    categories: [],
    ...overrides,
  }
}

/**
 * 创建测试用的 MediaItem
 */
export function createMockMediaItem(overrides?: Partial<StorableMediaItem>): StorableMediaItem {
  return {
    id: `media-${Date.now()}-${Math.random()}`,
    sourceId: 'source-1',
    title: 'Test Media',
    url: 'https://example.com/stream.m3u8',
    thumbnail: 'https://example.com/logo.png',
    category: 'Movies',
    category_num: 1,
    type: 'live',
    dateAdded: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * 创建测试用的 FavoriteItem
 */
export function createMockFavorite(overrides?: Partial<FavoriteItem>): FavoriteItem {
  return {
    id: `fav-${Date.now()}`,
    itemId: 'media-1',
    sourceId: 'source-1',
    type: 'm3u',
    title: 'Test Favorite',
    category: 'Movies',
    dateAdded: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * 创建测试用的 RecentWatchingItem
 */
export function createMockRecentItem(overrides?: Partial<RecentWatchingItem>): RecentWatchingItem {
  return {
    id: `recent-${Date.now()}`,
    itemId: 'media-1',
    sourceId: 'source-1',
    type: 'm3u',
    title: 'Test Recent',
    category: 'Movies',
    watchedAt: new Date().toISOString(),
    dateAdded: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * 等待异步操作完成
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 创建批量测试数据
 */
export function createBulkMediaItems(count: number, sourceId: string): StorableMediaItem[] {
  return Array.from({ length: count }, (_, i) =>
    createMockMediaItem({
      id: `media-${sourceId}-${i}`,
      sourceId,
      title: `Media ${i}`,
      category_num: i % 10,
    }),
  )
}
