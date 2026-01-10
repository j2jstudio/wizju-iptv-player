<template>
  <div class="p-6 h-screen flex flex-col">
    <div class="mb-6 flex-shrink-0">
      <h1 class="text-2xl font-bold text-stream-text">Series</h1>
      <p v-if="currentSource" class="text-sm text-stream-text-muted mt-1">
        Source: {{ currentSource.name }}
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 space-y-4">
      <div class="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin"></div>
      <p class="text-stream-text-muted">Loading series...</p>
    </div>

    <!-- No sources configured -->
    <div v-else-if="!hasConfiguredSources" class="text-center py-12">
      <p class="text-stream-text-muted mb-4">
        No streaming sources configured. Add your IPTV/M3U sources to see series.
      </p>
      <p class="text-sm text-stream-text-muted">
        Go to Settings to configure your streaming sources.
      </p>
    </div>

    <!-- No current source -->
    <div v-else-if="!hasCurrentSource" class="text-center py-12">
      <p class="text-stream-text-muted mb-4">
        Please select a source from the sidebar to view series.
      </p>
    </div>

    <!-- Series grid -->
    <div v-else-if="series.length === 0" class="text-center py-12">
      <p class="text-stream-text-muted">
        No series available in this source.
      </p>
    </div>

    <!-- Display series -->
    <div v-else class="flex-1">
      <MediaGrid :items="series" @item-click="handleSeriesClick" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import MediaGrid from '@/components/media/MediaGrid.vue'
import { useStreamSourcesStore } from '@/stores/streamSources'
import { useNavigationStore } from '@/stores/navigation'
import { useNavigationService } from '@/services/navigationService'
import type { M3UMediaItem } from '@/types/stream'

const streamSourcesStore = useStreamSourcesStore()
const navigationStore = useNavigationStore()
const navigationService = useNavigationService()

const isLoading = ref(false)

const currentSource = computed(() => navigationStore.currentSource)
const currentMediaItems = computed(() => navigationStore.currentSourceMediaItems)
const hasConfiguredSources = computed(() => streamSourcesStore.sources.length > 0)
const hasCurrentSource = computed(() => !!navigationStore.currentSource)

// Get series (series type media items)
const series = computed(() => {
  return currentMediaItems.value.filter((item) => item.type === 'series')
})

const handleSeriesClick = (seriesItem: M3UMediaItem): void => {
  console.log('Playing series:', seriesItem.title)
  navigationService.navigateToMediaDetail(seriesItem)
}

// Initialize the view
const initializeView = async () => {
  isLoading.value = true
  try {
    const validation = navigationStore.validateCurrentSource()
    if (!validation.isValid && navigationStore.currentSourceId) {
      console.error('Invalid current source:', validation.error)
    }
  } catch (error) {
    console.error('Failed to initialize view:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  initializeView()
})
</script>
