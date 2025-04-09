import { ref, onMounted, onUnmounted, computed } from 'vue'

export interface TerminalState {
  isExpanded: boolean;
  isFullscreen: boolean;
  isCollapsed: boolean;
  displayMode: 'bottom' | 'side' | 'fullscreen' | 'right-nav';
}

export type TerminalMode = 'bottom' | 'side' | 'fullscreen' | 'right-nav';

export interface TerminalConfig {
  defaultCollapsed?: boolean;
  defaultMode?: TerminalMode;
}

/**
 * Composable for managing terminal states
 * Provides consistent handling of fullscreen, expanded, and collapsed modes
 */
export function useTerminalExpansion(config?: TerminalConfig) {
  const isExpanded = ref(!config?.defaultCollapsed)
  const isFullscreen = ref(false)
  const displayMode = ref<TerminalMode>(config?.defaultMode || 'bottom')
  
  // Computed value for collapsed based on expanded and fullscreen states
  const isCollapsed = computed(() => !isExpanded.value && !isFullscreen.value)

  // Terminal state as an object
  const terminalState = computed<TerminalState>(() => ({
    isExpanded: isExpanded.value,
    isFullscreen: isFullscreen.value,
    isCollapsed: isCollapsed.value,
    displayMode: displayMode.value
  }))

  // Computed classes based on terminal state
  const terminalClasses = computed(() => ({
    expanded: isExpanded.value && !isFullscreen.value,
    fullscreen: isFullscreen.value,
    collapsed: isCollapsed.value,
    'mode-bottom': displayMode.value === 'bottom',
    'mode-side': displayMode.value === 'side',
    'mode-fullscreen': displayMode.value === 'fullscreen',
    'mode-right-nav': displayMode.value === 'right-nav'
  }))

  /**
   * Toggle expanded state of terminal
   */
  const toggleExpand = () => {
    if (isFullscreen.value) {
      // If in fullscreen, exit fullscreen and enter expanded state
      isFullscreen.value = false
      isExpanded.value = true
    } else if (isExpanded.value) {
      // If expanded, collapse
      isExpanded.value = false
    } else {
      // If collapsed, expand
      isExpanded.value = true
    }
  }
  
  /**
   * Toggle fullscreen state of terminal
   */
  const toggleFullscreen = () => {
    displayMode.value = 'fullscreen'
    if (isFullscreen.value) {
      // If already in fullscreen, exit to expanded state
      isFullscreen.value = false
      isExpanded.value = true
      displayMode.value = 'bottom' // Return to default mode
    } else {
      // Enter fullscreen mode from any state
      isFullscreen.value = true
      // When entering fullscreen, set expanded to false (since fullscreen takes precedence)
      isExpanded.value = false
    }
  }

  /**
   * Set display mode for terminal (bottom, side, fullscreen)
   */
  const setDisplayMode = (mode: TerminalMode) => {
    displayMode.value = mode
    
    if (mode === 'fullscreen') {
      isFullscreen.value = true
      isExpanded.value = false
    } else {
      isFullscreen.value = false
      isExpanded.value = true
    }
  }
  
  /**
   * Apply visibility styles based on terminal state
   */
  const applyVisibilityStyles = () => {
    // Handle document body overflow based on fullscreen state
    if (isFullscreen.value) {
      document.body.style.overflow = 'hidden' // Prevent body scrolling in fullscreen
    } else {
      document.body.style.overflow = '' // Restore normal scrolling
    }

    // Base styles
    const styles: Record<string, any> = {
      opacity: isCollapsed.value ? '0.95' : '1',
      visibility: 'visible', // Always keep visible to prevent display issues
      display: isCollapsed.value ? 'flex' : 'block',
      zIndex: '1000', // Ensure high z-index to appear above other elements
    };

    // Apply position styles based on mode
    if (displayMode.value === 'side') {
      // Side mode - position on right side
      styles.position = 'fixed';
      styles.top = '0';
      styles.right = '0';
      styles.bottom = '0';
      styles.left = 'auto';
      styles.width = isCollapsed.value ? '40px' : '30%'; // Default width when expanded
      styles.height = '100vh';
      styles.borderLeft = '1px solid hsl(var(--border))';
      styles.borderTop = 'none';
    } else if (displayMode.value === 'right-nav') {
      // Right navigation button mode - slim sidebar on right
      styles.position = 'fixed';
      styles.top = '60px'; // Leave space for top navigation
      styles.right = '0';
      styles.bottom = '0';
      styles.left = 'auto';
      styles.width = isCollapsed.value ? '40px' : '300px'; // Narrow when expanded
      styles.height = 'calc(100vh - 60px)';
      styles.borderLeft = '1px solid hsl(var(--border))';
      styles.borderTop = 'none';
      styles.borderRadius = '8px 0 0 8px';
      styles.boxShadow = '-2px 0 10px rgba(0, 0, 0, 0.15)';
      styles.marginRight = isCollapsed.value ? '0' : '0';
    } else if (displayMode.value === 'fullscreen') {
      // Fullscreen mode
      styles.position = 'fixed';
      styles.top = '0';
      styles.right = '0';
      styles.bottom = '0';
      styles.left = '0';
      styles.width = '100%';
      styles.height = '100vh';
    } else {
      // Bottom mode (default)
      styles.position = 'fixed';
      styles.top = 'auto';
      styles.right = '0';
      styles.bottom = '0';
      styles.left = '0';
      styles.width = '100%';
      styles.height = isCollapsed.value ? '40px' : 'min(80vh, 500px)';
    }

    return styles;
  }
  
  // Keyboard shortcut handlers
  const handleKeydown = (event: KeyboardEvent) => {
    // ESC key to exit fullscreen
    if (event.key === 'Escape' && isFullscreen.value) {
      isFullscreen.value = false
      isExpanded.value = true // Revert to expanded state when exiting fullscreen
      displayMode.value = 'bottom' // Return to default mode
    }
    
    // CTRL+SHIFT+T to toggle terminal visibility (expanded/collapsed)
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
      event.preventDefault()
      toggleExpand()
    }
    
    // CTRL+SHIFT+F to toggle fullscreen
    if (event.ctrlKey && event.shiftKey && event.key === 'F') {
      event.preventDefault()
      toggleFullscreen()
    }
    
    // CTRL+SHIFT+S to toggle side mode
    if (event.ctrlKey && event.shiftKey && event.key === 'S') {
      event.preventDefault()
      setDisplayMode(displayMode.value === 'side' ? 'bottom' : 'side')
    }
  }

  // Set up keyboard listeners on component mount
  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  // Clean up keyboard listeners on component unmount
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    // Reset body overflow style when unmounting
    document.body.style.overflow = ''
  })

  // Collapse terminal method - always goes to collapsed state
  const collapseTerminal = () => {
    isExpanded.value = false
    isFullscreen.value = false
  }

  return {
    isExpanded,
    isFullscreen,
    isCollapsed,
    displayMode,
    terminalState,
    terminalClasses,
    toggleExpand,
    toggleFullscreen,
    collapseTerminal,
    setDisplayMode,
    applyVisibilityStyles
  }
} 