<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Settings,
  Zap
} from 'lucide-vue-next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Base components
import SettingSection from '@/features/settings/components/base/SettingSection.vue'
import SettingGroup from '@/features/settings/components/base/SettingGroup.vue'
import SettingSwitch from '@/features/settings/components/base/SettingSwitch.vue'

// AI Actions components
import AIActionCard from './components/AIActionCard.vue'
import AIActionDialog from './components/AIActionDialog.vue'

// Store and types
import { useAIActionsStore } from '@/features/ai/stores/aiActionsStore'
import type { AIAction } from '@/features/ai/types/aiActions'
import { toast } from 'vue-sonner'

const aiActionsStore = useAIActionsStore()

// Local state
const activeTab = ref('actions')
const showCreateDialog = ref(false)
const editingAction = ref<AIAction | null>(null)

// Computed
const defaultActions = computed(() => aiActionsStore.isLoaded ? aiActionsStore.defaultActions : [])
const customActions = computed(() => aiActionsStore.isLoaded ? aiActionsStore.customActions : [])
const enabledActions = computed(() => aiActionsStore.isLoaded ? aiActionsStore.enabledActions : [])

const actionStats = computed(() => ({
  total: aiActionsStore.isLoaded ? aiActionsStore.actions.length : 0,
  enabled: enabledActions.value.length,
  custom: customActions.value.length,
  default: defaultActions.value.length
}))

// Methods
const createNewAction = () => {
  editingAction.value = null
  showCreateDialog.value = true
}

const editAction = (action: AIAction) => {
  editingAction.value = action
  showCreateDialog.value = true
}

const duplicateAction = (actionId: string) => {
  const newId = aiActionsStore.duplicateAction(actionId)
  if (newId) {
    toast.success('Action duplicated successfully')
  }
}

const deleteAction = (actionId: string) => {
  const action = aiActionsStore.getActionById(actionId)
  if (!action?.isCustom) return
  
  const success = aiActionsStore.removeAction(actionId)
  if (success) {
    toast.success('Custom action deleted')
  }
}

const moveAction = (fromIndex: number, toIndex: number) => {
  aiActionsStore.moveAction(fromIndex, toIndex)
  toast.success('Action position updated')
}

const toggleAction = (actionId: string, enabled: boolean) => {
  aiActionsStore.updateAction(actionId, { enabled })
  const actionName = aiActionsStore.getActionById(actionId)?.name
  toast.success(`${actionName} ${enabled ? 'enabled' : 'disabled'}`)
}

const resetToDefaults = () => {
  if (confirm('This will reset all actions to defaults and remove custom actions. Continue?')) {
    aiActionsStore.resetToDefaults()
    toast.success('AI actions reset to defaults')
  }
}

const exportActions = () => {
  const data = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    actions: aiActionsStore.actions
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-actions-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  toast.success('AI actions exported successfully')
}

const handleDialogClose = () => {
  showCreateDialog.value = false
  editingAction.value = null
}
</script>

<template>
  <div class="space-y-6">
    <SettingSection
      title="AI Actions Management"
      description="Configure AI-powered actions for text enhancement and editing"
      :icon="Sparkles"
    >
      <!-- Stats Overview -->
      <SettingGroup title="Overview" description="Current AI actions configuration">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div class="text-2xl font-bold text-purple-600">{{ actionStats.default }}</div>
            <div class="text-sm text-muted-foreground">Default</div>
          </div>
        </div>
      </SettingGroup>
    </SettingSection>

    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-3">
        <TabsTrigger value="actions">
          <Settings class="mr-2 h-4 w-4" />
          Manage Actions
        </TabsTrigger>
        <TabsTrigger value="default">
          <Sparkles class="mr-2 h-4 w-4" />
          Default Actions
        </TabsTrigger>
        <TabsTrigger value="custom">
          <Zap class="mr-2 h-4 w-4" />
          Custom Actions
        </TabsTrigger>
      </TabsList>

      <!-- All Actions Tab -->
      <TabsContent value="actions">
        <SettingSection
          title="All AI Actions"
          description="Manage all your AI actions in one place"
          :icon="Settings"
        >
          <SettingGroup title="Quick Actions" description="Manage your AI actions">
            <div class="flex flex-wrap gap-2">
              <Button @click="createNewAction" class="gap-2">
                <Plus class="h-4 w-4" />
                Create Action
              </Button>
              <Button variant="outline" @click="exportActions" class="gap-2">
                <Copy class="h-4 w-4" />
                Export Actions
              </Button>
              <Button variant="outline" @click="resetToDefaults" class="gap-2">
                <RefreshCw class="h-4 w-4" />
                Reset to Defaults
              </Button>
            </div>
          </SettingGroup>

          <SettingGroup title="Actions List" description="All configured AI actions">
            <div v-if="!aiActionsStore.isLoaded" class="text-center py-8 text-muted-foreground">
              Loading AI actions...
            </div>
            <div v-else class="space-y-3">
              <AIActionCard
                v-for="(action, index) in aiActionsStore.actions"
                :key="action.id"
                :action="action"
                :index="index"
                :total-actions="aiActionsStore.actions.length"
                @edit="editAction"
                @duplicate="duplicateAction"
                @delete="deleteAction"
                @move="moveAction"
                @toggle="toggleAction"
              />
              
              <div v-if="aiActionsStore.actions.length === 0" class="text-center py-8 text-muted-foreground">
                No AI actions configured. Create your first action to get started.
              </div>
            </div>
          </SettingGroup>
        </SettingSection>
      </TabsContent>

      <!-- Default Actions Tab -->
      <TabsContent value="default">
        <SettingSection
          title="Default Actions"
          description="Built-in AI actions for common text operations"
          :icon="Sparkles"
        >
          <SettingGroup title="Built-in Actions" description="Pre-configured actions for common tasks">
            <div v-if="!aiActionsStore.isLoaded" class="text-center py-8 text-muted-foreground">
              Loading default actions...
            </div>
            <div v-else class="space-y-3">
              <AIActionCard
                v-for="(action, index) in defaultActions"
                :key="action.id"
                :action="action"
                :index="index"
                :total-actions="defaultActions.length"
                :show-move="false"
                :show-delete="false"
                @edit="editAction"
                @duplicate="duplicateAction"
                @toggle="toggleAction"
              />
            </div>
          </SettingGroup>
        </SettingSection>
      </TabsContent>

      <!-- Custom Actions Tab -->
      <TabsContent value="custom">
        <SettingSection
          title="Custom Actions"
          description="Your personalized AI actions"
          :icon="Zap"
        >
          <SettingGroup title="Your Custom Actions" description="Actions you've created or customized">
            <div v-if="!aiActionsStore.isLoaded" class="text-center py-8 text-muted-foreground">
              Loading custom actions...
            </div>
            <div v-else class="space-y-3">
              <AIActionCard
                v-for="(action, index) in customActions"
                :key="action.id"
                :action="action"
                :index="index"
                :total-actions="customActions.length"
                @edit="editAction"
                @duplicate="duplicateAction"
                @delete="deleteAction"
                @move="moveAction"
                @toggle="toggleAction"
              />
              
              <div v-if="customActions.length === 0" class="text-center py-8 text-muted-foreground">
                <Zap class="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 class="font-medium mb-2">No Custom Actions</h3>
                <p class="text-sm mb-4">Create custom AI actions tailored to your specific needs.</p>
                <Button @click="createNewAction" class="gap-2">
                  <Plus class="h-4 w-4" />
                  Create First Custom Action
                </Button>
              </div>
            </div>
          </SettingGroup>
        </SettingSection>
      </TabsContent>
    </Tabs>

    <!-- Create/Edit Action Dialog -->
    <AIActionDialog
      v-model:open="showCreateDialog"
      :editing-action="editingAction"
      @close="handleDialogClose"
    />
  </div>
</template>