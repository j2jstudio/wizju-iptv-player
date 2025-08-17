<template>
  <section :class="cn('space-y-4', className)">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-stream-text flex items-center">
        {{ title }}
        <ChevronRight class="w-5 h-5 ml-1" />
      </h2>

      <div class="flex items-center space-x-2">
        <Button
          v-if="items.length > 6"
          variant="ghost"
          size="sm"
          @click="showAll = !showAll"
          class="text-stream-text-muted hover:text-stream-accent"
        >
          {{ showAll ? 'Show Less' : `View All (${items.length})` }}
        </Button>
        <Button
          v-if="onViewAll && items.length > 0"
          variant="ghost"
          size="sm"
          @click="$emit('view-all')"
          class="text-stream-accent hover:text-stream-accent-hover"
        >
          View All
          <ChevronRight class="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>

    <MediaGrid
      :items="displayItems"
      :empty-message="emptyMessage"
      @item-click="$emit('item-click', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { cn } from '@/utils/cn'
import Button from '@/components/ui/UiButton.vue'
import MediaGrid from './MediaGrid.vue'
import type { MediaItem } from '@/types/stream'

interface Props {
  title: string
  items: MediaItem[]
  onViewAll?: () => void
  className?: string
  emptyMessage?: string
}

const props = defineProps<Props>()

defineEmits<{
  'item-click': [item: MediaItem]
  'view-all': []
}>()

const showAll = ref(false)

const displayItems = computed(() => (showAll.value ? props.items : props.items.slice(0, 6)))
</script>
