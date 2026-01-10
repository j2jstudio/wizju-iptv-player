/**
 * Platform-agnostic storage interface
 * This interface defines the contract for storage services across different platforms
 */
export interface PlatformStorage {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

/**
 * Platform detection utilities
 */
export interface PlatformInfo {
  readonly isChromeExtension: boolean
  readonly isWeb: boolean
  readonly name: 'chrome-extension' | 'web'
}
