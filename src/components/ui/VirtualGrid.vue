<template>
  <div
    ref="containerRef"
    class="virtual-grid-container"
    :style="{
      height: `${containerHeight}px`,
      overflow: 'auto',
    }"
    @scroll="handleScroll"
  >
    <!-- Virtual scroll container -->
    <div
      :style="{
        height: `${totalHeight}px`,
        width: '100%',
        position: 'relative',
      }"
    >
      <!-- Visible items -->
      <div
        v-for="virtualRow in virtualRows"
        :key="`row-${virtualRow.index}`"
        :style="{
          position: 'absolute',
          top: `${virtualRow.start}px`,
          left: 0,
          right: 0,
          height: `${props.itemHeight}px`,
          display: 'grid',
          gap: `${props.gap}px`,
        }"
        :class="props.gridClass"
      >
        <div
          v-for="(item, itemIndex) in virtualRow.items"
          :key="(item as any)?.id || `${virtualRow.index}-${itemIndex}`"
          class="w-full"
          :style="{ height: `${props.itemHeight}px` }"
        >
          <slot :item="item" :index="virtualRow.index * props.itemsPerRow + itemIndex" />
        </div>
      </div>
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
  itemHeight: number
  containerHeight: number
  itemsPerRow?: number
  gap?: number
  gridClass?: string
  overscan?: number
}

const props = withDefaults(defineProps<Props>(), {
  itemsPerRow: 6,
  gap: 16,
  gridClass:
    'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
  overscan: 10, // Increase overscan, more friendly for large data volumes
})

const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)

// Development environment check
const isDev = import.meta.env.DEV

// Calculate row height (including gap)
const rowHeight = computed(() => props.itemHeight + props.gap)

// Total number of rows
const totalRows = computed(() => Math.ceil(props.items.length / props.itemsPerRow))

// Total height
const totalHeight = computed(() => totalRows.value * rowHeight.value)

// Row range of the visible area
const visibleRange = computed(() => {
  if (props.items.length === 0) {
    return { start: 0, end: -1 }
  }

  const start = Math.floor(scrollTop.value / rowHeight.value)
  const visibleRows = Math.ceil(props.containerHeight / rowHeight.value)
  const end = start + visibleRows - 1 // Correct end calculation

  const actualStart = Math.max(0, start - props.overscan)
  const actualEnd = Math.min(totalRows.value - 1, end + props.overscan)

  return {
    start: actualStart,
    end: actualEnd,
  }
})

// Virtual row data
const virtualRows = computed<VirtualRow[]>(() => {
  if (props.items.length === 0 || visibleRange.value.end < visibleRange.value.start) {
    return []
  }

  const rows: VirtualRow[] = []

  // Ensure at least some rows are rendered, especially on initialization
  const minRows = Math.max(5, Math.ceil(props.containerHeight / rowHeight.value))
  const safeEnd =
    scrollTop.value === 0 ? Math.max(visibleRange.value.end, minRows - 1) : visibleRange.value.end

  for (let i = visibleRange.value.start; i <= Math.min(safeEnd, totalRows.value - 1); i++) {
    if (i < 0 || i >= totalRows.value) continue

    const startIndex = i * props.itemsPerRow
    const endIndex = Math.min(startIndex + props.itemsPerRow, props.items.length)

    if (startIndex >= props.items.length) break

    const items = props.items.slice(startIndex, endIndex)

    if (items.length > 0) {
      rows.push({
        index: i,
        start: i * rowHeight.value,
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
      console.debug('Virtual Grid Scroll:', {
        scrollTop: scrollTop.value,
        totalHeight: totalHeight.value,
        visibleRange: visibleRange.value,
        virtualRowsCount: virtualRows.value.length,
        totalItems: props.items.length,
        totalRows: totalRows.value,
        itemsPerRow: props.itemsPerRow,
        containerHeight: props.containerHeight,
      })
    }
  }
}

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

// Responsive adjustment
const updateLayout = () => {
  nextTick(() => {
    handleScroll()

    // Output debug information in development environment
    if (isDev) {
      console.debug('Virtual Grid Layout Updated:', {
        containerHeight: props.containerHeight,
        itemsPerRow: props.itemsPerRow,
        totalRows: totalRows.value,
        visibleRange: visibleRange.value,
      })
    }
  })
}

// Debounced layout update function
const debouncedUpdateLayout = debounce(updateLayout, 150)

// Window resize handler
const handleWindowResize = () => {
  // Immediately handle critical layout updates
  handleScroll()
  // Debounce subsequent layout adjustments
  debouncedUpdateLayout()
}

// Debounced window resize handler
const debouncedHandleWindowResize = debounce(handleWindowResize, 200)

// Listener
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    // Initialize scroll position
    handleScroll()

    // Listen for container size changes (for direct container changes)
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        // Update immediately on container change
        updateLayout()
      })
      resizeObserver.observe(containerRef.value)
    }

    // Add window resize listener (for responsive layout changes)
    window.addEventListener('resize', debouncedHandleWindowResize, { passive: true })

    // Listen for orientation changes (mobile devices)
    if ('screen' in window && 'orientation' in screen) {
      window.addEventListener(
        'orientationchange',
        () => {
          // Delay update after orientation change to wait for layout to stabilize
          setTimeout(updateLayout, 300)
        },
        { passive: true },
      )
    }
  }
})

// Watch for changes in key props
watch(
  () => [props.containerHeight, props.itemsPerRow, props.itemHeight, props.items.length],
  (
    [newContainerHeight, newItemsPerRow, newItemHeight, newItemsLength],
    [oldContainerHeight, oldItemsPerRow, oldItemHeight, oldItemsLength],
  ) => {
    const shouldUpdate =
      newContainerHeight !== oldContainerHeight ||
      newItemsPerRow !== oldItemsPerRow ||
      newItemHeight !== oldItemHeight ||
      newItemsLength !== oldItemsLength

    if (shouldUpdate) {
      // Use debounced update to avoid frequent recalculations
      debouncedUpdateLayout()

      // Output change information in development environment
      if (isDev) {
        console.debug('VirtualGrid props changed:', {
          containerHeight: { old: oldContainerHeight, new: newContainerHeight },
          itemsPerRow: { old: oldItemsPerRow, new: newItemsPerRow },
          itemHeight: { old: oldItemHeight, new: newItemHeight },
          itemsLength: { old: oldItemsLength, new: newItemsLength },
        })
      }
    }
  },
  { deep: false },
)

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('resize', debouncedHandleWindowResize)
  window.removeEventListener('orientationchange', updateLayout)
})

// Expose methods to parent component
defineExpose({
  scrollToIndex: (index: number) => {
    if (containerRef.value) {
      const rowIndex = Math.floor(index / props.itemsPerRow)
      const targetScrollTop = rowIndex * rowHeight.value
      containerRef.value.scrollTop = targetScrollTop
    }
  },
  scrollToTop: () => {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0
    }
  },
})
</script>

<style scoped>
.virtual-grid-container {
  /* Ensure scrollbar styles */
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.virtual-grid-container::-webkit-scrollbar {
  width: 6px;
}

.virtual-grid-container::-webkit-scrollbar-track {
  background: transparent;
}

.virtual-grid-container::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.virtual-grid-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}
</style>
