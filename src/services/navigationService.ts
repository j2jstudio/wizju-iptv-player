import type { Router } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { useNavigationStore } from '@/stores/navigation'
import { useStreamSourcesStore } from '@/stores/streamSources'
import type { MediaItem } from '@/types/stream'

/**
 * Unified routing navigation service class
 * Centralized management of all routing navigation operations to avoid scattered router.push() calls
 */
export class NavigationService {
  private router: Router

  constructor(router: Router) {
    this.router = router
  }

  /**
   * Navigate to the homepage
   */
  navigateToHome(): void {
    this.router.push({ name: 'Home' })
  }

  /**
   * Navigate to the Live page
   * @param sourceId Optional source ID, sets it as the current source if provided
   */
  navigateToLive(sourceId?: string): void {
    if (sourceId) {
      const navigationStore = useNavigationStore()
      navigationStore.setCurrentSource(sourceId)
    }
    this.router.push({ name: 'Live' })
  }

  /**
   * Navigate to the Films page
   */
  navigateToFilms(): void {
    this.router.push({ name: 'Films' })
  }

  /**
   * Navigate to the Series page
   */
  navigateToSeries(): void {
    this.router.push({ name: 'Series' })
  }

  /**
   * Navigate to the Media Detail page
   * @param mediaItem Media item, automatically set in the navigation store
   * @param sourceId Optional source ID, sets it as the current source if provided
   */
  navigateToMediaDetail(mediaItem: MediaItem, sourceId?: string): void {
    const navigationStore = useNavigationStore()

    // If a source ID is provided, set it as the current source
    if (sourceId) {
      navigationStore.setCurrentSource(sourceId)
    }
    // Set the current media item
    navigationStore.setCurrentMediaItem(mediaItem)

    this.router.push({ name: 'MediaDetail' })
  }

  /**
   * Navigate from a channel to the Media Detail page
   * @param channel Channel information (currently an alias for MediaItem)
   * @param sourceId Optional source ID
   */
  navigateToChannelDetail(channel: MediaItem, sourceId?: string): void {
    this.navigateToMediaDetail(channel, sourceId)
  }

  /**
   * Navigate to the 404 page
   */
  navigateToNotFound(): void {
    this.router.push({ name: 'NotFound' })
  }

  /**
   * Go back to the previous page
   */
  goBack(): void {
    this.router.back()
  }

  /**
   * Go forward to the next page
   */
  goForward(): void {
    this.router.forward()
  }

  /**
   * Replace the current route (does not leave a record in the history)
   * @param location Route location
   */
  replace(location: RouteLocationRaw): void {
    this.router.replace(location)
  }

  /**
   * Smart navigation: Decide the navigation target based on the current application state
   * Mainly used for navigation logic after deleting a source
   */
  navigateAfterSourceDeletion(): void {
    const streamSourcesStore = useStreamSourcesStore()

    if (streamSourcesStore.sources.length === 0) {
      // If there are no other sources, return to the homepage
      this.navigateToHome()
    } else {
      // If there are other sources, return to the Live page for the user to choose
      this.navigateToLive()
    }
  }

  /**
   * Conditional navigation: Navigate only if the condition is met
   * @param condition Navigation condition
   * @param location Target route
   * @param fallback Fallback route
   */
  navigateIf(condition: boolean, location: RouteLocationRaw, fallback?: RouteLocationRaw): void {
    if (condition) {
      this.router.push(location)
    } else if (fallback) {
      this.router.push(fallback)
    }
  }

  /**
   * Navigate to the settings page (if it exists)
   */
  navigateToSettings(): void {
    // The settings page may not currently exist in the project, this is a reserved interface
    console.log('Settings page navigation - to be implemented')
  }

  /**
   * Get the current route information
   */
  getCurrentRoute() {
    return this.router.currentRoute
  }

  /**
   * Check if it is possible to go back to the previous page
   */
  canGoBack(): boolean {
    return window.history.length > 1
  }
}

// Factory function to create a singleton instance
let navigationServiceInstance: NavigationService | null = null

export function createNavigationService(router: Router): NavigationService {
  if (!navigationServiceInstance) {
    navigationServiceInstance = new NavigationService(router)
  }
  return navigationServiceInstance
}

export function useNavigationService(): NavigationService {
  if (!navigationServiceInstance) {
    throw new Error(
      'NavigationService has not been initialized. Call createNavigationService first.',
    )
  }
  return navigationServiceInstance
}
