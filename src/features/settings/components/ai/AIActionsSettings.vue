<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-medium">AI Actions</h3>
      <p class="text-sm text-muted-foreground">
        Configure AI-powered actions that appear in the context menu when you right-click on text blocks.
      </p>
    </div>

    <!-- Action List -->
    <div class="space-y-4">
      <div 
        v-for="(action, index) in aiActionsStore.actions"
        :key="action.id"
        class="border rounded-lg p-4 space-y-3"
        :class="{ 'bg-muted/50': !action.enabled }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <component 
              :is="getIconComponent(action.icon)" 
              class="h-5 w-5"
              :class="getColorClasses(action.color).text"
            />
            <div>
              <h4 class="font-medium">{{ action.name }}</h4>
              <p class="text-sm text-muted-foreground">{{ action.description }}</p>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
                         <Switch
               :checked="action.enabled"
               @update:checked="(checked: boolean) => aiActionsStore.updateAction(action.id, { enabled: checked })"
             />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="editAction(action)">
                  <EditIcon class="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem @click="duplicateAction(action.id)">
                  <CopyIcon class="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  @click="moveAction(index, index - 1)"
                  :disabled="index === 0"
                >
                  <ChevronUpIcon class="mr-2 h-4 w-4" />
                  Move Up
                </DropdownMenuItem>
                <DropdownMenuItem 
                  @click="moveAction(index, index + 1)"
                  :disabled="index === aiActionsStore.actions.length - 1"
                >
                  <ChevronDownIcon class="mr-2 h-4 w-4" />
                  Move Down
                </DropdownMenuItem>
                <DropdownMenuSeparator v-if="action.isCustom" />
                <DropdownMenuItem 
                  v-if="action.isCustom"
                  @click="deleteAction(action.id)"
                  class="text-red-600"
                >
                  <Trash2Icon class="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <!-- Preview prompt -->
        <div v-if="action.enabled" class="text-xs bg-muted p-2 rounded text-muted-foreground">
          <span class="font-medium">Prompt:</span> {{ action.prompt }}
        </div>
      </div>
    </div>

    <!-- Add Custom Action Button -->
    <Button @click="showCreateDialog = true" class="w-full" variant="outline">
      <PlusIcon class="mr-2 h-4 w-4" />
      Add Custom Action
    </Button>

    <!-- Reset to Defaults -->
    <div class="pt-4 border-t">
      <Button 
        @click="resetToDefaults" 
        variant="outline" 
        class="w-full text-muted-foreground"
      >
        <RefreshCwIcon class="mr-2 h-4 w-4" />
        Reset to Defaults
      </Button>
    </div>

    <!-- Create/Edit Action Dialog -->
    <Dialog v-model:open="showCreateDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editingAction ? 'Edit Action' : 'Create Custom Action' }}</DialogTitle>
          <DialogDescription>
            {{ editingAction ? 'Modify the existing action.' : 'Create a new AI-powered action for the context menu.' }}
          </DialogDescription>
        </DialogHeader>
        
        <form @submit.prevent="saveAction" class="space-y-4">
          <div class="space-y-2">
            <Label for="action-name">Name</Label>
            <Input
              id="action-name"
              :value="formData.name"
              @input="(e: Event) => formData.name = (e.target as HTMLInputElement).value"
              placeholder="e.g., Fix Grammar"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="action-description">Description</Label>
            <Input
              id="action-description"
              :value="formData.description"
              @input="(e: Event) => formData.description = (e.target as HTMLInputElement).value"
              placeholder="e.g., Correct grammar and spelling errors"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="action-icon">Icon</Label>
              <Select 
                :value="formData.icon"
                @update:value="(value: string) => formData.icon = value"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem 
                    v-for="iconName in AVAILABLE_ICONS"
                    :key="iconName"
                    :value="iconName"
                  >
                    <div class="flex items-center space-x-2">
                      <component :is="getIconComponent(iconName)" class="h-4 w-4" />
                      <span>{{ iconName.replace('Icon', '') }}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="action-color">Color</Label>
              <Select 
                :value="formData.color"
                @update:value="(value: string) => formData.color = value"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem 
                    v-for="color in AVAILABLE_COLORS"
                    :key="color"
                    :value="color"
                  >
                    <div class="flex items-center space-x-2">
                      <div 
                        class="w-3 h-3 rounded-full"
                        :class="getColorClasses(color).text.replace('text-', 'bg-')"
                      ></div>
                      <span class="capitalize">{{ color }}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="action-prompt">Prompt</Label>
            <Textarea
              id="action-prompt"
              v-model="formData.prompt"
              placeholder="e.g., Please correct any grammar, spelling, and punctuation errors in the following text..."
              rows="4"
              required
            />
            <p class="text-xs text-muted-foreground">
              The selected text will be automatically appended to this prompt.
            </p>
          </div>

          <div v-if="formErrors.length > 0" class="text-sm text-red-600">
            <ul class="list-disc list-inside">
              <li v-for="error in formErrors" :key="error">{{ error }}</li>
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="cancelEdit">
              Cancel
            </Button>
            <Button type="submit">
              {{ editingAction ? 'Save Changes' : 'Create Action' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus as PlusIcon, 
  MoreHorizontal,
  Edit as EditIcon,
  Copy as CopyIcon,
  Trash2 as Trash2Icon,
  ChevronUp as ChevronUpIcon,
  ChevronDown as ChevronDownIcon,
  RefreshCw as RefreshCwIcon
} from 'lucide-vue-next'
import { useAIActionsStore } from '@/features/ai/stores/aiActionsStore'
import { getIconComponent, getColorClasses } from '@/features/ai/utils/iconResolver'
import { AVAILABLE_ICONS, AVAILABLE_COLORS } from '@/features/ai/types/aiActions'
import type { AIAction } from '@/features/ai/types/aiActions'
import { toast } from 'vue-sonner'

const aiActionsStore = useAIActionsStore()

const showCreateDialog = ref(false)
const editingAction = ref<AIAction | null>(null)
const formErrors = ref<string[]>([])

const formData = ref({
  name: '',
  description: '',
  icon: 'EditIcon',
  color: 'blue',
  prompt: '',
  enabled: true
})

const editAction = (action: AIAction) => {
  editingAction.value = action
  formData.value = {
    name: action.name,
    description: action.description || '',
    icon: action.icon,
    color: action.color,
    prompt: action.prompt,
    enabled: action.enabled
  }
  showCreateDialog.value = true
}

const duplicateAction = (actionId: string) => {
  const newId = aiActionsStore.duplicateAction(actionId)
  if (newId) {
    toast({
      title: 'Action Duplicated',
      description: 'The action has been duplicated successfully.'
    })
  }
}

const moveAction = (fromIndex: number, toIndex: number) => {
  aiActionsStore.moveAction(fromIndex, toIndex)
}

const deleteAction = (actionId: string) => {
  const success = aiActionsStore.removeAction(actionId)
  if (success) {
    toast({
      title: 'Action Deleted',
      description: 'The custom action has been deleted.'
    })
  }
}

const resetToDefaults = () => {
  if (confirm('This will reset all actions to their default settings. Custom actions will be lost. Continue?')) {
    aiActionsStore.resetToDefaults()
    toast({
      title: 'Reset Complete',
      description: 'AI actions have been reset to defaults.'
    })
  }
}

const saveAction = () => {
  // Validate form
  formErrors.value = aiActionsStore.validateAction({
    ...formData.value,
    id: editingAction.value?.id
  })

  if (formErrors.value.length > 0) {
    return
  }

  if (editingAction.value) {
    // Update existing action
    aiActionsStore.updateAction(editingAction.value.id, formData.value)
    toast({
      title: 'Action Updated',
      description: 'The action has been updated successfully.'
    })
  } else {
    // Create new action
    aiActionsStore.addCustomAction(formData.value)
    toast({
      title: 'Action Created',
      description: 'The custom action has been created successfully.'
    })
  }

  cancelEdit()
}

const cancelEdit = () => {
  showCreateDialog.value = false
  editingAction.value = null
  formData.value = {
    name: '',
    description: '',
    icon: 'EditIcon',
    color: 'blue',
    prompt: '',
    enabled: true
  }
  formErrors.value = []
}
</script> 