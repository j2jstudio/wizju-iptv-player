import { ref, onMounted, onUnmounted } from 'vue'

interface BreakpointConfig {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

interface ResponsiveGridOptions {
  breakpoints?: BreakpointConfig
  sidebarWidth?: number // Width of sidebar in pixels (default: 240px for w-60)
  asideWidth?: number // Width of aside in pixels (default: 320px for w-80)
  asideBreakpoint?: number // Breakpoint at which aside is shown (default: xl = 1280px)
}

export function useResponsiveGrid(options: ResponsiveGridOptions = {}) {
  const {
    breakpoints = {
      xs: 420,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    },
    sidebarWidth = 240, // w-60 = 240px
    asideWidth = 320, // w-80 = 320px
    asideBreakpoint = 1280, // xl breakpoint
  } = options

  const windowWidth = ref(0)

  const updateWidth = () => {
    if (typeof window !== 'undefined') {
      windowWidth.value = window.innerWidth
    }
  }

  onMounted(() => {
    updateWidth()
    window.addEventListener('resize', updateWidth)
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateWidth)
    }
  })

  const getColumnsCount = () => {
    const totalWidth = windowWidth.value

    // Calculate available width by subtracting sidebar and aside width
    let availableWidth = totalWidth - sidebarWidth // Always subtract sidebar width

    // Subtract aside width when it's visible (at xl breakpoint and above)
    if (totalWidth >= asideBreakpoint) {
      availableWidth -= asideWidth
    }

    // Use available width for column calculation
    if (availableWidth >= breakpoints['2xl']) return 6
    if (availableWidth >= breakpoints.xl) return 5
    if (availableWidth >= breakpoints.lg) return 4
    if (availableWidth >= breakpoints.md) return 3
    if (availableWidth >= breakpoints.sm) return 2
    if (availableWidth >= breakpoints.xs) return 2
    return 1
  }

  return {
    windowWidth,
    getColumnsCount,
  }
}
