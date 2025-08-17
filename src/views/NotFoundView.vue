<template>
  <div class="min-h-screen flex items-center justify-center bg-stream-bg">
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-4 text-stream-text">404</h1>
      <p class="text-xl text-stream-text-muted mb-4">Oops! Page not found</p>
      <Button @click="navigationService.navigateToHome()" variant="outline">
        Return to Home
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/ui/UiButton.vue'
import { useNavigationService } from '@/services/navigationService'

const navigationService = useNavigationService()
</script>
