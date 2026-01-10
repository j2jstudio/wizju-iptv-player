<template>
  <div id="app" class="bg-stream-bg text-stream-text">
    <!-- Storage Migration Modal -->
    <Teleport to="body">
      <div
        v-if="showMigrationModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      >
        <div class="max-w-lg w-full">
          <StorageMigration
            @migration-complete="handleMigrationComplete"
            @skip-migration="handleSkipMigration"
          />
        </div>
      </div>
    </Teleport>

    <!-- Layout for pages that require a sidebar -->
    <div v-if="showSidebar" class="flex h-screen">
      <StreamSidebar />
      <main class="flex-1 h-screen overflow-y-auto">
        <PageNavigation />
        <RouterView />
      </main>
      <aside class="hidden xl:block w-80 h-screen border-stream-border">
        <!--*bg-stream-surface border-l* -->
        <div class="p-4"></div>
      </aside>
    </div>

    <!-- Layout for pages that do not require a sidebar -->
    <div v-else class="flex h-screen">
      <main class="flex-1 min-h-screen">
        <PageNavigation />
        <RouterView />
      </main>
      <aside class="hidden xl:block w-80 h-screen border-stream-border">
        <div class="p-4"></div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useStreamSourcesStore } from '@/stores/streamSources'
import { useMediaItemsStore } from '@/stores/mediaItems'
import { storageMigrationService } from '@/services/storageMigration'
import { initDB } from '@/services/indexedDb/indexedDbService'
import StreamSidebar from '@/components/navigation/StreamSidebar.vue'
import PageNavigation from '@/components/navigation/PageNavigation.vue'
import StorageMigration from '@/components/setup/StorageMigration.vue'

const themeStore = useThemeStore()
const streamSourcesStore = useStreamSourcesStore()
const mediaItemsStore = useMediaItemsStore()
const route = useRoute()

// Migration state
const showMigrationModal = ref(false)
const isAppReady = ref(false)

// Define routes that need to display the sidebar
const sidebarRoutes = ['Home', 'Live', 'Films', 'Series', 'Settings']

// Calculate whether to show the sidebar
const showSidebar = computed(() => {
  return sidebarRoutes.includes(route.name as string)
})

// Check if migration is needed and initialize the app
const initializeApp = async () => {
  try {
    // Initialize IndexedDB first
    await initDB()

    // Check migration status
    const migrationStatus = storageMigrationService.getMigrationStatus()
    console.log('[App] Migration status:', migrationStatus)

    if (migrationStatus === 'pending') {
      // Show migration modal
      showMigrationModal.value = true
    } else {
      // No migration needed, load data directly
      await loadAppData()
    }
  } catch (error) {
    console.error('[App] Failed to initialize app:', error)
    // Try to load data anyway
    await loadAppData()
  }
}

// Load application data from IndexedDB
const loadAppData = async () => {
  try {
    await Promise.all([
      streamSourcesStore.loadSources(),
      mediaItemsStore.loadAllMediaItems(),
    ])
    isAppReady.value = true
    console.log('[App] Application data loaded successfully')
  } catch (error) {
    console.error('[App] Failed to load application data:', error)
  }
}

// Handle migration complete
const handleMigrationComplete = async () => {
  console.log('[App] Migration completed, reloading data...')
  showMigrationModal.value = false
  await loadAppData()
}

// Handle skip migration
const handleSkipMigration = async () => {
  console.log('[App] Migration skipped')
  showMigrationModal.value = false
  await loadAppData()
}

onMounted(async () => {
  themeStore.initializeTheme()
  await initializeApp()
})
</script>

<style scoped>
main {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

main::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
}

main:hover::-webkit-scrollbar {
  display: block;
}
</style>
