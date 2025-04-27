import { ref, watch, onMounted, computed, readonly } from 'vue'

// Define available themes
export type ThemeColor = 
  | 'slate' 
  | 'zinc' 
  | 'stone' 
  | 'gray' 
  | 'neutral' 
  | 'red' 
  | 'rose' 
  | 'orange' 
  | 'green' 
  | 'blue' 
  | 'yellow' 
  | 'violet'
  | 'purple'
  | 'indigo'

export type ThemeMode = 'light' | 'dark' | 'system'

// Dark mode intensity levels
export type DarkModeIntensity = 'soft' | 'medium' | 'deep' | 'black'

// Theme color definitions for display purposes
export const themeDefinitions = [
  { value: 'slate', label: 'Slate', color: 'hsl(222.2, 47.4%, 11.2%)' },
  { value: 'zinc', label: 'Zinc', color: 'hsl(240, 5.9%, 10%)' },
  { value: 'stone', label: 'Stone', color: 'hsl(20, 14.3%, 4.1%)' },
  { value: 'gray', label: 'Gray', color: 'hsl(220.9, 39.3%, 11%)' },
  { value: 'neutral', label: 'Neutral', color: 'hsl(0, 0%, 9%)' },
  { value: 'red', label: 'Red', color: 'hsl(0, 72.2%, 50.6%)' },
  { value: 'rose', label: 'Rose', color: 'hsl(346.8, 77.2%, 49.8%)' },
  { value: 'orange', label: 'Orange', color: 'hsl(24.6, 95%, 53.1%)' },
  { value: 'green', label: 'Green', color: 'hsl(142.1, 76.2%, 36.3%)' },
  { value: 'blue', label: 'Blue', color: 'hsl(221.2, 83.2%, 53.3%)' },
  { value: 'yellow', label: 'Yellow', color: 'hsl(47.9, 95.8%, 53.1%)' },
  { value: 'violet', label: 'Violet', color: 'hsl(262.1, 83.3%, 57.8%)' },
  { value: 'purple', label: 'Purple', color: 'hsl(272.9, 91.6%, 64.3%)' },
  { value: 'indigo', label: 'Indigo', color: 'hsl(243.4, 75.4%, 58.6%)' }
]

// Dark mode intensity definitions
export const darkModeIntensities = [
  { 
    value: 'soft', 
    label: 'Soft Dark',
    description: 'Gentle dark background with higher contrast'
  },
  { 
    value: 'medium', 
    label: 'Medium Dark',
    description: 'Standard dark mode background'
  },
  { 
    value: 'deep', 
    label: 'Deep Dark',
    description: 'Deeper dark background for low-light environments'
  },
  { 
    value: 'black', 
    label: 'True Black',
    description: 'OLED-optimized true black background'
  }
]

/**
 * Composable for managing color theme
 */
export function useThemeColor() {
  // Theme color state 
  const color = ref<ThemeColor>('slate')
  
  // Initialize on component mount
  onMounted(() => {
    // Load saved color preference from localStorage
    const savedColor = localStorage.getItem('theme-color') as ThemeColor
    if (savedColor) color.value = savedColor
    
    // Apply the theme color immediately
    applyThemeColor()
  })
  
  // Apply the current color theme to the document
  const applyThemeColor = () => {
    // Set the data-theme attribute for color theme
    document.documentElement.setAttribute('data-theme', color.value)
  }
  
  // Set theme color
  const setColor = (newColor: ThemeColor) => {
    color.value = newColor
    localStorage.setItem('theme-color', newColor)
    applyThemeColor()
  }
  
  // Watch for theme color changes to reapply
  watch(color, () => {
    applyThemeColor()
  })
  
  // Get theme definition for current color
  const currentThemeDefinition = computed(() => {
    return themeDefinitions.find(def => def.value === color.value) || themeDefinitions[0]
  })
  
  return {
    color: readonly(color),
    currentThemeDefinition,
    setColor,
    themeDefinitions: readonly(themeDefinitions)
  }
}

/**
 * Composable for managing dark mode and intensity
 */
export function useDarkMode() {
  // Dark mode state
  const mode = ref<ThemeMode>('system')
  const intensity = ref<DarkModeIntensity>('medium')
  const isDark = ref(false)
  
  // Current intensity description for display
  const currentIntensityDescription = computed(() => {
    const found = darkModeIntensities.find(i => i.value === intensity.value)
    return found ? found.description : darkModeIntensities[1].description
  })
  
  // Initialize on component mount
  onMounted(() => {
    // Load saved preferences from localStorage
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode
    const savedIntensity = localStorage.getItem('dark-intensity') as DarkModeIntensity
    
    if (savedMode) mode.value = savedMode
    if (savedIntensity) intensity.value = savedIntensity
    
    // Apply the dark mode immediately
    applyDarkMode()
    
    // Watch for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (mode.value === 'system') {
        applyDarkMode()
      }
    })
  })
  
  // Apply the current dark mode settings to the document
  const applyDarkMode = () => {
    // Determine if dark mode should be applied
    if (mode.value === 'system') {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      isDark.value = mode.value === 'dark'
    }
    
    // Apply dark/light class
    if (isDark.value) {
      document.documentElement.classList.add('dark')
      
      // First clean up all intensity classes to ensure a clean state
      document.documentElement.classList.remove('dark-soft', 'dark-medium', 'dark-deep', 'dark-black')
      
      // Then apply the selected intensity (skip for medium as it's the default)
      if (intensity.value !== 'medium') {
        document.documentElement.classList.add(`dark-${intensity.value}`)
      }
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.remove('dark-soft', 'dark-medium', 'dark-deep', 'dark-black')
    }
  }
  
  // Set theme mode
  const setMode = (newMode: ThemeMode) => {
    mode.value = newMode
    localStorage.setItem('theme-mode', newMode)
    applyDarkMode()
  }
  
  // Set dark mode intensity
  const setIntensity = (newIntensity: DarkModeIntensity) => {
    intensity.value = newIntensity
    localStorage.setItem('dark-intensity', newIntensity)
    applyDarkMode()
  }
  
  // Toggle between light/dark/system modes
  const toggleDarkMode = () => {
    if (mode.value === 'light') {
      setMode('dark')
    } else if (mode.value === 'dark') {
      setMode('system')
    } else {
      setMode('light')
    }
  }
  
  // Watch for dark mode or intensity changes to reapply
  watch([mode, intensity], () => {
    applyDarkMode()
  })
  
  return {
    mode: readonly(mode),
    intensity: readonly(intensity),
    isDark: readonly(isDark),
    currentIntensityDescription,
    darkModeIntensities: readonly(darkModeIntensities),
    setMode,
    setIntensity,
    toggleDarkMode
  }
}

/**
 * Combined theme composable that provides backward compatibility
 * while leveraging the separated color and dark mode composables
 */
export function useTheme() {
  const { 
    color: themeColor,
    setColor: setThemeColor,
    themeDefinitions
  } = useThemeColor()
  
  const { 
    mode: themeMode,
    intensity: darkIntensity,
    isDark,
    darkModeIntensities,
    currentIntensityDescription,
    setMode: setThemeMode,
    setIntensity: setDarkIntensity,
    toggleDarkMode
  } = useDarkMode()
  
  return {
    // Color theme properties
    themeColor,
    themeDefinitions,
    setThemeColor,
    
    // Dark mode properties
    themeMode,
    darkIntensity,
    isDark,
    darkModeIntensities,
    currentIntensityDescription,
    setThemeMode,
    setDarkIntensity,
    toggleDarkMode
  }
}