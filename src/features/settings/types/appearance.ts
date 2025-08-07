import type { ThemeColor } from '@/composables/theme'

export interface AppearanceSettings {
  // Theme
  theme: 'light' | 'dark' | 'system'
  themeColor: ThemeColor
  highContrast: boolean
  reducedMotion: boolean
  darkModeSchedule: boolean
  
  // Interface
  sidebarWidth: number
  sidebarPosition: 'left' | 'right'
  density: 'compact' | 'comfortable' | 'spacious'
  showStatusBar: boolean
  showMenuBar: boolean
  customCss: string
}

export const appearanceSettingsDefaults: AppearanceSettings = {
  theme: 'system',
  themeColor: 'slate' as ThemeColor,
  highContrast: false,
  reducedMotion: false,
  darkModeSchedule: false,
  sidebarWidth: 280,
  sidebarPosition: 'left',
  density: 'comfortable',
  showStatusBar: true,
  showMenuBar: true,
  customCss: ''
}
