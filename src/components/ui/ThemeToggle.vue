<template>
  <Button variant="ghost" size="icon" @click="themeStore.toggleTheme()" class="h-9 w-9">
    <Sun v-if="!isDark" class="h-4 w-4" />
    <Moon v-else class="h-4 w-4" />
    <span class="sr-only">Toggle theme</span>
  </Button>
</template>

<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import Button from './UiButton.vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const isDark = themeStore.isDark
</script>
