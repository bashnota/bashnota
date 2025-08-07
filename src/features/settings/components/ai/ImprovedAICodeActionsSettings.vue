<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Code2, 
  Shield, 
  AlertTriangle, 
  TestTube,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Settings,
  Zap,
  Eye
} from 'lucide-vue-next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Base components
import SettingSection from '@/features/settings/components/base/SettingSection.vue'
import SettingGroup from '@/features/settings/components/base/SettingGroup.vue'
import SettingSwitch from '@/features/settings/components/base/SettingSwitch.vue'
import SettingSlider from '@/features/settings/components/base/SettingSlider.vue'

// AI Code Actions components
import CodeActionCard from './components/CodeActionCard.vue'
import CodeActionDialog from './components/CodeActionDialog.vue'

// Store and types
import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'
import type { CustomAIAction } from '@/features/editor/stores/aiActionsStore'
import { toast } from 'vue-sonner'

const aiActionsStore = useAIActionsStore()

// Local state
const activeTab = ref('features')
const showCreateDialog = ref(false)
const editingAction = ref<CustomAIAction | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Computed
const isStoreReady = computed(() => aiActionsStore.state?.customActions && Array.isArray(aiActionsStore.state.customActions))
const preferences = computed(() => aiActionsStore.state?.providerSettings || {})
const errorConfig = computed(() => aiActionsStore.state?.errorTriggerConfig || {})
const customActions = computed(() => {
  if (!isStoreReady.value) return []
  try {
    return aiActionsStore.enabledCustomActions || []
  } catch (error) {
    console.warn('Error accessing enabledCustomActions:', error)
    return []
  }
})
const builtInActions = computed(() => (customActions.value || []).filter(a => a.isBuiltIn))
const userActions = computed(() => (customActions.value || []).filter(a => !a.isBuiltIn))
const codeActions = computed(() => {
  if (!isStoreReady.value) return []
  try {
    return aiActionsStore.codeActions || []
  } catch (error) {
    console.warn('Error accessing codeActions:', error)
    return []
  }
})

const actionStats = computed(() => {
  const customActionsArray = customActions.value || []
  const userActionsArray = userActions.value || []
  const builtInActionsArray = builtInActions.value || []
  
  return {
    total: customActionsArray.length,
    enabled: customActionsArray.filter(a => a.isEnabled).length,
    custom: userActionsArray.length,
    builtin: builtInActionsArray.length
  }
})

const codeFeatures = computed(() => [
  {
    key: 'codeExplanation',
    name: 'Code Explanation',
    description: 'Generate detailed explanations of code functionality',
    icon: Brain,
    enabled: preferences.value.enabledFeatures?.codeExplanation ?? true
  },
  {
    key: 'errorAnalysis',
    name: 'Error Analysis',
    description: 'Analyze and suggest fixes for code errors',
    icon: AlertTriangle,
    enabled: preferences.value.enabledFeatures?.errorAnalysis ?? true
  },
  {
    key: 'securityAnalysis',
    name: 'Security Analysis',
    description: 'Detect potential security vulnerabilities',
    icon: Shield,
    enabled: preferences.value.enabledFeatures?.securityAnalysis ?? false
  },
  {
    key: 'performanceAnalysis',
    name: 'Performance Analysis',
    description: 'Suggest performance optimizations',
    icon: Zap,
    enabled: preferences.value.enabledFeatures?.performanceAnalysis ?? false
  },
  {
    key: 'codeTransformation',
    name: 'Code Transformation',
    description: 'Refactor, optimize, and transform code',
    icon: Code2,
    enabled: preferences.value.enabledFeatures?.codeTransformation ?? true
  }
])

// Methods
const updateEnabledFeature = (key: string, value: boolean) => {
  const enabledFeatures = { ...preferences.value.enabledFeatures, [key]: value }
  aiActionsStore.updateProviderSettings({ enabledFeatures })
  toast.success(`${key} ${value ? 'enabled' : 'disabled'}`)
}

const updateErrorConfig = (key: string, value: any) => {
  aiActionsStore.updateErrorTriggerConfig({ [key]: value })
  toast.success('Error handling settings updated')
}

const createNewAction = () => {
  editingAction.value = null
  showCreateDialog.value = true
}

const editAction = (action: CustomAIAction) => {
  editingAction.value = action
  showCreateDialog.value = true
}

const duplicateAction = (action: CustomAIAction) => {
  const { id, createdAt, updatedAt, ...actionData } = action
  const duplicated = {
    ...actionData,
    name: `${action.name} (Copy)`,
    isBuiltIn: false
  }
  aiActionsStore.addCustomAction(duplicated)
  toast.success('Action duplicated successfully')
}

const deleteAction = (actionId: string) => {
  const action = customActions.value.find(a => a.id === actionId)
  if (!action?.isBuiltIn) {
    aiActionsStore.deleteCustomAction(actionId)
    toast.success('Custom action deleted')
  }
}

const toggleAction = (actionId: string, enabled: boolean) => {
  aiActionsStore.updateCustomAction(actionId, { isEnabled: enabled })
  const actionName = customActions.value.find(a => a.id === actionId)?.name
  toast.success(`${actionName} ${enabled ? 'enabled' : 'disabled'}`)
}

const testAction = async (actionId: string) => {
  try {
    const sampleCode = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`
    
    // This would normally execute the action
    toast.info('Action test would execute here with sample code')
  } catch (error) {
    toast.error('Failed to test action')
  }
}

const resetToDefaults = () => {
  if (confirm('Reset all AI code actions to defaults? This will remove all custom actions.')) {
    aiActionsStore.resetToDefaults()
    toast.success('AI code actions reset to defaults')
  }
}

const exportActions = () => {
  const data = {
    customActions: userActions.value,
    exportDate: new Date().toISOString(),
    version: '1.0'
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-code-actions-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  toast.success('AI code actions exported successfully')
}

const importActions = () => {
  fileInput.value?.click()
}

const handleFileImport = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      if (data.customActions && Array.isArray(data.customActions)) {
        data.customActions.forEach((action: any) => {
          delete action.id // Remove ID to create new ones
          aiActionsStore.addCustomAction(action)
        })
        toast.success(`Imported ${data.customActions.length} custom actions successfully`)
      }
    } catch (error) {
      toast.error('Invalid file format')
    }
  }
  reader.readAsText(file)
}

const handleDialogClose = () => {
  showCreateDialog.value = false
  editingAction.value = null
}
</script>

<template>
  <div class="space-y-6">
    <SettingSection
      title="AI Code Actions Management"
      description="Configure AI-powered code analysis, transformation, and debugging features"
      :icon="Code2"
    >
      <!-- Stats Overview -->
      <SettingGroup title="Overview" description="Current AI code actions configuration">
        <div v-if="!isStoreReady" class="text-center py-8 text-muted-foreground">
          Loading AI code actions...
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-muted/50 rounded-lg">
            <div class="text-2xl font-bold text-primary">{{ actionStats.total }}</div>
            <div class="text-sm text-muted-foreground">Total Actions</div>
          </div>
          <div class="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ actionStats.enabled }}</div>
            <div class="text-sm text-muted-foreground">Enabled</div>
          </div>
          <div class="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{ actionStats.custom }}</div>
            <div class="text-sm text-muted-foreground">Custom</div>
          </div>
          <div class="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <div class="text-2xl font-bold text-purple-600">{{ actionStats.builtin }}</div>
            <div class="text-sm text-muted-foreground">Built-in</div>
          </div>
        </div>
      </SettingGroup>
    </SettingSection>

    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-4">
        <TabsTrigger value="features">
          <Brain class="mr-2 h-4 w-4" />
          Features
        </TabsTrigger>
        <TabsTrigger value="error-handling">
          <AlertTriangle class="mr-2 h-4 w-4" />
          Error Handling
        </TabsTrigger>
        <TabsTrigger value="actions">
          <Settings class="mr-2 h-4 w-4" />
          Actions
        </TabsTrigger>
        <TabsTrigger value="manage">
          <Eye class="mr-2 h-4 w-4" />
          Manage
        </TabsTrigger>
      </TabsList>

      <!-- Features Tab -->
      <TabsContent value="features">
        <SettingSection
          title="Code Analysis Features"
          description="Enable or disable specific AI-powered code analysis capabilities"
          :icon="Brain"
        >
          <SettingGroup title="Analysis Features" description="AI-powered code analysis and enhancement">
            <CodeActionCard
              v-for="feature in codeFeatures"
              :key="feature.key"
              :title="feature.name"
              :description="feature.description"
              :icon="feature.icon"
              :enabled="feature.enabled"
              :is-feature="true"
              @toggle="(enabled) => updateEnabledFeature(feature.key, Boolean(enabled))"
            />
          </SettingGroup>
        </SettingSection>
      </TabsContent>

      <!-- Error Handling Tab -->
      <TabsContent value="error-handling">
        <SettingSection
          title="Automatic Error Detection"
          description="Configure when and how AI assistance is triggered for code errors"
          :icon="AlertTriangle"
        >
          <SettingGroup title="Error Detection" description="Automatic error analysis settings">
            <SettingSwitch
              label="Enable Auto Error Detection"
              description="Automatically trigger AI assistance when code execution fails"
              help="When enabled, AI will analyze errors and suggest fixes automatically"
              :model-value="errorConfig.autoTrigger"
              @update:model-value="(value) => updateErrorConfig('autoTrigger', value)"
            />

            <SettingSwitch
              label="Auto-suggest Fixes"
              description="Automatically generate suggested fixes for common errors"
              help="Show quick fix suggestions when errors are detected"
              :model-value="errorConfig.showQuickFix"
              @update:model-value="(value) => updateErrorConfig('showQuickFix', value)"
            />

            <SettingSwitch
              label="Show Error Context"
              description="Include surrounding code context in error analysis"
              help="Provides more context to AI for better error analysis"
              :model-value="errorConfig.showExplanation"
              @update:model-value="(value) => updateErrorConfig('showExplanation', value)"
            />
          </SettingGroup>

          <SettingGroup title="Context Settings" description="Configure error analysis context">
            <SettingSlider
              label="Context Lines"
              description="Number of lines before and after the error to include"
              help="More lines provide better context but use more tokens"
              :model-value="[5]"
              :min="1"
              :max="10"
              @update:model-value="(value) => updateErrorConfig('contextLines', value[0])"
            />
          </SettingGroup>
        </SettingSection>
      </TabsContent>

      <!-- Actions Tab -->
      <TabsContent value="actions">
        <SettingSection
          title="Built-in Code Actions"
          description="Standard AI-powered code actions available for all code blocks"
          :icon="Settings"
        >
          <SettingGroup title="Built-in Actions" description="Pre-configured actions for common tasks">
            <div v-if="!isStoreReady" class="text-center py-8 text-muted-foreground">
              Loading built-in actions...
            </div>
            <div v-else-if="!builtInActions || builtInActions.length === 0" class="text-center py-8 text-muted-foreground">
              No built-in actions available.
            </div>
            <div v-else class="space-y-3">
              <CodeActionCard
                v-for="action in builtInActions"
                :key="action.id"
                :action="action"
                :show-edit="false"
                :show-delete="false"
                @toggle="toggleAction"
                @test="testAction"
                @duplicate="duplicateAction"
              />
            </div>
          </SettingGroup>

          <SettingGroup title="Custom Actions" description="Your personalized code actions">
            <div class="space-y-4">
              <Button @click="createNewAction" class="w-full gap-2">
                <Plus class="h-4 w-4" />
                Create Custom Code Action
              </Button>

              <div v-if="!isStoreReady" class="text-center py-8 text-muted-foreground">
                Loading custom actions...
              </div>
              <div v-else-if="userActions.length > 0" class="space-y-3">
                <CodeActionCard
                  v-for="action in userActions"
                  :key="action.id"
                  :action="action"
                  @edit="editAction"
                  @delete="deleteAction"
                  @toggle="toggleAction"
                  @test="testAction"
                  @duplicate="duplicateAction"
                />
              </div>
              <div v-else class="text-center py-8 text-muted-foreground">
                <Code2 class="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 class="font-medium mb-2">No Custom Code Actions</h3>
                <p class="text-sm mb-4">Create custom actions for specific code analysis needs.</p>
                <Button @click="createNewAction" class="gap-2">
                  <Plus class="h-4 w-4" />
                  Create First Custom Action
                </Button>
              </div>
            </div>
          </SettingGroup>
        </SettingSection>
      </TabsContent>

      <!-- Manage Tab -->
      <TabsContent value="manage">
        <SettingSection
          title="Backup & Management"
          description="Export, import, and manage your AI code actions"
          :icon="Eye"
        >
          <SettingGroup title="Import & Export" description="Backup and restore your custom actions">
            <div class="grid grid-cols-2 gap-4">
              <Button @click="exportActions" variant="outline" class="gap-2">
                <Download class="h-4 w-4" />
                Export Actions
              </Button>
              <Button @click="importActions" variant="outline" class="gap-2">
                <Upload class="h-4 w-4" />
                Import Actions
              </Button>
            </div>

            <input
              ref="fileInput"
              type="file"
              accept=".json"
              @change="handleFileImport"
              class="hidden"
            />
          </SettingGroup>

          <SettingGroup title="Reset Settings" description="Restore default configurations">
            <Button @click="resetToDefaults" variant="outline" class="w-full gap-2">
              <RefreshCw class="h-4 w-4" />
              Reset All Settings to Defaults
            </Button>
            <p class="text-sm text-muted-foreground">
              This will remove all custom actions and reset all settings to their defaults
            </p>
          </SettingGroup>

          <SettingGroup title="Template Variables" description="Available variables for custom actions">
            <div class="bg-muted/50 rounded-lg p-4 space-y-2">
              <div class="text-sm font-medium">Available Template Variables:</div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div><code>&#123;&#123;code&#125;&#125;</code> - The selected code content</div>
                <div><code>&#123;&#123;language&#125;&#125;</code> - The programming language</div>
                <div><code>&#123;&#123;error&#125;&#125;</code> - Error message (if available)</div>
                <div><code>&#123;&#123;chatContext&#125;&#125;</code> - Chat conversation context</div>
              </div>
            </div>
          </SettingGroup>
        </SettingSection>
      </TabsContent>
    </Tabs>

    <!-- Create/Edit Action Dialog -->
    <CodeActionDialog
      v-model:open="showCreateDialog"
      :editing-action="editingAction"
      @close="handleDialogClose"
    />
  </div>
</template>