import type { StreamSource, StorableMediaItem, FavoriteItem, RecentItem } from '@/types/stream'

/**
 * 创建测试用的 StreamSource
 */
export function createMockStreamSource(overrides?: Partial<StreamSource>): StreamSource {
  return {
    id: `source-${Date.now()}`,
    name: 'Test Stream Source',
    url: 'https://example.com/playlist.m3u',
    type: 'url',
    dateAdded: new Date().toISOString(),
    isActive: true,
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
    name: 'Test Media',
    url: 'https://example.com/stream.m3u8',
    logo: 'https://example.com/logo.png',
    group: 'Movies',
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
    mediaItemId: 'media-1',
    sourceId: 'source-1',
    dateAdded: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * 创建测试用的 RecentItem
 */
export function createMockRecentItem(overrides?: Partial<RecentItem>): RecentItem {
  return {
    id: `recent-${Date.now()}`,
    mediaItemId: 'media-1',
    sourceId: 'source-1',
    watchedAt: new Date().toISOString(),
    duration: 0,
    position: 0,
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
      name: `Media ${i}`,
      category_num: i % 10,
    }),
  )
}
