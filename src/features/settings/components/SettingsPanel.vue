<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settingsStore'

interface Props {
  settingId: string
  component: string
}

const props = defineProps<Props>()
const settingsStore = useSettingsStore()

// Load settings when component mounts
onMounted(() => {
  settingsStore.loadSettings()
})

// Dynamically import components
const componentMap = {
  // Editor Settings
  'UnifiedEditorSettings': defineAsyncComponent(() => import('@/features/settings/components/editor/UnifiedEditorSettings.vue')),
  'TextEditingSettings': defineAsyncComponent(() => import('@/features/settings/components/editor/TextEditingSettings.vue')),
  'CodeEditingSettings': defineAsyncComponent(() => import('@/features/settings/components/editor/CodeEditingSettings.vue')),
  'FormattingSettings': defineAsyncComponent(() => import('@/features/settings/components/editor/FormattingSettings.vue')),
  
  // Appearance Settings
  'ThemeSettings': defineAsyncComponent(() => import('@/features/settings/components/appearance/ThemeSettings.vue')),
  'InterfaceSettings': defineAsyncComponent(() => import('@/features/settings/components/appearance/InterfaceSettings.vue')),
  
  // AI Settings
  'AIProvidersSettings': defineAsyncComponent(() => import('@/features/settings/components/ai/AIProvidersSettings.vue')),
  'AIActionsSettings': defineAsyncComponent(() => import('@/features/settings/components/ai/AIActionsSettings.vue')),
  'AICodeActionsSettings': defineAsyncComponent(() => import('@/features/settings/components/ai/AICodeActionsSettings.vue')),
  'AIGenerationSettings': defineAsyncComponent(() => import('@/features/settings/components/ai/AIGenerationSettings.vue')),
  
  // Integration Settings
  'JupyterSettings': defineAsyncComponent(() => import('@/features/settings/components/integrations/JupyterSettings.vue')),
  'ExternalToolsSettings': defineAsyncComponent(() => import('@/features/settings/components/integrations/ExternalToolsSettings.vue')),
  
  // Keyboard Shortcuts
  'EditorShortcutsSettings': defineAsyncComponent(() => import('@/features/settings/components/keyboard/EditorShortcutsSettings.vue')),
  'NavigationShortcutsSettings': defineAsyncComponent(() => import('@/features/settings/components/keyboard/NavigationShortcutsSettings.vue')),
  'GlobalShortcutsSettings': defineAsyncComponent(() => import('@/features/settings/components/keyboard/GlobalShortcutsSettings.vue')),
  
  // Advanced Settings
  'PerformanceSettings': defineAsyncComponent(() => import('@/features/settings/components/advanced/PerformanceSettings.vue')),
  'DataManagementSettings': defineAsyncComponent(() => import('@/features/settings/components/advanced/DataManagementSettings.vue')),
  'SystemInfoSettings': defineAsyncComponent(() => import('@/features/settings/components/advanced/SystemInfoSettings.vue'))
}

const currentComponent = computed(() => {
  const componentName = props.component as keyof typeof componentMap
  return componentMap[componentName] || null
})
</script>

<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="settingsStore.isLoading" class="flex items-center justify-center h-32">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
    
    <!-- Settings Component -->
    <div v-else-if="currentComponent">
      <Suspense>
        <component :is="currentComponent" :setting-id="settingId" />
        <template #fallback>
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </template>
      </Suspense>
    </div>
    
    <!-- Error State -->
    <div v-else>
      <Alert>
        <AlertCircle class="h-4 w-4" />
        <AlertDescription>
          Settings component "{{ component }}" not found. This section is under development.
        </AlertDescription>
      </Alert>
    </div>
    
    <!-- Unsaved Changes Indicator -->
    <div 
      v-if="settingsStore.hasUnsavedChanges" 
      class="fixed bottom-6 right-6 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg animate-in slide-in-from-bottom-2"
    >
      Changes will be saved automatically
    </div>
  </div>
</template> 