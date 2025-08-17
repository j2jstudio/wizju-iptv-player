import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useStreamSourcesStore } from '@/stores/streamSources'

// Google Analytics gtag
declare global {
  function gtag(
    command: 'config' | 'event' | 'js',
    targetId: string | Date,
    config?: {
      page_path?: string
      event_category?: string
      event_label?: string
      value?: number
      [key: string]: unknown
    },
  ): void
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/live',
    name: 'Live',
    component: () => import('@/views/LiveView.vue'),
  },
  {
    path: '/films',
    name: 'Films',
    component: () => import('@/views/FilmsView.vue'),
  },
  {
    path: '/series',
    name: 'Series',
    component: () => import('@/views/SeriesView.vue'),
  },
  {
    path: '/media',
    name: 'MediaDetail',
    component: () => import('@/views/MediaDetailView.vue'),
  },
  {
    path: '/virtual-scroll-demo',
    name: 'VirtualScrollDemo',
    component: () => import('@/views/VirtualScrollDemo.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// Global before guard: Redirect to the homepage if no streaming sources are available
router.beforeEach((to, from, next) => {
  if (typeof gtag !== 'undefined') {
    gtag('config', 'G-07ZGCNZLDT', {
      page_path: to.path,
    })
  }

  const streamStore = useStreamSourcesStore()

  // If the target route is the homepage, allow navigation
  if (to.name === 'Home') {
    next()
    return
  }

  // Check if there are streaming sources
  if (streamStore.sources.length === 0) {
    // If no streaming sources are available, redirect to the homepage
    next({ name: 'Home' })
    return
  }

  // If navigating to the MediaDetail page, perform additional validation
  if (to.name === 'MediaDetail') {
    // Additional validation logic can be added here
    // For example, checking if the current source is set
    // For now, allow navigation; errors will be handled in the component
    next()
    return
  }

  // If streaming sources are available, allow normal navigation
  next()
})

export default router
