import { ref, watch, onMounted } from 'vue'
import { onKeyStroke } from '@vueuse/core'

export interface UseSidebarOptions {
  initialState?: boolean
  storageKey?: string
  keyboard?: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    key: string
  }
  onToggle?: (isOpen: boolean) => void
}

export function useSidebar(options: UseSidebarOptions = {}) {
  const {
    initialState = false,
    storageKey,
    keyboard,
    onToggle
  } = options

  const isOpen = ref(initialState)

  // Set up keyboard shortcut for toggling sidebar
  if (keyboard) {
    onKeyStroke(keyboard.key, (e) => {
      if (
        (!keyboard.ctrl || e.ctrlKey) &&
        (!keyboard.shift || e.shiftKey) &&
        (!keyboard.alt || e.altKey)
      ) {
        e.preventDefault()
        toggle()
      }
    })
  }

  // Load state from local storage if a storage key is provided
  onMounted(() => {
    if (storageKey) {
      try {
        const savedState = localStorage.getItem(storageKey)
        if (savedState !== null) {
          isOpen.value = JSON.parse(savedState)
        }
      } catch (error) {
        console.error(`Failed to load sidebar state for ${storageKey}:`, error)
      }
    }
  })

  // Save state to local storage when it changes
  watch(isOpen, (newValue) => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newValue))
      } catch (error) {
        console.error(`Failed to save sidebar state for ${storageKey}:`, error)
      }
    }

    if (onToggle) {
      onToggle(newValue)
    }
  })

  // Toggle sidebar visibility
  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  const open = () => {
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
  }

  return {
    isOpen,
    toggle,
    open,
    close
  }
}








