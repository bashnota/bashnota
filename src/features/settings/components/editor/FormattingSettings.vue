<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Label } from '@/ui/label'
import { Switch } from '@/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { toast } from '@/ui/toast'
import { Button } from '@/ui/button'
import { RotateCw, Type } from 'lucide-vue-next'

// Settings state
const autoFormat = ref(true)
const formatOnSave = ref(true)
const formatOnPaste = ref(false)
const trimTrailingWhitespace = ref(true)
const insertFinalNewline = ref(true)
const quotesStyle = ref('double')
const semicolons = ref('always')

// Options
const quotesOptions = [
  { value: 'double', label: 'Double Quotes ("...")' },
  { value: 'single', label: 'Single Quotes (\'...\')' }
]

const semicolonOptions = [
  { value: 'always', label: 'Always' },
  { value: 'never', label: 'Never' },
  { value: 'as-needed', label: 'As Needed' }
]

// Load settings from localStorage
const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('formatting-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      autoFormat.value = settings.autoFormat ?? true
      formatOnSave.value = settings.formatOnSave ?? true
      formatOnPaste.value = settings.formatOnPaste ?? false
      trimTrailingWhitespace.value = settings.trimTrailingWhitespace ?? true
      insertFinalNewline.value = settings.insertFinalNewline ?? true
      quotesStyle.value = settings.quotesStyle || 'double'
      semicolons.value = settings.semicolons || 'always'
    }
  } catch (error) {
    console.error('Failed to load formatting settings:', error)
  }
}

// Save settings to localStorage
const saveSettings = () => {
  const settings = {
    autoFormat: autoFormat.value,
    formatOnSave: formatOnSave.value,
    formatOnPaste: formatOnPaste.value,
    trimTrailingWhitespace: trimTrailingWhitespace.value,
    insertFinalNewline: insertFinalNewline.value,
    quotesStyle: quotesStyle.value,
    semicolons: semicolons.value
  }
  
  localStorage.setItem('formatting-settings', JSON.stringify(settings))
  
  // Dispatch event to notify other parts of the app
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('formatting-settings-changed', { detail: settings }))
  }
}

// Reset to defaults
const resetToDefaults = () => {
  autoFormat.value = true
  formatOnSave.value = true
  formatOnPaste.value = false
  trimTrailingWhitespace.value = true
  insertFinalNewline.value = true
  quotesStyle.value = 'double'
  semicolons.value = 'always'
  
  saveSettings()
  
  toast({
    title: 'Settings Reset',
    description: 'Formatting settings have been reset to defaults',
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
    <!-- Auto Formatting -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Type class="h-5 w-5" />
          Auto Formatting
        </CardTitle>
        <CardDescription>Configure when and how code is automatically formatted</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Auto Format</Label>
              <p class="text-sm text-muted-foreground">
                Enable automatic code formatting
              </p>
            </div>
            <Switch
              v-model:checked="autoFormat"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Format on Save</Label>
              <p class="text-sm text-muted-foreground">
                Automatically format code when saving files
              </p>
            </div>
            <Switch
              v-model:checked="formatOnSave"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Format on Paste</Label>
              <p class="text-sm text-muted-foreground">
                Automatically format pasted code
              </p>
            </div>
            <Switch
              v-model:checked="formatOnPaste"
              @update:checked="handleSettingChange"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Whitespace -->
    <Card>
      <CardHeader>
        <CardTitle>Whitespace</CardTitle>
        <CardDescription>Configure how whitespace is handled</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Trim Trailing Whitespace</Label>
              <p class="text-sm text-muted-foreground">
                Remove extra spaces at the end of lines
              </p>
            </div>
            <Switch
              v-model:checked="trimTrailingWhitespace"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Insert Final Newline</Label>
              <p class="text-sm text-muted-foreground">
                Ensure files end with a newline character
              </p>
            </div>
            <Switch
              v-model:checked="insertFinalNewline"
              @update:checked="handleSettingChange"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Style Preferences -->
    <Card>
      <CardHeader>
        <CardTitle>Style Preferences</CardTitle>
        <CardDescription>Configure code style preferences</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>Quotes Style</Label>
            <Select v-model="quotesStyle" @update:model-value="handleSettingChange">
              <SelectTrigger>
                <SelectValue placeholder="Select quotes style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in quotesOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Preferred style for string quotes
            </p>
          </div>
          
          <div class="space-y-2">
            <Label>Semicolons</Label>
            <Select v-model="semicolons" @update:model-value="handleSettingChange">
              <SelectTrigger>
                <SelectValue placeholder="Select semicolon preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in semicolonOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              When to use semicolons in code
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Reset Section -->
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
        <CardDescription>Restore formatting settings to their default values</CardDescription>
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