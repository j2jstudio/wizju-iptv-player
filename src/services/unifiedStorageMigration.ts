/**
 * Unified Storage Migration Service
 *
 * Provides a unified interface for migrating data from both localStorage (web)
 * and chrome.storage.local (extension) to IndexedDB.
 *
 * This service automatically detects the environment and runs the appropriate
 * migration based on where old data exists.
 */

import {
  StorageMigrationService,
  storageMigrationService,
  type MigrationResult,
  type MigrationProgressCallback,
} from './storageMigration'
import {
  ChromeStorageMigrationService,
  chromeStorageMigrationService,
  isChromeExtension,
  type ChromeMigrationResult,
  type ChromeMigrationProgressCallback,
} from './chromeStorageMigration'

/**
 * Unified migration result
 */
export interface UnifiedMigrationResult {
  success: boolean
  localStorage: MigrationResult | null
  chromeStorage: ChromeMigrationResult | null
  errors: string[]
}

/**
 * Migration source type
 */
export type MigrationSource = 'localStorage' | 'chromeStorage' | 'both' | 'none'

/**
 * Unified progress callback
 */
export type UnifiedMigrationProgressCallback = (progress: {
  source: MigrationSource
  stage: string
  current: number
  total: number
  message: string
}) => void

/**
 * Unified Storage Migration Service
 */
export class UnifiedStorageMigrationService {
  private localStorageMigration: StorageMigrationService
  private chromeStorageMigration: ChromeStorageMigrationService

  constructor() {
    this.localStorageMigration = storageMigrationService
    this.chromeStorageMigration = chromeStorageMigrationService
  }

  /**
   * Check if running in Chrome extension environment
   */
  isChromeExtension(): boolean {
    return isChromeExtension()
  }

  /**
   * Detect which storage sources have old data that needs migration
   *
   * @returns Migration source type
   */
  async detectMigrationSource(): Promise<MigrationSource> {
    const hasLocalStorageData = await this.localStorageMigration.detectOldData()
    const hasChromeStorageData = this.isChromeExtension()
      ? await this.chromeStorageMigration.detectOldData()
      : false

    if (hasLocalStorageData && hasChromeStorageData) {
      return 'both'
    } else if (hasLocalStorageData) {
      return 'localStorage'
    } else if (hasChromeStorageData) {
      return 'chromeStorage'
    }

    return 'none'
  }

  /**
   * Get the overall migration status
   *
   * @returns Object with status for each storage type
   */
  async getMigrationStatus(): Promise<{
    localStorage: 'completed' | 'pending' | 'none'
    chromeStorage: 'completed' | 'pending' | 'none'
    needsMigration: boolean
  }> {
    const localStorageStatus = this.localStorageMigration.getMigrationStatus()
    const chromeStorageStatus = this.isChromeExtension()
      ? await this.chromeStorageMigration.getMigrationStatus()
      : 'none'

    const needsMigration = localStorageStatus === 'pending' || chromeStorageStatus === 'pending'

    return {
      localStorage: localStorageStatus,
      chromeStorage: chromeStorageStatus,
      needsMigration,
    }
  }

  /**
   * Execute migration for localStorage only
   *
   * @param onProgress Progress callback
   * @returns Migration result
   */
  async migrateLocalStorage(onProgress?: MigrationProgressCallback): Promise<MigrationResult> {
    return this.localStorageMigration.executeMigration(onProgress)
  }

  /**
   * Execute migration for chrome.storage only
   *
   * @param onProgress Progress callback
   * @returns Migration result
   */
  async migrateChromeStorage(
    onProgress?: ChromeMigrationProgressCallback,
  ): Promise<ChromeMigrationResult> {
    return this.chromeStorageMigration.executeMigration(onProgress)
  }

  /**
   * Execute migration for all available sources
   *
   * This method automatically detects which storage sources have data
   * and migrates them in order: localStorage first, then chrome.storage.
   *
   * @param onProgress Unified progress callback
   * @returns Unified migration result
   */
  async executeUnifiedMigration(
    onProgress?: UnifiedMigrationProgressCallback,
  ): Promise<UnifiedMigrationResult> {
    const result: UnifiedMigrationResult = {
      success: false,
      localStorage: null,
      chromeStorage: null,
      errors: [],
    }

    const migrationSource = await this.detectMigrationSource()

    if (migrationSource === 'none') {
      console.log('[UnifiedMigration] No migration needed')
      result.success = true
      return result
    }

    console.log(`[UnifiedMigration] Detected migration source: ${migrationSource}`)

    // Migrate localStorage if needed
    if (migrationSource === 'localStorage' || migrationSource === 'both') {
      console.log('[UnifiedMigration] Starting localStorage migration...')

      const localStorageProgress: MigrationProgressCallback = (progress) => {
        onProgress?.({
          source: 'localStorage',
          ...progress,
        })
      }

      try {
        result.localStorage =
          await this.localStorageMigration.executeMigration(localStorageProgress)

        if (!result.localStorage.success) {
          result.errors.push(
            `localStorage migration failed: ${result.localStorage.errors.join(', ')}`,
          )
        }
      } catch (error) {
        const errorMessage = `localStorage migration error: ${error}`
        console.error('[UnifiedMigration]', errorMessage)
        result.errors.push(errorMessage)
      }
    }

    // Migrate chrome.storage if needed
    if (migrationSource === 'chromeStorage' || migrationSource === 'both') {
      console.log('[UnifiedMigration] Starting chrome.storage migration...')

      const chromeStorageProgress: ChromeMigrationProgressCallback = (progress) => {
        onProgress?.({
          source: 'chromeStorage',
          ...progress,
        })
      }

      try {
        result.chromeStorage =
          await this.chromeStorageMigration.executeMigration(chromeStorageProgress)

        if (!result.chromeStorage.success) {
          result.errors.push(
            `chrome.storage migration failed: ${result.chromeStorage.errors.join(', ')}`,
          )
        }
      } catch (error) {
        const errorMessage = `chrome.storage migration error: ${error}`
        console.error('[UnifiedMigration]', errorMessage)
        result.errors.push(errorMessage)
      }
    }

    // Determine overall success
    const localStorageSuccess = result.localStorage?.success ?? true
    const chromeStorageSuccess = result.chromeStorage?.success ?? true
    result.success = localStorageSuccess && chromeStorageSuccess

    console.log('[UnifiedMigration] Migration completed:', {
      success: result.success,
      localStorage: result.localStorage?.success,
      chromeStorage: result.chromeStorage?.success,
      errors: result.errors,
    })

    return result
  }

  /**
   * Get summary of what will be migrated
   *
   * @returns Summary object with counts for each storage type
   */
  async getMigrationSummary(): Promise<{
    localStorage: {
      available: boolean
      hasPendingData: boolean
    }
    chromeStorage: {
      available: boolean
      hasPendingData: boolean
    }
  }> {
    const localStorageStatus = this.localStorageMigration.getMigrationStatus()
    const chromeStorageStatus = this.isChromeExtension()
      ? await this.chromeStorageMigration.getMigrationStatus()
      : 'none'

    return {
      localStorage: {
        available: true,
        hasPendingData: localStorageStatus === 'pending',
      },
      chromeStorage: {
        available: this.isChromeExtension(),
        hasPendingData: chromeStorageStatus === 'pending',
      },
    }
  }
}

// Export singleton instance
export const unifiedStorageMigrationService = new UnifiedStorageMigrationService()

// Re-export for convenience
export { isChromeExtension }
export type { MigrationResult, MigrationProgressCallback }
export type { ChromeMigrationResult, ChromeMigrationProgressCallback }
