<template>
  <div
    ref="element"
    class="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded flex items-center"
  >
    <div
      class="w-2 h-2 bg-white rounded-full mr-1"
      :class="{ 'live-pulse': shouldShowAnimation }"
      :style="{ animationDelay: `${animationDelay}s` }"
    />
    LIVE
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  isVisible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: undefined,
})

// Generate a different animation delay for each component
const animationDelay = Math.random() * 2

// Internal visibility state
const element = ref<HTMLElement>()
const internalIsVisible = ref(false)

// Decide whether to show the animation
const shouldShowAnimation = computed(() => {
  // If isVisible is explicitly passed, use the passed value
  if (props.isVisible !== undefined) {
    return props.isVisible
  }
  // Otherwise, use the internal IntersectionObserver result
  return internalIsVisible.value
})

let observer: IntersectionObserver | null = null

onMounted(() => {
  // Only use IntersectionObserver if isVisible is not explicitly passed
  if (props.isVisible === undefined && element.value && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          internalIsVisible.value = entry.isIntersecting
        })
      },
      { rootMargin: '50px' },
    )
    observer.observe(element.value)
  } else if (props.isVisible === undefined) {
    // If IntersectionObserver is not supported, show the animation by default
    internalIsVisible.value = true
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})
</script>

<style scoped>
/* Use CSS keyframes instead of Tailwind's animate-pulse for better performance control */
@keyframes live-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.live-pulse {
  animation: live-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* When the animation is disabled, ensure the element is still visible */
.live-pulse:not(.live-pulse) {
  opacity: 1;
}
</style>
