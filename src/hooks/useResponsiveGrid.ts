import { ref, onMounted, onUnmounted } from 'vue'

interface BreakpointConfig {
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

export function useResponsiveGrid(
  breakpoints: BreakpointConfig = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
) {
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
    const width = windowWidth.value
    if (width >= breakpoints['2xl']) return 6
    if (width >= breakpoints.xl) return 5
    if (width >= breakpoints.lg) return 4
    if (width >= breakpoints.md) return 3
    if (width >= breakpoints.sm) return 2
    return 1
  }

  return {
    windowWidth,
    getColumnsCount,
  }
}
