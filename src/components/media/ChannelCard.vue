<template>
  <div class="channel-card-wrapper w-full h-full max-w-none">
    <Card
      ref="cardElement"
      :class="
        cn(
          'group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-accent bg-gradient-card border-stream-border w-full h-full flex flex-col',
          className,
        )
      "
      @click="$emit('click')"
    >
      <div class="p-0">
        <div class="relative aspect-video overflow-hidden rounded-t-lg">
          <img
            v-if="!imageError && channel.thumbnail"
            :src="channel.thumbnail"
            :alt="channel.title"
            :class="
              cn(
                'w-full h-full object-contain bg-stream-surface transition-opacity duration-300',
                imageLoaded ? 'opacity-100' : 'opacity-0',
              )
            "
            @load="imageLoaded = true"
            @error="imageError = true"
          />
          <div v-else class="w-full h-full bg-stream-surface flex items-center justify-center">
            <Tv class="w-12 h-12 text-stream-text-muted" />
          </div>

          <!-- Overlay -->
          <div
            class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
          >
            <Button size="sm" class="bg-gradient-primary hover:bg-stream-accent-hover">
              <Play class="w-4 h-4 mr-2" />
              Watch Live
            </Button>
          </div>

          <!-- Live indicator -->
          <LiveIndicator :is-visible="shouldAnimate" />
        </div>

        <div class="p-3">
          <h3
            class="font-semibold text-stream-text line-clamp-1 group-hover:text-stream-accent transition-colors"
          >
            {{ channel.title }}
          </h3>

          <p v-if="channel.category" class="text-sm text-stream-text-muted mt-1 capitalize">
            {{ channel.category }}
          </p>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Play, Tv } from 'lucide-vue-next'
import { cn } from '@/utils/cn'
import Card from '@/components/ui/UiCard.vue'
import Button from '@/components/ui/UiButton.vue'
import LiveIndicator from '@/components/ui/LiveIndicator.vue'
import type { Channel } from '@/types/stream'

interface Props {
  channel: Channel
  className?: string
}

defineProps<Props>()

defineEmits<{
  click: []
}>()

const imageLoaded = ref(false)
const imageError = ref(false)

// Performance optimization: only enable animation when the card is in viewport
const cardElement = ref<HTMLElement>()
const isVisible = ref(false)
const shouldAnimate = computed(() => isVisible.value)
const isInitialized = ref(false)

let observer: IntersectionObserver | null = null

onMounted(() => {
  // Use nextTick to ensure DOM elements are rendered
  nextTick(() => {
    initializeIntersectionObserver()
    isInitialized.value = true
  })
})

const initializeIntersectionObserver = () => {
  // Ensure element exists and is a valid DOM element
  let element: Element | null = null

  // cardElement could be either a component instance or direct DOM element
  if (cardElement.value) {
    // Check if it's a Vue component instance (has $el property)
    const cardRef = cardElement.value as { $el?: Element } | Element
    if ('$el' in cardRef && cardRef.$el) {
      element = cardRef.$el
    } else if (cardRef instanceof Element) {
      element = cardRef
    }
  }

  if (element && element instanceof Element && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible.value = entry.isIntersecting
        })
      },
      {
        rootMargin: '50px', // Start animation 50px before element enters viewport
      },
    )

    try {
      observer.observe(element)
    } catch (error) {
      console.warn('Failed to observe element:', error)
      // Fallback to enable animation by default
      isVisible.value = true
    }
  } else {
    // If IntersectionObserver is not supported or element doesn't exist, enable animation by default
    isVisible.value = true
  }
}

onUnmounted(() => {
  if (observer && isInitialized.value) {
    observer.disconnect()
    observer = null
  }
})
</script>
