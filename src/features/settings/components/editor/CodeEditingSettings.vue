<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { RotateCw, Code } from 'lucide-vue-next'

// Settings state
const tabSize = ref([2])
const indentWithTabs = ref(false)
const showLineNumbers = ref(true)
const highlightCurrentLine = ref(true)
const showIndentGuides = ref(true)
const autoCloseBrackets = ref(true)
const codeTheme = ref('default')

// Theme options
const themeOptions = [
  { value: 'default', label: 'Default' },
  { value: 'github', label: 'GitHub' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'monokai', label: 'Monokai' },
  { value: 'solarized', label: 'Solarized' }
]

// Load settings from localStorage
const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('code-editor-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      tabSize.value = [settings.tabSize?.[0] || 2]
      indentWithTabs.value = settings.indentWithTabs ?? false
      showLineNumbers.value = settings.showLineNumbers ?? true
      highlightCurrentLine.value = settings.highlightCurrentLine ?? true
      showIndentGuides.value = settings.showIndentGuides ?? true
      autoCloseBrackets.value = settings.autoCloseBrackets ?? true
      codeTheme.value = settings.codeTheme || 'default'
    }
  } catch (error) {
    console.error('Failed to load code editor settings:', error)
  }
}

// Save settings to localStorage
const saveSettings = () => {
  const settings = {
    tabSize: tabSize.value,
    indentWithTabs: indentWithTabs.value,
    showLineNumbers: showLineNumbers.value,
    highlightCurrentLine: highlightCurrentLine.value,
    showIndentGuides: showIndentGuides.value,
    autoCloseBrackets: autoCloseBrackets.value,
    codeTheme: codeTheme.value
  }
  
  localStorage.setItem('code-editor-settings', JSON.stringify(settings))
  
  // Dispatch event to notify other parts of the app
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('code-editor-settings-changed', { detail: settings }))
  }
}

// Reset to defaults
const resetToDefaults = () => {
  tabSize.value = [2]
  indentWithTabs.value = false
  showLineNumbers.value = true
  highlightCurrentLine.value = true
  showIndentGuides.value = true
  autoCloseBrackets.value = true
  codeTheme.value = 'default'
  
  saveSettings()
  
  toast({
    title: 'Settings Reset',
    description: 'Code editing settings have been reset to defaults',
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
    <!-- Indentation Settings -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Code class="h-5 w-5" />
          Indentation
        </CardTitle>
        <CardDescription>Configure how code indentation works</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>Tab Size ({{ tabSize[0] }} spaces)</Label>
            <Slider
              v-model="tabSize"
              :min="1"
              :max="8"
              :step="1"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              Number of spaces per indentation level
            </p>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Use Tabs Instead of Spaces</Label>
              <p class="text-sm text-muted-foreground">
                Insert tab characters instead of spaces for indentation
              </p>
            </div>
            <Switch
              v-model:checked="indentWithTabs"
              @update:checked="handleSettingChange"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Display Settings -->
    <Card>
      <CardHeader>
        <CardTitle>Display</CardTitle>
        <CardDescription>Configure visual elements in the code editor</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Show Line Numbers</Label>
              <p class="text-sm text-muted-foreground">
                Display line numbers in the editor gutter
              </p>
            </div>
            <Switch
              v-model:checked="showLineNumbers"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Highlight Current Line</Label>
              <p class="text-sm text-muted-foreground">
                Highlight the line where the cursor is located
              </p>
            </div>
            <Switch
              v-model:checked="highlightCurrentLine"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Show Indent Guides</Label>
              <p class="text-sm text-muted-foreground">
                Display vertical lines to show indentation levels
              </p>
            </div>
            <Switch
              v-model:checked="showIndentGuides"
              @update:checked="handleSettingChange"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Code Assistance -->
    <Card>
      <CardHeader>
        <CardTitle>Code Assistance</CardTitle>
        <CardDescription>Features that help with code writing</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Auto Close Brackets</Label>
              <p class="text-sm text-muted-foreground">
                Automatically close brackets, parentheses, and quotes
              </p>
            </div>
            <Switch
              v-model:checked="autoCloseBrackets"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="space-y-2">
            <Label>Code Theme</Label>
            <Select v-model="codeTheme" @update:model-value="handleSettingChange">
              <SelectTrigger>
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="theme in themeOptions"
                  :key="theme.value"
                  :value="theme.value"
                >
                  {{ theme.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Color theme for syntax highlighting
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Reset Section -->
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
        <CardDescription>Restore code editing settings to their default values</CardDescription>
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