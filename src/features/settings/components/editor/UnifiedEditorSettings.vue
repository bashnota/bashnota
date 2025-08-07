<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { RotateCw, Type, FileText, Code2, Settings as SettingsIcon, Eye, Palette, RotateCcw } from 'lucide-vue-next'
import { useSettings } from '@/composables/useSettings'
import { toast } from 'vue-sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'

// Base components
import SettingSection from '@/features/settings/components/base/SettingSection.vue'
import SettingGroup from '@/features/settings/components/base/SettingGroup.vue'
import SettingSwitch from '@/features/settings/components/base/SettingSwitch.vue'
import SettingSlider from '@/features/settings/components/base/SettingSlider.vue'
import SettingSelect from '@/features/settings/components/base/SettingSelect.vue'

const { settings, updateSetting, resetToDefaults, hasUnsavedChanges } = useSettings('editor')

// Local state
const activeTab = ref('text-editing')

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
    const hslColor = hexToHsl(settings.value.textColor)
    document.documentElement.style.setProperty('--foreground', hslColor)
  } else {
    // Override light mode foreground color
    const hslColor = hexToHsl(settings.value.lightModeTextColor)
    document.documentElement.style.setProperty('--foreground', hslColor)
  }
}

// Handle setting changes with automatic saving
const handleSettingChange = () => {
  // Settings are automatically saved by the store
  applyTextColor()
  
  // Dispatch event to notify other parts of the app
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('editor-settings-changed', { detail: settings.value }))
  }
}

// Enhanced reset function
const handleResetToDefaults = () => {
  resetToDefaults()
  applyTextColor()
}

// Options
const themeOptions = [
  { value: 'vs-dark', label: 'Dark', description: 'Dark theme for code editing' },
  { value: 'vs-light', label: 'Light', description: 'Light theme for code editing' },
  { value: 'monokai', label: 'Monokai', description: 'Popular dark theme with vibrant colors' }
]

const indentTypeOptions = [
  { value: 'spaces', label: 'Spaces', description: 'Use spaces for indentation' },
  { value: 'tabs', label: 'Tabs', description: 'Use tabs for indentation' }
]

// Color preset methods
const applyColorPreset = (darkColor: string, lightColor: string) => {
  updateSetting('textColor', darkColor)
  updateSetting('lightModeTextColor', lightColor)
  handleSettingChange()
}

// Watch for text color changes to apply them immediately
watch([() => settings.value.textColor, () => settings.value.lightModeTextColor], () => {
  applyTextColor()
}, { immediate: true })

onMounted(() => {
  // Apply initial text color
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
})
</script>

<template>
  <div class="space-y-6">
    <SettingSection
      title="Editor Settings"
      description="Configure text editing, code editing, and formatting preferences"
      :icon="FileText"
    >
      <!-- Overview Stats -->
      <SettingGroup title="Quick Overview" description="Current editor configuration">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-muted/50 rounded-lg">
            <div class="text-2xl font-bold text-primary">{{ settings.fontSize[0] }}px</div>
            <div class="text-sm text-muted-foreground">Font Size</div>
          </div>
          <div class="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ settings.lineHeight[0] }}</div>
            <div class="text-sm text-muted-foreground">Line Height</div>
          </div>
          <div class="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{ settings.tabSize[0] }}</div>
            <div class="text-sm text-muted-foreground">Tab Size</div>
          </div>
          <div class="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <div class="text-2xl font-bold text-purple-600">{{ settings.autoSave ? 'ON' : 'OFF' }}</div>
            <div class="text-sm text-muted-foreground">Auto Save</div>
          </div>
        </div>
      </SettingGroup>
    </SettingSection>

    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-4">
        <TabsTrigger value="text-editing">
          <Type class="mr-2 h-4 w-4" />
          Text Editing
        </TabsTrigger>
        <TabsTrigger value="code-editing">
          <Code2 class="mr-2 h-4 w-4" />
          Code Editing
        </TabsTrigger>
        <TabsTrigger value="formatting">
          <SettingsIcon class="mr-2 h-4 w-4" />
          Formatting
        </TabsTrigger>
        <TabsTrigger value="appearance">
          <Palette class="mr-2 h-4 w-4" />
          Appearance
        </TabsTrigger>
      </TabsList>

      <!-- Text Editing Tab -->
      <TabsContent value="text-editing">
        <SettingSection
          title="Text Editing"
          description="Basic text editing preferences and behavior"
          :icon="Type"
        >
          <SettingGroup title="Typography" description="Text appearance and readability">
        <SettingSlider
          label="Font Size"
              :description="`Current size: ${settings.fontSize[0]}px`"
              help="Adjust the font size for better readability"
          :model-value="settings.fontSize"
              :min="12"
          :max="24"
              @update:model-value="(value) => { updateSetting('fontSize', value); handleSettingChange() }"
        />
        
        <SettingSlider
          label="Line Height"
              :description="`Current height: ${settings.lineHeight[0]}`"
              help="Control spacing between lines of text"
          :model-value="settings.lineHeight"
              :min="1.2"
              :max="2.5"
          :step="0.1"
              @update:model-value="(value) => { updateSetting('lineHeight', value); handleSettingChange() }"
        />
      </SettingGroup>
      
          <SettingGroup title="Editing Behavior" description="How the editor behaves during editing">
        <SettingSwitch
          label="Auto Save"
              description="Automatically save changes as you type"
              help="Reduces risk of losing work"
          :model-value="settings.autoSave"
              @update:model-value="(value) => { updateSetting('autoSave', value); handleSettingChange() }"
        />
        
        <SettingSwitch
          label="Spell Check"
              description="Enable spell checking while typing"
              help="Helps catch spelling errors in real-time"
          :model-value="settings.spellCheck"
              @update:model-value="(value) => { updateSetting('spellCheck', value); handleSettingChange() }"
        />
        
        <SettingSwitch
          label="Word Wrap"
          description="Wrap long lines to fit the editor width"
              help="Prevents horizontal scrolling"
          :model-value="settings.wordWrap"
              @update:model-value="(value) => { updateSetting('wordWrap', value); handleSettingChange() }"
        />
      </SettingGroup>
    </SettingSection>
      </TabsContent>

      <!-- Code Editing Tab -->
      <TabsContent value="code-editing">
    <SettingSection
      title="Code Editing"
          description="Specialized settings for code editing and programming"
      :icon="Code2"
    >
          <SettingGroup title="Code Appearance" description="Visual settings for code blocks">
        <SettingSelect
          label="Code Theme"
          description="Color theme for code syntax highlighting"
              help="Different themes provide various color schemes for better code readability"
          :model-value="settings.codeTheme"
              :options="themeOptions"
              @update:model-value="(value) => { updateSetting('codeTheme', String(value)); handleSettingChange() }"
        />
        
        <SettingSlider
          label="Code Font Size"
              :description="`Current size: ${settings.codeFontSize[0]}px`"
              help="Font size specifically for code blocks"
          :model-value="settings.codeFontSize"
              :min="10"
          :max="20"
              @update:model-value="(value) => { updateSetting('codeFontSize', value); handleSettingChange() }"
        />
        
        <SettingSlider
          label="Code Line Height"
              :description="`Current height: ${settings.codeLineHeight[0]}`"
              help="Line spacing for code blocks"
          :model-value="settings.codeLineHeight"
              :min="1.2"
          :max="2.0"
          :step="0.1"
              @update:model-value="(value) => { updateSetting('codeLineHeight', value); handleSettingChange() }"
        />
      </SettingGroup>
      
          <SettingGroup title="Code Features" description="Programming assistance and visual aids">
        <SettingSwitch
          label="Show Line Numbers"
          description="Display line numbers in code blocks"
              help="Helps with debugging and code navigation"
          :model-value="settings.showLineNumbers"
              @update:model-value="(value) => { updateSetting('showLineNumbers', value); handleSettingChange() }"
        />
        
        <SettingSwitch
          label="Highlight Active Line"
              description="Highlight the line where the cursor is located"
              help="Makes it easier to track cursor position"
          :model-value="settings.highlightActiveLine"
              @update:model-value="(value) => { updateSetting('highlightActiveLine', value); handleSettingChange() }"
        />
        
        <SettingSwitch
          label="Auto Close Brackets"
          description="Automatically close brackets, quotes, and parentheses"
              help="Speeds up coding and reduces syntax errors"
          :model-value="settings.autoCloseBrackets"
              @update:model-value="(value) => { updateSetting('autoCloseBrackets', value); handleSettingChange() }"
        />
        
        <SettingSwitch
          label="Auto Indent"
          description="Automatically indent new lines based on context"
              help="Maintains consistent code structure"
          :model-value="settings.autoIndent"
              @update:model-value="(value) => { updateSetting('autoIndent', value); handleSettingChange() }"
        />
      </SettingGroup>
      
          <SettingGroup title="Indentation" description="Configure how indentation works">
        <SettingSelect
          label="Indent Type"
          description="Use spaces or tabs for indentation"
              help="Choose based on your project's coding standards"
          :model-value="settings.indentType"
          :options="indentTypeOptions"
              @update:model-value="(value) => { updateSetting('indentType', value as 'spaces' | 'tabs'); handleSettingChange() }"
        />
        
        <SettingSlider
          label="Tab Size"
              :description="`Current size: ${settings.tabSize[0]} ${settings.indentType}`"
              help="Number of spaces or width of tab character"
          :model-value="settings.tabSize"
              :min="2"
          :max="8"
              @update:model-value="(value) => { updateSetting('tabSize', value); handleSettingChange() }"
        />
        
        <SettingSlider
          label="Indent Size"
              :description="`Current size: ${settings.indentSize[0]} spaces`"
              help="Number of spaces for each indentation level"
          :model-value="settings.indentSize"
              :min="2"
          :max="8"
              @update:model-value="(value) => { updateSetting('indentSize', value); handleSettingChange() }"
        />
      </SettingGroup>
    </SettingSection>
      </TabsContent>

      <!-- Formatting Tab -->
      <TabsContent value="formatting">
    <SettingSection
      title="Formatting"
          description="Automatic formatting and cleanup settings"
          :icon="SettingsIcon"
    >
          <SettingGroup title="Auto Formatting" description="Automatic code and text formatting">
        <SettingSwitch
          label="Auto Format"
              description="Automatically format code while typing"
              help="Maintains consistent code style as you write"
          :model-value="settings.autoFormat"
              @update:model-value="(value) => { updateSetting('autoFormat', value); handleSettingChange() }"
        />
        
        <SettingSwitch
              label="Format on Save"
              description="Automatically format code when saving"
              help="Ensures consistent formatting before saving"
          :model-value="settings.formatOnSave"
              @update:model-value="(value) => { updateSetting('formatOnSave', value); handleSettingChange() }"
        />
      </SettingGroup>
      
          <SettingGroup title="Cleanup" description="Automatic cleanup of whitespace and formatting">
        <SettingSwitch
          label="Trim Trailing Whitespace"
              description="Remove extra spaces at the end of lines"
              help="Keeps files clean and reduces diff noise"
          :model-value="settings.trimTrailingWhitespace"
              @update:model-value="(value) => { updateSetting('trimTrailingWhitespace', value); handleSettingChange() }"
        />
        
        <SettingSwitch
          label="Insert Final Newline"
          description="Ensure files end with a newline character"
              help="Follows POSIX standard and Git best practices"
          :model-value="settings.insertFinalNewline"
              @update:model-value="(value) => { updateSetting('insertFinalNewline', value); handleSettingChange() }"
        />
      </SettingGroup>
    </SettingSection>
      </TabsContent>

      <!-- Appearance Tab -->
      <TabsContent value="appearance">
        <SettingSection
          title="Text Colors"
          description="Customize text colors for light and dark modes"
          :icon="Palette"
        >
          <SettingGroup title="Color Settings" description="Customize text colors for different themes">
            <div class="space-y-6">
              <!-- Dark Mode Text Color -->
              <div class="space-y-3">
                <label class="text-sm font-medium">Dark Mode Text Color</label>
                <div class="flex items-center gap-3">
                  <Input
                    :value="settings.textColor"
                    type="color"
                    class="w-16 h-10 p-1 rounded cursor-pointer"
                    @input="(e: any) => { updateSetting('textColor', e.target.value); handleSettingChange() }"
                  />
                  <Input
                    :value="settings.textColor"
                    type="text"
                    placeholder="#e5e5e5"
                    class="flex-1 font-mono"
                    @input="(e: any) => { updateSetting('textColor', e.target.value); handleSettingChange() }"
                  />
                  <div 
                    class="w-10 h-10 rounded border border-border"
                    :style="{ backgroundColor: settings.textColor }"
                  ></div>
                </div>
                <p class="text-xs text-muted-foreground">
                  Softer colors like #e5e5e5 or #d0d0d0 reduce eye strain in dark mode
                </p>
              </div>

              <!-- Light Mode Text Color -->
              <div class="space-y-3">
                <label class="text-sm font-medium">Light Mode Text Color</label>
                <div class="flex items-center gap-3">
                  <Input
                    :value="settings.lightModeTextColor"
                    type="color"
                    class="w-16 h-10 p-1 rounded cursor-pointer"
                    @input="(e: any) => { updateSetting('lightModeTextColor', e.target.value); handleSettingChange() }"
                  />
                  <Input
                    :value="settings.lightModeTextColor"
                    type="text"
                    placeholder="#1f1f1f"
                    class="flex-1 font-mono"
                    @input="(e: any) => { updateSetting('lightModeTextColor', e.target.value); handleSettingChange() }"
                  />
                  <div 
                    class="w-10 h-10 rounded border border-border"
                    :style="{ backgroundColor: settings.lightModeTextColor }"
                  ></div>
                </div>
                <p class="text-xs text-muted-foreground">
                  Darker grays like #1f1f1f or #2f2f2f provide good contrast without harshness
                </p>
              </div>
            </div>
          </SettingGroup>

          <SettingGroup title="Color Presets" description="Quick color combinations for different preferences">
            <div class="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                @click="() => applyColorPreset('#e5e5e5', '#1f1f1f')"
                class="flex items-center gap-2 justify-start"
              >
                <Eye class="h-4 w-4" />
                Eye-friendly
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                @click="() => applyColorPreset('#d0d0d0', '#2f2f2f')"
                class="flex items-center gap-2 justify-start"
              >
                <Eye class="h-4 w-4" />
                Extra soft
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                @click="() => applyColorPreset('#ffffff', '#000000')"
                class="flex items-center gap-2 justify-start"
              >
                <Palette class="h-4 w-4" />
                High contrast
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                @click="() => applyColorPreset('#cccccc', '#333333')"
                class="flex items-center gap-2 justify-start"
              >
                <Eye class="h-4 w-4" />
                Balanced
              </Button>
            </div>
          </SettingGroup>
        </SettingSection>
      </TabsContent>
    </Tabs>

    <!-- Reset Section -->
    <SettingSection
      title="Reset Settings"
      description="Restore editor settings to their default values"
      :icon="RotateCw"
    >
      <SettingGroup title="Reset to Defaults" description="Restore all editor settings to their original values">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Reset All Editor Settings</div>
            <div class="text-sm text-muted-foreground">This will restore all typography, code editing, and formatting settings to their defaults</div>
          </div>
          <Button variant="outline" @click="handleResetToDefaults" class="gap-2">
            <RotateCcw class="h-4 w-4" />
            Reset to Defaults
      </Button>
    </div>
      </SettingGroup>
    </SettingSection>
  </div>
</template>