<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { Alert, AlertDescription } from '@/ui/alert'
import { AlertCircle } from 'lucide-vue-next'

interface Props {
  settingId: string
  component: string
}

const props = defineProps<Props>()

// Dynamically import components
const componentMap = {
  // Editor Settings
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
    <div v-if="currentComponent">
      <Suspense>
        <component :is="currentComponent" />
        <template #fallback>
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </template>
      </Suspense>
    </div>
    
    <div v-else>
      <Alert>
        <AlertCircle class="h-4 w-4" />
        <AlertDescription>
          Settings component "{{ component }}" not found. This section is under development.
        </AlertDescription>
      </Alert>
    </div>
  </div>
</template> 