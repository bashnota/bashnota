<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onBeforeUnmount, watch } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useSubNotaDialog } from '@/features/editor/composables/useSubNotaDialog'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'
import { CheckIcon, XIcon, LoaderIcon, FileTextIcon, FolderIcon } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db } from '@/db'

const { state, closeSubNotaDialog, handleSuccess } = useSubNotaDialog()

const notaStore = useNotaStore()
const title = ref('')
const isLoading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const errorMessage = ref('')
const parentName = ref('')
const charCount = ref(0)
const maxChars = 50
const showParentNote = ref(false)
const isSubmitted = ref(false)

// Character count tracking
watch(title, (newValue) => {
  charCount.value = newValue.length
  if (charCount.value > maxChars) {
    title.value = title.value.slice(0, maxChars)
    charCount.value = maxChars
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

const isValid = computed(() => {
  return title.value.trim().length > 0 && title.value.length <= maxChars
})

const handleClose = () => {
  closeSubNotaDialog()
}

onMounted(async () => {
  await nextTick()
  if (inputRef.value) {
    inputRef.value.focus()
  }
  
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

const createSubNota = async () => {
  // Prevent multiple submissions
  if (!isValid.value || isLoading.value || isSubmitted.value) return

  errorMessage.value = ''
  isLoading.value = true
  isSubmitted.value = true

  // Make absolutely sure parentId is a string (not undefined, empty string, etc.)
  // If it's an invalid parentId, explicitly pass null instead of undefined/empty string
  const parentId = state.value.parentId && state.value.parentId.trim() !== '' ? state.value.parentId : null
  
  try {
    const newNota = await notaStore.createItem(title.value.trim(), parentId)
    
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
    toast(`"${title.value}" created successfully${parentContext}`)
    
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
    
    handleSuccess(newNota.id, title.value)
  } catch (error) {
    logger.error('Failed to create nota:', error)
    errorMessage.value = 'Failed to create sub nota. Please try again.'
    isSubmitted.value = false
    isLoading.value = false
  } 
}

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
        
        <form @submit.prevent="isValid && !isLoading && createSubNota()" class="space-y-4">
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <Label for="nota-title">Title</Label>
              <span class="text-xs text-muted-foreground" :class="{ 'text-destructive': charCount >= maxChars }">
                {{ charCount }}/{{ maxChars }}
              </span>
            </div>
            
            <Input
              id="nota-title"
              ref="inputRef"
              v-model="title"
              type="text"
              placeholder="Enter title for your new nota"
              :class="{ 'border-destructive': errorMessage }"
              :disabled="isLoading"
              @keydown.esc.prevent="cancel()"
              maxlength="50"
              autocomplete="off"
              required
            />
            
            <p v-if="errorMessage" class="text-sm text-destructive flex items-center">
              <XIcon class="w-3.5 h-3.5 mr-1" />
              {{ errorMessage }}
            </p>
            
            <p v-else class="text-xs text-muted-foreground">
              Press Enter to create, Esc to cancel
            </p>
          </div>
        </form>
      </div>

      <DialogFooter class="p-6 pt-0">
        <Button 
          variant="outline" 
          @click="cancel"
          :disabled="isLoading"
        >
          <XIcon class="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button 
          @click="createSubNota"
          :disabled="!isValid || isLoading"
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







