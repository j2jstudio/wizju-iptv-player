<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-stream-text mb-4">Virtual Scroll Demo</h1>

      <!-- Control Panel -->
      <div
        class="flex flex-wrap gap-4 mb-6 p-4 bg-stream-surface border border-stream-border rounded-lg"
      >
        <div>
          <label class="block text-sm font-medium text-stream-text mb-1">Channel Count</label>
          <select
            v-model="channelCount"
            class="px-3 py-2 border border-stream-border rounded-md bg-stream-surface text-stream-text"
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
            <option value="5000">5000</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-stream-text mb-1">Container Height</label>
          <select
            v-model="containerHeight"
            class="px-3 py-2 border border-stream-border rounded-md bg-stream-surface text-stream-text"
          >
            <option value="400">400px</option>
            <option value="600">600px</option>
            <option value="800">800px</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-stream-text mb-1">Render Mode</label>
          <select
            v-model="renderMode"
            class="px-3 py-2 border border-stream-border rounded-md bg-stream-surface text-stream-text"
          >
            <option value="virtual">Virtual Scroll</option>
            <option value="normal">Regular Render</option>
            <option value="advanced">Advanced Virtual Scroll</option>
          </select>
        </div>

        <div class="flex items-end">
          <button
            @click="generateData"
            class="px-4 py-2 bg-stream-accent text-white rounded-md hover:bg-stream-accent-hover"
          >
            Generate Data
          </button>
        </div>

        <div class="flex items-end">
          <button
            @click="scrollToTop"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Scroll to Top
          </button>
        </div>
      </div>

      <!-- Performance Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="p-4 bg-stream-surface border border-stream-border rounded-lg">
          <div class="text-2xl font-bold text-stream-text">{{ mockChannels.length }}</div>
          <div class="text-sm text-stream-text-muted">Total Channels</div>
        </div>
        <div class="p-4 bg-stream-surface border border-stream-border rounded-lg">
          <div class="text-2xl font-bold text-stream-text">{{ visibleItems }}</div>
          <div class="text-sm text-stream-text-muted">Visible Items</div>
        </div>
        <div class="p-4 bg-stream-surface border border-stream-border rounded-lg">
          <div class="text-2xl font-bold text-stream-text">{{ renderTime }}ms</div>
          <div class="text-sm text-stream-text-muted">Render Time</div>
        </div>
        <div class="p-4 bg-stream-surface border border-stream-border rounded-lg">
          <div class="text-2xl font-bold text-stream-text">{{ renderMode }}</div>
          <div class="text-sm text-stream-text-muted">Current Mode</div>
        </div>
      </div>
    </div>

    <!-- Render Area -->
    <div class="relative">
      <!-- Virtual Scroll -->
      <VirtualGrid
        v-if="renderMode === 'virtual'"
        ref="virtualGridRef"
        :items="mockChannels"
        :item-height="280"
        :container-height="containerHeight"
        :items-per-row="itemsPerRow"
        :gap="16"
        grid-class="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
        @scroll="updateVisibleItems"
      >
        <template #default="{ item }">
          <MockChannelCard :channel="item as MockChannel" />
        </template>
      </VirtualGrid>

      <!-- Advanced Virtual Scroll -->
      <AdvancedVirtualGrid
        v-else-if="renderMode === 'advanced'"
        ref="advancedVirtualGridRef"
        :items="mockChannels"
        :estimated-item-height="280"
        :container-height="containerHeight"
        :items-per-row="itemsPerRow"
        :gap="16"
        :show-scroll-indicator="true"
        grid-class="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      >
        <template #default="{ item }">
          <MockChannelCard :channel="item as MockChannel" />
        </template>
      </AdvancedVirtualGrid>

      <!-- Regular Render -->
      <div
        v-else
        :style="{ height: `${containerHeight}px`, overflow: 'auto' }"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
      >
        <MockChannelCard v-for="channel in mockChannels" :key="channel.id" :channel="channel" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, type PropType } from 'vue'
import VirtualGrid from '@/components/ui/VirtualGrid.vue'
import AdvancedVirtualGrid from '@/components/ui/AdvancedVirtualGrid.vue'
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid'

interface MockChannel {
  id: string
  title: string
  category: string
  thumbnail?: string
}

// Mock ChannelCard 组件
const MockChannelCard = defineComponent({
  props: {
    channel: {
      type: Object as PropType<MockChannel>,
      required: true,
    },
  },
  template: `
    <div class="bg-stream-surface border border-stream-border rounded-lg overflow-hidden hover:border-stream-accent transition-colors">
      <div class="aspect-video bg-gradient-to-br from-stream-accent/20 to-stream-accent/5 flex items-center justify-center">
        <div class="text-4xl font-bold text-stream-accent/50">{{ channel.title.charAt(0) }}</div>
      </div>
      <div class="p-3">
        <h3 class="font-semibold text-stream-text line-clamp-1">{{ channel.title }}</h3>
        <p class="text-sm text-stream-text-muted mt-1 capitalize">{{ channel.category }}</p>
      </div>
    </div>
  `,
})

const { getColumnsCount } = useResponsiveGrid()

const channelCount = ref(500)
const containerHeight = ref(600)
const renderMode = ref<'virtual' | 'normal' | 'advanced'>('virtual')
const mockChannels = ref<MockChannel[]>([])
const virtualGridRef = ref()
const advancedVirtualGridRef = ref()
const renderTime = ref(0)
const visibleItems = ref(0)

const itemsPerRow = computed(() => getColumnsCount())

// Mock datas
const generateData = () => {
  const start = performance.now()

  const categories = ['News', 'Sports', 'Movies', 'Kids', 'Music', 'Documentary', 'Comedy', 'Drama']
  const channels: MockChannel[] = []

  for (let i = 1; i <= channelCount.value; i++) {
    channels.push({
      id: `channel-${i}`,
      title: `Channel ${i}`,
      category: categories[Math.floor(Math.random() * categories.length)],
    })
  }

  mockChannels.value = channels

  const end = performance.now()
  renderTime.value = Math.round(end - start)

  // Initialize the number of visible items
  updateVisibleItems()
}

// Update the number of visible items
const updateVisibleItems = () => {
  if (renderMode.value === 'virtual' && virtualGridRef.value) {
    // Calculate visible items for basic virtual scrolling
    const itemsPerRowValue = itemsPerRow.value
    const itemHeight = 280 + 16 // item height + gap
    const visibleRows = Math.ceil(containerHeight.value / itemHeight) + 10 // Add overscan
    visibleItems.value = Math.min(visibleRows * itemsPerRowValue, mockChannels.value.length)
  } else if (renderMode.value === 'advanced' && advancedVirtualGridRef.value) {
    // Calculate visible items for advanced virtual scrolling
    const range = advancedVirtualGridRef.value.getVisibleRange()
    visibleItems.value = (range.end - range.start + 1) * itemsPerRow.value
  } else {
    // Regular rendering displays all items
    visibleItems.value = mockChannels.value.length
  }
}

// Scroll to the top
const scrollToTop = () => {
  if (renderMode.value === 'virtual' && virtualGridRef.value) {
    virtualGridRef.value.scrollToTop()
  } else if (renderMode.value === 'advanced' && advancedVirtualGridRef.value) {
    advancedVirtualGridRef.value.scrollToTop()
  }
}

onMounted(() => {
  generateData()
})
</script>
