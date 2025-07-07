import { ref, computed, nextTick, onMounted, onUnmounted, type Ref } from 'vue'

export interface FullscreenState {
  isActive: boolean
  container: Ref<HTMLElement | null>
  originalStyles: {
    position: string
    top: string
    left: string
    width: string
    height: string
    zIndex: string
    margin: string
    borderRadius: string
    border: string
  } | null
}

export function usePipelineFullscreen(containerRef: Ref<HTMLElement | null>) {
  const isFullscreen = ref(false)
  const originalStyles = ref<FullscreenState['originalStyles']>(null)
  const escapeHandler = ref<((e: KeyboardEvent) => void) | null>(null)

  // Computed properties
  const canFullscreen = computed(() => !!containerRef.value)
  
  const fullscreenClass = computed(() => ({
    'pipeline-fullscreen': isFullscreen.value,
    'pipeline-normal': !isFullscreen.value
  }))

  // Save original styles
  const saveOriginalStyles = () => {
    if (!containerRef.value || !(containerRef.value instanceof Element)) {
      console.warn('Container ref is not available or not an Element')
      return
    }

    try {
      const element = containerRef.value
      const computed = window.getComputedStyle(element)
      originalStyles.value = {
        position: element.style.position || computed.position,
        top: element.style.top || computed.top,
        left: element.style.left || computed.left,
        width: element.style.width || computed.width,
        height: element.style.height || computed.height,
        zIndex: element.style.zIndex || computed.zIndex,
        margin: element.style.margin || computed.margin,
        borderRadius: element.style.borderRadius || computed.borderRadius,
        border: element.style.border || computed.border
      }
    } catch (error) {
      console.warn('Failed to save original styles:', error)
      // Fallback with default values
      originalStyles.value = {
        position: 'relative',
        top: 'auto',
        left: 'auto',
        width: 'auto',
        height: 'auto',
        zIndex: 'auto',
        margin: '16px 0',
        borderRadius: '8px',
        border: '2px solid hsl(var(--border))'
      }
    }
  }

  // Apply fullscreen styles
  const applyFullscreenStyles = () => {
    if (!containerRef.value || !(containerRef.value instanceof HTMLElement)) {
      console.warn('Container ref is not available or not an HTMLElement')
      return
    }

    try {
      const element = containerRef.value
      
      // Ensure element has a style property
      if (!element.style) {
        console.warn('Element does not have a style property')
        return
      }
      
      // Apply fullscreen styles
      element.style.position = 'fixed'
      element.style.top = '0'
      element.style.left = '0'
      element.style.width = '100vw'
      element.style.height = '100vh'
      element.style.zIndex = '9999'
      element.style.margin = '0'
      element.style.borderRadius = '0'
      element.style.border = 'none'

      // Add fullscreen class
      element.classList.add('pipeline-fullscreen')
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      
      // Focus the container
      element.focus()
    } catch (error) {
      console.warn('Failed to apply fullscreen styles:', error)
    }
  }

  // Restore original styles
  const restoreOriginalStyles = () => {
    if (!containerRef.value || !(containerRef.value instanceof HTMLElement) || !originalStyles.value) {
      console.warn('Container ref or original styles not available')
      return
    }

    try {
      const element = containerRef.value
      const styles = originalStyles.value

      // Ensure element has a style property
      if (!element.style) {
        console.warn('Element does not have a style property')
        return
      }

      // Restore styles
      element.style.position = styles.position
      element.style.top = styles.top
      element.style.left = styles.left
      element.style.width = styles.width
      element.style.height = styles.height
      element.style.zIndex = styles.zIndex
      element.style.margin = styles.margin
      element.style.borderRadius = styles.borderRadius
      element.style.border = styles.border

      // Remove fullscreen class
      element.classList.remove('pipeline-fullscreen')
      
      // Restore body scroll
      document.body.style.overflow = ''
    } catch (error) {
      console.warn('Failed to restore original styles:', error)
    }
  }

  // Enter fullscreen
  const enterFullscreen = async () => {
    if (!containerRef.value || !(containerRef.value instanceof HTMLElement) || isFullscreen.value) {
      console.warn('Cannot enter fullscreen: container not available or already in fullscreen')
      return
    }

    try {
      saveOriginalStyles()
      
      // Try native fullscreen API first
      if (containerRef.value.requestFullscreen) {
        await containerRef.value.requestFullscreen()
      } else {
        // Fallback to custom fullscreen
        applyFullscreenStyles()
      }
      
      isFullscreen.value = true
      
      // Setup escape key handler
      escapeHandler.value = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          exitFullscreen()
        }
      }
      
      document.addEventListener('keydown', escapeHandler.value)
      
      // Listen for native fullscreen changes
      document.addEventListener('fullscreenchange', handleFullscreenChange)
      
    } catch (error) {
      console.warn('Failed to enter fullscreen:', error)
      // Fallback to custom fullscreen
      applyFullscreenStyles()
      isFullscreen.value = true
    }
  }

  // Exit fullscreen
  const exitFullscreen = async () => {
    if (!isFullscreen.value) return

    try {
      // Try native fullscreen API first
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        // Custom fullscreen exit
        restoreOriginalStyles()
      }
      
      isFullscreen.value = false
      
      // Remove escape key handler
      if (escapeHandler.value) {
        document.removeEventListener('keydown', escapeHandler.value)
        escapeHandler.value = null
      }
      
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      
    } catch (error) {
      console.warn('Failed to exit fullscreen:', error)
      // Fallback
      restoreOriginalStyles()
      isFullscreen.value = false
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    // Wait for container to be available if it's not ready yet
    if (!containerRef.value || !(containerRef.value instanceof HTMLElement)) {
      console.warn('Container not ready for fullscreen toggle')
      // Try to find the container in DOM if the ref isn't working
      const container = document.querySelector('.pipeline-container')
      if (container && container instanceof HTMLElement) {
        // Update the ref to point to the actual element
        containerRef.value = container
      } else {
        console.error('Could not find pipeline container element')
        return
      }
    }

    if (isFullscreen.value) {
      await exitFullscreen()
    } else {
      await enterFullscreen()
    }
  }

  // Handle native fullscreen changes
  const handleFullscreenChange = () => {
    const isNativeFullscreen = !!document.fullscreenElement
    
    if (!isNativeFullscreen && isFullscreen.value) {
      // Native fullscreen was exited
      isFullscreen.value = false
      restoreOriginalStyles()
      
      if (escapeHandler.value) {
        document.removeEventListener('keydown', escapeHandler.value)
        escapeHandler.value = null
      }
    }
  }

  // Handle viewport resize in fullscreen
  const handleViewportResize = () => {
    if (!isFullscreen.value || !containerRef.value || !(containerRef.value instanceof HTMLElement)) return
    
    // Ensure container takes full viewport
    nextTick(() => {
      if (containerRef.value && containerRef.value.style) {
        containerRef.value.style.width = '100vw'
        containerRef.value.style.height = '100vh'
      }
    })
  }

  // Setup resize listener
  onMounted(() => {
    window.addEventListener('resize', handleViewportResize)
  })

  // Cleanup
  onUnmounted(() => {
    if (isFullscreen.value) {
      exitFullscreen()
    }
    
    window.removeEventListener('resize', handleViewportResize)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    
    if (escapeHandler.value) {
      document.removeEventListener('keydown', escapeHandler.value)
    }
  })

  return {
    isFullscreen,
    canFullscreen,
    fullscreenClass,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen
  }
} 