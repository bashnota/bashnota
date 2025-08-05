<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { RotateCw, FileText, Eye, Code2 } from 'lucide-vue-next'
import { useSettings } from '@/composables/useSettings'
import { toast } from 'vue-sonner'

// Base components
import SettingSection from '@/features/settings/components/base/SettingSection.vue'
import SettingGroup from '@/features/settings/components/base/SettingGroup.vue'
import SettingSwitch from '@/features/settings/components/base/SettingSwitch.vue'
import SettingSlider from '@/features/settings/components/base/SettingSlider.vue'
import SettingSelect from '@/features/settings/components/base/SettingSelect.vue'
import SettingInput from '@/features/settings/components/base/SettingInput.vue'

const { settings, updateSetting, resetToDefaults, hasUnsavedChanges } = useSettings('editor')

// Theme options for code editor
const codeThemeOptions = [
  { value: 'vs-dark', label: 'Dark', description: 'Dark theme for code' },
  { value: 'vs-light', label: 'Light', description: 'Light theme for code' },
  { value: 'hc-black', label: 'High Contrast Dark', description: 'High contrast dark theme' },
  { value: 'hc-light', label: 'High Contrast Light', description: 'High contrast light theme' }
]

const indentTypeOptions = [
  { value: 'spaces', label: 'Spaces', description: 'Use spaces for indentation' },
  { value: 'tabs', label: 'Tabs', description: 'Use tabs for indentation' }
]

const handleResetToDefaults = () => {
  resetToDefaults()
  toast.success('Editor settings reset to defaults')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Text Editing Settings -->
    <SettingSection
      title="Text Editing"
      description="Configure text editing behavior and appearance"
      :icon="FileText"
    >
      <SettingGroup title="Typography" description="Font and text appearance settings">
        <SettingSlider
          label="Font Size"
          description="Base font size for text content"
          help="Adjust the size of text in the editor"
          :model-value="settings.fontSize"
          :min="10"
          :max="24"
          unit="px"
          @update:model-value="(value) => updateSetting('fontSize', value)"
        />
        
        <SettingSlider
          label="Line Height"
          description="Spacing between lines of text"
          help="Higher values increase space between lines"
          :model-value="settings.lineHeight"
          :min="1.0"
          :max="3.0"
          :step="0.1"
          @update:model-value="(value) => updateSetting('lineHeight', value)"
        />
        
        <SettingInput
          label="Text Color (Dark Mode)"
          description="Text color when using dark theme"
          :model-value="String(settings.textColor)"
          type="color"
          @update:model-value="(value) => updateSetting('textColor', String(value))"
        />
        
        <SettingInput
          label="Text Color (Light Mode)"
          description="Text color when using light theme"
          :model-value="String(settings.lightModeTextColor)"
          type="color"
          @update:model-value="(value) => updateSetting('lightModeTextColor', String(value))"
        />
      </SettingGroup>
      
      <SettingGroup title="Behavior" description="Text editing behavior options">
        <SettingSwitch
          label="Auto Save"
          description="Automatically save changes while typing"
          help="Saves your work continuously to prevent data loss"
          :model-value="settings.autoSave"
          @update:model-value="(value) => updateSetting('autoSave', value)"
        />
        
        <SettingSwitch
          label="Spell Check"
          description="Enable spell checking for text content"
          help="Highlights misspelled words as you type"
          :model-value="settings.spellCheck"
          @update:model-value="(value) => updateSetting('spellCheck', value)"
        />
        
        <SettingSwitch
          label="Word Wrap"
          description="Wrap long lines to fit the editor width"
          help="Long lines will wrap instead of requiring horizontal scrolling"
          :model-value="settings.wordWrap"
          @update:model-value="(value) => updateSetting('wordWrap', value)"
        />
      </SettingGroup>
    </SettingSection>

    <!-- Code Editing Settings -->
    <SettingSection
      title="Code Editing"
      description="Settings specific to code editing experience"
      :icon="Code2"
    >
      <SettingGroup title="Appearance" description="Code editor visual settings">
        <SettingSelect
          label="Code Theme"
          description="Color theme for code syntax highlighting"
          help="Choose a theme that's comfortable for your eyes"
          :model-value="settings.codeTheme"
          :options="codeThemeOptions"
          @update:model-value="(value) => updateSetting('codeTheme', value)"
        />
        
        <SettingSlider
          label="Code Font Size"
          description="Font size specifically for code blocks"
          help="Usually smaller than regular text for better code visibility"
          :model-value="settings.codeFontSize"
          :min="8"
          :max="20"
          unit="px"
          @update:model-value="(value) => updateSetting('codeFontSize', value)"
        />
        
        <SettingSlider
          label="Code Line Height"
          description="Line spacing for code blocks"
          help="Adjust line spacing for better code readability"
          :model-value="settings.codeLineHeight"
          :min="1.0"
          :max="2.0"
          :step="0.1"
          @update:model-value="(value) => updateSetting('codeLineHeight', value)"
        />
      </SettingGroup>
      
      <SettingGroup title="Features" description="Code editing features and behavior">
        <SettingSwitch
          label="Show Line Numbers"
          description="Display line numbers in code blocks"
          help="Makes it easier to reference specific lines of code"
          :model-value="settings.showLineNumbers"
          @update:model-value="(value) => updateSetting('showLineNumbers', value)"
        />
        
        <SettingSwitch
          label="Highlight Active Line"
          description="Highlight the line where the cursor is positioned"
          help="Makes it easier to see which line you're currently editing"
          :model-value="settings.highlightActiveLine"
          @update:model-value="(value) => updateSetting('highlightActiveLine', value)"
        />
        
        <SettingSwitch
          label="Auto Close Brackets"
          description="Automatically close brackets, quotes, and parentheses"
          help="Speeds up coding by automatically completing paired characters"
          :model-value="settings.autoCloseBrackets"
          @update:model-value="(value) => updateSetting('autoCloseBrackets', value)"
        />
        
        <SettingSwitch
          label="Auto Indent"
          description="Automatically indent new lines based on context"
          help="Maintains proper code indentation automatically"
          :model-value="settings.autoIndent"
          @update:model-value="(value) => updateSetting('autoIndent', value)"
        />
      </SettingGroup>
      
      <SettingGroup title="Indentation" description="Code indentation preferences">
        <SettingSelect
          label="Indent Type"
          description="Use spaces or tabs for indentation"
          help="Choose your preferred indentation method"
          :model-value="settings.indentType"
          :options="indentTypeOptions"
          @update:model-value="(value) => updateSetting('indentType', value)"
        />
        
        <SettingSlider
          label="Tab Size"
          description="Number of spaces per tab"
          help="Controls how wide tab characters appear"
          :model-value="settings.tabSize"
          :min="1"
          :max="8"
          unit=" spaces"
          @update:model-value="(value) => updateSetting('tabSize', value)"
        />
        
        <SettingSlider
          label="Indent Size"
          description="Number of spaces for each indentation level"
          help="Controls how much each level of code is indented"
          :model-value="settings.indentSize"
          :min="1"
          :max="8"
          unit=" spaces"
          @update:model-value="(value) => updateSetting('indentSize', value)"
        />
      </SettingGroup>
    </SettingSection>

    <!-- Formatting Settings -->
    <SettingSection
      title="Formatting"
      description="Code and text formatting options"
      :icon="Eye"
    >
      <SettingGroup title="Automatic Formatting" description="Format code automatically">
        <SettingSwitch
          label="Auto Format"
          description="Automatically format code as you type"
          help="Applies consistent formatting rules while you code"
          :model-value="settings.autoFormat"
          @update:model-value="(value) => updateSetting('autoFormat', value)"
        />
        
        <SettingSwitch
          label="Format On Save"
          description="Format code automatically when saving"
          help="Ensures consistent formatting every time you save"
          :model-value="settings.formatOnSave"
          @update:model-value="(value) => updateSetting('formatOnSave', value)"
        />
      </SettingGroup>
      
      <SettingGroup title="Cleanup" description="Automatic code cleanup options">
        <SettingSwitch
          label="Trim Trailing Whitespace"
          description="Remove unnecessary whitespace at the end of lines"
          help="Keeps your code clean by removing trailing spaces"
          :model-value="settings.trimTrailingWhitespace"
          @update:model-value="(value) => updateSetting('trimTrailingWhitespace', value)"
        />
        
        <SettingSwitch
          label="Insert Final Newline"
          description="Ensure files end with a newline character"
          help="Some tools expect files to end with a newline"
          :model-value="settings.insertFinalNewline"
          @update:model-value="(value) => updateSetting('insertFinalNewline', value)"
        />
      </SettingGroup>
    </SettingSection>

    <!-- Reset Section -->
    <div class="pt-6 border-t">
      <Button 
        @click="handleResetToDefaults" 
        variant="outline" 
        class="w-full"
      >
        <RotateCw class="mr-2 h-4 w-4" />
        Reset Editor Settings to Defaults
      </Button>
    </div>
  </div>
</template>
