<template>
  <div
    v-if="items.length === 0"
    class="flex items-center justify-start h-64 text-stream-text-muted"
  >
    <p>{{ emptyMessage || 'No media available. Please configure your streaming sources.' }}</p>
  </div>

  <div
    v-else
    :class="
      cn(
        'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4',
        className,
      )
    "
  >
    <MediaCard
      v-for="item in items"
      :key="item.id"
      :media="item"
      @click="$emit('item-click', item)"
    />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/utils/cn'
import MediaCard from './MediaCard.vue'
import type { MediaItem } from '@/types/stream'

interface Props {
  items: MediaItem[]
  className?: string
  emptyMessage?: string
}

defineProps<Props>()

defineEmits<{
  'item-click': [item: MediaItem]
}>()
</script>
