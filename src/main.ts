import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'
import '@fontsource/fira-code/latin-400.css'
import '@fontsource/fira-code/latin-500.css'
import './assets/index.css'
import App from './App.vue'
import router from './router'

// Text color initialization utility
const initializeTextColors = () => {
  // Convert hex color to HSL values for CSS variables
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const diff = max - min
    const sum = max + min
    const l = sum / 2
    
    let h, s
    if (diff === 0) {
      h = s = 0
    } else {
      s = l > 0.5 ? diff / (2 - sum) : diff / sum
      switch (max) {
        case r: h = (g - b) / diff + (g < b ? 6 : 0); break
        case g: h = (b - r) / diff + 2; break
        case b: h = (r - g) / diff + 4; break
        default: h = 0
      }
      h /= 6
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  }

  // Load saved text color settings
  try {
    const savedSettings = localStorage.getItem('editor-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      const darkModeTextColor = settings.textColor || '#e5e5e5'
      const lightModeTextColor = settings.lightModeTextColor || '#1f1f1f'
      
      // Apply the appropriate color based on current theme
      const isDarkMode = document.documentElement.classList.contains('dark')
      const currentColor = isDarkMode ? darkModeTextColor : lightModeTextColor
      const hslColor = hexToHsl(currentColor)
      
      document.documentElement.style.setProperty('--foreground', hslColor)
    }
  } catch (error) {
    console.error('Failed to load text color settings:', error)
  }
}

// Import core stores to ensure they're registered
import '@/features/ai/stores/aiSettingsStore'
import '@/features/jupyter/stores/jupyterStore'

// Initialize new storage system
import { initializeDatabaseAdapter } from './services/databaseAdapter'
import { initializeSettingsAdapter } from './services/settingsAdapter'
import { useFeatureFlags } from './composables/useFeatureFlags'
import {
  beginStorageAuthorityResolution,
  reportStorageAuthorityFailure,
  reportStorageAuthorityReady,
} from './services/storageAuthority'

const app = createApp(App)
const pinia = createPinia()
const head = createHead()

app.use(pinia)
app.use(router)
app.use(head)

// Initialize database adapter based on feature flag and storage mode
const { useNewStorage, useConsolidatedSettings } = useFeatureFlags()

// Load storage mode preference
let preferredBackend: 'indexeddb' | 'filesystem' | undefined
try {
  const storageModeConfig = localStorage.getItem('bashnota-storage-mode')
  if (storageModeConfig) {
    const config = JSON.parse(storageModeConfig)
    preferredBackend = config.mode
  }
} catch (error) {
  console.error('[Storage] Failed to load storage mode preference:', error)
}

// Publish the unresolved boundary synchronously, before bootstrap yields to
// any adapter import or persisted-handle permission check.
beginStorageAuthorityResolution(preferredBackend)

async function bootstrap(): Promise<void> {
  // Resolve the one authoritative backend before any route or store can read
  // or mutate nota data.
  const shouldUseNewStorage = useNewStorage.value || preferredBackend === 'filesystem'
  try {
    const adapter = await initializeDatabaseAdapter(shouldUseNewStorage, preferredBackend)
    const actualBackend = adapter.getStorageService().getBackendType()
    app.provide('dbAdapter', adapter)
    reportStorageAuthorityReady(preferredBackend, actualBackend)
    console.log('[Storage] Database adapter initialized:', {
      usingNewStorage: adapter.isUsingNewStorage(),
      backend: actualBackend,
    })
  } catch (error) {
    console.error('[Storage] Failed to initialize database adapter:', error)
    reportStorageAuthorityFailure(preferredBackend, error)
  }

  try {
    const settingsAdapter = await initializeSettingsAdapter(useConsolidatedSettings.value)
    app.provide('settingsAdapter', settingsAdapter)
  } catch (error) {
    console.error('[Settings] Failed to initialize settings adapter:', error)
  }

  app.mount('#app')
  window.setTimeout(initializeTextColors, 100)
}

void bootstrap()

// Watch for theme changes and reapply text colors
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      // Re-apply text colors when theme changes
      setTimeout(initializeTextColors, 10) // Small delay to ensure theme is fully applied
    }
  })
})

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['class']
})
