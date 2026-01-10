import type { PlatformStorage, PlatformInfo } from './types'
import { webStorage } from './webStorage'
import { chromeStorage } from './chromeStorage'

// These values are replaced at build time by Vite
declare const __PLATFORM__: 'web' | 'chrome-extension'
declare const __IS_CHROME_EXTENSION__: boolean

/**
 * Detect the current platform at runtime
 * This is useful when the build-time constants are not available
 */
function detectPlatform(): PlatformInfo {
  // First, try to use build-time constants
  if (typeof __IS_CHROME_EXTENSION__ !== 'undefined') {
    return {
      isChromeExtension: __IS_CHROME_EXTENSION__,
      isWeb: !__IS_CHROME_EXTENSION__,
      name: __IS_CHROME_EXTENSION__ ? 'chrome-extension' : 'web',
    }
  }

  // Fallback: runtime detection
  const isChromeExtension =
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    typeof chrome.runtime.id !== 'undefined'

  return {
    isChromeExtension,
    isWeb: !isChromeExtension,
    name: isChromeExtension ? 'chrome-extension' : 'web',
  }
}

/**
 * Get platform information
 */
export const platform: PlatformInfo = detectPlatform()

/**
 * Get the appropriate storage implementation for the current platform
 */
export function getStorage(): PlatformStorage {
  return platform.isChromeExtension ? chromeStorage : webStorage
}

/**
 * Platform-specific storage instance
 */
export const storage = getStorage()

// Re-export types
export type { PlatformStorage, PlatformInfo } from './types'
