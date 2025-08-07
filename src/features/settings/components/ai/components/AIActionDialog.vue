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
import { AlertTriangle } from 'lucide-vue-next'

import { useAIActionsStore } from '@/features/ai/stores/aiActionsStore'
import { getIconComponent, getColorClasses } from '@/features/ai/utils/iconResolver'
import { AVAILABLE_ICONS, AVAILABLE_COLORS } from '@/features/ai/types/aiActions'
import type { AIAction } from '@/features/ai/types/aiActions'
import { toast } from 'vue-sonner'

interface Props {
  open: boolean
  editingAction?: AIAction | null
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
  icon: 'EditIcon',
  color: 'blue',
  prompt: '',
  enabled: true
})

const formErrors = ref<string[]>([])
const isSubmitting = ref(false)

// Computed
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const isEditing = computed(() => !!props.editingAction)
const dialogTitle = computed(() => isEditing.value ? 'Edit AI Action' : 'Create AI Action')
const dialogDescription = computed(() => 
  isEditing.value 
    ? 'Modify the existing AI action settings.' 
    : 'Create a new AI-powered action for text enhancement.'
)

const submitButtonText = computed(() => 
  isSubmitting.value 
    ? (isEditing.value ? 'Saving...' : 'Creating...') 
    : (isEditing.value ? 'Save Changes' : 'Create Action')
)

// Watch for editing action changes
watch(() => props.editingAction, (action) => {
  if (action) {
    formData.value = {
      name: action.name,
      description: action.description || '',
      icon: action.icon,
      color: action.color,
      prompt: action.prompt,
      enabled: action.enabled
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
    icon: 'EditIcon',
    color: 'blue',
    prompt: '',
    enabled: true
  }
  formErrors.value = []
}

const validateForm = (): boolean => {
  formErrors.value = aiActionsStore.validateAction({
    ...formData.value,
    id: props.editingAction?.id
  })
  
  return formErrors.value.length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    if (isEditing.value && props.editingAction) {
      // Update existing action
      aiActionsStore.updateAction(props.editingAction.id, formData.value)
      toast.success('AI action updated successfully')
    } else {
      // Create new action
      aiActionsStore.addCustomAction(formData.value)
      toast.success('AI action created successfully')
    }
    
    handleClose()
  } catch (error) {
    toast.error('Failed to save AI action')
    console.error('Error saving AI action:', error)
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

// Icon and color preview helpers
const getIconPreview = (iconName: string) => {
  return getIconComponent(iconName)
}

const getColorPreview = (colorName: string) => {
  return getColorClasses(colorName)
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
        <DialogDescription>{{ dialogDescription }}</DialogDescription>
      </DialogHeader>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Name and Description -->
        <div class="grid grid-cols-1 gap-4">
          <div class="space-y-2">
            <Label for="action-name" class="text-sm font-medium">
              Name <span class="text-destructive">*</span>
            </Label>
            <Input
              id="action-name"
              v-model="formData.name"
              placeholder="e.g., Fix Grammar"
              required
              class="w-full"
            />
          </div>

          <div class="space-y-2">
            <Label for="action-description" class="text-sm font-medium">Description</Label>
            <Input
              id="action-description"
              v-model="formData.description"
              placeholder="e.g., Correct grammar and spelling errors"
              class="w-full"
            />
          </div>
        </div>

        <!-- Icon and Color -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="action-icon" class="text-sm font-medium">Icon</Label>
            <Select v-model="formData.icon">
              <SelectTrigger>
                <SelectValue placeholder="Select icon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="iconName in AVAILABLE_ICONS"
                  :key="iconName"
                  :value="iconName"
                >
                  <div class="flex items-center gap-2">
                    <component :is="getIconPreview(iconName)" class="h-4 w-4" />
                    <span>{{ iconName.replace('Icon', '') }}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="action-color" class="text-sm font-medium">Color</Label>
            <Select v-model="formData.color">
              <SelectTrigger>
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="color in AVAILABLE_COLORS"
                  :key="color"
                  :value="color"
                >
                  <div class="flex items-center gap-2">
                    <div 
                      class="w-3 h-3 rounded-full"
                      :class="getColorPreview(color).bg"
                    />
                    <span class="capitalize">{{ color }}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Prompt -->
        <div class="space-y-2">
          <Label for="action-prompt" class="text-sm font-medium">
            Prompt <span class="text-destructive">*</span>
          </Label>
          <Textarea
            id="action-prompt"
            v-model="formData.prompt"
            placeholder="Please correct any grammar, spelling, and punctuation errors in the following text..."
            rows="4"
            required
            class="resize-none"
          />
          <p class="text-xs text-muted-foreground">
            The selected text will be automatically appended to this prompt when the action is used.
          </p>
        </div>

        <!-- Preview -->
        <div v-if="formData.name && formData.prompt" class="space-y-2">
          <Label class="text-sm font-medium">Preview</Label>
          <div class="border rounded-lg p-3 bg-muted/50">
            <div class="flex items-center gap-2 mb-2">
              <component 
                :is="getIconPreview(formData.icon)" 
                class="h-4 w-4"
                :class="getColorPreview(formData.color).text"
              />
              <span class="font-medium text-sm">{{ formData.name }}</span>
            </div>
            <p v-if="formData.description" class="text-xs text-muted-foreground mb-2">
              {{ formData.description }}
            </p>
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
          <Button type="submit" :disabled="isSubmitting">
            {{ submitButtonText }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>