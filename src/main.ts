import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/tailwind-themes/stream-complete.css'
import { createNavigationService } from '@/services/navigationService'

const app = createApp(App)

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
