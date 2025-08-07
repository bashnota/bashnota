<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'
import type { CustomAIAction } from '@/features/editor/stores/aiActionsStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Zap, 
  Shield, 
  MessageSquare, 
  Code2, 
  AlertCircle, 
  CheckCircle, 
  Wrench, 
  Plus,
  Edit,
  Trash2,
  Save,
  RotateCcw,
  Download,
  Upload,
  FileText,
  TestTube,
  Eye,
  EyeOff,
  Info,
  Play,
  Copy,
  Check
} from 'lucide-vue-next'

const aiActionsStore = useAIActionsStore()

// Local state
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const activeTab = ref('features')
const isCreateActionOpen = ref(false)
const isEditActionOpen = ref(false)
const editingAction = ref<CustomAIAction | null>(null)
const isImportExportOpen = ref(false)
const testActionId = ref<string | null>(null)
const testResult = ref<string | null>(null)
const testError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Form state for creating/editing actions
const actionForm = ref({
  name: '',
  description: '',
  icon: 'Brain',
  prompt: '',
  category: 'analysis' as 'analysis' | 'transformation' | 'generation' | 'debugging',
  outputType: 'text' as 'text' | 'code' | 'markdown',
  shortcut: ''
})

// Computed
const preferences = computed(() => aiActionsStore.state.providerSettings)
const errorConfig = computed(() => aiActionsStore.state.errorTriggerConfig)
const customActions = computed(() => aiActionsStore.enabledCustomActions)
const builtInActions = computed(() => customActions.value.filter(a => a.isBuiltIn))
const userActions = computed(() => customActions.value.filter(a => !a.isBuiltIn))

const isFormValid = computed(() => 
  actionForm.value.name.trim() && 
  actionForm.value.description.trim() && 
  actionForm.value.prompt.trim()
)

const templateVariables = computed(() => '{{code}}, {{language}}, {{error}}')

// Options
const iconOptions = [
  { value: 'Brain', label: 'Brain' },
  { value: 'MessageSquare', label: 'Message' },
  { value: 'Wrench', label: 'Wrench' },
  { value: 'Zap', label: 'Lightning' },
  { value: 'FileText', label: 'Document' },
  { value: 'Shield', label: 'Shield' },
  { value: 'TestTube', label: 'Test' },
  { value: 'Code2', label: 'Code' },
  { value: 'Edit', label: 'Edit' },
  { value: 'Play', label: 'Play' }
]

const categoryOptions = [
  { value: 'analysis', label: 'Analysis' },
  { value: 'transformation', label: 'Transformation' },
  { value: 'generation', label: 'Generation' },
  { value: 'debugging', label: 'Debugging' }
]

const outputTypeOptions = [
  { value: 'text', label: 'Plain Text' },
  { value: 'code', label: 'Code' },
  { value: 'markdown', label: 'Markdown' }
]

// Methods
const updateErrorConfig = (key: string, value: any) => {
  aiActionsStore.updateErrorTriggerConfig({ [key]: value })
  saveSettings()
}

const updateEnabledFeature = (key: string, value: boolean) => {
  const enabledFeatures = { ...preferences.value.enabledFeatures, [key]: value }
  aiActionsStore.updateProviderSettings({ enabledFeatures })
  saveSettings()
}

const saveSettings = async () => {
  saveStatus.value = 'saving'
  try {
    aiActionsStore.saveSettings()
    saveStatus.value = 'saved'
    setTimeout(() => {
      saveStatus.value = 'idle'
    }, 2000)
  } catch (error) {
    console.error('Failed to save AI settings:', error)
    saveStatus.value = 'error'
    setTimeout(() => {
      saveStatus.value = 'idle'
    }, 3000)
  }
}

const resetToDefaults = () => {
  if (confirm('Are you sure you want to reset all AI code actions to defaults? This will remove all custom actions.')) {
    aiActionsStore.resetToDefaults()
    saveSettings()
  }
}

// Custom Actions Management
const openCreateAction = () => {
  resetActionForm()
  isCreateActionOpen.value = true
}

const openEditAction = (action: CustomAIAction) => {
  editingAction.value = action
  actionForm.value = {
    name: action.name,
    description: action.description,
    icon: action.icon,
    prompt: action.prompt,
    category: action.category,
    outputType: action.outputType,
    shortcut: action.shortcut || ''
  }
  isEditActionOpen.value = true
}

const resetActionForm = () => {
  actionForm.value = {
    name: '',
    description: '',
    icon: 'Brain',
    prompt: '',
    category: 'analysis',
    outputType: 'text',
    shortcut: ''
  }
  editingAction.value = null
}

const saveAction = () => {
  if (!isFormValid.value) return

  const actionData = {
    name: actionForm.value.name.trim(),
    description: actionForm.value.description.trim(),
    icon: actionForm.value.icon,
    prompt: actionForm.value.prompt.trim(),
    category: actionForm.value.category,
    outputType: actionForm.value.outputType,
    shortcut: actionForm.value.shortcut || undefined,
    isBuiltIn: false,
    isEnabled: true
  }

  if (editingAction.value) {
    aiActionsStore.updateCustomAction(editingAction.value.id, actionData)
  } else {
    aiActionsStore.addCustomAction(actionData)
  }

  resetActionForm()
  isCreateActionOpen.value = false
  isEditActionOpen.value = false
  saveSettings()
}

const cancelAction = () => {
  resetActionForm()
  isCreateActionOpen.value = false
  isEditActionOpen.value = false
}

const deleteAction = (actionId: string) => {
  if (confirm('Are you sure you want to delete this custom action?')) {
    aiActionsStore.deleteCustomAction(actionId)
    saveSettings()
  }
}

const duplicateAction = (action: CustomAIAction) => {
  const { id, createdAt, updatedAt, ...actionData } = action
  const duplicated = {
    ...actionData,
    name: `${action.name} (Copy)`,
    isBuiltIn: false
  }
  aiActionsStore.addCustomAction(duplicated)
  saveSettings()
}

// Test Action
const testAction = async (actionId: string) => {
  testActionId.value = actionId
  testResult.value = null
  testError.value = null

  try {
    const action = customActions.value.find(a => a.id === actionId)
    if (!action) return

    // Simulate test with sample code
    const sampleCode = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`

    testResult.value = `Test result for "${action.name}" would appear here with sample code analysis.`
  } catch (error) {
    testError.value = error instanceof Error ? error.message : 'Unknown error occurred'
  } finally {
    testActionId.value = null
  }
}

// Import/Export
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
        saveSettings()
        alert(`Imported ${data.customActions.length} custom actions successfully`)
      }
    } catch (error) {
      alert('Invalid file format')
    }
  }
  reader.readAsText(file)
}

// Copy template
const copyTemplate = () => {
  navigator.clipboard.writeText(templateVariables.value)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h3 class="text-lg font-medium">AI Code Actions</h3>
      <p class="text-sm text-muted-foreground">
        Configure AI-powered actions for executable code blocks and automatic error handling
      </p>
    </div>

    <!-- Navigation Tabs -->
    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-4">
        <TabsTrigger value="features">Features</TabsTrigger>
        <TabsTrigger value="error-handling">Error Handling</TabsTrigger>
        <TabsTrigger value="custom-actions">Custom Actions</TabsTrigger>
        <TabsTrigger value="import-export">Import/Export</TabsTrigger>
      </TabsList>

      <!-- AI Features Tab -->
      <TabsContent value="features" class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Brain class="h-5 w-5" />
              AI Code Analysis Features
            </CardTitle>
            <CardDescription>
              Enable or disable specific AI-powered code analysis features
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-4">
              <!-- Code Explanation -->
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Code Explanation</Label>
                  <p class="text-sm text-muted-foreground">
                    Generate detailed explanations of code functionality
                  </p>
                </div>
                <Switch
                  :checked="preferences.enabledFeatures?.codeExplanation ?? true"
                  @update:checked="(value: boolean) => updateEnabledFeature('codeExplanation', value)"
                />
              </div>

              <Separator />

              <!-- Error Analysis -->
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Error Analysis</Label>
                  <p class="text-sm text-muted-foreground">
                    Analyze and suggest fixes for code errors
                  </p>
                </div>
                <Switch
                  :checked="preferences.enabledFeatures?.errorAnalysis ?? true"
                  @update:checked="(value: boolean) => updateEnabledFeature('errorAnalysis', value)"
                />
              </div>

              <Separator />

              <!-- Security Analysis -->
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Security Analysis</Label>
                  <p class="text-sm text-muted-foreground">
                    Detect potential security vulnerabilities
                  </p>
                </div>
                <Switch
                  :checked="preferences.enabledFeatures?.securityAnalysis ?? false"
                  @update:checked="(value: boolean) => updateEnabledFeature('securityAnalysis', value)"
                />
              </div>

              <Separator />

              <!-- Performance Analysis -->
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Performance Analysis</Label>
                  <p class="text-sm text-muted-foreground">
                    Suggest performance optimizations
                  </p>
                </div>
                <Switch
                  :checked="preferences.enabledFeatures?.performanceAnalysis ?? false"
                  @update:checked="(value: boolean) => updateEnabledFeature('performanceAnalysis', value)"
                />
              </div>

              <Separator />

              <!-- Code Transformation -->
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Code Transformation</Label>
                  <p class="text-sm text-muted-foreground">
                    Refactor, optimize, and transform code
                  </p>
                </div>
                <Switch
                  :checked="preferences.enabledFeatures?.codeTransformation ?? true"
                  @update:checked="(value: boolean) => updateEnabledFeature('codeTransformation', value)"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Error Handling Tab -->
      <TabsContent value="error-handling" class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <AlertCircle class="h-5 w-5" />
              Automatic Error Detection
            </CardTitle>
            <CardDescription>
              Configure when and how AI assistance is triggered for code errors
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label>Enable Auto Error Detection</Label>
                <p class="text-sm text-muted-foreground">
                  Automatically trigger AI assistance when code execution fails
                </p>
              </div>
              <Switch
                :checked="errorConfig.autoTrigger"
                @update:checked="(value: boolean) => updateErrorConfig('autoTrigger', value)"
              />
            </div>

            <div v-if="errorConfig.autoTrigger" class="space-y-4">
              <Separator />

              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Auto-suggest Fixes</Label>
                  <p class="text-sm text-muted-foreground">
                    Automatically generate suggested fixes for common errors
                  </p>
                </div>
                <Switch
                  :checked="errorConfig.showQuickFix"
                  @update:checked="(value: boolean) => updateErrorConfig('showQuickFix', value)"
                />
              </div>

              <Separator />

              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label>Show Error Context</Label>
                  <p class="text-sm text-muted-foreground">
                    Include surrounding code context in error analysis
                  </p>
                </div>
                <Switch
                  :checked="errorConfig.showExplanation"
                  @update:checked="(value: boolean) => updateErrorConfig('showExplanation', value)"
                />
              </div>

              <Separator />

              <div class="space-y-2">
                <Label>Context Lines</Label>
                <div class="px-3">
                  <Slider
                    :value="[5]"
                    @update:value="(value: number[]) => updateErrorConfig('contextLines', value[0])"
                    :max="10"
                    :min="1"
                    :step="1"
                    class="w-full"
                  />
                </div>
                <p class="text-xs text-muted-foreground">
                  Number of lines before and after the error to include (5 lines)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Custom Actions Tab -->
      <TabsContent value="custom-actions" class="space-y-6">
        <!-- Built-in Actions -->
        <Card v-if="builtInActions.length > 0">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Wrench class="h-5 w-5" />
              Built-in Actions
            </CardTitle>
            <CardDescription>
              Standard AI-powered code actions available for all code blocks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div 
                v-for="action in builtInActions" 
                :key="action.id"
                class="flex items-center justify-between p-3 border rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <component :is="action.icon" class="h-4 w-4" />
                  <div>
                    <p class="font-medium">{{ action.name }}</p>
                    <p class="text-sm text-muted-foreground">{{ action.description }}</p>
                  </div>
                  <Badge variant="secondary">{{ action.category }}</Badge>
                </div>
                <div class="flex items-center gap-2">
                  <Button
                    @click="testAction(action.id)"
                    :disabled="testActionId === action.id"
                    variant="outline"
                    size="sm"
                  >
                    <TestTube class="h-4 w-4 mr-2" />
                    Test
                  </Button>
                  <Switch
                    :checked="action.isEnabled"
                    @update:checked="(value: boolean) => aiActionsStore.updateCustomAction(action.id, { isEnabled: value })"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- User Custom Actions -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Plus class="h-5 w-5" />
              Custom Actions
            </CardTitle>
            <CardDescription>
              Create your own AI-powered actions for specific code analysis tasks
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <Button @click="openCreateAction" class="w-full">
              <Plus class="h-4 w-4 mr-2" />
              Create Custom Action
            </Button>

            <div v-if="userActions.length > 0" class="space-y-2">
              <div 
                v-for="action in userActions" 
                :key="action.id"
                class="flex items-center justify-between p-3 border rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <component :is="action.icon" class="h-4 w-4" />
                  <div>
                    <p class="font-medium">{{ action.name }}</p>
                    <p class="text-sm text-muted-foreground">{{ action.description }}</p>
                  </div>
                  <Badge>{{ action.category }}</Badge>
                </div>
                <div class="flex items-center gap-2">
                  <Button
                    @click="testAction(action.id)"
                    :disabled="testActionId === action.id"
                    variant="outline"
                    size="sm"
                  >
                    <TestTube class="h-4 w-4 mr-2" />
                    Test
                  </Button>
                  <Button
                    @click="openEditAction(action)"
                    variant="outline"
                    size="sm"
                  >
                    <Edit class="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    @click="duplicateAction(action)"
                    variant="outline"
                    size="sm"
                  >
                    <Copy class="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    @click="deleteAction(action.id)"
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 class="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Switch
                    :checked="action.isEnabled"
                    @update:checked="(value: boolean) => aiActionsStore.updateCustomAction(action.id, { isEnabled: value })"
                  />
                </div>
              </div>
            </div>

            <div v-else class="text-center py-8 text-muted-foreground">
              <Code2 class="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No custom actions created yet</p>
              <p class="text-sm">Create your first custom action to get started</p>
            </div>
          </CardContent>
        </Card>

        <!-- Template Variables Help -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Info class="h-5 w-5" />
              Template Variables
            </CardTitle>
            <CardDescription>
              Use these variables in your custom action prompts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
              <code class="text-sm">{{ templateVariables }}</code>
              <Button @click="copyTemplate" variant="outline" size="sm">
                <Copy class="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <div class="mt-4 space-y-2 text-sm text-muted-foreground">
              <p><code>&#123;&#123;code&#125;&#125;</code> - The selected code content</p>
              <p><code>&#123;&#123;language&#125;&#125;</code> - The programming language</p>
              <p><code>&#123;&#123;error&#125;&#125;</code> - Error message (if available)</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Import/Export Tab -->
      <TabsContent value="import-export" class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <FileText class="h-5 w-5" />
              Backup & Restore
            </CardTitle>
            <CardDescription>
              Export your custom actions for backup or sharing, or import actions from a file
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <Button @click="exportActions" variant="outline" class="w-full">
                <Download class="h-4 w-4 mr-2" />
                Export Actions
              </Button>
              <Button @click="importActions" variant="outline" class="w-full">
                <Upload class="h-4 w-4 mr-2" />
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

            <Separator />

            <div class="space-y-2">
              <Label>Reset to Defaults</Label>
              <Button @click="resetToDefaults" variant="outline" class="w-full">
                <RotateCcw class="h-4 w-4 mr-2" />
                Reset All Settings
              </Button>
              <p class="text-sm text-muted-foreground">
                This will remove all custom actions and reset all settings to their defaults
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <!-- Create/Edit Action Dialog -->
    <Dialog v-model:open="isCreateActionOpen">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Custom Action</DialogTitle>
          <DialogDescription>
            Create a new AI-powered action for code analysis and transformation
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="saveAction" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="action-name">Name</Label>
              <Input
                id="action-name"
                v-model="actionForm.name"
                placeholder="e.g., Add Comments"
                required
              />
            </div>
            <div class="space-y-2">
              <Label for="action-category">Category</Label>
              <CustomSelect
                v-model="actionForm.category"
                :options="categoryOptions"
                placeholder="Select category"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="action-description">Description</Label>
            <Input
              id="action-description"
              v-model="actionForm.description"
              placeholder="e.g., Add comprehensive comments to explain code functionality"
              required
            />
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label for="action-icon">Icon</Label>
              <CustomSelect
                v-model="actionForm.icon"
                :options="iconOptions"
                placeholder="Select icon"
              />
            </div>
            <div class="space-y-2">
              <Label for="action-output">Output Type</Label>
              <CustomSelect
                v-model="actionForm.outputType"
                :options="outputTypeOptions"
                placeholder="Select output type"
              />
            </div>
            <div class="space-y-2">
              <Label for="action-shortcut">Shortcut (Optional)</Label>
              <Input
                id="action-shortcut"
                v-model="actionForm.shortcut"
                placeholder="e.g., Ctrl+Shift+C"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="action-prompt">Prompt Template</Label>
            <Textarea
              id="action-prompt"
              v-model="actionForm.prompt"
              placeholder="Analyze the following {{language}} code and {{action_specific_instruction}}..."
              rows="4"
              required
            />
            <p class="text-xs text-muted-foreground">
              Use template variables like &#123;&#123;code&#125;&#125;, &#123;&#123;language&#125;&#125;, and &#123;&#123;error&#125;&#125; in your prompt
            </p>
          </div>

          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="cancelAction">
              Cancel
            </Button>
            <Button type="submit" :disabled="!isFormValid">
              <Save class="h-4 w-4 mr-2" />
              Create Action
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Edit Action Dialog -->
    <Dialog v-model:open="isEditActionOpen">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Custom Action</DialogTitle>
          <DialogDescription>
            Modify the existing custom action
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="saveAction" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="edit-action-name">Name</Label>
              <Input
                id="edit-action-name"
                v-model="actionForm.name"
                required
              />
            </div>
            <div class="space-y-2">
              <Label for="edit-action-category">Category</Label>
              <CustomSelect
                v-model="actionForm.category"
                :options="categoryOptions"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="edit-action-description">Description</Label>
            <Input
              id="edit-action-description"
              v-model="actionForm.description"
              required
            />
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label for="edit-action-icon">Icon</Label>
              <CustomSelect
                v-model="actionForm.icon"
                :options="iconOptions"
              />
            </div>
            <div class="space-y-2">
              <Label for="edit-action-output">Output Type</Label>
              <CustomSelect
                v-model="actionForm.outputType"
                :options="outputTypeOptions"
              />
            </div>
            <div class="space-y-2">
              <Label for="edit-action-shortcut">Shortcut</Label>
              <Input
                id="edit-action-shortcut"
                v-model="actionForm.shortcut"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="edit-action-prompt">Prompt Template</Label>
            <Textarea
              id="edit-action-prompt"
              v-model="actionForm.prompt"
              rows="4"
              required
            />
          </div>

          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="cancelAction">
              Cancel
            </Button>
            <Button type="submit" :disabled="!isFormValid">
              <Save class="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Test Result Dialog -->
    <Dialog :open="!!testResult || !!testError" @update:open="(value) => { if (!value) { testResult = null; testError = null } }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Result</DialogTitle>
        </DialogHeader>
        
        <div v-if="testResult" class="space-y-2">
          <Label>AI Response:</Label>
          <div class="p-3 bg-muted rounded-lg">
            <p class="text-sm">{{ testResult }}</p>
          </div>
        </div>
        
        <div v-if="testError" class="space-y-2">
          <Label class="text-red-600">Error:</Label>
          <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ testError }}</p>
          </div>
        </div>

        <div class="flex justify-end">
          <Button @click="testResult = null; testError = null">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Save Status -->
    <Alert v-if="saveStatus === 'saved'" class="border-green-200 bg-green-50">
      <CheckCircle class="h-4 w-4 text-green-600" />
      <AlertDescription class="text-green-700">
        Settings saved successfully
      </AlertDescription>
    </Alert>
    
    <Alert v-else-if="saveStatus === 'error'" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertDescription>
        Failed to save settings. Please try again.
      </AlertDescription>
    </Alert>
  </div>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style> 