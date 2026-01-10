<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <h1 class="text-3xl font-bold mb-8 text-stream-text">Settings</h1>

    <!-- Theme Settings -->
    <div class="bg-stream-surface rounded-lg p-6 mb-6 border border-stream-border">
      <h2 class="text-xl font-semibold mb-4 text-stream-text">Appearance</h2>
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="font-medium text-stream-text">Theme</p>
          <p class="text-sm text-stream-text/60">Choose your preferred theme</p>
        </div>
        <ThemeToggle />
      </div>
    </div>

    <!-- Stream Sources Settings -->
    <div class="bg-stream-surface rounded-lg p-6 mb-6 border border-stream-border">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-stream-text">Stream Sources</h2>
        <UiButton @click="showAddSourceDialog" size="sm">
          <Plus class="w-4 h-4 mr-2" />
          Add Source
        </UiButton>
      </div>

      <!-- Sources List -->
      <div v-if="streamStore.sources.length > 0" class="space-y-3">
        <div
          v-for="source in streamStore.sources"
          :key="source.id"
          class="flex items-center justify-between p-4 bg-stream-bg rounded-lg border border-stream-border"
        >
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <PlayCircle class="w-5 h-5 text-stream-primary" />
              <div>
                <p class="font-medium text-stream-text">{{ source.name }}</p>
                <p class="text-sm text-stream-text/60">{{ source.type }}</p>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span
              :class="[
                'text-xs px-2 py-1 rounded',
                source.isActive
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-gray-500/20 text-gray-500',
              ]"
            >
              {{ source.isActive ? 'Active' : 'Inactive' }}
            </span>
            <UiButton
              variant="ghost"
              size="sm"
              @click="toggleSourceActive(source.id)"
              class="text-stream-text/60 hover:text-stream-text"
            >
              {{ source.isActive ? 'Disable' : 'Enable' }}
            </UiButton>
            <UiButton
              variant="ghost"
              size="sm"
              @click="removeSource(source.id)"
              class="text-red-500 hover:text-red-600"
            >
              <Trash2 class="w-4 h-4" />
            </UiButton>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8 text-stream-text/60">
        <p>No stream sources configured</p>
        <p class="text-sm mt-2">Click "Add Source" to get started</p>
      </div>
    </div>

    <!-- Storage Settings -->
    <div class="bg-stream-surface rounded-lg p-6 mb-6 border border-stream-border">
      <h2 class="text-xl font-semibold mb-4 text-stream-text">Storage</h2>
      
      <!-- Storage Statistics -->
      <div class="mb-6">
        <h3 class="text-base font-medium text-stream-text mb-3">Storage Information</h3>
        <StorageStats :show-clear-button="false" />
      </div>
      
      <div class="space-y-4 pt-4 border-t border-stream-border">
        <div>
          <p class="font-medium text-stream-text mb-2">Clear Cache</p>
          <p class="text-sm text-stream-text/60 mb-3">
            Remove cached data to free up space
          </p>
          <UiButton variant="outline" @click="clearCache">
            <Trash2 class="w-4 h-4 mr-2" />
            Clear Cache
          </UiButton>
        </div>
        <div class="pt-4 border-t border-stream-border">
          <p class="font-medium text-stream-text mb-2">Clear All Data</p>
          <p class="text-sm text-stream-text/60 mb-3">
            Remove all settings, sources, and favorites (cannot be undone)
          </p>
          <UiButton variant="destructive" @click="showClearDataDialog">
            <AlertCircle class="w-4 h-4 mr-2" />
            Clear All Data
          </UiButton>
        </div>
      </div>
    </div>

    <!-- About Section -->
    <div class="bg-stream-surface rounded-lg p-6 border border-stream-border">
      <h2 class="text-xl font-semibold mb-4 text-stream-text">About</h2>
      <div class="space-y-2 text-sm text-stream-text/80">
        <p>
          <span class="font-medium">Version:</span> 1.0.0
        </p>
        <p>
          <span class="font-medium">Developer:</span>
          <a href="https://wizju.com" class="text-stream-primary hover:underline" target="_blank">
            Wizju
          </a>
        </p>
        <p class="text-stream-text/60 mt-4">
          Wizju IPTV Player is a modern streaming media player for managing and watching IPTV
          content.
        </p>
      </div>
    </div>
  </div>

  <!-- Add Source Modal -->
  <Teleport to="body">
    <div
      v-if="showAddSourceModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="relative max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div class="absolute top-4 right-4 z-10">
          <UiButton
            variant="ghost"
            size="sm"
            class="h-8 w-8 p-0"
            @click="closeAddSourceModal"
            title="Close"
          >
            <span class="text-lg">×</span>
          </UiButton>
        </div>
        <SetupWelcome @complete="handleSetupComplete" />
      </div>
    </div>
  </Teleport>

  <!-- Clear Data Confirmation Dialog -->
  <Teleport to="body">
    <div
      v-if="showClearDataConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-stream-surface rounded-lg p-6 max-w-md w-full mx-4 border border-stream-border">
        <h3 class="text-lg font-semibold mb-3 text-stream-text">Clear All Data?</h3>
        <p class="text-sm text-stream-text/80 mb-6">
          This will remove all your settings, stream sources, favorites, and watch history. This
          action cannot be undone.
        </p>
        <div class="flex justify-end gap-3">
          <UiButton variant="outline" @click="showClearDataConfirm = false"> Cancel </UiButton>
          <UiButton variant="destructive" @click="confirmClearAllData">
            Clear All Data
          </UiButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus, PlayCircle, Trash2, AlertCircle } from 'lucide-vue-next'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import UiButton from '@/components/ui/UiButton.vue'
import SetupWelcome from '@/components/setup/SetupWelcome.vue'
import StorageStats from '@/components/ui/StorageStats.vue'
import { useStreamSourcesStore } from '@/stores/streamSources'
import { favoritesService } from '@/services/favoritesService'
import { recentWatchingService } from '@/services/recentWatchingService'
import { closeDB } from '@/services/indexedDb/indexedDbService'

const streamStore = useStreamSourcesStore()

const showAddSourceModal = ref(false)
const showClearDataConfirm = ref(false)

// Show add source dialog
const showAddSourceDialog = () => {
  showAddSourceModal.value = true
}

// Close add source modal
const closeAddSourceModal = () => {
  showAddSourceModal.value = false
}

// Handle setup completion
const handleSetupComplete = () => {
  showAddSourceModal.value = false
}

// Toggle source active/inactive
const toggleSourceActive = (sourceId: string) => {
  streamStore.toggleSource(sourceId)
}

// Remove source
const removeSource = (sourceId: string) => {
  if (confirm('Are you sure you want to remove this source?')) {
    streamStore.removeSource(sourceId)
  }
}

// Clear cache
const clearCache = async () => {
  try {
    // Clear favorites and recent watching
    await favoritesService.clearFavorites()
    await recentWatchingService.clearAll()
    alert('Cache cleared successfully')
  } catch (error) {
    console.error('Failed to clear cache:', error)
    alert('Failed to clear cache. Please try again.')
  }
}

// Show clear data confirmation dialog
const showClearDataDialog = () => {
  showClearDataConfirm.value = true
}

// Confirm and clear all data
const confirmClearAllData = async () => {
  try {
    // Close the IndexedDB connection
    await closeDB()
    
    // Clear IndexedDB
    const dbs = await window.indexedDB.databases()
    for (const db of dbs) {
      if (db.name) {
        window.indexedDB.deleteDatabase(db.name)
      }
    }
    
    // Clear all data
    localStorage.clear()
    sessionStorage.clear()
    
    showClearDataConfirm.value = false
    alert('All data cleared. The page will now reload.')
    
    // Reload the page
    window.location.reload()
  } catch (error) {
    console.error('Failed to clear all data:', error)
    alert('Failed to clear all data. Please try again.')
  }
}
</script>
