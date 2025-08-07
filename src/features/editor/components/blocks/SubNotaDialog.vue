<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onBeforeUnmount, watch } from 'vue'
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"
import * as z from "zod"
import { useNotaStore } from '@/features/nota/stores/nota'
import { useSubNotaDialog } from '@/features/editor/composables/useSubNotaDialog'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'
import { CheckIcon, XIcon, LoaderIcon, FileTextIcon, FolderIcon } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from '@/components/ui/input'
import { db } from '@/db'

const { state, closeSubNotaDialog, handleSuccess } = useSubNotaDialog()

const notaStore = useNotaStore()
const isLoading = ref(false)
const parentName = ref('')
const showParentNote = ref(false)
const isSubmitted = ref(false)

// Form schema
const formSchema = toTypedSchema(z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(50, "Title must be 50 characters or less")
    .refine((val) => val.trim().length > 0, "Title cannot be empty")
}))

// Form setup
const { handleSubmit, resetForm, setValues } = useForm({
  validationSchema: formSchema,
  initialValues: {
    title: ''
  }
})

// Get parent note title for context
const fetchParentTitle = async () => {
  try {
    if (!state.value.parentId) return
    
    const parentNota = await db.notas.get(state.value.parentId)
    if (parentNota) {
      parentName.value = parentNota.title
      showParentNote.value = true
    }
  } catch (error) {
    logger.error('Failed to fetch parent nota:', error)
  }
}

const handleClose = () => {
  closeSubNotaDialog()
  resetForm()
}

onMounted(async () => {
  await nextTick()
  // Fetch parent nota info
  fetchParentTitle()
})

// Clean up event listeners
onBeforeUnmount(() => {
  // No cleanup needed for shadcn dialog
})

const handleKeyDown = (event: KeyboardEvent) => {
  // Only handle global keyboard events here, not input-specific ones
  if (event.key === 'Escape' && !event.defaultPrevented) {
    handleClose()
  }
}

const onSubmit = handleSubmit(async (values) => {
  // Prevent multiple submissions
  if (isLoading.value || isSubmitted.value) return

  isLoading.value = true
  isSubmitted.value = true

  // Make absolutely sure parentId is a string (not undefined, empty string, etc.)
  // If it's an invalid parentId, explicitly pass null instead of undefined/empty string
  const parentId = state.value.parentId && state.value.parentId.trim() !== '' ? state.value.parentId : null
  
  try {
    const newNota = await notaStore.createItem(values.title.trim(), parentId)
    
    // Verify in database that parentId was set correctly
    setTimeout(async () => {
      try {
        const storedNota = await db.notas.get(newNota.id)
        // Silent verification
        if (storedNota?.parentId !== parentId) {
          logger.error('ParentId mismatch!', { 
            expectedParentId: parentId, 
            actualParentId: storedNota?.parentId 
          })
        }
      } catch (e) {
        logger.error('Error verifying nota in database:', e)
      }
    }, 500)
    
    // Show success message with better description
    const parentContext = parentName.value ? ` under "${parentName.value}"` : ''
    toast(`"${values.title}" created successfully${parentContext}`)
    
    // Add a visual highlight to the created link
    setTimeout(() => {
      // Find the newly created link and apply a highlight
      const linkElement = document.querySelector(`a[href="/nota/${newNota.id}"]`)
      if (linkElement) {
        linkElement.classList.add('newly-created')
        setTimeout(() => {
          linkElement.classList.remove('newly-created')
        }, 2000)
      }
    }, 100)
    
    handleSuccess(newNota.id, values.title)
  } catch (error) {
    logger.error('Failed to create nota:', error)
    toast('Failed to create sub nota. Please try again.')
    isSubmitted.value = false
    isLoading.value = false
  } 
})

const cancel = () => {
  // Prevent multiple cancellations
  if (isSubmitted.value) return
  
  isSubmitted.value = true
  handleClose()
}
</script>

<template>
  <Dialog :open="state.isOpen" @update:open="(value) => { if (!value) handleClose() }">
    <DialogContent class="sm:max-w-[500px] grid-rows-[auto_1fr_auto] p-0 max-h-[90dvh]">
      <DialogHeader class="p-6 pb-0">
        <DialogTitle class="flex items-center gap-2">
          <FileTextIcon class="w-5 h-5" />
          Create Sub Nota
        </DialogTitle>
        <DialogDescription>
          Create a new nota as a sub-item of the current document.
        </DialogDescription>
      </DialogHeader>

      <div class="overflow-y-auto px-6 min-h-0">
        <!-- Parent note information if available -->
        <div v-if="showParentNote" class="mb-4 p-3 rounded-lg bg-muted flex items-center text-sm">
          <FolderIcon class="w-4 h-4 mr-2 text-muted-foreground" />
          <span>Creating under: <strong>{{ parentName }}</strong></span>
        </div>
        
        <form @submit="onSubmit" class="space-y-4">
          <FormField v-slot="{ componentField }" name="title">
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter title for your new nota"
                  :disabled="isLoading"
                  @keydown.esc.prevent="cancel()"
                  autocomplete="off"
                  autofocus
                  v-bind="componentField"
                />
              </FormControl>
              <FormDescription>
                Press Enter to create, Esc to cancel
              </FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>
        </form>
      </div>

      <DialogFooter class="p-6 pt-0">
        <Button 
          variant="outline" 
          @click="cancel"
          :disabled="isLoading"
          type="button"
        >
          <XIcon class="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button 
          @click="onSubmit"
          :disabled="isLoading"
          type="submit"
        >
          <LoaderIcon v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
          <CheckIcon v-else class="w-4 h-4 mr-2" />
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style>
/* Global styles for highlighting newly created items */
.newly-created {
  animation: pulse-highlight 2s ease-in-out;
  position: relative;
  z-index: 1;
}

@keyframes pulse-highlight {
  0%, 100% {
    background-color: transparent;
    box-shadow: none;
  }
  50% {
    background-color: rgba(59, 130, 246, 0.1);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }
}
</style> 







