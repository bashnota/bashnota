<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { RotateCw, Layout } from 'lucide-vue-next'

// Settings state
const sidebarWidth = ref([280])
const animationSpeed = ref([0.5])
const compactMode = ref(false)
const showLineNumbers = ref(true)
const showStatusBar = ref(true)
const showMinimap = ref(false)
const enableBreadcrumbs = ref(true)
const sidebarPosition = ref('left')

// Load settings from localStorage
const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('interface-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      sidebarWidth.value = [settings.sidebarWidth?.[0] || 280]
      animationSpeed.value = [settings.animationSpeed?.[0] || 0.5]
      compactMode.value = settings.compactMode ?? false
      showLineNumbers.value = settings.showLineNumbers ?? true
      showStatusBar.value = settings.showStatusBar ?? true
      showMinimap.value = settings.showMinimap ?? false
      enableBreadcrumbs.value = settings.enableBreadcrumbs ?? true
      sidebarPosition.value = settings.sidebarPosition || 'left'
    }
  } catch (error) {
    console.error('Failed to load interface settings:', error)
  }
}

// Save settings to localStorage
const saveSettings = () => {
  const settings = {
    sidebarWidth: sidebarWidth.value,
    animationSpeed: animationSpeed.value,
    compactMode: compactMode.value,
    showLineNumbers: showLineNumbers.value,
    showStatusBar: showStatusBar.value,
    showMinimap: showMinimap.value,
    enableBreadcrumbs: enableBreadcrumbs.value,
    sidebarPosition: sidebarPosition.value
  }
  
  localStorage.setItem('interface-settings', JSON.stringify(settings))
  
  // Dispatch event to notify other parts of the app
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('interface-settings-changed', { detail: settings }))
  }
}

// Reset to defaults
const resetToDefaults = () => {
  sidebarWidth.value = [280]
  animationSpeed.value = [0.5]
  compactMode.value = false
  showLineNumbers.value = true
  showStatusBar.value = true
  showMinimap.value = false
  enableBreadcrumbs.value = true
  sidebarPosition.value = 'left'
  
  saveSettings()
  
  toast({
    title: 'Settings Reset',
    description: 'Interface settings have been reset to defaults',
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
    <!-- Layout -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Layout class="h-5 w-5" />
          Layout
        </CardTitle>
        <CardDescription>Configure the overall layout and spacing</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>Sidebar Width ({{ sidebarWidth[0] }}px)</Label>
            <Slider
              v-model="sidebarWidth"
              :min="200"
              :max="400"
              :step="10"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              Adjust the width of the sidebar panels
            </p>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Compact Mode</Label>
              <p class="text-sm text-muted-foreground">
                Use smaller padding and margins for a more compact interface
              </p>
            </div>
            <Switch
              v-model:checked="compactMode"
              @update:checked="handleSettingChange"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Animations -->
    <Card>
      <CardHeader>
        <CardTitle>Animations</CardTitle>
        <CardDescription>Control interface animations and transitions</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>Animation Speed ({{ animationSpeed[0] }}x)</Label>
            <Slider
              v-model="animationSpeed"
              :min="0.1"
              :max="2.0"
              :step="0.1"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              Control the speed of interface animations
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Visual Elements -->
    <Card>
      <CardHeader>
        <CardTitle>Visual Elements</CardTitle>
        <CardDescription>Show or hide various interface elements</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Show Line Numbers</Label>
              <p class="text-sm text-muted-foreground">
                Display line numbers in the editor
              </p>
            </div>
            <Switch
              v-model:checked="showLineNumbers"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Show Status Bar</Label>
              <p class="text-sm text-muted-foreground">
                Display the status bar at the bottom of the interface
              </p>
            </div>
            <Switch
              v-model:checked="showStatusBar"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Show Minimap</Label>
              <p class="text-sm text-muted-foreground">
                Display a miniature overview of the current document
              </p>
            </div>
            <Switch
              v-model:checked="showMinimap"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Enable Breadcrumbs</Label>
              <p class="text-sm text-muted-foreground">
                Show navigation breadcrumbs for better orientation
              </p>
            </div>
            <Switch
              v-model:checked="enableBreadcrumbs"
              @update:checked="handleSettingChange"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Sidebar Position -->
    <Card>
      <CardHeader>
        <CardTitle>Sidebar Position</CardTitle>
        <CardDescription>Choose where the sidebar appears</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div
              :class="[
                'relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md text-center',
                sidebarPosition === 'left'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              ]"
              @click="sidebarPosition = 'left'; handleSettingChange()"
            >
              <div class="text-sm font-medium">Left</div>
              <div class="text-xs text-muted-foreground mt-1">Sidebar on the left</div>
              <div v-if="sidebarPosition === 'left'" class="absolute top-2 right-2">
                <div class="w-2 h-2 bg-primary rounded-full"></div>
              </div>
            </div>
            
            <div
              :class="[
                'relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md text-center',
                sidebarPosition === 'right'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              ]"
              @click="sidebarPosition = 'right'; handleSettingChange()"
            >
              <div class="text-sm font-medium">Right</div>
              <div class="text-xs text-muted-foreground mt-1">Sidebar on the right</div>
              <div v-if="sidebarPosition === 'right'" class="absolute top-2 right-2">
                <div class="w-2 h-2 bg-primary rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Reset Section -->
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
        <CardDescription>Restore interface settings to their default values</CardDescription>
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