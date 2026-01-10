/// <reference types="chrome" />
import type { PlatformStorage } from './types'

/**
 * Chrome Extension storage implementation using chrome.storage.local
 */
class ChromeExtensionStorage implements PlatformStorage {
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key)
      return (result[key] as T) ?? null
    } catch (error) {
      console.error(`Failed to get item from chrome storage: ${key}`, error)
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value })
    } catch (error) {
      console.error(`Failed to set item in chrome storage: ${key}`, error)
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key)
    } catch (error) {
      console.error(`Failed to remove item from chrome storage: ${key}`, error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear()
    } catch (error) {
      console.error('Failed to clear chrome storage', error)
      throw error
    }
  }
}

export const chromeStorage = new ChromeExtensionStorage()
