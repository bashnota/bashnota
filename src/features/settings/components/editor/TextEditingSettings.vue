<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Label } from '@/ui/label'
import { Slider } from '@/ui/slider'
import { Switch } from '@/ui/switch'
import { toast } from '@/ui/toast'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { RotateCw, Eye, Palette } from 'lucide-vue-next'

// Apply text color to CSS custom properties
const applyTextColor = () => {
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
  
  // Apply the text colors by overriding the --foreground variable
  const isDarkMode = document.documentElement.classList.contains('dark')
  
  if (isDarkMode) {
    // Override dark mode foreground color
    const hslColor = hexToHsl(textColor.value)
    document.documentElement.style.setProperty('--foreground', hslColor)
  } else {
    // Override light mode foreground color
    const hslColor = hexToHsl(lightModeTextColor.value)
    document.documentElement.style.setProperty('--foreground', hslColor)
  }
}

// Settings state
const fontSize = ref([16])
const lineHeight = ref([1.6])
const textColor = ref('#ffffff')
const lightModeTextColor = ref('#000000')
const autoSave = ref(true)
const spellCheck = ref(true)
const wordWrap = ref(true)

// Load settings from localStorage
const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('editor-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      fontSize.value = [settings.fontSize?.[0] || 16]
      lineHeight.value = [settings.lineHeight?.[0] || 1.6]
      textColor.value = settings.textColor || '#e5e5e5'
      lightModeTextColor.value = settings.lightModeTextColor || '#1f1f1f'
      autoSave.value = settings.autoSave ?? true
      spellCheck.value = settings.spellCheck ?? true
      wordWrap.value = settings.wordWrap ?? true
    }
  } catch (error) {
    console.error('Failed to load editor settings:', error)
  }
}

// Save settings to localStorage
const saveSettings = () => {
  const settings = {
    fontSize: fontSize.value,
    lineHeight: lineHeight.value,
    textColor: textColor.value,
    lightModeTextColor: lightModeTextColor.value,
    autoSave: autoSave.value,
    spellCheck: spellCheck.value,
    wordWrap: wordWrap.value
  }
  
  localStorage.setItem('editor-settings', JSON.stringify(settings))
  
  // Apply text color to CSS variables
  applyTextColor()
  
  // Dispatch event to notify other parts of the app
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('editor-settings-changed', { detail: settings }))
  }
}

// Reset to defaults
const resetToDefaults = () => {
  fontSize.value = [16]
  lineHeight.value = [1.6]
  textColor.value = '#e5e5e5'
  lightModeTextColor.value = '#1f1f1f'
  autoSave.value = true
  spellCheck.value = true
  wordWrap.value = true
  
  saveSettings()
  
  toast({
    title: 'Settings Reset',
    description: 'Text editing settings have been reset to defaults',
    variant: 'default'
  })
}

// Watch for changes and auto-save
const handleSettingChange = () => {
  saveSettings()
}

onMounted(() => {
  loadSettings()
  applyTextColor()
  
  // Watch for theme mode changes (light/dark) to reapply text color
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        applyTextColor()
      }
    })
  })
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
  
  // Clean up observer on unmount
  const cleanup = () => observer.disconnect()
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup)
  }
})

// Expose methods for parent components
defineExpose({
  loadSettings,
  resetToDefaults
})
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <!-- Typography Settings -->
    <Card>
      <CardHeader>
        <CardTitle>Typography</CardTitle>
        <CardDescription>Configure text appearance and readability</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>Font Size ({{ fontSize[0] }}px)</Label>
            <Slider
              v-model="fontSize"
              :min="12"
              :max="24"
              :step="1"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              Adjust the font size for better readability
            </p>
          </div>
          
          <div class="space-y-2">
            <Label>Line Height ({{ lineHeight[0] }})</Label>
            <Slider
              v-model="lineHeight"
              :min="1.2"
              :max="2.5"
              :step="0.1"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              Control spacing between lines of text
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Text Color Settings -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Palette class="h-5 w-5" />
          Text Color
        </CardTitle>
        <CardDescription>Customize text colors for light and dark modes</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>Dark Mode Text Color</Label>
            <div class="flex items-center gap-3">
              <Input
                :value="textColor"
                type="color"
                class="w-16 h-10 p-1 rounded cursor-pointer"
                @input="(e: any) => { textColor = e.target.value; handleSettingChange() }"
              />
              <Input
                v-model="textColor"
                type="text"
                placeholder="#e5e5e5"
                class="flex-1 font-mono"
                @input="handleSettingChange"
              />
              <div 
                class="w-10 h-10 rounded border border-border"
                :style="{ backgroundColor: textColor }"
              ></div>
            </div>
            <p class="text-xs text-muted-foreground">
              Softer colors like #e5e5e5 or #d0d0d0 reduce eye strain in dark mode
            </p>
          </div>
          
          <div class="space-y-2">
            <Label>Light Mode Text Color</Label>
            <div class="flex items-center gap-3">
              <Input
                :value="lightModeTextColor"
                type="color"
                class="w-16 h-10 p-1 rounded cursor-pointer"
                @input="(e: any) => { lightModeTextColor = e.target.value; handleSettingChange() }"
              />
              <Input
                v-model="lightModeTextColor"
                type="text"
                placeholder="#1f1f1f"
                class="flex-1 font-mono"
                @input="handleSettingChange"
              />
              <div 
                class="w-10 h-10 rounded border border-border"
                :style="{ backgroundColor: lightModeTextColor }"
              ></div>
            </div>
            <p class="text-xs text-muted-foreground">
              Darker grays like #1f1f1f or #2f2f2f provide good contrast without harshness
            </p>
          </div>

          <!-- Quick Presets -->
          <div class="space-y-2">
            <Label>Quick Presets</Label>
            <div class="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                @click="() => { textColor = '#e5e5e5'; lightModeTextColor = '#1f1f1f'; handleSettingChange() }"
                class="flex items-center gap-2 justify-start"
              >
                <Eye class="h-4 w-4" />
                Eye-friendly
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                @click="() => { textColor = '#d0d0d0'; lightModeTextColor = '#2f2f2f'; handleSettingChange() }"
                class="flex items-center gap-2 justify-start"
              >
                <Eye class="h-4 w-4" />
                Extra soft
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                @click="() => { textColor = '#ffffff'; lightModeTextColor = '#000000'; handleSettingChange() }"
                class="flex items-center gap-2 justify-start"
              >
                <Palette class="h-4 w-4" />
                High contrast
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                @click="() => { textColor = '#cccccc'; lightModeTextColor = '#333333'; handleSettingChange() }"
                class="flex items-center gap-2 justify-start"
              >
                <Eye class="h-4 w-4" />
                Balanced
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Editing Behavior -->
    <Card>
      <CardHeader>
        <CardTitle>Editing Behavior</CardTitle>
        <CardDescription>Configure how the editor behaves during editing</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Auto Save</Label>
              <p class="text-sm text-muted-foreground">
                Automatically save changes as you type
              </p>
            </div>
            <Switch
              v-model:checked="autoSave"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Spell Check</Label>
              <p class="text-sm text-muted-foreground">
                Enable spell checking while typing
              </p>
            </div>
            <Switch
              v-model:checked="spellCheck"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Word Wrap</Label>
              <p class="text-sm text-muted-foreground">
                Wrap long lines to fit the editor width
              </p>
            </div>
            <Switch
              v-model:checked="wordWrap"
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
        <CardDescription>Restore text editing settings to their default values</CardDescription>
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