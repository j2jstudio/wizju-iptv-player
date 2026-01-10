/// <reference types="vite/client" />

/**
 * Build-time platform constants defined in Vite config
 */
declare const __PLATFORM__: 'web' | 'chrome-extension'
declare const __IS_CHROME_EXTENSION__: boolean

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_PLATFORM: 'web' | 'chrome-extension'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
