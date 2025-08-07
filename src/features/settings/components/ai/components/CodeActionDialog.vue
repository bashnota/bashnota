<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"
import * as z from "zod"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
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
import { Badge } from '@/components/ui/badge'
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

// Form schema
const formSchema = toTypedSchema(z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  icon: z.string().min(1, "Icon is required"),
  prompt: z.string().min(1, "Prompt template is required"),
  category: z.enum(['analysis', 'transformation', 'generation', 'debugging']),
  outputType: z.enum(['text', 'code', 'markdown']),
  shortcut: z.string().optional()
}).refine((data) => {
  // Check for duplicate names
  const existingActions = aiActionsStore.enabledCustomActions || []
  const duplicateName = existingActions.some(action => 
    action.name === data.name && 
    action.id !== props.editingAction?.id
  )
  return !duplicateName
}, {
  message: "An action with this name already exists",
  path: ["name"]
}))

// Form setup
const { handleSubmit, resetForm, setValues, values } = useForm({
  validationSchema: formSchema,
  initialValues: {
    name: '',
    description: '',
    icon: 'Brain',
    prompt: '',
    category: 'analysis' as const,
    outputType: 'text' as const,
    shortcut: ''
  }
})

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

// Watch for editing action changes
watch(() => props.editingAction, (action) => {
  if (action) {
    setValues({
      name: action.name,
      description: action.description,
      icon: action.icon,
      prompt: action.prompt,
      category: action.category,
      outputType: action.outputType,
      shortcut: action.shortcut || ''
    })
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
const onSubmit = handleSubmit(async (formValues) => {
  isSubmitting.value = true
  
  try {
    const actionData = {
      name: formValues.name.trim(),
      description: formValues.description.trim(),
      icon: formValues.icon,
      prompt: formValues.prompt.trim(),
      category: formValues.category,
      outputType: formValues.outputType,
      shortcut: formValues.shortcut || undefined,
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
})

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
    const text = values.prompt || ''
    const before = text.substring(0, start)
    const after = text.substring(end)
    setValues({ ...values, prompt: before + template + after })
    
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
      
      <form @submit="onSubmit" class="space-y-4">
        <!-- Name and Category -->
        <div class="grid grid-cols-2 gap-4">
          <FormField v-slot="{ componentField }" name="name">
            <FormItem>
              <FormLabel>Name <span class="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input 
                  id="action-name"
                  placeholder="e.g., Add Comments"
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="category">
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Select v-bind="componentField">
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
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <!-- Description -->
        <FormField v-slot="{ componentField }" name="description">
          <FormItem>
            <FormLabel>Description <span class="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input
                id="action-description"
                placeholder="e.g., Add comprehensive comments to explain code functionality"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Icon, Output Type, and Shortcut -->
        <div class="grid grid-cols-3 gap-4">
          <FormField v-slot="{ componentField }" name="icon">
            <FormItem>
              <FormLabel>Icon</FormLabel>
              <FormControl>
                <Select v-bind="componentField">
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
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="outputType">
            <FormItem>
              <FormLabel>Output Type</FormLabel>
              <FormControl>
                <Select v-bind="componentField">
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
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="shortcut">
            <FormItem>
              <FormLabel>Shortcut</FormLabel>
              <FormControl>
                <Input
                  id="action-shortcut"
                  placeholder="e.g., Ctrl+Shift+C"
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
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
              Insert &#123;&#123;code&#125;&#125;
            </Button>
            <Button 
              type="button"
              @click="insertTemplate('{{language}}')"
              variant="outline" 
              size="sm"
            >
              Insert &#123;&#123;language&#125;&#125;
            </Button>
            <Button 
              type="button"
              @click="insertTemplate('{{error}}')"
              variant="outline" 
              size="sm"
            >
              Insert &#123;&#123;error&#125;&#125;
            </Button>
          </div>
        </div>

        <!-- Prompt Template -->
        <FormField v-slot="{ componentField }" name="prompt">
          <FormItem>
            <FormLabel>Prompt Template <span class="text-destructive">*</span></FormLabel>
            <FormControl>
              <Textarea
                id="action-prompt"
                placeholder="Analyze the following {{language}} code and add comprehensive comments..."
                rows="6"
                class="resize-none"
                v-bind="componentField"
              />
            </FormControl>
            <FormDescription>
              Use template variables to make your prompt dynamic. The code and context will be automatically inserted.
            </FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Preview -->
        <div v-if="values.name && values.prompt" class="space-y-2">
          <FormLabel class="text-sm font-medium">Preview</FormLabel>
          <div class="border rounded-lg p-4 bg-muted/50">
            <div class="flex items-center gap-2 mb-3">
              <Code2 class="h-4 w-4 text-primary" />
              <span class="font-medium text-sm">{{ values.name }}</span>
              <Badge :class="{
                'bg-blue-50 text-blue-700': values.category === 'analysis',
                'bg-green-50 text-green-700': values.category === 'transformation',
                'bg-purple-50 text-purple-700': values.category === 'generation',
                'bg-red-50 text-red-700': values.category === 'debugging'
              }" class="text-xs">
                {{ values.category }}
              </Badge>
            </div>
            <p class="text-xs text-muted-foreground mb-2">{{ values.description }}</p>
            <div class="text-xs bg-background border rounded p-2">
              <span class="font-medium">Prompt:</span> {{ values.prompt }}
            </div>
          </div>
        </div>

        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" @click="handleCancel">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            {{ submitButtonText }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>