<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Label } from '@/ui/label'
import { Slider } from '@/ui/slider'
import { Switch } from '@/ui/switch'
import { toast } from '@/ui/toast'
import { Button } from '@/ui/button'
import { RotateCw } from 'lucide-vue-next'

// Settings state
const fontSize = ref([16])
const lineHeight = ref([1.6])
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
    autoSave: autoSave.value,
    spellCheck: spellCheck.value,
    wordWrap: wordWrap.value
  }
  
  localStorage.setItem('editor-settings', JSON.stringify(settings))
  
  // Dispatch event to notify other parts of the app
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('editor-settings-changed', { detail: settings }))
  }
}

// Reset to defaults
const resetToDefaults = () => {
  fontSize.value = [16]
  lineHeight.value = [1.6]
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