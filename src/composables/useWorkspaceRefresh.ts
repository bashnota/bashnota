import { ref, onUnmounted } from 'vue'
import { useNotaStore } from '@/stores/nota'

// Types
interface RefreshOptions {
  interval?: number
  autoStart?: boolean
  onRefresh?: () => Promise<void>
  onError?: (error: Error) => void
}

// Composable
export function useWorkspaceRefresh(options: RefreshOptions = {}) {
  const store = useNotaStore()
  
  // State
  const isRefreshing = ref(false)
  const lastRefresh = ref(new Date())
  const refreshCount = ref(0)
  const error = ref<string | null>(null)
  
  // Internal state
  let refreshInterval: NodeJS.Timeout | null = null
  const defaultInterval = options.interval || 30000 // 30 seconds

  // Manual refresh
  const refresh = async (): Promise<void> => {
    if (isRefreshing.value) return

    try {
      isRefreshing.value = true
      error.value = null
      
      // Call custom refresh handler if provided
      if (options.onRefresh) {
        await options.onRefresh()
      } else {
        // Default refresh behavior
        await store.loadNotas()
      }
      
      lastRefresh.value = new Date()
      refreshCount.value++
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      error.value = errorMessage
      console.error('Refresh failed:', err)
      
      // Call error handler if provided
      if (options.onError && err instanceof Error) {
        options.onError(err)
      }
      
    } finally {
      isRefreshing.value = false
    }
  }

  // Start auto-refresh
  const startAutoRefresh = (interval?: number): void => {
    stopAutoRefresh() // Clear any existing interval
    
    const refreshInterval_ms = interval || defaultInterval
    
    refreshInterval = setInterval(async () => {
      await refresh()
    }, refreshInterval_ms)
  }

  // Stop auto-refresh
  const stopAutoRefresh = (): void => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  // Update refresh interval
  const updateInterval = (newInterval: number): void => {
    const wasRunning = refreshInterval !== null
    stopAutoRefresh()
    
    if (wasRunning) {
      startAutoRefresh(newInterval)
    }
  }

  // Check if auto-refresh is active
  const isAutoRefreshActive = (): boolean => {
    return refreshInterval !== null
  }

  // Reset refresh state
  const resetRefreshState = (): void => {
    refreshCount.value = 0
    error.value = null
    lastRefresh.value = new Date()
  }

  // Get refresh statistics
  const getRefreshStats = () => ({
    refreshCount: refreshCount.value,
    lastRefresh: lastRefresh.value,
    isRefreshing: isRefreshing.value,
    isAutoActive: isAutoRefreshActive(),
    error: error.value
  })

  // Format time since last refresh
  const getTimeSinceRefresh = (): string => {
    const now = new Date()
    const diff = now.getTime() - lastRefresh.value.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes === 1) return '1 minute ago'
    if (minutes < 60) return `${minutes} minutes ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours === 1) return '1 hour ago'
    if (hours < 24) return `${hours} hours ago`
    
    return 'Over a day ago'
  }

  // Auto-start if specified
  if (options.autoStart) {
    startAutoRefresh()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopAutoRefresh()
  })

  return {
    // State
    isRefreshing,
    lastRefresh,
    refreshCount,
    error,
    
    // Methods
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    updateInterval,
    isAutoRefreshActive,
    resetRefreshState,
    getRefreshStats,
    getTimeSinceRefresh
  }
} 