/**
 * Media source type
 * Supports M3U playlists, Xtream Codes API, and Emby server
 */
export type MediaSourceType = 'm3u' | 'xtreamcode' | 'emby'

export interface StreamSource {
  readonly id: string
  readonly name: string
  readonly url: string
  readonly type: MediaSourceType
  readonly password?: string
  readonly dateAdded: string
  readonly isActive: boolean
  readonly categories: string[]
}

export interface M3UMediaItem {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly thumbnail?: string
  readonly duration?: string
  readonly category: string
  readonly url: string
  readonly type: 'live' | 'vod' | 'series'
  readonly genre?: string
  readonly year?: number
  readonly rating?: number
  readonly timeRemaining?: string
  readonly tvgName?: string
  readonly groupTitle?: string
}

// Channel is an alias for M3UMediaItem, the type is exactly the same
export type Channel = M3UMediaItem

export interface M3UCategory {
  readonly id: string
  readonly name: string
  readonly icon: string
  readonly count: number
}

export type CreateStreamSource = Omit<StreamSource, 'id' | 'dateAdded'>

export type CreateStreamSourceInput = Omit<StreamSource, 'id' | 'dateAdded' | 'categories'>
