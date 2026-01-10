import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Chrome Extension-specific Vite configuration
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    // Define platform for conditional code
    __PLATFORM__: JSON.stringify('chrome-extension'),
    __IS_CHROME_EXTENSION__: JSON.stringify(true),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'options.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        // Use static file names for Chrome extension (required for manifest.json)
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
    outDir: 'dist-extension',
  },
  publicDir: 'public',
})
