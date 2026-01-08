import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/tailwind-themes/stream-complete.css'
import { createNavigationService } from '@/services/navigationService'
import { setupGlobalErrorHandlers } from '@/utils/errorHandler'

// Setup global error handlers
setupGlobalErrorHandlers()

const app = createApp(App)

// Add global error handler for Vue
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err)
  console.error('Component:', instance)
  console.error('Error Info:', info)

  // You can add custom error reporting here
  // For now, we'll just log it
}

app.use(createPinia())
app.use(router)

// Initialize the navigation service
createNavigationService(router)

app.mount('#app')

export function mountVueApp(): void {
  const container = document.getElementById('vue-app')
  if (!container) return

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)

  // Initialize the navigation service
  createNavigationService(router)

  app.mount(container)
}
