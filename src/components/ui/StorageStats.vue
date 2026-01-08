<template>
  <div class="space-y-4">
    <!-- Storage Overview -->
    <div class="bg-stream-bg rounded-lg p-4 border border-stream-border">
      <h3 class="font-semibold text-stream-text mb-3">Storage Overview</h3>
      
      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-4">
        <div class="w-6 h-6 border-2 border-stream-accent border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Storage stats -->
      <div v-else class="space-y-3">
        <!-- Total storage usage -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-stream-text-muted">Total Usage</span>
          <span class="text-sm font-medium text-stream-text">{{ formatBytes(totalUsage) }}</span>
        </div>

        <!-- Storage breakdown -->
        <div class="space-y-2">
          <div
            v-for="store in storageBreakdown"
            :key="store.name"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-stream-text-muted">{{ store.label }}</span>
            <div class="flex items-center gap-2">
              <span class="text-stream-text">{{ store.count }} items</span>
              <span class="text-stream-text-muted">{{ formatBytes(store.size) }}</span>
            </div>
          </div>
        </div>

        <!-- Storage type indicator -->
        <div class="pt-3 mt-3 border-t border-stream-border">
          <div class="flex items-center justify-between text-xs">
            <span class="text-stream-text-muted">Storage Type</span>
            <span class="text-stream-accent font-medium">{{ storageType }}</span>
          </div>
        </div>

        <!-- Browser storage estimate (if available) -->
        <div v-if="browserStorageEstimate" class="pt-3 mt-3 border-t border-stream-border">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-stream-text-muted">Browser Storage Used</span>
              <span class="text-stream-text">{{ formatBytes(browserStorageEstimate.usage) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-stream-text-muted">Browser Storage Quota</span>
              <span class="text-stream-text">{{ formatBytes(browserStorageEstimate.quota) }}</span>
            </div>
            <div class="w-full bg-stream-surface rounded-full h-2 mt-2">
              <div
                class="bg-stream-accent rounded-full h-2 transition-all"
                :style="{ width: storageUsagePercentage + '%' }"
              ></div>
            </div>
            <div class="text-xs text-stream-text-muted text-center">
              {{ storageUsagePercentage }}% used
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2">
      <button
        @click="refreshStats"
        :disabled="isLoading"
        class="flex-1 px-3 py-2 text-sm font-medium text-stream-text bg-stream-surface border border-stream-border rounded-md hover:bg-stream-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="isLoading">Refreshing...</span>
        <span v-else>Refresh</span>
      </button>
      <button
        v-if="showClearButton"
        @click="$emit('clear-storage')"
        class="flex-1 px-3 py-2 text-sm font-medium text-red-400 bg-stream-surface border border-red-400/30 rounded-md hover:bg-red-500/10 transition-colors"
      >
        Clear Data
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getDB } from '@/services/indexedDb/indexedDbService'

interface StorageBreakdownItem {
  name: string
  label: string
  count: number
  size: number
}

interface BrowserStorageEstimate {
  usage: number
  quota: number
}

defineProps<{
  showClearButton?: boolean
}>()

defineEmits<{
  (e: 'clear-storage'): void
}>()

const isLoading = ref(false)
const storageBreakdown = ref<StorageBreakdownItem[]>([])
const browserStorageEstimate = ref<BrowserStorageEstimate | null>(null)
const storageType = ref<string>('IndexedDB')

const totalUsage = computed(() => {
  return storageBreakdown.value.reduce((sum, store) => sum + store.size, 0)
})

const storageUsagePercentage = computed(() => {
  if (!browserStorageEstimate.value || browserStorageEstimate.value.quota === 0) {
    return 0
  }
  return Math.round((browserStorageEstimate.value.usage / browserStorageEstimate.value.quota) * 100)
})

// Format bytes to human-readable format
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// Estimate object size in bytes
const estimateSize = (obj: unknown): number => {
  const str = JSON.stringify(obj)
  // UTF-16 uses 2 bytes per character
  return str.length * 2
}

// Get storage stats from IndexedDB
const getStorageStats = async (): Promise<void> => {
  isLoading.value = true
  
  try {
    const db = await getDB()
    const storeNames = ['streamSources', 'm3uMediaItems', 'favorites', 'recentWatching'] as const
    const breakdown: StorageBreakdownItem[] = []

    const storeLabels: Record<string, string> = {
      streamSources: 'Stream Sources',
      m3uMediaItems: 'Media Items',
      favorites: 'Favorites',
      recentWatching: 'Recent Watching'
    }

    for (const storeName of storeNames) {
      try {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const items = await store.getAll()
        
        const totalSize = items.reduce((sum, item) => sum + estimateSize(item), 0)
        
        breakdown.push({
          name: storeName,
          label: storeLabels[storeName] || storeName,
          count: items.length,
          size: totalSize
        })
      } catch (error) {
        console.error(`Failed to get stats for ${storeName}:`, error)
      }
    }

    storageBreakdown.value = breakdown

    // Get browser storage estimate (if supported)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          browserStorageEstimate.value = {
            usage: estimate.usage,
            quota: estimate.quota
          }
        }
      } catch (error) {
        console.error('Failed to get browser storage estimate:', error)
      }
    }
  } catch (error) {
    console.error('Failed to get storage stats:', error)
  } finally {
    isLoading.value = false
  }
}

const refreshStats = async (): Promise<void> => {
  await getStorageStats()
}

onMounted(() => {
  getStorageStats()
})
</script>
