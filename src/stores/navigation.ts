import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StreamSource, MediaItem } from '@/types/stream'
import type { StorableMediaItem } from '@/services/storageService'
import { useStreamSourcesStore } from './streamSources'
import { useMediaItemsStore } from './mediaItems'

export const useNavigationStore = defineStore('navigation', () => {
  // Currently selected StreamSource ID
  const currentSourceId = ref<string | null>(null)
  // Currently selected MediaItem
  const currentMediaItem = ref<MediaItem | null>(null)

  const streamSourcesStore = useStreamSourcesStore()
  const mediaItemsStore = useMediaItemsStore()

  // Computed property: the current StreamSource
  const currentSource = computed((): StreamSource | null => {
    if (!currentSourceId.value) return null
    return streamSourcesStore.getSourceById(currentSourceId.value) || null
  })

  // Computed property: MediaItems of the current source
  const currentSourceMediaItems = computed((): StorableMediaItem[] => {
    if (!currentSourceId.value) return []
    return mediaItemsStore.getItemsBySource(currentSourceId.value).value
  })

  // Computed property: whether there is a valid current source
  const hasValidCurrentSource = computed((): boolean => {
    return !!(currentSourceId.value && currentSource.value)
  })

  /**
   * Set the current StreamSource
   */
  const setCurrentSource = (sourceId: string | null): void => {
    currentSourceId.value = sourceId
    // When changing the source, clear the current MediaItem
    currentMediaItem.value = null
  }

  /**
   * Set the current MediaItem
   */
  const setCurrentMediaItem = (mediaItem: MediaItem | null): void => {
    currentMediaItem.value = mediaItem
  }

  /**
   * Create a MediaItem from a StorableMediaItem and set it as the current item
   */
  const setCurrentMediaItemFromStorable = (storableItem: StorableMediaItem): void => {
    const mediaItem: MediaItem = {
      id: storableItem.id,
      title: storableItem.title,
      description: storableItem.description || storableItem.category,
      thumbnail: storableItem.thumbnail || '',
      category: storableItem.category,
      url: storableItem.url,
      type: storableItem.type,
      year: storableItem.year,
      rating: storableItem.rating,
      genre: storableItem.genre,
      duration: storableItem.duration,
      timeRemaining: storableItem.timeRemaining,
    }
    setCurrentMediaItem(mediaItem)
  }

  /**
   * Find and set the current MediaItem by ID
   */
  const setCurrentMediaItemById = (itemId: string): boolean => {
    if (!currentSourceId.value) return false

    const item = mediaItemsStore.getMediaItemById(currentSourceId.value, itemId)
    if (item) {
      setCurrentMediaItemFromStorable(item)
      return true
    }
    return false
  }

  /**
   * Clear all current states
   */
  const clearCurrent = (): void => {
    currentSourceId.value = null
    currentMediaItem.value = null
  }

  /**
   * Validate if the current source exists and is valid
   */
  const validateCurrentSource = (): {
    isValid: boolean
    error?: string
  } => {
    if (!currentSourceId.value) {
      return {
        isValid: false,
        error: 'No source selected',
      }
    }

    const source = streamSourcesStore.getSourceById(currentSourceId.value)
    if (!source) {
      return {
        isValid: false,
        error: 'Selected source not found',
      }
    }

    if (!source.isActive) {
      return {
        isValid: false,
        error: 'Selected source is not active',
      }
    }

    return { isValid: true }
  }

  /**
   * Validate if the current MediaItem exists and is valid
   */
  const validateCurrentMediaItem = (): {
    isValid: boolean
    error?: string
  } => {
    if (!currentMediaItem.value) {
      return {
        isValid: false,
        error: 'No media item selected',
      }
    }

    // No need to validate the current source
    // const sourceValidation = validateCurrentSource();
    // if (!sourceValidation.isValid) {
    //   return sourceValidation;
    // }

    // Validate if the media item exists in the current source
    // const item = mediaItemsStore.getMediaItemById(
    //   currentSourceId.value!,
    //   currentMediaItem.value.id
    // );

    // if (!item) {
    //   return {
    //     isValid: false,
    //     error: "Selected media item not found in current source",
    //   };
    // }

    return { isValid: true }
  }

  /**
   * Get error message
   */
  const getNavigationError = (): string | null => {
    const sourceValidation = validateCurrentSource()
    if (!sourceValidation.isValid) {
      return sourceValidation.error || 'Source validation failed'
    }
    return null
  }

  return {
    // Reactive data
    currentSourceId: computed(() => currentSourceId.value),
    currentSource,
    currentMediaItem: computed(() => currentMediaItem.value),
    currentSourceMediaItems,
    hasValidCurrentSource,

    // Actions
    setCurrentSource,
    setCurrentMediaItem,
    setCurrentMediaItemFromStorable,
    setCurrentMediaItemById,
    clearCurrent,

    // Validation methods
    validateCurrentSource,
    validateCurrentMediaItem,
    getNavigationError,
  }
})
