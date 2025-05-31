<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Code2 } from 'lucide-vue-next'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { logger } from '@/services/logger'

// Editor settings state (text-specific)
const textEditingSettings = ref({
  fontSize: [16],
  lineHeight: [1.6],
  wordWrap: true,
  spellCheck: true,
})

// Settings management
const loadSettings = () => {
  const savedEditorSettings = localStorage.getItem('editor-settings')
  if (savedEditorSettings) {
    try {
      const allEditorSettings = JSON.parse(savedEditorSettings)
      // Extract only text editing relevant settings
      textEditingSettings.value = {
        fontSize: allEditorSettings.fontSize || [16],
        lineHeight: allEditorSettings.lineHeight || [1.6],
        wordWrap: allEditorSettings.wordWrap ?? true,
        spellCheck: allEditorSettings.spellCheck ?? true,
      }
    } catch (e) {
      logger.error('Failed to parse saved text editing settings', e)
    }
  }
}

const saveTextEditingSettings = () => {
  // Get existing editor settings and merge with text editing settings
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
    ...textEditingSettings.value
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
  textEditingSettings,
  saveTextEditingSettings,
  loadSettings
})
</script>

<template>
  <Card class="border-2 hover:border-primary/50 transition-all">
    <CardHeader class="bg-muted/50">
      <CardTitle class="flex items-center gap-2">
        <Code2 class="h-5 w-5 text-primary" />
        Text Editing
      </CardTitle>
      <CardDescription>Configure text editing and display preferences</CardDescription>
    </CardHeader>
    <CardContent class="pt-6">
      <div class="space-y-6">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="font-size">Font Size</Label>
            <Badge variant="outline">{{ textEditingSettings.fontSize[0] }}px</Badge>
          </div>
          <Slider 
            id="font-size" 
            v-model="textEditingSettings.fontSize" 
            :min="12" 
            :max="24" 
            :step="1" 
            class="flex-1"
            @update:modelValue="saveTextEditingSettings"
          />
        </div>
        
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="line-height">Line Height</Label>
            <Badge variant="outline">{{ textEditingSettings.lineHeight[0] }}</Badge>
          </div>
          <Slider 
            id="line-height" 
            v-model="textEditingSettings.lineHeight" 
            :min="1" 
            :max="2" 
            :step="0.1" 
            class="flex-1"
            @update:modelValue="saveTextEditingSettings"
          />
        </div>
        
        <Separator />
        
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label for="word-wrap">Word Wrap</Label>
            <p class="text-sm text-muted-foreground">Wrap text to fit the editor width</p>
          </div>
          <Switch 
            id="word-wrap" 
            v-model="textEditingSettings.wordWrap" 
            @update:modelValue="saveTextEditingSettings"
          />
        </div>
        
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label for="spell-check">Spell Check</Label>
            <p class="text-sm text-muted-foreground">Enable spell checking in the editor</p>
          </div>
          <Switch 
            id="spell-check" 
            v-model="textEditingSettings.spellCheck" 
            @update:modelValue="saveTextEditingSettings"
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