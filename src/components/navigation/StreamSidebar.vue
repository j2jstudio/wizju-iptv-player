<template>
  <div class="w-60 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">
    <!-- Logo/Title -->
    <div class="p-4 border-b border-sidebar-border">
      <a href="https://wizju.com" class="text-lg font-semibold text-sidebar-foreground">
        Wiz<span class="text-orange-500">ju</span>
      </a>
      <p class="text-xs text-sidebar-foreground/60">Media Hub</p>
    </div>

    <!-- Search -->
    <!-- <div class="p-4 border-b border-sidebar-border">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-sidebar-foreground/60" />
        <Input
          v-model="searchQuery"
          placeholder="Search"
          class="pl-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder-sidebar-foreground/60"
        />
      </div>
    </div> -->

    <!-- Main Navigation -->
    <div class="flex-1 overflow-y-auto">
      <nav class="p-2 space-y-1">
        <RouterLink
          v-for="item in navigationItems"
          :key="item.url"
          :to="item.url"
          :class="
            cn(
              'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              route.path === item.url
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent',
            )
          "
        >
          <component :is="item.icon" class="w-4 h-4" />
          <span>{{ item.title }}</span>
        </RouterLink>
      </nav>

      <!-- Quick Actions -->
      <!-- <div class="mt-6 px-4">
        <h3 class="text-xs font-semibold text-sidebar-foreground/80 uppercase tracking-wide mb-2">
          Quick Actions
        </h3>
        <div class="space-y-1">
          <Button
            v-for="(action, index) in quickActions"
            :key="index"
            variant="ghost"
            size="sm"
            class="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <component :is="action.icon" class="w-4 h-4 mr-3" />
            {{ action.title }}
          </Button>
        </div>
      </div> -->

      <!-- Playlists -->
      <div class="mt-6 px-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xs font-semibold text-sidebar-foreground/80 uppercase tracking-wide">
            Playlists
          </h3>
          <Button
            variant="ghost"
            size="sm"
            class="h-6 w-6 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            @click="showAddSourceDialog"
            title="Add playlist"
          >
            <Plus class="w-3 h-3" />
          </Button>
        </div>
        <div class="space-y-1">
          <!-- Display playlists from StreamSources -->
          <Button
            v-for="playlist in playlistItems"
            :key="playlist.id"
            variant="ghost"
            size="sm"
            :class="
              cn(
                'w-full justify-start transition-colors',
                isActiveSource(playlist.id)
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent',
              )
            "
            @click="navigateToLive(playlist.id)"
          >
            <PlayCircle class="w-4 h-4 mr-3" />
            <span class="truncate">{{ playlist.title }}</span>
            <span v-if="!playlist.isActive" class="ml-auto text-xs text-sidebar-foreground/40">
              inactive
            </span>
          </Button>

          <!-- Show hint if no playlists are available -->
          <div
            v-if="playlistItems.length === 0"
            class="text-xs text-sidebar-foreground/60 py-2 px-3"
          >
            No playlists available
          </div>
        </div>
      </div>
    </div>

    <!-- Settings -->
    <div class="p-4 border-t border-sidebar-border space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-sm text-sidebar-foreground/80">Theme</span>
        <ThemeToggle />
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
      >
        <Settings class="w-4 h-4 mr-3" />
        Settings
      </Button>
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
          <Button
            variant="ghost"
            size="sm"
            class="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
            @click="closeAddSourceModal"
            title="Close"
          >
            <span class="text-lg">×</span>
          </Button>
        </div>
        <SetupWelcome @complete="handleSetupComplete" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Home, Settings, Plus, PlayCircle } from 'lucide-vue-next'
import { cn } from '@/utils/cn'
import Button from '@/components/ui/UiButton.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import SetupWelcome from '@/components/setup/SetupWelcome.vue'
import { useStreamSourcesStore } from '@/stores/streamSources'
import { useNavigationService } from '@/services/navigationService'
import { useNavigationStore } from '@/stores/navigation'

const streamStore = useStreamSourcesStore()
const navigationService = useNavigationService()
const navigationStore = useNavigationStore()
const route = useRoute()
const showAddSourceModal = ref(false)

// Fetch active streaming sources from the store
const playlistItems = computed(() => {
  return streamStore.activeSources.map((source) => ({
    id: source.id,
    title: source.name,
    type: source.type,
    isActive: source.isActive,
  }))
})

// Check if the source is currently active
const isActiveSource = (sourceId: string): boolean => {
  return navigationStore.currentSourceId === sourceId && route.path === '/live'
}

// Navigate to LiveView when a playlist item is clicked and set the current source in the navigation store
const navigateToLive = (sourceId: string) => {
  // Use navigation service for navigation
  navigationService.navigateToLive(sourceId)
}

// Show the add source modal
const showAddSourceDialog = () => {
  showAddSourceModal.value = true
}

// Close the add source modal
const closeAddSourceModal = () => {
  showAddSourceModal.value = false
}

// Handle setup completion
const handleSetupComplete = () => {
  showAddSourceModal.value = false
}

const navigationItems = [
  { title: 'Home', url: '/', icon: Home },
  // { title: 'Live', url: '/live', icon: Radio },
]
</script>

<style scoped>
addstream {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}

addstream::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
}

addstream:hover::-webkit-scrollbar {
  display: block;
}
</style>
