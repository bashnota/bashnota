<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Cpu } from 'lucide-vue-next'
import { Switch } from '@/ui/switch'
import { Label } from '@/ui/label'
import { Slider } from '@/ui/slider'
import { Badge } from '@/ui/badge'
import { Separator } from '@/ui/separator'
import { logger } from '@/services/logger'

// Code editing settings state
const codeEditingSettings = ref({
  tabSize: [2],
  dragHandleWidth: [24],
  indentWithTabs: false,
  autoSave: true,
})

// Settings management
const loadSettings = () => {
  const savedEditorSettings = localStorage.getItem('editor-settings')
  if (savedEditorSettings) {
    try {
      const allEditorSettings = JSON.parse(savedEditorSettings)
      // Extract only code editing relevant settings
      codeEditingSettings.value = {
        tabSize: allEditorSettings.tabSize || [2],
        dragHandleWidth: allEditorSettings.dragHandleWidth || [24],
        indentWithTabs: allEditorSettings.indentWithTabs ?? false,
        autoSave: allEditorSettings.autoSave ?? true,
      }
    } catch (e) {
      logger.error('Failed to parse saved code editing settings', e)
    }
  }
}

const saveCodeEditingSettings = () => {
  // Get existing editor settings and merge with code editing settings
  let existingSettings = {}
  try {
    const saved = localStorage.getItem('editor-settings')
    if (saved) {
      existingSettings = JSON.parse(saved)
    }
  } catch (e) {
    logger.error('Failed to parse existing editor settings', e)
  }
  
  const updatedSettings = {
    ...existingSettings,
    ...codeEditingSettings.value
  }
  
  localStorage.setItem('editor-settings', JSON.stringify(updatedSettings))
  
  // Apply settings immediately
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('editor-settings-changed', { 
      detail: updatedSettings 
    }))
  }
}

// Lifecycle
onMounted(() => {
  loadSettings()
})

// Expose settings for parent components if needed
defineExpose({
  codeEditingSettings,
  saveCodeEditingSettings,
  loadSettings
})
</script>

<template>
  <Card class="border-2 hover:border-primary/50 transition-all">
    <CardHeader class="bg-muted/50">
      <CardTitle class="flex items-center gap-2">
        <Cpu class="h-5 w-5 text-primary" />
        Code Editing
      </CardTitle>
      <CardDescription>Configure coding and formatting preferences</CardDescription>
    </CardHeader>
    <CardContent class="pt-6">
      <div class="space-y-6">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="tab-size">Tab Size</Label>
            <Badge variant="outline">{{ codeEditingSettings.tabSize[0] }} spaces</Badge>
          </div>
          <Slider 
            id="tab-size" 
            v-model="codeEditingSettings.tabSize" 
            :min="2" 
            :max="8" 
            :step="2" 
            class="flex-1"
            @update:modelValue="saveCodeEditingSettings"
          />
        </div>
        
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="drag-handle-width">Drag Handle Width</Label>
            <Badge variant="outline">{{ codeEditingSettings.dragHandleWidth[0] }}px</Badge>
          </div>
          <Slider 
            id="drag-handle-width" 
            v-model="codeEditingSettings.dragHandleWidth" 
            :min="16" 
            :max="40" 
            :step="2" 
            class="flex-1"
            @update:modelValue="saveCodeEditingSettings"
          />
        </div>
        
        <Separator />
        
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label for="indent-with-tabs">Indent with Tabs</Label>
            <p class="text-sm text-muted-foreground">Use tabs instead of spaces for indentation</p>
          </div>
          <Switch 
            id="indent-with-tabs" 
            v-model="codeEditingSettings.indentWithTabs" 
            @update:modelValue="saveCodeEditingSettings"
          />
        </div>
        
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label for="auto-save">Auto Save</Label>
            <p class="text-sm text-muted-foreground">Automatically save changes as you type</p>
          </div>
          <Switch 
            id="auto-save" 
            v-model="codeEditingSettings.autoSave" 
            @update:modelValue="saveCodeEditingSettings"
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








