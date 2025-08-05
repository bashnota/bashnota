<script setup lang="ts">
import { useSettings } from '@/composables/useSettings'
import SettingSection from '@/features/settings/components/base/SettingSection.vue'
import SettingGroup from '@/features/settings/components/base/SettingGroup.vue'
import SettingSwitch from '@/features/settings/components/base/SettingSwitch.vue'
import SettingSlider from '@/features/settings/components/base/SettingSlider.vue'
import SettingInput from '@/features/settings/components/base/SettingInput.vue'
import { RotateCw, Eye, Palette } from 'lucide-vue-next'

const { settings, updateSetting, resetToDefaults } = useSettings('editor')
</script>
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <SettingSection title="Text Editing" description="Configure text appearance and editing behavior" :icon="Palette">
      <SettingGroup title="Typography" description="Font and text appearance settings">
        <SettingSlider
          label="Font Size"
          description="Base font size for text content"
          :model-value="settings.fontSize"
          :min="12"
          :max="24"
          unit="px"
          @update:model-value="v => updateSetting('fontSize', v)"
        />
        <SettingSlider
          label="Line Height"
          description="Spacing between lines of text"
          :model-value="settings.lineHeight"
          :min="1.2"
          :max="2.5"
          :step="0.1"
          @update:model-value="v => updateSetting('lineHeight', v)"
        />
      </SettingGroup>
      <SettingGroup title="Text Color" description="Customize text colors for light and dark modes">
        <SettingInput
          label="Dark Mode Text Color"
          description="Softer colors like #e5e5e5 or #d0d0d0 reduce eye strain in dark mode"
          :model-value="settings.textColor"
          type="text"
          @update:model-value="v => updateSetting('textColor', v)"
        />
        <SettingInput
          label="Light Mode Text Color"
          description="Darker grays like #1f1f1f or #2f2f2f provide good contrast without harshness"
          :model-value="settings.lightModeTextColor"
          type="text"
          @update:model-value="v => updateSetting('lightModeTextColor', v)"
        />
      </SettingGroup>
      <SettingGroup title="Editing Behavior" description="Configure how the editor behaves during editing">
        <SettingSwitch
          label="Auto Save"
          description="Automatically save changes as you type"
          :model-value="settings.autoSave"
          @update:model-value="v => updateSetting('autoSave', v)"
        />
        <SettingSwitch
          label="Spell Check"
          description="Enable spell checking while typing"
          :model-value="settings.spellCheck"
          @update:model-value="v => updateSetting('spellCheck', v)"
        />
        <SettingSwitch
          label="Word Wrap"
          description="Wrap long lines to fit the editor width"
          :model-value="settings.wordWrap"
          @update:model-value="v => updateSetting('wordWrap', v)"
        />
      </SettingGroup>
      <div class="flex justify-end mt-8">
        <button class="btn btn-outline flex items-center gap-2" @click="resetToDefaults">
          <RotateCw class="h-4 w-4" />
          Reset to Defaults
        </button>
      </div>
    </SettingSection>
  </div>
</template>