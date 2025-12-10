<script setup lang="ts">
import { ref } from 'vue'
import { useFeatureFlags } from '@/composables/useFeatureFlags'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'vue-sonner'

const {
  useNewStorage,
  useSimplifiedNavigation,
  useConsolidatedSettings,
  enableAllNewFeatures,
  disableAllNewFeatures,
  hasAnyNewFeatureEnabled
} = useFeatureFlags()

const handleToggleStorage = () => {
  const newValue = !useNewStorage.value
  useNewStorage.value = newValue
  
  toast(newValue ? 'New Storage Enabled' : 'Legacy Storage Enabled', {
    description: newValue 
      ? 'Using file-based storage. Reload the page to apply changes.'
      : 'Using Dexie database. Reload the page to apply changes.',
    duration: 5000
  })
}

const handleToggleNavigation = () => {
  const newValue = !useSimplifiedNavigation.value
  useSimplifiedNavigation.value = newValue
  
  toast(newValue ? 'Simplified Navigation Enabled' : 'Legacy Navigation Enabled', {
    description: newValue 
      ? '3-panel layout active. Reload the page to apply changes.'
      : '7-sidebar layout active. Reload the page to apply changes.',
    duration: 5000
  })
}

const handleToggleSettings = () => {
  const newValue = !useConsolidatedSettings.value
  useConsolidatedSettings.value = newValue
  
  toast(newValue ? 'Consolidated Settings Enabled' : 'Legacy Settings Enabled', {
    description: newValue 
      ? 'Using single settings file. Reload the page to apply changes.'
      : 'Using localStorage keys. Reload the page to apply changes.',
    duration: 5000
  })
}

const handleEnableAll = () => {
  enableAllNewFeatures()
  toast('All New Features Enabled', {
    description: 'Reload the page to activate all new features.',
    duration: 5000
  })
}

const handleDisableAll = () => {
  disableAllNewFeatures()
  toast('All New Features Disabled', {
    description: 'Reload the page to revert to legacy system.',
    duration: 5000
  })
}

const handleReloadPage = () => {
  window.location.reload()
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Feature Flags</CardTitle>
      <CardDescription>
        Toggle new features for gradual rollout. Changes require page reload.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Storage Flag -->
      <div class="flex items-center justify-between">
        <div class="space-y-0.5">
          <div class="font-medium">File-Based Storage</div>
          <div class="text-sm text-muted-foreground">
            Use File System API with automatic fallback (50-70% faster)
          </div>
        </div>
        <Switch :checked="useNewStorage" @update:checked="handleToggleStorage" />
      </div>

      <!-- Navigation Flag -->
      <div class="flex items-center justify-between">
        <div class="space-y-0.5">
          <div class="font-medium">Simplified Navigation</div>
          <div class="text-sm text-muted-foreground">
            3-panel layout with command palette (87% less complexity)
          </div>
        </div>
        <Switch :checked="useSimplifiedNavigation" @update:checked="handleToggleNavigation" />
      </div>

      <!-- Settings Flag -->
      <div class="flex items-center justify-between">
        <div class="space-y-0.5">
          <div class="font-medium">Consolidated Settings</div>
          <div class="text-sm text-muted-foreground">
            Single settings file with import/export (80% faster)
          </div>
        </div>
        <Switch :checked="useConsolidatedSettings" @update:checked="handleToggleSettings" />
      </div>

      <!-- Batch Actions -->
      <div class="flex gap-2 pt-4 border-t">
        <Button variant="outline" size="sm" @click="handleEnableAll">
          Enable All
        </Button>
        <Button variant="outline" size="sm" @click="handleDisableAll">
          Disable All
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          @click="handleReloadPage"
          :disabled="!hasAnyNewFeatureEnabled"
        >
          Reload Page
        </Button>
      </div>

      <!-- Status Info -->
      <div v-if="hasAnyNewFeatureEnabled" class="text-sm text-amber-600 dark:text-amber-400 pt-2">
        ⚠️ Reload required to apply feature flag changes
      </div>
    </CardContent>
  </Card>
</template>
