<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onBeforeUnmount, watch } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { toast } from '@/lib/utils'
import { logger } from '@/services/logger'
import { CheckIcon, XIcon, LoaderIcon, FileTextIcon, FolderIcon } from 'lucide-vue-next'
import { db } from '@/db'

const props = defineProps<{
  parentId: string
  onSuccess: (newNotaId: string, title: string) => void
  onCancel: () => void
}>()

const emit = defineEmits(['close', 'outside-click'])

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
    if (!props.parentId) return
    
    const parentNota = await db.notas.get(props.parentId)
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

const handleOutsideClick = (event: MouseEvent) => {
  const dialogElement = document.querySelector('.subnota-dialog')
  if (dialogElement && !dialogElement.contains(event.target as Node)) {
    cancel()
    emit('outside-click')
  }
}

onMounted(async () => {
  await nextTick()
  if (inputRef.value) {
    inputRef.value.focus()
  }
  
  // Add outside click handler after a small delay to prevent immediate closing
  setTimeout(() => {
    document.addEventListener('mousedown', handleOutsideClick)
  }, 100)
  
  // Fetch parent nota info
  fetchParentTitle()
})

// Clean up event listeners
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})

const handleKeyDown = (event: KeyboardEvent) => {
  // Only handle global keyboard events here, not input-specific ones
  if (event.key === 'Escape' && !event.defaultPrevented) {
    cancel()
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
  const parentId = props.parentId && props.parentId.trim() !== '' ? props.parentId : null
  
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
    
    props.onSuccess(newNota.id, title.value)
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
  props.onCancel()
  emit('close')
}
</script>

<template>
  <div 
    class="subnota-dialog bg-popover border border-border rounded-md shadow-lg overflow-hidden transition-all duration-200 animate-in" 
    @keydown="handleKeyDown"
    role="dialog"
    aria-labelledby="subnota-dialog-title"
  >
    <div class="px-4 py-3 border-b border-border flex items-center justify-between">
      <h3 id="subnota-dialog-title" class="text-base font-medium flex items-center">
        <FileTextIcon class="w-4 h-4 mr-2" />
        Create Sub Nota
      </h3>
      <button 
        @click="cancel" 
        class="p-1 rounded-full hover:bg-accent/50 transition-colors"
        aria-label="Close"
      >
        <XIcon class="w-4 h-4" />
      </button>
    </div>
    
    <div class="p-4">
      <!-- Parent note information if available -->
      <div v-if="showParentNote" class="mb-3 p-2 rounded-md bg-muted flex items-center text-sm">
        <FolderIcon class="w-4 h-4 mr-2 text-muted-foreground" />
        <span>Creating under: <strong>{{ parentName }}</strong></span>
      </div>
      
      <form @submit.prevent="isValid && !isLoading && createSubNota()">
        <div class="mb-4">
          <div class="flex justify-between items-center mb-1">
            <label for="nota-title" class="block text-sm font-medium">Title</label>
            <span class="text-xs text-muted-foreground" :class="{ 'text-destructive': charCount >= maxChars }">
              {{ charCount }}/{{ maxChars }}
            </span>
          </div>
          
          <input
            id="nota-title"
            ref="inputRef"
            v-model="title"
            type="text"
            placeholder="Enter title for your new nota"
            class="w-full px-3 py-2 bg-input rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
            :class="{ 'border-destructive': errorMessage }"
            :disabled="isLoading"
            @keydown.esc.prevent="cancel()"
            maxlength="50"
            autocomplete="off"
            required
          />
          
          <p v-if="errorMessage" class="mt-1 text-sm text-destructive flex items-center">
            <XIcon class="w-3.5 h-3.5 mr-1" />
            {{ errorMessage }}
          </p>
          
          <p v-else class="mt-1 text-xs text-muted-foreground">
            Press Enter to create, Esc to cancel
          </p>
        </div>

        <div class="flex justify-end space-x-2">
          <button 
            type="button" 
            class="px-3 py-1.5 rounded-md border border-border hover:bg-accent text-sm font-medium flex items-center transition-colors"
            @click="cancel"
            :disabled="isLoading"
          >
            <XIcon class="w-4 h-4 mr-1" />
            Cancel
          </button>
          <button 
            type="submit" 
            class="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium flex items-center transition-colors"
            :disabled="!isValid || isLoading"
          >
            <LoaderIcon v-if="isLoading" class="w-4 h-4 mr-1 animate-spin" />
            <CheckIcon v-else class="w-4 h-4 mr-1" />
            Create
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.subnota-dialog {
  min-width: 400px;
  max-width: 95vw;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.animate-in {
  animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(5px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Input focus styles */
input:focus {
  box-shadow: 0 0 0 2px var(--primary-color, rgba(59, 130, 246, 0.5));
}

/* Button hover effect */
button {
  position: relative;
  overflow: hidden;
}

button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.3);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%, -50%);
  transform-origin: 50% 50%;
}

button:focus:not(:disabled)::after {
  animation: ripple 0.6s ease-out;
}

@keyframes ripple {
  0% {
    transform: scale(0, 0);
    opacity: 0.5;
  }
  100% {
    transform: scale(30, 30);
    opacity: 0;
  }
}
</style>

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







