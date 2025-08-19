<template>
  <div class="p-6 h-screen flex flex-col">
    <div class="flex items-center justify-between mb-6 flex-shrink-0">
      <div>
        <h1 class="text-2xl font-bold text-stream-text">Live TV</h1>
        <p v-if="currentSource" class="text-sm text-stream-text-muted mt-1">
          Source: {{ currentSource.name }}
        </p>
      </div>
      <div v-if="currentSource" class="flex items-center space-x-2">
        <button
          @click="handleRefreshSource"
          :disabled="isRefreshing"
          class="flex items-center px-3 py-2 text-sm font-medium text-stream-accent hover:text-stream-accent-hover hover:bg-stream-accent/10 rounded-md transition-colors border border-stream-accent/30 hover:border-stream-accent disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh Source"
        >
          <RefreshCw :class="cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')" />
          {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button
          @click="showDeleteConfirm = true"
          class="flex items-center px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors border border-red-400/30 hover:border-red-400"
          title="Delete Source"
        >
          <Trash2 class="w-4 h-4 mr-2" />
          Delete Source
        </button>
      </div>
    </div>

    <div v-if="!hasConfiguredSources" class="text-center py-12">
      <p class="text-stream-text-muted mb-4">
        No streaming sources configured. Add your IPTV/M3U sources to see live channels.
      </p>
      <p class="text-sm text-stream-text-muted">
        Go to Settings to configure your streaming sources.
      </p>
    </div>

    <div v-else-if="!hasCurrentSource" class="text-center py-12">
      <p class="text-stream-text-muted mb-4">
        Please select a source from the sidebar to view channels.
      </p>
    </div>

    <div v-else-if="navigationError" class="text-center py-12">
      <p class="text-red-400 mb-4">
        {{ navigationError }}
      </p>
      <p class="text-stream-text-muted mb-4">
        The selected source may have been removed or is not active.
      </p>
    </div>

    <div v-else class="flex flex-col flex-1">
      <!-- Category Tabs -->
      <div class="mb-6 flex-shrink-0">
        <div class="relative">
          <!-- Scrollable category tabs container -->
          <div
            ref="categoryScrollContainer"
            class="flex overflow-x-auto scrollbar-hide space-x-1 bg-stream-surface border border-stream-border rounded-lg p-1"
            style="scrollbar-width: none; -ms-overflow-style: none"
            @scroll="handleCategoryScroll"
          >
            <button
              v-for="category in categories"
              :key="category.id"
              ref="categoryButtons"
              @click="scrollToCategory(category.id)"
              :class="
                cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0',
                  activeCategory === category.id
                    ? 'bg-stream-accent text-white'
                    : 'text-stream-text-muted hover:text-stream-text hover:bg-stream-accent/10',
                )
              "
            >
              {{ category.name }}
            </button>
          </div>

          <!-- Left gradient mask -->
          <div
            v-show="showLeftGradient"
            class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-stream-surface to-transparent pointer-events-none rounded-l-lg"
          ></div>

          <!-- Right gradient mask -->
          <div
            v-show="showRightGradient"
            class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-stream-surface to-transparent pointer-events-none rounded-r-lg"
          ></div>

          <!-- Left scroll button -->
          <button
            v-show="showLeftButton"
            @click="scrollCategoryLeft"
            class="absolute left-1 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-stream-accent/20 hover:bg-stream-accent/30 rounded-full flex items-center justify-center transition-colors"
            title="Scroll left"
          >
            <svg
              class="w-3 h-3 text-stream-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
          </button>

          <!-- Right scroll button -->
          <button
            v-show="showRightButton"
            @click="scrollCategoryRight"
            class="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-stream-accent/20 hover:bg-stream-accent/30 rounded-full flex items-center justify-center transition-colors"
            title="Scroll right"
          >
            <svg
              class="w-3 h-3 text-stream-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Channel Grid -->
      <div v-if="filteredChannels.length === 0" class="text-center py-12">
        <p class="text-stream-text-muted">No channels available in this category.</p>
      </div>

      <!-- Virtual scroll grid -->
      <div class="virtual-grid-wrapper flex-1 flex flex-col">
        <!-- Debug info -->
        <div
          v-if="isDev"
          class="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs flex-shrink-0"
        >
          Debug: Virtual Scroll Active | Channels: {{ filteredChannels.length }} | Columns:
          {{ itemsPerRow }} | Threshold: {{ VIRTUAL_SCROLL_THRESHOLD }} | Total Rows:
          {{ Math.ceil(filteredChannels.length / itemsPerRow) }}
        </div>

        <div class="flex-1 pb-20">
          <VirtualGrid
            ref="virtualGridRef"
            :items="filteredChannels"
            :item-height="280"
            :container-height="containerHeight"
            :items-per-row="itemsPerRow"
            :gap="16"
            grid-class="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          >
            <template #default="{ item }">
              <div class="w-full h-full flex">
                <ChannelCard
                  :channel="item as Channel"
                  @click="handleChannelClick(item as Channel)"
                  class="w-full h-full"
                />
              </div>
            </template>
          </VirtualGrid>

          <!-- Virtual scroll hint - fixed at the bottom -->
          <div
            class="text-center py-4 text-sm text-stream-text-muted bg-stream-background/80 backdrop-blur-sm border-t border-stream-border flex-shrink-0"
          >
            Showing {{ filteredChannels.length }} channels
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div
        class="bg-stream-surface border border-stream-border rounded-lg p-6 max-w-md w-full mx-4"
      >
        <h3 class="text-lg font-semibold text-stream-text mb-4">Delete Source</h3>
        <p class="text-stream-text-muted mb-6">
          Are you sure you want to delete "<strong>{{ currentSource?.name }}</strong
          >"? <br /><br />
          This will permanently remove the source and all its channels ({{
            channels.length
          }}
          channels). This action cannot be undone.
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="cancelDelete"
            :disabled="isDeleting"
            class="px-4 py-2 text-sm font-medium text-stream-text-muted hover:text-stream-text border border-stream-border hover:border-stream-border-hover rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            @click="handleDeleteSource"
            :disabled="isDeleting"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RefreshCw, Trash2 } from 'lucide-vue-next'
import { cn } from '@/utils/cn'
import ChannelCard from '@/components/media/ChannelCard.vue'
import VirtualGrid from '@/components/ui/VirtualGrid.vue'
import { useStreamSourcesStore } from '@/stores/streamSources'
import { useNavigationStore } from '@/stores/navigation'
import { useMediaItemsStore } from '@/stores/mediaItems'
import { useNavigationService } from '@/services/navigationService'
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid'
import {
  parseAndSaveMediaItems,
  extractCategories,
  addSourceIdToMediaItems,
} from '@/services/mediaParsingService'
import { recentWatchingService } from '@/services/recentWatchingService'
import type { Channel } from '@/types/stream'

const streamSourcesStore = useStreamSourcesStore()
const navigationStore = useNavigationStore()
const mediaItemsStore = useMediaItemsStore()
const navigationService = useNavigationService()
const { getColumnsCount } = useResponsiveGrid()
const activeCategory = ref('all')

// Delete confirmation state
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)

// Refreshing state
const isRefreshing = ref(false)

// Category scroll state
const categoryScrollContainer = ref<HTMLElement>()
const categoryButtons = ref<HTMLElement[]>([])
const showLeftGradient = ref(false)
const showRightGradient = ref(false)
const showLeftButton = ref(false)
const showRightButton = ref(false)

// Get the current source and media items from the navigation store
const currentSource = computed(() => navigationStore.currentSource)
const currentMediaItems = computed(() => navigationStore.currentSourceMediaItems)

const hasConfiguredSources = computed(() => streamSourcesStore.sources.length > 0)

// Check if there is a current source (from the navigation store)
const hasCurrentSource = computed(() => !!navigationStore.currentSource)

// Initialize the view
const initializeView = () => {
  // Validate the current source
  const validation = navigationStore.validateCurrentSource()
  if (!validation.isValid && navigationStore.currentSourceId) {
    console.error('Invalid current source:', validation.error)
  }
}

const navigationError = computed(() => {
  return navigationStore.getNavigationError()
})

// Get the live type MediaItems of the current source, Channel is now an alias for MediaItem
const channels = computed(() => {
  return currentMediaItems.value.filter((item) => item.type === 'live')
})

// Generate category tabs from the categories of the current source
const categories = computed(() => {
  const baseCategories = [{ id: 'all', name: 'All' }]

  if (
    currentSource.value &&
    currentSource.value.categories &&
    currentSource.value.categories.length > 0
  ) {
    const sourceCategories = currentSource.value.categories.map((cat) => ({
      id: cat.toLowerCase(),
      name: cat,
    }))
    return [...baseCategories, ...sourceCategories]
  }

  // If there are no source categories, extract from the actual channels
  const channelCategories = new Set<string>()

  channels.value.forEach((ch) => {
    if (ch.category && ch.category.trim()) {
      // Support multiple categories separated by semicolons
      const categories = ch.category
        .split(';')
        .map((cat) => cat.trim())
        .filter((cat) => cat.length > 0)

      categories.forEach((cat) => channelCategories.add(cat))
    }
  })

  const extractedCategories = Array.from(channelCategories)
    .sort()
    .map((cat) => ({
      id: cat.toLowerCase(),
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
    }))

  return [...baseCategories, ...extractedCategories]
})

const filteredChannels = computed(() => {
  if (activeCategory.value === 'all') {
    return channels.value
  }

  return channels.value.filter((channel) => {
    if (!channel.category || !channel.category.trim()) {
      return false
    }
    // Check if the category string includes the active category
    return channel.category.toLocaleLowerCase().includes(activeCategory.value)
    // const channelCategories = channel.category.split(';')
    //   .map(cat => cat.trim().toLowerCase())
    //   .filter(cat => cat.length > 0)

    // return channelCategories.includes(activeCategory.value)
  })
})

// Virtual scroll settings
const VIRTUAL_SCROLL_THRESHOLD = 30 // Further lower the threshold to ensure virtual scrolling is used for large amounts of data
const virtualGridRef = ref()

// Always use virtual scroll for now
const shouldUseVirtualScroll = computed(() => {
  return true
  // const channelCount = filteredChannels.value.length

  // return channelCount > VIRTUAL_SCROLL_THRESHOLD && channelCount > 0
})

const itemsPerRow = computed(() => getColumnsCount())

// Development environment check
const isDev = import.meta.env.DEV

// Container height for virtual grid
const containerHeight = ref(800)

// Debounce function
const debounce = <T extends (...args: never[]) => unknown>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

const updateScrollIndicators = () => {
  if (!categoryScrollContainer.value) return

  const container = categoryScrollContainer.value
  const scrollLeft = container.scrollLeft
  const scrollWidth = container.scrollWidth
  const clientWidth = container.clientWidth

  // Show gradients
  showLeftGradient.value = scrollLeft > 0
  showRightGradient.value = scrollLeft < scrollWidth - clientWidth

  // Show buttons
  const needsScroll = scrollWidth > clientWidth
  showLeftButton.value = needsScroll && scrollLeft > 0
  showRightButton.value = needsScroll && scrollLeft < scrollWidth - clientWidth
}

const handleCategoryScroll = () => {
  updateScrollIndicators()
}

const scrollCategoryLeft = () => {
  if (!categoryScrollContainer.value) return

  const container = categoryScrollContainer.value
  const scrollAmount = Math.min(200, container.clientWidth * 0.8)
  container.scrollBy({
    left: -scrollAmount,
    behavior: 'smooth',
  })
}

const scrollCategoryRight = () => {
  if (!categoryScrollContainer.value) return

  const container = categoryScrollContainer.value
  const scrollAmount = Math.min(200, container.clientWidth * 0.8)
  container.scrollBy({
    left: scrollAmount,
    behavior: 'smooth',
  })
}

const scrollToCategory = (categoryId: string) => {
  // Set the active category
  activeCategory.value = categoryId

  // Scroll the category into view
  if (!categoryScrollContainer.value || !categoryButtons.value) return

  const categoryIndex = categories.value.findIndex((cat) => cat.id === categoryId)
  if (categoryIndex === -1) return

  const targetButton = categoryButtons.value[categoryIndex]
  if (!targetButton) return

  const container = categoryScrollContainer.value
  const buttonRect = targetButton.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  // Calculate the target scroll position to center the button
  const buttonLeft = buttonRect.left - containerRect.left + container.scrollLeft
  const buttonWidth = buttonRect.width
  const containerWidth = container.clientWidth

  // Calculate the scroll position to center the button
  const targetScrollLeft = buttonLeft - (containerWidth - buttonWidth) / 2

  container.scrollTo({
    left: Math.max(0, targetScrollLeft),
    behavior: 'smooth',
  })
}

// Update container height for virtual grid
const updateContainerHeight = () => {
  console.log('updateContainerHeight called')
  if (typeof window !== 'undefined') {
    // Calculate available height: viewport height - page padding - header height - category tabs height - bottom margin 80
    const headerHeight = 100 // Estimated height for header and category tabs
    const paddingHeight = 48 // p-6 = 24px * 2
    const bottomMargin = 80 // Fixed bottom margin for VirtualGrid
    const footerHeight = 60 // Height of the virtual scroll hint area

    const newHeight = Math.max(
      400, // Minimum height
      window.innerHeight - paddingHeight - headerHeight - bottomMargin - footerHeight,
    )

    if (containerHeight.value !== newHeight) {
      containerHeight.value = newHeight

      // Debugging in development environment
      if (isDev) {
        console.log('Container height updated:', {
          windowHeight: window.innerHeight,
          newContainerHeight: newHeight,
          itemsPerRow: itemsPerRow.value,
          calculations: {
            paddingHeight,
            headerHeight,
            bottomMargin,
            footerHeight,
            totalReserved: paddingHeight + headerHeight + bottomMargin + footerHeight,
          },
        })
      }
    }
  }
}

const debouncedUpdateContainerHeight = debounce(updateContainerHeight, 250)

const handleChannelClick = (channel: Channel): void => {
  console.log('Playing channel:', channel.title, 'from source:', currentSource.value?.name)

  // Use the navigation service to navigate to the channel detail page
  navigationService.navigateToChannelDetail(channel, currentSource.value?.id)
}

// Delete source handler
const handleDeleteSource = async (): Promise<void> => {
  if (!currentSource.value) return

  try {
    isDeleting.value = true
    const sourceId = currentSource.value.id
    const sourceName = currentSource.value.name

    // 1. Delete all MediaItems corresponding to this source
    await mediaItemsStore.clearMediaItemsBySource(sourceId)

    // 2. Delete all recent watching records related to this source
    recentWatchingService.removeBySourceId(sourceId)

    // 3. Delete the StreamSource
  await streamSourcesStore.removeSource(sourceId)

    console.log(`Successfully deleted source: ${sourceName} and all its items`)

    // 4. Close the confirmation dialog
    showDeleteConfirm.value = false

    // 5. Use the navigation service for smart navigation
    navigationService.navigateAfterSourceDeletion()
  } catch (error) {
    console.error('Failed to delete source:', error)
    alert('Failed to delete source. Please try again.')
  } finally {
    isDeleting.value = false
  }
}

// Refresh source handler
const handleRefreshSource = async (): Promise<void> => {
  if (!currentSource.value) return

  try {
    isRefreshing.value = true
    const source = currentSource.value
    const sourceId = source.id
    const sourceUrl = source.url

    console.log(`Refreshing source: ${source.name}`)

    // 1. Parse the new MediaItems
    const newMediaItems = await parseAndSaveMediaItems(sourceUrl)

    // 2. Delete the old MediaItems
    await mediaItemsStore.clearMediaItemsBySource(sourceId)

    // 3. Add the new MediaItems (with sourceId)
    const mediaItemsWithSourceId = addSourceIdToMediaItems(newMediaItems, sourceId)

  await mediaItemsStore.addMediaItemsBatch(sourceId, mediaItemsWithSourceId)

    // 4. Extract categories from the new MediaItems and update the StreamSource
    const categories = extractCategories(newMediaItems)
  await streamSourcesStore.updateSourceCategories(sourceId, categories)

    console.log(
      `Successfully refreshed source: ${source.name} with ${newMediaItems.length} media items`,
    )
    alert(`Successfully refreshed source "${source.name}" with ${newMediaItems.length} channels.`)
  } catch (error) {
    console.error('Failed to refresh source:', error)
    alert(`Failed to refresh source: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    isRefreshing.value = false
  }
}

const cancelDelete = (): void => {
  showDeleteConfirm.value = false
}

onMounted(() => {
  initializeView()

  // Update container height on mount
  updateContainerHeight()

  // Update scroll indicators after a short delay
  setTimeout(() => {
    updateScrollIndicators()
  }, 100) // Delay to ensure DOM is rendered

  // Add resize listener
  window.addEventListener('resize', debouncedUpdateContainerHeight, { passive: true })

  // Combined resize handler
  const handleResize = () => {
    debouncedUpdateContainerHeight()
    setTimeout(updateScrollIndicators, 50)
  }
  window.addEventListener('resize', handleResize, { passive: true })

  // Orientation change handler
  if ('screen' in window && 'orientation' in screen) {
    window.addEventListener(
      'orientationchange',
      () => {
        // Delay update to wait for layout to stabilize
        setTimeout(() => {
          updateContainerHeight()
          updateScrollIndicators()
        }, 300)
      },
      { passive: true },
    )
  }

  // Debugging shortcuts in development environment
  if (isDev) {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case 'D':
            // Ctrl+Shift+D: Toggle debug info
            console.log('Virtual Scroll Debug Info:', {
              shouldUseVirtualScroll: shouldUseVirtualScroll.value,
              filteredChannelsCount: filteredChannels.value.length,
              itemsPerRow: itemsPerRow.value,
              containerHeight: containerHeight.value,
              hasCurrentSource: hasCurrentSource.value,
            })
            break
          case 'R':
            // Ctrl+Shift+R: Reset virtual scroll
            if (virtualGridRef.value) {
              virtualGridRef.value.scrollToTop()
            }
            break
          case 'U':
            // Ctrl+Shift+U: Manually update layout
            updateContainerHeight()
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyPress)

    const cleanup = () => {
      window.removeEventListener('keydown', handleKeyPress)
      window.removeEventListener('resize', debouncedUpdateContainerHeight)
      window.removeEventListener('orientationchange', updateContainerHeight)
    }
    onUnmounted(cleanup)
  } else {
    // Cleanup for production environment
    onUnmounted(() => {
      window.removeEventListener('resize', debouncedUpdateContainerHeight)
      window.removeEventListener('orientationchange', updateContainerHeight)
    })
  }
})
</script>

<style scoped>
/* Hide scrollbar */
.scrollbar-hide {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none; /* WebKit */
}

.scrollbar-hide > button {
  flex-shrink: 0;
}

/* Flexbox fix for virtual grid wrapper */
.virtual-grid-wrapper {
  min-height: 0; /* Allow flex child to shrink */
  overflow: hidden; /* Prevent content overflow */
}

/* Ensure the main container takes up the full screen height */
.p-6.h-screen {
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}
</style>
