<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { RotateCw, Palette, Layout, Monitor, Accessibility, Eye } from 'lucide-vue-next'
import { useSettings } from '@/composables/useSettings'
import { useTheme } from '@/composables/theme'
import { useThemeColor, type ThemeColor } from '@/composables/theme'
import { toast } from 'vue-sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Base components
import SettingSection from '@/features/settings/components/base/SettingSection.vue'
import SettingGroup from '@/features/settings/components/base/SettingGroup.vue'
import SettingSwitch from '@/features/settings/components/base/SettingSwitch.vue'
import SettingSlider from '@/features/settings/components/base/SettingSlider.vue'
import SettingSelect from '@/features/settings/components/base/SettingSelect.vue'
import SettingInput from '@/features/settings/components/base/SettingInput.vue'

// Appearance-specific components
import ThemeColorPicker from './components/ThemeColorPicker.vue'

const { settings, updateSetting, resetToDefaults, hasUnsavedChanges } = useSettings('appearance')
const { setThemeMode, themeMode } = useTheme()
const { color: currentThemeColor, setColor: setThemeColor, themeDefinitions } = useThemeColor()

// Local state
const activeTab = ref('theme')

// Options
const themeOptions = [
  { value: 'light', label: 'Light', description: 'Light theme for daytime use' },
  { value: 'dark', label: 'Dark', description: 'Dark theme for low-light environments' },
  { value: 'system', label: 'System', description: 'Follow system preference automatically' }
]

const sidebarPositionOptions = [
  { value: 'left', label: 'Left', description: 'Sidebar on the left side' },
  { value: 'right', label: 'Right', description: 'Sidebar on the right side' }
]

const densityOptions = [
  { value: 'comfortable', label: 'Comfortable', description: 'More spacing for easier interaction' },
  { value: 'compact', label: 'Compact', description: 'Less spacing for more content' },
  { value: 'dense', label: 'Dense', description: 'Minimal spacing for maximum density' }
]

// Available theme colors
const themeColors = computed(() => 
  themeDefinitions.map(definition => ({
    value: definition.value as ThemeColor,
    label: definition.label,
    description: `${definition.label} color scheme`,
    color: definition.color
  }))
)

// Methods
const handleThemeChange = (theme: string | number) => {
  const themeStr = String(theme) as 'light' | 'dark' | 'system'
  updateSetting('theme', themeStr)
  setThemeMode(themeStr)
  toast.success(`Theme changed to ${themeStr}`)
}

const handleThemeColorChange = (color: ThemeColor) => {
  updateSetting('themeColor', color)
  setThemeColor(color)
  const colorDef = themeDefinitions.find(def => def.value === color)
  toast.success(`Theme color changed to ${colorDef?.label || color}`)
}

const handleResetToDefaults = () => {
  resetToDefaults()
  // Also reset theme composables to defaults
  setThemeMode('system')
  setThemeColor('slate')
  toast.success('Appearance settings reset to defaults')
}

// Watch for external theme changes and sync with settings
const syncThemeWithComposable = () => {
  if (themeMode.value !== settings.value.theme) {
    updateSetting('theme', themeMode.value)
  }
  if (currentThemeColor.value !== settings.value.themeColor) {
    updateSetting('themeColor', currentThemeColor.value)
  }
}
</script>

<template>
  <div class="space-y-6">
    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-4">
        <TabsTrigger value="theme">
          <Palette class="mr-2 h-4 w-4" />
          Theme
        </TabsTrigger>
        <TabsTrigger value="layout">
          <Layout class="mr-2 h-4 w-4" />
          Layout
        </TabsTrigger>
        <TabsTrigger value="interface">
          <Monitor class="mr-2 h-4 w-4" />
          Interface
        </TabsTrigger>
        <TabsTrigger value="accessibility">
          <Accessibility class="mr-2 h-4 w-4" />
          Accessibility
        </TabsTrigger>
      </TabsList>

      <!-- Theme Tab -->
      <TabsContent value="theme">
        <SettingSection
          title="Theme & Colors"
          description="Customize the visual appearance of the application"
          :icon="Palette"
        >
          <SettingGroup title="Theme Mode" description="Choose between light, dark, or system theme">
            <SettingSelect
              label="Theme Mode"
              description="Select your preferred theme"
              help="System theme automatically switches based on your OS settings"
              :model-value="settings.theme"
              :options="themeOptions"
              @update:model-value="handleThemeChange"
            />

            <SettingSwitch
              label="High Contrast"
              description="Increase contrast for better visibility"
              help="Enhances text and UI element contrast"
              :model-value="settings.highContrast"
              @update:model-value="(value) => updateSetting('highContrast', value)"
            />
          </SettingGroup>

          <SettingGroup title="Color Scheme" description="Choose your preferred accent color">
            <ThemeColorPicker
              :current-color="settings.themeColor"
              :colors="themeColors"
              @color-change="handleThemeColorChange"
            />
          </SettingGroup>

          <SettingGroup title="Schedule" description="Automatic theme switching">
            <SettingSwitch
              label="Dark Mode Schedule"
              description="Automatically switch to dark mode at sunset"
              help="Uses your system location to determine sunset time"
              :model-value="settings.darkModeSchedule"
              @update:model-value="(value) => updateSetting('darkModeSchedule', value)"
            />
          </SettingGroup>
        </SettingSection>
      </TabsContent>

      <!-- Layout Tab -->
      <TabsContent value="layout">
        <SettingSection
          title="Layout & Structure"
          description="Configure the layout and positioning of interface elements"
          :icon="Layout"
        >
          <SettingGroup title="Sidebar" description="Sidebar configuration and positioning">
            <SettingSlider
              label="Sidebar Width"
              description="Width of the main sidebar"
              help="Adjust to fit your content and screen size"
              :model-value="[settings.sidebarWidth]"
              :min="200"
              :max="500"
              unit="px"
              @update:model-value="(value) => updateSetting('sidebarWidth', value[0])"
            />

            <SettingSelect
              label="Sidebar Position"
              description="Which side to display the sidebar"
              help="Choose based on your workflow preference"
              :model-value="settings.sidebarPosition"
              :options="sidebarPositionOptions"
              @update:model-value="(value) => updateSetting('sidebarPosition', value as 'left' | 'right')"
            />
          </SettingGroup>

          <SettingGroup title="Density" description="Control the spacing and compactness of the interface">
            <SettingSelect
              label="Interface Density"
              description="How compact the interface should be"
              help="Compact mode shows more content in less space"
              :model-value="settings.density"
              :options="densityOptions"
              @update:model-value="(value) => updateSetting('density', value as 'compact' | 'comfortable' | 'spacious')"
            />
          </SettingGroup>
        </SettingSection>
      </TabsContent>

      <!-- Interface Tab -->
      <TabsContent value="interface">
        <SettingSection
          title="Interface Elements"
          description="Show or hide various interface components"
          :icon="Monitor"
        >
          <SettingGroup title="Visibility" description="Control which interface elements are shown">
            <SettingSwitch
              label="Show Status Bar"
              description="Display status information at the bottom"
              help="Shows file info, cursor position, and other status details"
              :model-value="settings.showStatusBar"
              @update:model-value="(value) => updateSetting('showStatusBar', value)"
            />

            <SettingSwitch
              label="Show Menu Bar"
              description="Display the main menu bar"
              help="Hide to maximize content area"
              :model-value="settings.showMenuBar"
              @update:model-value="(value) => updateSetting('showMenuBar', value)"
            />
          </SettingGroup>

          <SettingGroup title="Customization" description="Advanced interface customization">
            <SettingInput
              label="Custom CSS"
              description="Add custom CSS to override default styles"
              help="Advanced users can add custom CSS rules"
              :model-value="settings.customCss"
              placeholder="/* Your custom CSS here */"
              @update:model-value="(value) => updateSetting('customCss', String(value))"
            />
          </SettingGroup>
        </SettingSection>
      </TabsContent>

      <!-- Accessibility Tab -->
      <TabsContent value="accessibility">
        <SettingSection
          title="Accessibility"
          description="Settings to improve accessibility and usability"
          :icon="Accessibility"
        >
          <SettingGroup title="Motion & Animation" description="Control animations and motion effects">
            <SettingSwitch
              label="Reduced Motion"
              description="Minimize animations and transitions"
              help="Reduces motion for users sensitive to movement"
              :model-value="settings.reducedMotion"
              @update:model-value="(value) => updateSetting('reducedMotion', value)"
            />
          </SettingGroup>

          <SettingGroup title="Visual Assistance" description="Visual accessibility features">
            <SettingSwitch
              label="High Contrast Mode"
              description="Increase contrast for better visibility"
              help="Makes text and UI elements more distinct"
              :model-value="settings.highContrast"
              @update:model-value="(value) => updateSetting('highContrast', value)"
            />
          </SettingGroup>
        </SettingSection>
      </TabsContent>
    </Tabs>

    <!-- Reset Section -->
    <div class="pt-6 border-t">
      <Button 
        @click="handleResetToDefaults" 
        variant="outline" 
        class="w-full"
      >
        <RotateCw class="mr-2 h-4 w-4" />
        Reset Appearance Settings to Defaults
      </Button>
    </div>
  </div>
</template>