/**
 * Global error handler for the application
 * Provides user-friendly error messages and fallback mechanisms
 */

export interface ErrorHandlerOptions {
  showAlert?: boolean
  logToConsole?: boolean
  fallbackMessage?: string
}

export class AppError extends Error {
  constructor(
    message: string,
    public userMessage?: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class StorageError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(message, userMessage, 'STORAGE_ERROR')
    this.name = 'StorageError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(message, userMessage, 'NETWORK_ERROR')
    this.name = 'NetworkError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, userMessage?: string) {
    super(message, userMessage, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

/**
 * Handle errors with user-friendly messages
 */
export function handleError(error: unknown, options: ErrorHandlerOptions = {}): void {
  const {
    showAlert = true,
    logToConsole = true,
    fallbackMessage = 'An unexpected error occurred. Please try again.',
  } = options

  let userMessage = fallbackMessage
  let technicalMessage = 'Unknown error'

  // Extract error information
  if (error instanceof AppError) {
    userMessage = error.userMessage || error.message
    technicalMessage = error.message
  } else if (error instanceof Error) {
    technicalMessage = error.message

    // Check for specific error types
    if (error.name === 'QuotaExceededError') {
      userMessage = 'Storage quota exceeded. Please free up some space by clearing old data.'
    } else if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      userMessage = 'Network error. Please check your internet connection and try again.'
    } else if (error.message.includes('IndexedDB')) {
      userMessage =
        'Database error. The application may not function properly. Try refreshing the page.'
    }
  } else if (typeof error === 'string') {
    technicalMessage = error
    userMessage = error
  }

  // Log to console
  if (logToConsole) {
    console.error('[Error Handler]', {
      technical: technicalMessage,
      user: userMessage,
      original: error,
    })
  }

  // Show alert to user
  if (showAlert) {
    alert(userMessage)
  }
}

/**
 * Async error wrapper - catches errors from async functions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: ErrorHandlerOptions,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(error, options)
      throw error
    }
  }) as T
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window
  } catch {
    return false
  }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Get storage availability status
 */
export function getStorageStatus(): {
  indexedDB: boolean
  localStorage: boolean
  recommended: 'indexedDB' | 'localStorage' | 'none'
} {
  const hasIndexedDB = isIndexedDBAvailable()
  const hasLocalStorage = isLocalStorageAvailable()

  let recommended: 'indexedDB' | 'localStorage' | 'none' = 'none'
  if (hasIndexedDB) {
    recommended = 'indexedDB'
  } else if (hasLocalStorage) {
    recommended = 'localStorage'
  }

  return {
    indexedDB: hasIndexedDB,
    localStorage: hasLocalStorage,
    recommended,
  }
}

/**
 * Handle storage operation with automatic fallback
 */
export async function withStorageFallback<T>(
  operation: () => Promise<T>,
  fallback?: () => T,
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.warn('Storage operation failed, attempting fallback:', error)

    if (fallback) {
      try {
        return fallback()
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
        throw new StorageError(
          'Both primary and fallback storage operations failed',
          'Unable to access storage. Please check your browser settings.',
        )
      }
    }

    throw error
  }
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    handleError(event.reason, {
      showAlert: false,
      logToConsole: true,
    })
    event.preventDefault()
  })

  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error)
    handleError(event.error, {
      showAlert: false,
      logToConsole: true,
    })
  })

  // Check storage availability on startup
  const storageStatus = getStorageStatus()
  if (!storageStatus.indexedDB && !storageStatus.localStorage) {
    console.error('No storage mechanism available!')
    alert(
      'Your browser does not support the required storage features. ' +
        'The application may not function correctly. ' +
        'Please try using a modern browser like Chrome, Firefox, or Safari.',
    )
  } else if (!storageStatus.indexedDB) {
    console.warn('IndexedDB not available, functionality may be limited')
  }
}
