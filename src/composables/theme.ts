import { ref } from 'vue'

type Theme = 'light' | 'dark' | 'system'

const theme = ref<Theme>('system')

export function useTheme() {
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
    
    // Update the document attributes
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', systemTheme)
    } else {
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  }

  // Watch for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    if (theme.value === 'system') {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
    }
  })

  // Initialize theme
  setTheme(theme.value)

  return {
    theme,
    setTheme
  }
} 