import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StreamSource, CreateStreamSource } from '@/types/stream'
import { streamSourcesStorage } from '@/services/storageService'

export const useStreamSourcesStore = defineStore('streamSources', () => {
  const sources = ref<StreamSource[]>([])
  const isFirstTime = ref(true)

  const activeSources = computed(() => sources.value.filter((source) => source.isActive))

  const loadSources = async (): Promise<void> => {
    try {
      const loadedSources = await streamSourcesStorage.loadItems()
      sources.value = loadedSources
      isFirstTime.value = loadedSources.length === 0
    } catch (error) {
      console.error('Failed to load stream sources:', error)
    }
  }

  const addSource = async (sourceData: CreateStreamSource): Promise<StreamSource[]> => {
    try {
      const withinLimit = await streamSourcesStorage.checkStorageLimit(sources.value, sourceData)
      if (!withinLimit) {
        throw new Error('Storage limit exceeded')
      }
      sources.value = await streamSourcesStorage.addItem(sources.value, sourceData)
      isFirstTime.value = false
      return sources.value
    } catch (error) {
      console.error('Failed to add stream source:', error)
      throw error
    }
  }

  const addSourceWithCategories = async (
    sourceInput: Omit<CreateStreamSource, 'categories'>,
    categories: string[],
  ): Promise<StreamSource[]> => {
    const sourceData: CreateStreamSource = {
      ...sourceInput,
      categories,
    }
    return addSource(sourceData)
  }

  const updateSourceCategories = async (id: string, categories: string[]): Promise<void> => {
    try {
      const source = streamSourcesStorage.getItemById(sources.value, id)
      if (source) {
        sources.value = await streamSourcesStorage.updateItem(sources.value, id, {
          categories,
        })
      }
    } catch (error) {
      console.error('Failed to update source categories:', error)
      throw error
    }
  }

  const removeSource = async (id: string): Promise<void> => {
    try {
      sources.value = await streamSourcesStorage.removeItem(sources.value, id)
      if (sources.value.length === 0) {
        isFirstTime.value = true
      }
    } catch (error) {
      console.error('Failed to remove stream source:', error)
      throw error
    }
  }

  const toggleSource = async (id: string): Promise<void> => {
    try {
      const source = streamSourcesStorage.getItemById(sources.value, id)
      if (source) {
        sources.value = await streamSourcesStorage.updateItem(sources.value, id, {
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

  const getStorageUsage = async (): Promise<number> => {
    return streamSourcesStorage.getStorageUsage()
  }

  const clearAllSources = async (): Promise<void> => {
    try {
      await streamSourcesStorage.clearAll()
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
