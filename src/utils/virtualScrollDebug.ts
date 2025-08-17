import type { Channel } from '@/types/stream'

// Generate test channel data
export function generateTestChannels(count: number): Channel[] {
  const categories = [
    'News',
    'Sports',
    'Movies',
    'Kids',
    'Music',
    'Documentary',
    'Comedy',
    'Drama',
    'Sci-Fi',
    'Horror',
  ]
  const channels: Channel[] = []

  for (let i = 1; i <= count; i++) {
    channels.push({
      id: `test-channel-${i}`,
      title: `Test Channel ${i}`,
      description: `This is test channel number ${i}`,
      thumbnail: `https://picsum.photos/300/200?random=${i}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      url: `http://test.stream/${i}.m3u8`,
      type: 'live',
      genre: categories[Math.floor(Math.random() * categories.length)],
      tvgName: `test-${i}`,
      groupTitle: `Group ${Math.floor(i / 10) + 1}`,
    })
  }

  return channels
}

// Virtual scrolling debugging tool
export class VirtualScrollDebugger {
  private static instance: VirtualScrollDebugger | null = null
  private logs: Array<{ timestamp: number; message: string; data?: unknown }> = []

  static getInstance(): VirtualScrollDebugger {
    if (!this.instance) {
      this.instance = new VirtualScrollDebugger()
    }
    return this.instance
  }

  log(message: string, data?: unknown) {
    if (import.meta.env.DEV) {
      const logEntry = {
        timestamp: Date.now(),
        message,
        data,
      }
      this.logs.push(logEntry)
      console.debug(`[VirtualScroll] ${message}`, data)

      // Keep the number of logs within a reasonable range
      if (this.logs.length > 100) {
        this.logs = this.logs.slice(-50)
      }
    }
  }

  getLogs() {
    return this.logs
  }

  clearLogs() {
    this.logs = []
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2)
  }
}

// Performance monitoring tool
export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map()

  static start(label: string) {
    this.measurements.set(label, performance.now())
  }

  static end(label: string): number {
    const startTime = this.measurements.get(label)
    if (startTime !== undefined) {
      const duration = performance.now() - startTime
      this.measurements.delete(label)

      if (import.meta.env.DEV) {
        console.debug(`[Performance] ${label}: ${duration.toFixed(2)}ms`)
      }

      return duration
    }
    return 0
  }

  static measure(label: string, fn: () => void): number {
    this.start(label)
    fn()
    return this.end(label)
  }
}
