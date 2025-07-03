<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Label } from '@/ui/label'
import { Button } from '@/ui/button'
import { Switch } from '@/ui/switch'
import { toast } from '@/ui/toast'
import { RotateCw, Palette } from 'lucide-vue-next'
import { useTheme } from '@/composables/theme'
import { useThemeColor, themeDefinitions, type ThemeColor } from '@/composables/theme'

const { setThemeMode, themeMode } = useTheme()
const { color: currentThemeColor, setColor: setThemeColor } = useThemeColor()

// Settings state
const currentTheme = ref('system')
const highContrast = ref(false)
const reducedMotion = ref(false)
const darkModeSchedule = ref(false)

// Theme options
const themeOptions = [
  { value: 'light', label: 'Light', description: 'Light theme' },
  { value: 'dark', label: 'Dark', description: 'Dark theme' },
  { value: 'system', label: 'System', description: 'Follow system preference' }
]

// Load settings from localStorage
const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('theme-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      currentTheme.value = settings.theme || 'system'
      highContrast.value = settings.highContrast ?? false
      reducedMotion.value = settings.reducedMotion ?? false
      darkModeSchedule.value = settings.darkModeSchedule ?? false
    } else {
      // Get current theme from the composable
      currentTheme.value = themeMode.value || 'system'
    }
  } catch (error) {
    console.error('Failed to load theme settings:', error)
  }
}

// Save settings to localStorage
const saveSettings = () => {
  const settings = {
    theme: currentTheme.value,
    highContrast: highContrast.value,
    reducedMotion: reducedMotion.value,
    darkModeSchedule: darkModeSchedule.value
  }
  
  localStorage.setItem('theme-settings', JSON.stringify(settings))
  
  // Apply theme change
  setThemeMode(currentTheme.value as any)
  
  // Apply accessibility settings
  if (reducedMotion.value) {
    document.documentElement.style.setProperty('--animation-duration', '0s')
  } else {
    document.documentElement.style.removeProperty('--animation-duration')
  }
  
  // Dispatch event to notify other parts of the app
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('theme-settings-changed', { detail: settings }))
  }
}

// Handle theme change
const handleThemeChange = (newTheme: string) => {
  currentTheme.value = newTheme
  saveSettings()
}

// Handle theme color change
const handleThemeColorChange = (color: ThemeColor) => {
  setThemeColor(color)
}

// Reset to defaults
const resetToDefaults = () => {
  currentTheme.value = 'system'
  highContrast.value = false
  reducedMotion.value = false
  darkModeSchedule.value = false
  setThemeColor('slate')
  
  saveSettings()
  
  toast({
    title: 'Settings Reset',
    description: 'Theme settings have been reset to defaults',
    variant: 'default'
  })
}

// Handle setting changes
const handleSettingChange = () => {
  saveSettings()
}

onMounted(() => {
  loadSettings()
})

// Expose methods for parent components
defineExpose({
  loadSettings,
  resetToDefaults
})
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <!-- Color Theme -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Palette class="h-5 w-5" />
          Color Theme
        </CardTitle>
        <CardDescription>Choose your preferred color scheme</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="grid grid-cols-3 gap-3">
            <div
              v-for="themeOption in themeOptions"
              :key="themeOption.value"
              :class="[
                'relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md',
                currentTheme === themeOption.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              ]"
              @click="handleThemeChange(themeOption.value)"
            >
              <div class="text-center">
                <div class="text-sm font-medium">{{ themeOption.label }}</div>
                <div class="text-xs text-muted-foreground mt-1">{{ themeOption.description }}</div>
              </div>
              <div v-if="currentTheme === themeOption.value" class="absolute top-2 right-2">
                <div class="w-2 h-2 bg-primary rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Theme Color -->
    <Card>
      <CardHeader>
        <CardTitle>Theme Color</CardTitle>
        <CardDescription>Choose your preferred theme color</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="grid grid-cols-7 gap-3">
            <div
              v-for="themeColor in themeDefinitions"
              :key="themeColor.value"
              :class="[
                'relative p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md',
                currentThemeColor === themeColor.value
                  ? 'border-primary'
                  : 'border-border hover:border-primary/50'
              ]"
              @click="handleThemeColorChange(themeColor.value as ThemeColor)"
            >
              <div class="text-center">
                <div 
                  class="w-6 h-6 rounded-full mx-auto mb-1 border border-border/20"
                  :style="{ backgroundColor: themeColor.color }"
                ></div>
                <div class="text-xs font-medium">{{ themeColor.label }}</div>
              </div>
              <div v-if="currentThemeColor === themeColor.value" class="absolute top-1 right-1">
                <div class="w-2 h-2 bg-primary rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Accessibility -->
    <Card>
      <CardHeader>
        <CardTitle>Accessibility</CardTitle>
        <CardDescription>Configure accessibility features</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>High Contrast</Label>
              <p class="text-sm text-muted-foreground">
                Increase contrast for better visibility
              </p>
            </div>
            <Switch
              v-model:checked="highContrast"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Reduce Motion</Label>
              <p class="text-sm text-muted-foreground">
                Minimize animations and transitions
              </p>
            </div>
            <Switch
              v-model:checked="reducedMotion"
              @update:checked="handleSettingChange"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Advanced Theme Settings -->
    <Card>
      <CardHeader>
        <CardTitle>Advanced</CardTitle>
        <CardDescription>Additional theme customization options</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Automatic Dark Mode Schedule</Label>
              <p class="text-sm text-muted-foreground">
                Switch to dark mode at sunset (requires location access)
              </p>
            </div>
            <Switch
              v-model:checked="darkModeSchedule"
              @update:checked="handleSettingChange"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Reset Section -->
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
        <CardDescription>Restore theme settings to their default values</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" @click="resetToDefaults" class="flex items-center gap-2">
          <RotateCw class="h-4 w-4" />
          Reset to Defaults
        </Button>
      </CardContent>
    </Card>
  </div>
</template> 