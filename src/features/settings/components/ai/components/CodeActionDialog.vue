<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Code2, Copy } from 'lucide-vue-next'

import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'
import type { CustomAIAction } from '@/features/editor/stores/aiActionsStore'
import { toast } from 'vue-sonner'

interface Props {
  open: boolean
  editingAction?: CustomAIAction | null
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const aiActionsStore = useAIActionsStore()

// Form state
const formData = ref({
  name: '',
  description: '',
  icon: 'Brain',
  prompt: '',
  category: 'analysis' as 'analysis' | 'transformation' | 'generation' | 'debugging',
  outputType: 'text' as 'text' | 'code' | 'markdown',
  shortcut: ''
})

const formErrors = ref<string[]>([])
const isSubmitting = ref(false)

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

const templateVariables = '{{code}}, {{language}}, {{error}}, {{chatContext}}'

// Computed
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const isEditing = computed(() => !!props.editingAction)
const dialogTitle = computed(() => isEditing.value ? 'Edit Code Action' : 'Create Code Action')
const dialogDescription = computed(() => 
  isEditing.value 
    ? 'Modify the existing AI code action settings.' 
    : 'Create a new AI-powered action for code analysis and transformation.'
)

const submitButtonText = computed(() => 
  isSubmitting.value 
    ? (isEditing.value ? 'Saving...' : 'Creating...') 
    : (isEditing.value ? 'Save Changes' : 'Create Action')
)

const isFormValid = computed(() => 
  formData.value.name.trim() && 
  formData.value.description.trim() && 
  formData.value.prompt.trim()
)

// Watch for editing action changes
watch(() => props.editingAction, (action) => {
  if (action) {
    formData.value = {
      name: action.name,
      description: action.description,
      icon: action.icon,
      prompt: action.prompt,
      category: action.category,
      outputType: action.outputType,
      shortcut: action.shortcut || ''
    }
  } else {
    resetForm()
  }
})

// Watch for dialog close
watch(isOpen, (open) => {
  if (!open) {
    handleClose()
  }
})

// Methods
const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
    icon: 'Brain',
    prompt: '',
    category: 'analysis',
    outputType: 'text',
    shortcut: ''
  }
  formErrors.value = []
}

const validateForm = (): boolean => {
  formErrors.value = []
  
  if (!formData.value.name.trim()) {
    formErrors.value.push('Name is required')
  }
  
  if (!formData.value.description.trim()) {
    formErrors.value.push('Description is required')
  }
  
  if (!formData.value.prompt.trim()) {
    formErrors.value.push('Prompt template is required')
  }
  
  // Check for duplicate names
  const existingActions = aiActionsStore.enabledCustomActions
  const duplicateName = existingActions.some(action => 
    action.name === formData.value.name && 
    action.id !== props.editingAction?.id
  )
  
  if (duplicateName) {
    formErrors.value.push('An action with this name already exists')
  }
  
  return formErrors.value.length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const actionData = {
      name: formData.value.name.trim(),
      description: formData.value.description.trim(),
      icon: formData.value.icon,
      prompt: formData.value.prompt.trim(),
      category: formData.value.category,
      outputType: formData.value.outputType,
      shortcut: formData.value.shortcut || undefined,
      isBuiltIn: false,
      isEnabled: true
    }

    if (isEditing.value && props.editingAction) {
      // Update existing action
      aiActionsStore.updateCustomAction(props.editingAction.id, actionData)
      toast.success('Code action updated successfully')
    } else {
      // Create new action
      aiActionsStore.addCustomAction(actionData)
      toast.success('Code action created successfully')
    }
    
    handleClose()
  } catch (error) {
    toast.error('Failed to save code action')
    console.error('Error saving code action:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  emit('update:open', false)
  emit('close')
  resetForm()
}

const handleCancel = () => {
  handleClose()
}

const copyTemplateVariables = () => {
  navigator.clipboard.writeText(templateVariables)
  toast.success('Template variables copied to clipboard')
}

const insertTemplate = (template: string) => {
  const textarea = document.getElementById('action-prompt') as HTMLTextAreaElement
  if (textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = formData.value.prompt
    const before = text.substring(0, start)
    const after = text.substring(end)
    formData.value.prompt = before + template + after
    
    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + template.length
    }, 0)
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
        <DialogDescription>{{ dialogDescription }}</DialogDescription>
      </DialogHeader>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Name and Category -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="action-name" class="text-sm font-medium">
              Name <span class="text-destructive">*</span>
            </Label>
            <Input
              id="action-name"
              v-model="formData.name"
              placeholder="e.g., Add Comments"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="action-category" class="text-sm font-medium">Category</Label>
            <Select v-model="formData.category">
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="category in categoryOptions"
                  :key="category.value"
                  :value="category.value"
                >
                  {{ category.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <Label for="action-description" class="text-sm font-medium">
            Description <span class="text-destructive">*</span>
          </Label>
          <Input
            id="action-description"
            v-model="formData.description"
            placeholder="e.g., Add comprehensive comments to explain code functionality"
            required
          />
        </div>

        <!-- Icon, Output Type, and Shortcut -->
        <div class="grid grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label for="action-icon" class="text-sm font-medium">Icon</Label>
            <Select v-model="formData.icon">
              <SelectTrigger>
                <SelectValue placeholder="Select icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="icon in iconOptions"
                  :key="icon.value"
                  :value="icon.value"
                >
                  {{ icon.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="action-output" class="text-sm font-medium">Output Type</Label>
            <Select v-model="formData.outputType">
              <SelectTrigger>
                <SelectValue placeholder="Select output" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="output in outputTypeOptions"
                  :key="output.value"
                  :value="output.value"
                >
                  {{ output.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="action-shortcut" class="text-sm font-medium">Shortcut</Label>
            <Input
              id="action-shortcut"
              v-model="formData.shortcut"
              placeholder="e.g., Ctrl+Shift+C"
            />
          </div>
        </div>

        <!-- Template Variables Helper -->
        <div class="space-y-2">
          <Label class="text-sm font-medium">Template Variables</Label>
          <div class="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <code class="text-sm flex-1">{{ templateVariables }}</code>
            <Button 
              type="button" 
              @click="copyTemplateVariables" 
              variant="outline" 
              size="sm"
              class="gap-2"
            >
              <Copy class="h-3 w-3" />
              Copy
            </Button>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button 
              type="button"
              @click="insertTemplate('{{code}}')"
              variant="outline" 
              size="sm"
            >
              Insert {{code}}
            </Button>
            <Button 
              type="button"
              @click="insertTemplate('{{language}}')"
              variant="outline" 
              size="sm"
            >
              Insert {{language}}
            </Button>
            <Button 
              type="button"
              @click="insertTemplate('{{error}}')"
              variant="outline" 
              size="sm"
            >
              Insert {{error}}
            </Button>
          </div>
        </div>

        <!-- Prompt Template -->
        <div class="space-y-2">
          <Label for="action-prompt" class="text-sm font-medium">
            Prompt Template <span class="text-destructive">*</span>
          </Label>
          <Textarea
            id="action-prompt"
            v-model="formData.prompt"
            placeholder="Analyze the following {{language}} code and add comprehensive comments..."
            rows="6"
            required
            class="resize-none"
          />
          <p class="text-xs text-muted-foreground">
            Use template variables to make your prompt dynamic. The code and context will be automatically inserted.
          </p>
        </div>

        <!-- Preview -->
        <div v-if="formData.name && formData.prompt" class="space-y-2">
          <Label class="text-sm font-medium">Preview</Label>
          <div class="border rounded-lg p-4 bg-muted/50">
            <div class="flex items-center gap-2 mb-3">
              <Code2 class="h-4 w-4 text-primary" />
              <span class="font-medium text-sm">{{ formData.name }}</span>
              <Badge :class="{
                'bg-blue-50 text-blue-700': formData.category === 'analysis',
                'bg-green-50 text-green-700': formData.category === 'transformation',
                'bg-purple-50 text-purple-700': formData.category === 'generation',
                'bg-red-50 text-red-700': formData.category === 'debugging'
              }" class="text-xs">
                {{ formData.category }}
              </Badge>
            </div>
            <p class="text-xs text-muted-foreground mb-2">{{ formData.description }}</p>
            <div class="text-xs bg-background border rounded p-2">
              <span class="font-medium">Prompt:</span> {{ formData.prompt }}
            </div>
          </div>
        </div>

        <!-- Errors -->
        <Alert v-if="formErrors.length > 0" variant="destructive">
          <AlertTriangle class="h-4 w-4" />
          <AlertDescription>
            <ul class="list-disc list-inside space-y-1">
              <li v-for="error in formErrors" :key="error">{{ error }}</li>
            </ul>
          </AlertDescription>
        </Alert>

        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" @click="handleCancel">
            Cancel
          </Button>
          <Button type="submit" :disabled="!isFormValid || isSubmitting">
            {{ submitButtonText }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>