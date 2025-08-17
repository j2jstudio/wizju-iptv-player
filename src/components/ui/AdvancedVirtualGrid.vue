<template>
  <div
    ref="containerRef"
    class="advanced-virtual-grid"
    :style="{
      height: `${containerHeight}px`,
      overflow: 'auto',
    }"
    @scroll="handleScroll"
  >
    <!-- Measurement container, used to calculate the actual card size -->
    <div ref="measureRef" class="absolute opacity-0 pointer-events-none">
      <div :class="gridClass" class="gap-4">
        <div
          v-for="i in itemsPerRow"
          :key="`measure-${i}`"
          class="channel-card-measure"
          :style="{ height: `${estimatedItemHeight}px` }"
        />
      </div>
    </div>

    <!-- Virtual scroll content -->
    <div
      :style="{
        height: `${totalHeight}px`,
        width: '100%',
        position: 'relative',
      }"
    >
      <!-- Visible rows -->
      <div
        v-for="virtualRow in virtualRows"
        :key="`row-${virtualRow.index}`"
        :style="{
          position: 'absolute',
          top: `${virtualRow.start}px`,
          left: 0,
          right: 0,
          height: `${actualRowHeight}px`,
        }"
        class="gap-4"
        :class="gridClass"
      >
        <slot
          v-for="(item, itemIndex) in virtualRow.items"
          :key="(item as any)?.id || `${virtualRow.index}-${itemIndex}`"
          :item="item"
          :index="virtualRow.index * itemsPerRow + itemIndex"
        />
      </div>
    </div>

    <!-- Scroll indicator -->
    <div
      v-if="showScrollIndicator"
      class="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded"
    >
      {{ Math.round((scrollTop / (totalHeight - containerHeight)) * 100) }}%
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

interface VirtualRow<T = unknown> {
  index: number
  start: number
  items: T[]
}

interface Props<T = unknown> {
  items: T[]
  estimatedItemHeight: number
  containerHeight: number
  itemsPerRow?: number
  gap?: number
  gridClass?: string
  overscan?: number
  showScrollIndicator?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  itemsPerRow: 6,
  gap: 16,
  gridClass:
    'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
  overscan: 5,
  showScrollIndicator: false,
})

const containerRef = ref<HTMLElement>()
const measureRef = ref<HTMLElement>()
const scrollTop = ref(0)
const actualRowHeight = ref(props.estimatedItemHeight + props.gap)

// Development environment check
const isDev = import.meta.env.DEV

// Calculate the actual row height
const measureRowHeight = async () => {
  if (measureRef.value) {
    await nextTick()
    const firstChild = measureRef.value.querySelector('.channel-card-measure')
    if (firstChild) {
      const rect = firstChild.getBoundingClientRect()
      actualRowHeight.value = rect.height + props.gap
    }
  }
}

// Total number of rows
const totalRows = computed(() => Math.ceil(props.items.length / props.itemsPerRow))

// Total height
const totalHeight = computed(() => totalRows.value * actualRowHeight.value)

// Row range of the visible area
const visibleRange = computed(() => {
  if (props.items.length === 0) {
    return { start: 0, end: -1 }
  }

  const start = Math.floor(scrollTop.value / actualRowHeight.value)
  const visibleRows = Math.ceil(props.containerHeight / actualRowHeight.value)
  const end = start + visibleRows

  return {
    start: Math.max(0, start - props.overscan),
    end: Math.min(totalRows.value - 1, end + props.overscan),
  }
})

// Virtual row data
const virtualRows = computed<VirtualRow[]>(() => {
  if (props.items.length === 0 || visibleRange.value.end < visibleRange.value.start) {
    return []
  }

  const rows: VirtualRow[] = []

  for (let i = visibleRange.value.start; i <= visibleRange.value.end; i++) {
    if (i < 0 || i >= totalRows.value) continue

    const startIndex = i * props.itemsPerRow
    const endIndex = Math.min(startIndex + props.itemsPerRow, props.items.length)

    if (startIndex >= props.items.length) break

    const items = props.items.slice(startIndex, endIndex)

    if (items.length > 0) {
      rows.push({
        index: i,
        start: i * actualRowHeight.value,
        items,
      })
    }
  }

  return rows
})

// Scroll handler
const handleScroll = () => {
  if (containerRef.value) {
    const newScrollTop = containerRef.value.scrollTop
    // Prevent negative values
    scrollTop.value = Math.max(0, newScrollTop)

    // Debug information (development environment)
    if (isDev) {
      console.debug('Advanced Virtual Grid Scroll:', {
        scrollTop: scrollTop.value,
        actualRowHeight: actualRowHeight.value,
        totalHeight: totalHeight.value,
        visibleRange: visibleRange.value,
        virtualRowsCount: virtualRows.value.length,
      })
    }
  }
}

// Watch for changes in itemsPerRow and re-measure
watch(
  () => props.itemsPerRow,
  () => {
    measureRowHeight()
  },
  { immediate: false },
)

// Watch for changes in items and re-measure (with debounce)
let measureTimeout: number | null = null
watch(
  () => props.items.length,
  () => {
    if (measureTimeout) {
      clearTimeout(measureTimeout)
    }
    measureTimeout = window.setTimeout(() => {
      measureRowHeight()
    }, 100)
  },
  { immediate: false },
)

// Responsive adjustment
const updateLayout = () => {
  nextTick(() => {
    measureRowHeight()
    handleScroll()
  })
}

// Listen for window size changes
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    // Initial measurement
    measureRowHeight()

    // Initial scroll position
    handleScroll()

    // Listen for container size changes
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(updateLayout)
      resizeObserver.observe(containerRef.value)
    }
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (measureTimeout) {
    clearTimeout(measureTimeout)
  }
})

// Expose methods to parent component
defineExpose({
  scrollToIndex: (index: number) => {
    if (containerRef.value) {
      const rowIndex = Math.floor(index / props.itemsPerRow)
      const targetScrollTop = rowIndex * actualRowHeight.value
      containerRef.value.scrollTop = targetScrollTop
    }
  },
  scrollToTop: () => {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0
    }
  },
  getVisibleRange: () => visibleRange.value,
  getTotalRows: () => totalRows.value,
})
</script>

<style scoped>
.advanced-virtual-grid {
  /* Custom scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.advanced-virtual-grid::-webkit-scrollbar {
  width: 8px;
}

.advanced-virtual-grid::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.advanced-virtual-grid::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.advanced-virtual-grid::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

.channel-card-measure {
  border: 1px solid transparent;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.1);
}

/* Grid styles */
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}
.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.grid-cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.grid-cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.grid-cols-5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
.grid-cols-6 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

@media (min-width: 640px) {
  .sm\\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 768px) {
  .md\\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lg\\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .xl\\:grid-cols-5 {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 1536px) {
  .\\32xl\\:grid-cols-6 {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.gap-4 {
  gap: 1rem;
}
</style>
