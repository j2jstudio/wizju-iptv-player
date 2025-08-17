import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StreamSource, CreateStreamSource } from '@/types/stream'
import { streamSourcesStorage } from '@/services/storageService'

export const useStreamSourcesStore = defineStore('streamSources', () => {
  const sources = ref<StreamSource[]>([])
  const isFirstTime = ref(true)

  const activeSources = computed(() => sources.value.filter((source) => source.isActive))

  const loadSources = (): void => {
    try {
      const loadedSources = streamSourcesStorage.loadItems()
      sources.value = loadedSources
      isFirstTime.value = loadedSources.length === 0
    } catch (error) {
      console.error('Failed to load stream sources:', error)
    }
  }

  const addSource = (sourceData: CreateStreamSource): StreamSource[] => {
    try {
      // Check storage limit before adding
      if (!streamSourcesStorage.checkStorageLimit(sources.value, sourceData)) {
        throw new Error('Storage limit exceeded')
      }

      sources.value = streamSourcesStorage.addItem(sources.value, sourceData)
      isFirstTime.value = false
      return sources.value
    } catch (error) {
      console.error('Failed to add stream source:', error)
      throw error
    }
  }

  const addSourceWithCategories = (
    sourceInput: Omit<CreateStreamSource, 'categories'>,
    categories: string[],
  ): StreamSource[] => {
    const sourceData: CreateStreamSource = {
      ...sourceInput,
      categories,
    }
    return addSource(sourceData)
  }

  const updateSourceCategories = (id: string, categories: string[]): void => {
    try {
      const source = streamSourcesStorage.getItemById(sources.value, id)
      if (source) {
        sources.value = streamSourcesStorage.updateItem(sources.value, id, {
          categories,
        })
      }
    } catch (error) {
      console.error('Failed to update source categories:', error)
      throw error
    }
  }

  const removeSource = (id: string): void => {
    try {
      sources.value = streamSourcesStorage.removeItem(sources.value, id)

      if (sources.value.length === 0) {
        isFirstTime.value = true
      }
    } catch (error) {
      console.error('Failed to remove stream source:', error)
      throw error
    }
  }

  const toggleSource = (id: string): void => {
    try {
      const source = streamSourcesStorage.getItemById(sources.value, id)
      if (source) {
        sources.value = streamSourcesStorage.updateItem(sources.value, id, {
          isActive: !source.isActive,
        })
      }
    } catch (error) {
      console.error('Failed to toggle stream source:', error)
      throw error
    }
  }

  const setIsFirstTime = (value: boolean): void => {
    isFirstTime.value = value
  }

  const getStorageUsage = (): number => {
    return streamSourcesStorage.getStorageUsage()
  }

  const clearAllSources = (): void => {
    try {
      streamSourcesStorage.clearAll()
      sources.value = []
      isFirstTime.value = true
    } catch (error) {
      console.error('Failed to clear all stream sources:', error)
      throw error
    }
  }

  const getSourceById = (id: string): StreamSource | undefined => {
    return streamSourcesStorage.getItemById(sources.value, id)
  }

  // Initialize on store creation
  loadSources()

  return {
    sources: computed(() => sources.value),
    activeSources,
    isFirstTime: computed(() => isFirstTime.value),
    addSource,
    addSourceWithCategories,
    updateSourceCategories,
    removeSource,
    toggleSource,
    setIsFirstTime,
    getStorageUsage,
    clearAllSources,
    getSourceById,
  }
})
