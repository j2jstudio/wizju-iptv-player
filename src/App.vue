<template>
  <div id="app" class="bg-stream-bg text-stream-text">
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
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import StreamSidebar from '@/components/navigation/StreamSidebar.vue'
import PageNavigation from '@/components/navigation/PageNavigation.vue'

const themeStore = useThemeStore()
const route = useRoute()

// Define routes that need to display the sidebar
const sidebarRoutes = ['Home', 'Live', 'Films', 'Series']

// Calculate whether to show the sidebar
const showSidebar = computed(() => {
  return sidebarRoutes.includes(route.name as string)
})

onMounted(() => {
  themeStore.initializeTheme()
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
