<template>
  <div class="p-6 space-y-8 min-h-full pb-20">
    <!-- Show setup if first time -->
    <SetupWelcome v-if="streamSourcesStore.sources.length === 0" @complete="handleSetupComplete" />

    <!-- Loading state -->
    <div v-else-if="isLoading" class="flex flex-col items-center justify-center py-12 space-y-4">
      <div class="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin"></div>
      <p class="text-stream-text-muted">Loading your content...</p>
    </div>

    <!-- Show home content if sources configured -->
    <template v-else>
      <!-- Header -->
      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-stream-text">Home</h1>
        <p class="text-stream-text-muted">Wizju - Online IPTV Player.</p>
      </div>

      <!-- Resume Watching -->
      <CategorySection
        title="Resume watching"
        :items="resumeWatching"
        empty-message="No recent watching history. Start watching some content to see it here!"
        @item-click="handleMediaClick"
      />

      <!-- Favorites -->
      <CategorySection
        title="Favorites"
        :items="favorites"
        empty-message="No favorites yet. Add some content to your favorites from the media detail page!"
        @item-click="handleMediaClick"
      />

      <!-- Scroll Test Hint (Development Environment) -->
      <div v-if="isDev" class="mt-12 p-4 bg-stream-surface border border-stream-border rounded-lg">
        <h3 class="text-lg font-semibold text-stream-text mb-2">Scroll Test Area</h3>
        <p class="text-stream-text-muted mb-4">
          This section is added to test scrolling functionality. If you can see this and scroll to
          see content above/below, then scrolling is working correctly.
        </p>
        <div class="space-y-2">
          <div class="h-20 bg-stream-accent/10 rounded flex items-center justify-center">
            <span class="text-stream-accent">Test Content Block 1</span>
          </div>
          <div class="h-20 bg-stream-accent/10 rounded flex items-center justify-center">
            <span class="text-stream-accent">Test Content Block 2</span>
          </div>
          <div class="h-20 bg-stream-accent/10 rounded flex items-center justify-center">
            <span class="text-stream-accent">Test Content Block 3</span>
          </div>
        </div>
      </div>

      <!-- Message when no sources -->
      <div v-if="streamSourcesStore.sources.length === 0" class="text-center py-12 space-y-4">
        <h3 class="text-lg font-semibold text-stream-text">No streaming sources configured</h3>
        <p class="text-stream-text-muted">
          Add your first IPTV or M3U source to start watching content.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import CategorySection from '@/components/media/CategorySection.vue'
import SetupWelcome from '@/components/setup/SetupWelcome.vue'
import { useStreamSourcesStore } from '@/stores/streamSources'
import { useNavigationService } from '@/services/navigationService'
import { recentWatchingService } from '@/services/recentWatchingService'
import { favoritesService } from '@/services/favoritesService'
import type { M3UMediaItem } from '@/types/stream'

const streamSourcesStore = useStreamSourcesStore()
const navigationService = useNavigationService()

// Development environment check
const isDev = import.meta.env.DEV

// Loading state
const isLoading = ref(false)

// Recent watching data and favorites data
const resumeWatching = ref<M3UMediaItem[]>([])
const favorites = ref<M3UMediaItem[]>([])

// Load recent watching data
const loadRecentWatching = async () => {
  try {
    const recentItems = await recentWatchingService.loadRecentWatching()
    resumeWatching.value = await recentWatchingService.convertToDisplayMediaItems(recentItems)
    console.log('Loaded recent watching items:', resumeWatching.value.length)
  } catch (error) {
    console.error('Failed to load recent watching items:', error)
    resumeWatching.value = []
  }
}

// Load favorites data
const loadFavorites = async () => {
  try {
    favorites.value = await favoritesService.getFavoritesAsMediaItems()
    console.log('Loaded favorites:', favorites.value.length)
  } catch (error) {
    console.error('Failed to load favorites:', error)
    favorites.value = []
  }
}

// Load all data
const loadAllData = async () => {
  isLoading.value = true
  try {
    await Promise.all([
      loadRecentWatching(),
      loadFavorites()
    ])
  } catch (error) {
    console.error('Failed to load data:', error)
  } finally {
    isLoading.value = false
  }
}

const handleMediaClick = (media: M3UMediaItem): void => {
  console.log('Playing media:', media.title)

  // Use navigation service for navigation
  navigationService.navigateToMediaDetail(media)
}

const handleSetupComplete = (): void => {
  streamSourcesStore.setIsFirstTime(false)
}

// Load data when the component is mounted
onMounted(() => {
  loadAllData()
})

// Refresh data when the component is activated (e.g., returning from another page)
onActivated(() => {
  loadAllData()
})
</script>
