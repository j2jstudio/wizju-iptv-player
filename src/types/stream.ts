export interface StreamSource {
  readonly id: string
  readonly name: string
  readonly url: string
  readonly type: 'iptv' | 'm3u'
  readonly dateAdded: string
  readonly isActive: boolean
  readonly categories: string[]
}

export interface MediaItem {
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

// Channel is an alias for MediaItem, the type is exactly the same
export type Channel = MediaItem

export interface Category {
  readonly id: string
  readonly name: string
  readonly icon: string
  readonly count: number
}

export type CreateStreamSource = Omit<StreamSource, 'id' | 'dateAdded'>

export type CreateStreamSourceInput = Omit<StreamSource, 'id' | 'dateAdded' | 'categories'>
