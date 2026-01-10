import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StreamSource, CreateStreamSource } from '@/types/stream'
import { StreamSourcesStorageV2 } from '@/services/indexedDb/streamSourcesStorageV2'

// Initialize storage service
const streamSourcesStorage = new StreamSourcesStorageV2()

export const useStreamSourcesStore = defineStore('streamSources', () => {
  const sources = ref<StreamSource[]>([])
  const isFirstTime = ref(true)
  const isLoading = ref(false)

  const activeSources = computed(() => sources.value.filter((source) => source.isActive))

  const loadSources = async (): Promise<void> => {
    try {
      isLoading.value = true
      const loadedSources = await streamSourcesStorage.loadItems()
      sources.value = loadedSources
      isFirstTime.value = loadedSources.length === 0
    } catch (error) {
      console.error('Failed to load stream sources:', error)
    } finally {
      isLoading.value = false
    }
  }

  const addSource = async (sourceData: CreateStreamSource): Promise<StreamSource> => {
    try {
      const newSource = await streamSourcesStorage.addItem(sourceData)
      sources.value.push(newSource)
      isFirstTime.value = false
      return newSource
    } catch (error) {
      console.error('Failed to add stream source:', error)
      throw error
    }
  }

  const addSourceWithCategories = async (
    sourceInput: Omit<CreateStreamSource, 'categories'>,
    categories: string[],
  ): Promise<StreamSource> => {
    const sourceData: CreateStreamSource = {
      ...sourceInput,
      categories,
    }
    return await addSource(sourceData)
  }

  const updateSourceCategories = async (id: string, categories: string[]): Promise<void> => {
    try {
      const updatedSource = await streamSourcesStorage.updateItem(id, { categories })
      if (updatedSource) {
        const index = sources.value.findIndex((s) => s.id === id)
        if (index !== -1) {
          sources.value[index] = updatedSource
        }
      }
    } catch (error) {
      console.error('Failed to update source categories:', error)
      throw error
    }
  }

  const removeSource = async (id: string): Promise<void> => {
    try {
      await streamSourcesStorage.removeItem(id)
      sources.value = sources.value.filter((s) => s.id !== id)

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
      const updatedSource = await streamSourcesStorage.toggleSourceActive(id)
      if (updatedSource) {
        const index = sources.value.findIndex((s) => s.id === id)
        if (index !== -1) {
          sources.value[index] = updatedSource
        }
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
    try {
      const estimate = await navigator.storage.estimate()
      return estimate.usage || 0
    } catch (error) {
      console.error('Failed to get storage usage:', error)
      return 0
    }
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
    return sources.value.find((s) => s.id === id)
  }

  // Initialize on store creation
  loadSources()

  return {
    sources: computed(() => sources.value),
    activeSources,
    isFirstTime: computed(() => isFirstTime.value),
    isLoading: computed(() => isLoading.value),
    loadSources,
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
