<template>
  <div class="flex items-center justify-center">
    <Card class="w-full max-w-2xl bg-stream-surface border-stream-border shadow-card">
      <div class="text-center p-6">
        <h2 class="text-2xl text-stream-text mb-2">{{ steps[currentStep]?.title }}</h2>
        <p class="text-stream-text-muted mb-6">
          {{ steps[currentStep]?.description }}
        </p>
      </div>

      <div class="p-6 space-y-6">
        <!-- Step 0: Welcome -->
        <div v-if="currentStep === 0" class="text-center space-y-6">
          <div
            class="w-20 h-20 mx-auto bg-gradient-primary rounded-full flex items-center justify-center shadow-accent"
          >
            <Tv class="w-10 h-10 text-white" />
          </div>
          <div class="space-y-4">
            <h2 class="text-3xl font-bold text-stream-text">Welcome to Wizju</h2>
            <p class="text-stream-text-muted text-lg max-w-md mx-auto">
              Online IPTV Player. Configure your streaming sources to get started.
            </p>
          </div>
          <div class="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div class="text-center space-y-2">
              <div
                class="w-12 h-12 mx-auto bg-stream-surface rounded-lg flex items-center justify-center"
              >
                <Wifi class="w-6 h-6 text-stream-accent" />
              </div>
              <p class="text-sm text-stream-text-muted">Live TV</p>
            </div>
            <div class="text-center space-y-2">
              <div
                class="w-12 h-12 mx-auto bg-stream-surface rounded-lg flex items-center justify-center"
              >
                <FileText class="w-6 h-6 text-stream-accent" />
              </div>
              <p class="text-sm text-stream-text-muted">VOD</p>
            </div>
            <div class="text-center space-y-2">
              <div
                class="w-12 h-12 mx-auto bg-stream-surface rounded-lg flex items-center justify-center"
              >
                <Plus class="w-6 h-6 text-stream-accent" />
              </div>
              <p class="text-sm text-stream-text-muted">More</p>
            </div>
          </div>
        </div>

        <!-- Step 1: Add Source -->
        <div v-else-if="currentStep === 1" class="space-y-6">
          <div class="space-y-4">
            <div class="space-y-2">
              <label for="source-name" class="text-sm font-medium text-stream-text"
                >Source Name</label
              >
              <Input
                id="source-name"
                v-model="formData.name"
                placeholder="e.g., My IPTV Provider"
                class="bg-stream-surface border-stream-border"
              />
            </div>

            <div class="space-y-2">
              <label for="source-type" class="text-sm font-medium text-stream-text"
                >Source Type</label
              >
              <select
                id="source-type"
                v-model="formData.type"
                class="flex h-10 w-full rounded-md border border-input bg-stream-surface px-3 py-2 text-sm"
              >
                <!-- <option value="iptv">IPTV</option> -->
                <option value="m3u" selected>M3U Playlist</option>
              </select>
            </div>

            <div class="space-y-2">
              <label for="source-url" class="text-sm font-medium text-stream-text"
                >Source URL</label
              >
              <textarea
                id="source-url"
                v-model="formData.url"
                placeholder="http://your-provider.com/playlist.m3u"
                class="flex min-h-[100px] w-full rounded-md border border-input bg-stream-surface px-3 py-2 text-sm"
              />
              <p class="text-xs text-stream-text-muted">
                Enter your M3U playlist URL or IPTV source URL
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-between pt-6">
          <Button
            variant="outline"
            @click="handleBack"
            :disabled="currentStep === 0"
            class="border-stream-border hover:bg-stream-surface-hover"
          >
            Back
          </Button>
          <Button
            @click="handleNext"
            :disabled="isLoading"
            class="bg-gradient-primary hover:bg-stream-accent-hover"
          >
            {{
              isLoading
                ? 'Processing...'
                : currentStep === steps.length - 1
                  ? 'Get Started'
                  : 'Next'
            }}
          </Button>
        </div>

        <div class="flex justify-center space-x-2">
          <div
            v-for="(_, index) in steps"
            :key="index"
            :class="
              cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentStep ? 'bg-stream-accent' : 'bg-stream-border',
              )
            "
          />
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Tv, Wifi, Plus, FileText } from 'lucide-vue-next'
import { cn } from '@/utils/cn'
import Card from '@/components/ui/UiCard.vue'
import Button from '@/components/ui/UiButton.vue'
import Input from '@/components/ui/UiInput.vue'
import type { CreateStreamSourceInput } from '@/types/stream'
import { useStreamSourcesStore } from '@/stores/streamSources'
import { useMediaItemsStore } from '@/stores/mediaItems'
import {
  parseAndSaveMediaItems,
  extractCategories,
  addSourceIdToMediaItems,
} from '@/services/mediaParsingService'

interface Step {
  title: string
  description: string
}

const emit = defineEmits<{
  complete: []
}>()

const streamStore = useStreamSourcesStore()
const mediaStore = useMediaItemsStore()

const currentStep = ref(0)
const isLoading = ref(false)
const formData = reactive({
  name: '',
  url: '',
  type: 'm3u' as 'iptv' | 'm3u',
})

const steps: Step[] = [
  {
    title: 'Welcome to Wizju',
    description: 'Your personal streaming media hub',
  },
  {
    title: 'Add Your First Source',
    description: 'Configure an IPTV or M3U source',
  },
]

const handleNext = async (): Promise<void> => {
  if (currentStep.value === 0) {
    currentStep.value = 1
  } else if (currentStep.value === 1) {
    if (!formData.name || !formData.url || !formData.url.trim()) {
      alert('Please fill in all required fields')
      return
    }
    const url = formData.url.trim()
    isLoading.value = true

    try {
      // First, parse the M3U to retrieve MediaItems and categories
      const mediaItems = await parseAndSaveMediaItems(url)

      // Extract unique categories from MediaItems
      const categories = extractCategories(mediaItems)

      // Create StreamSource (including categories)
      const sourceInput: CreateStreamSourceInput = {
        name: formData.name,
        url: url,
        type: formData.type,
        isActive: true,
      }

      const addedSources = streamStore.addSourceWithCategories(sourceInput, categories)

      // Retrieve the ID of the newly added StreamSource
      const newSource = addedSources[addedSources.length - 1]
      const sourceId = newSource.id

      // Update MediaItems with the sourceId and save them in batch
      const mediaItemsWithSourceId = addSourceIdToMediaItems(mediaItems, sourceId)

      try {
        mediaStore.addMediaItemsBatch(sourceId, mediaItemsWithSourceId)
        console.log(
          `Successfully parsed and saved ${mediaItems.length} media items for source ${sourceId}`,
        )
      } catch (error) {
        // If saving MediaItems fails, remove the added StreamSource
        streamStore.removeSource(sourceId)
        console.error('Failed to add media items batch:', error)
        throw error
      }

      // No longer emit the 'source-add' event since the source was already added above
      emit('complete')
    } catch (error) {
      console.error('Failed to add source:', error)
      alert(`Failed to add source: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      isLoading.value = false
    }
  }
}

const handleBack = (): void => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}
</script>
