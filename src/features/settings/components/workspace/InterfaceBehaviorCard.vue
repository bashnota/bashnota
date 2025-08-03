<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Settings } from 'lucide-vue-next'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { logger } from '@/services/logger'

// Interface settings state
const interfaceSettings = ref({
  sidebarWidth: [280],
  animationSpeed: [0.5],
  compactMode: false,
  showLineNumbers: true,
})

// Computed properties
const animationSpeedLabel = computed(() => {
  if (interfaceSettings.value.animationSpeed[0] < 0.3) return 'Slow'
  if (interfaceSettings.value.animationSpeed[0] > 0.7) return 'Fast'
  return 'Normal'
})

// Settings management
const loadSettings = () => {
  const savedInterfaceSettings = localStorage.getItem('interface-settings')
  if (savedInterfaceSettings) {
    try {
      interfaceSettings.value = { ...interfaceSettings.value, ...JSON.parse(savedInterfaceSettings) }
    } catch (e) {
      logger.error('Failed to parse saved interface settings', e)
    }
  }
}

const saveInterfaceSettings = () => {
  localStorage.setItem('interface-settings', JSON.stringify(interfaceSettings.value))
  
  // Apply settings immediately
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('interface-settings-changed', { 
      detail: interfaceSettings.value 
    }))
  }
}

// Lifecycle
onMounted(() => {
  loadSettings()
})

// Expose settings for parent components if needed
defineExpose({
  interfaceSettings,
  saveInterfaceSettings,
  loadSettings
})
</script>

<template>
  <Card class="border-2 hover:border-primary/50 transition-all">
    <CardHeader class="bg-muted/50">
      <CardTitle class="flex items-center gap-2">
        <Settings class="h-5 w-5 text-primary" />
        Interface Behavior
      </CardTitle>
      <CardDescription>Configure interface animations and interactions</CardDescription>
    </CardHeader>
    <CardContent class="pt-6">
      <div class="space-y-6">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="animation-speed">Animation Speed</Label>
            <Badge variant="outline">{{ animationSpeedLabel }}</Badge>
          </div>
          <Slider 
            id="animation-speed" 
            v-model="interfaceSettings.animationSpeed" 
            :min="0.1" 
            :max="2" 
            :step="0.1"
            @update:modelValue="saveInterfaceSettings"
          />
        </div>
        
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="sidebar-width">Sidebar Width</Label>
            <Badge variant="outline">{{ interfaceSettings.sidebarWidth[0] }}px</Badge>
          </div>
          <Slider 
            id="sidebar-width" 
            v-model="interfaceSettings.sidebarWidth" 
            :min="200" 
            :max="400" 
            :step="10"
            @update:modelValue="saveInterfaceSettings"
          />
        </div>
        
        <Separator />
        
        <div class="flex items-center justify-between pt-2">
          <div class="space-y-0.5">
            <Label for="compact-mode">Compact Mode</Label>
            <p class="text-sm text-muted-foreground">Reduce spacing for more content</p>
          </div>
          <Switch 
            id="compact-mode" 
            v-model="interfaceSettings.compactMode" 
            @update:modelValue="saveInterfaceSettings"
          />
        </div>

        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label for="show-line-numbers">Show Line Numbers</Label>
            <p class="text-sm text-muted-foreground">Display line numbers in code blocks</p>
          </div>
          <Switch 
            id="show-line-numbers" 
            v-model="interfaceSettings.showLineNumbers" 
            @update:modelValue="saveInterfaceSettings"
          />
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.card {
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style> 








