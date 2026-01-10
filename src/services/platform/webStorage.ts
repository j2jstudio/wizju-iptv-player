import type { PlatformStorage } from './types'

/**
 * Web platform storage implementation using localStorage
 * Falls back to in-memory storage if localStorage is not available
 */
class WebStorage implements PlatformStorage {
  private memoryStore: Map<string, string> = new Map()
  private useLocalStorage: boolean

  constructor() {
    this.useLocalStorage = this.isLocalStorageAvailable()
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__'
      localStorage.setItem(testKey, testKey)
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = this.useLocalStorage
        ? localStorage.getItem(key)
        : (this.memoryStore.get(key) ?? null)

      if (value === null) {
        return null
      }
      return JSON.parse(value) as T
    } catch (error) {
      console.error(`Failed to get item from storage: ${key}`, error)
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      if (this.useLocalStorage) {
        localStorage.setItem(key, serialized)
      } else {
        this.memoryStore.set(key, serialized)
      }
    } catch (error) {
      console.error(`Failed to set item in storage: ${key}`, error)
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    try {
      if (this.useLocalStorage) {
        localStorage.removeItem(key)
      } else {
        this.memoryStore.delete(key)
      }
    } catch (error) {
      console.error(`Failed to remove item from storage: ${key}`, error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.useLocalStorage) {
        localStorage.clear()
      } else {
        this.memoryStore.clear()
      }
    } catch (error) {
      console.error('Failed to clear storage', error)
      throw error
    }
  }
}

export const webStorage = new WebStorage()
