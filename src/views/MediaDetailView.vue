<template>
  <div class="min-h-screen bg-stream-bg">
    <!-- Floating Header -->
    <div
      class="fixed top-10 left-0 right-0 z-50 px-3 py-0 bg-stream-bg/95 backdrop-blur-sm border-b border-stream-border/50"
    >
      <Button @click="navigationService.goBack()" variant="ghost" class="mb-4">
        <ArrowLeft class="w-4 h-4 mr-2" />
        Back
      </Button>
    </div>

    <!-- Media Detail Content -->
    <div class="p-6 pt-24 md:pt-20">
      <div class="w-full lg:w-3/4">
        <div v-if="!media" class="text-center py-12">
          <h2 class="text-xl font-semibold text-stream-text mb-4">Media not found</h2>
          <Button @click="navigationService.goBack()" variant="outline">
            <ArrowLeft class="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        <div v-else class="space-y-8">
          <!-- Video Player -->
          <div class="w-full">
            <Card class="overflow-hidden bg-stream-surface border-stream-border">
              <div class="p-0">
                <div class="relative aspect-video max-h-[50vh] sm:max-h-none" id="video-container">
                  <!-- Video Player -->
                  <div v-if="isPlaying" class="w-full h-full">
                    <video
                      ref="videoPlayer"
                      class="video-js vjs-default-skin w-full h-full"
                      controls
                      preload="auto"
                      data-setup="{}"
                    />
                  </div>

                  <!-- Thumbnail/Poster -->
                  <div v-else class="relative w-full h-full bg-black">
                    <!-- Display thumbnail (if available and not failed to load) -->
                    <img
                      v-if="media.thumbnail && !imageLoadError"
                      :src="media.thumbnail"
                      :alt="media.title"
                      class="w-full h-full object-contain"
                      @error="handleImageError"
                    />

                    <!-- Default placeholder (when no thumbnail or failed to load) -->
                    <div
                      v-if="!media.thumbnail || imageLoadError"
                      class="w-full h-full flex items-center justify-center bg-stream-surface/50"
                    >
                      <div class="text-center">
                        <Play
                          class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-stream-text-muted"
                        />
                        <p class="text-stream-text-muted text-xs sm:text-sm">
                          No thumbnail available
                        </p>
                      </div>
                    </div>

                    <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Button
                        @click="handlePlay"
                        size="lg"
                        class="bg-gradient-primary hover:bg-stream-accent-hover"
                      >
                        <Play class="w-6 h-6 mr-2" />
                        Play Now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <!-- Media Information -->
          <div class="grid lg:grid-cols-2 gap-8">
            <!-- Left Column: Basic Info and Actions -->
            <div class="space-y-6">
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <div class="bg-stream-accent text-white text-xs px-2 py-1 rounded">
                    {{ media.type.toUpperCase() }}
                  </div>
                  <div
                    v-if="media.genre"
                    class="border border-stream-border text-stream-text-muted text-xs px-2 py-1 rounded"
                  >
                    {{ media.genre }}
                  </div>
                </div>

                <h1 class="text-3xl font-bold text-stream-text">
                  {{ media.title }}
                </h1>

                <p class="text-lg text-stream-text-muted">
                  {{ media.description }}
                </p>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-3">
                <Button
                  v-if="!isPlaying"
                  @click="handlePlay"
                  class="bg-gradient-primary hover:bg-stream-accent-hover flex-1"
                >
                  <Play class="w-4 h-4 mr-2" />
                  Play
                </Button>
                <Button
                  v-else
                  @click="handleStop"
                  variant="outline"
                  class="border-stream-border flex-1"
                >
                  Stop
                </Button>
                <Button
                  @click="handleToggleFavorite"
                  variant="outline"
                  class="border-stream-border"
                  :class="
                    isFavorite
                      ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20'
                      : 'hover:bg-stream-accent/10'
                  "
                >
                  <Heart :class="['w-4 h-4 mr-2', isFavorite ? 'fill-current' : '']" />
                  {{ isFavorite ? 'Remove from Favorites' : 'Add to Favorites' }}
                </Button>
              </div>
            </div>

            <!-- Right Column: Stats and Additional Info -->
            <div class="space-y-6">
              <!-- Media Stats -->
              <div class="grid grid-cols-2 gap-4">
                <div v-if="media.rating" class="flex items-center space-x-2">
                  <Star class="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span class="text-stream-text font-medium">{{ media.rating }}</span>
                  <span class="text-stream-text-muted">/10</span>
                </div>

                <div v-if="media.year" class="flex items-center space-x-2">
                  <Calendar class="w-5 h-5 text-stream-text-muted" />
                  <span class="text-stream-text">{{ media.year }}</span>
                </div>

                <div v-if="media.duration" class="flex items-center space-x-2">
                  <Clock class="w-5 h-5 text-stream-text-muted" />
                  <span class="text-stream-text">{{ media.duration }}</span>
                </div>

                <div v-if="media.timeRemaining" class="flex items-center space-x-2">
                  <Clock class="w-5 h-5 text-stream-accent" />
                  <span class="text-stream-text">{{ media.timeRemaining }}</span>
                </div>
              </div>

              <!-- Additional Info -->
              <Card class="bg-stream-surface border-stream-border">
                <div class="p-4">
                  <h3 class="font-semibold text-stream-text mb-2">About</h3>
                  <p class="text-stream-text-muted text-sm">Category: {{ media.category }}</p>
                  <p class="text-stream-text-muted text-sm">Type: {{ media.type }}</p>
                  <p v-if="media.url" class="text-stream-text-muted text-sm">
                    <span class="block mb-1">Source:</span>
                    <span class="block break-all">{{ media.url }}</span>
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ArrowLeft, Play, Star, Clock, Calendar, Heart } from 'lucide-vue-next'
import Card from '@/components/ui/UiCard.vue'
import Button from '@/components/ui/UiButton.vue'
import { useNavigationStore } from '@/stores/navigation'
import { useNavigationService } from '@/services/navigationService'
import { recentWatchingService } from '@/services/recentWatchingService'
import { favoritesService } from '@/services/favoritesService'
import type { MediaItem } from '@/types/stream'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import '@videojs/http-streaming'

const navigationStore = useNavigationStore()
const navigationService = useNavigationService()

const media = ref<MediaItem | null>(null)
const isPlaying = ref(false)
const videoPlayer = ref<HTMLVideoElement | null>(null)
const imageLoadError = ref(false)
let player: ReturnType<typeof videojs> | null = null

// Favorite state - use a reactive ref instead of computed
const isFavorite = ref(false)

// Update favorite status
const updateFavoriteStatus = () => {
  if (!media.value || !navigationStore.currentSourceId) {
    isFavorite.value = false
    return
  }
  isFavorite.value = favoritesService.isFavorite(media.value.id, navigationStore.currentSourceId)
}

// Toggle favorite status
const handleToggleFavorite = () => {
  if (!media.value || !navigationStore.currentSourceId) return

  const success = favoritesService.toggleFavorite(media.value, navigationStore.currentSourceId)
  if (success) {
    // Manually update the reactive state
    updateFavoriteStatus()
    const action = isFavorite.value ? 'added to' : 'removed from'
    console.log(`Media ${action} favorites:`, media.value.title)
  }
}

// Load media from the navigation store
const loadMedia = async () => {
  console.log('Loading media from navigation store')

  // // No need to validate the current navigation state
  // const sourceValidation = navigationStore.validateCurrentSource()
  // if (!sourceValidation.isValid) {
  //   console.error('No valid current source:', sourceValidation.error)
  //   media.value = null
  //   return
  // }

  // Validate the current MediaItem
  const mediaValidation = navigationStore.validateCurrentMediaItem()
  if (!mediaValidation.isValid) {
    console.error('No valid current media item:', mediaValidation.error)
    media.value = null
    return
  }

  // Get the current MediaItem directly from the navigation store
  media.value = navigationStore.currentMediaItem
  console.log('Media loaded from navigation store:', media.value)

  // Reset image load error state
  imageLoadError.value = false

  // Initialize favorite status
  updateFavoriteStatus()

  // After successfully loading the media, add it to the recent watching list
  if (media.value && navigationStore.currentSourceId) {
    try {
      recentWatchingService.addToRecentWatching({
        mediaItem: media.value,
        sourceId: navigationStore.currentSourceId,
      })
      console.log('Added to recent watching:', media.value.title)
    } catch (error) {
      console.error('Failed to add to recent watching:', error)
    }
  }
}

const initializePlayer = async () => {
  if (!videoPlayer.value || !media.value?.url) return

  try {
    // Initialize the video.js player
    player = videojs(videoPlayer.value, {
      controls: true,
      responsive: true,
      fluid: true,
      fill: true,
      preload: 'auto',
      autoplay: true,
      sources: [
        {
          src: media.value.url,
          type: getVideoType(media.value.url),
        },
      ],
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      html5: {
        hls: {
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          overrideNative: true,
        },
      },
    })

    player.ready(() => {
      console.log('Video.js player is ready')
      console.log('Playing URL:', media.value?.url)
    })

    player.on('error', (error: Error) => {
      console.error('Video.js error:', error)
      console.error('Error details:', player?.error())
      alert('Failed to load video. Please check the stream URL.')
    })

    player.on('loadstart', () => {
      console.log('Video load started')
    })

    player.on('canplay', () => {
      console.log('Video can start playing')
    })
  } catch (error) {
    console.error('Failed to initialize video player:', error)
  }
}

const getVideoType = (url: string): string => {
  if (url.includes('.m3u8')) return 'application/x-mpegURL'
  if (url.includes('.mp4')) return 'video/mp4'
  if (url.includes('.webm')) return 'video/webm'
  if (url.includes('.ogg')) return 'video/ogg'
  // Default to HLS type, suitable for most IPTV streams
  return 'application/x-mpegURL'
}

const handlePlay = async (): Promise<void> => {
  if (!media.value?.url) {
    alert('No video URL available')
    return
  }

  // Check if the URL is a mock URL
  if (media.value.url.startsWith('mock://')) {
    alert('This is a mock URL. Please configure real streaming sources to play actual content.')
    return
  }

  console.log('Playing media:', media.value?.title)
  console.log('Media URL:', media.value?.url)
  console.log('Video type:', getVideoType(media.value.url))

  isPlaying.value = true

  // Wait for the DOM to update
  await nextTick()

  // Initialize the player
  setTimeout(() => {
    initializePlayer()
  }, 100)
}

const handleStop = (): void => {
  cleanupPlayer()
  isPlaying.value = false
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  console.warn('Thumbnail failed to load:', target.src)
  // Set the image load failed state
  imageLoadError.value = true
}

const cleanupPlayer = () => {
  if (player) {
    try {
      player.dispose()
      player = null
    } catch (error) {
      console.error('Error disposing video player:', error)
    }
  }
}

onMounted(() => {
  loadMedia()
})

onUnmounted(() => {
  cleanupPlayer()
})
</script>
