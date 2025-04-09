import { ref } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { vibeUIService } from '@/services/vibe/VibeUIService'

/**
 * Composable for handling terminal resize functionality
 * @param terminalWidth The computed terminal width from service state
 * @returns Object with resize methods
 */
export function useTerminalResize(terminalWidth: ComputedRef<number>) {
  // Local state for resize functionality
  let isResizing = false
  let startX = 0
  let startWidth = 0

  /**
   * Start resizing the terminal
   * @param event The mouse down event
   */
  const startResize = (event: MouseEvent) => {
    isResizing = true
    startX = event.clientX
    startWidth = terminalWidth.value
    
    // Add event listeners
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)
    
    // Apply cursor style to entire document during resize
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none' // Prevent text selection during resize
  }

  /**
   * Handle mouse movement during resize
   * @param event The mouse move event
   */
  const handleResize = (event: MouseEvent) => {
    if (!isResizing) return
    
    // Calculate new width (resize from left side)
    const newWidth = startWidth - (event.clientX - startX)
    
    // Update width in service
    vibeUIService.setWidth(newWidth)
  }

  /**
   * Stop resizing the terminal
   */
  const stopResize = () => {
    isResizing = false
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
    
    // Reset cursor style
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  return {
    startResize,
    handleResize,
    stopResize
  }
} 