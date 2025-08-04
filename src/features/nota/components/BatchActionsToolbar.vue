<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Star,
  Tag,
  Trash2,
  ChevronDown,
  X,
  Plus,
  Loader2
} from 'lucide-vue-next'
import type { Nota } from '@/features/nota/types/nota'
import type { BatchActionResult } from '@/features/nota/composables/useNotaBatchActions'

interface Props {
  selectedCount: number
  selectedIds: string[]
  selectedNotas: Nota[]
  allTags: string[]
  isProcessing?: boolean
}

interface Emits {
  (e: 'batch-toggle-favorite', selectedIds: string[]): void
  (e: 'batch-delete', selectedIds: string[]): void
  (e: 'batch-add-tags', selectedIds: string[], tags: string[]): void
  (e: 'batch-remove-tags', selectedIds: string[], tags: string[]): void
  (e: 'clear-selection'): void
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false
})

const emit = defineEmits<Emits>()

// Dialog states
const showDeleteDialog = ref(false)
const showTagDialog = ref(false)
const tagAction = ref<'add' | 'remove'>('add')

// Tag management
const newTag = ref('')
const selectedTags = ref<string[]>([])

// Computed properties
const favoriteStatus = computed(() => {
  const favorites = props.selectedNotas.filter(nota => nota.favorite).length
  const total = props.selectedNotas.length
  
  if (favorites === 0) return 'none'
  if (favorites === total) return 'all'
  return 'mixed'
})

const favoriteButtonText = computed(() => {
  switch (favoriteStatus.value) {
    case 'all': return 'Remove from Favorites'
    case 'mixed': return 'Toggle Favorites'
    default: return 'Add to Favorites'
  }
})

// Tag dialog helpers
const availableTagsForAction = computed(() => {
  if (tagAction.value === 'add') {
    // For adding: show all available tags
    return props.allTags
  } else {
    // For removing: show only tags that exist on selected notas
    const commonTags = new Set<string>()
    props.selectedNotas.forEach(nota => {
      if (nota.tags) {
        nota.tags.forEach(tag => commonTags.add(tag))
      }
    })
    return Array.from(commonTags)
  }
})

// Action handlers
const handleToggleFavorite = () => {
  emit('batch-toggle-favorite', props.selectedIds)
}

const handleDelete = () => {
  showDeleteDialog.value = true
}

const confirmDelete = () => {
  emit('batch-delete', props.selectedIds)
  showDeleteDialog.value = false
}

const handleAddTags = () => {
  tagAction.value = 'add'
  selectedTags.value = []
  newTag.value = ''
  showTagDialog.value = true
}

const handleRemoveTags = () => {
  tagAction.value = 'remove'
  selectedTags.value = []
  newTag.value = ''
  showTagDialog.value = true
}

const addNewTag = () => {
  if (newTag.value.trim() && !selectedTags.value.includes(newTag.value.trim())) {
    selectedTags.value.push(newTag.value.trim())
    newTag.value = ''
  }
}

const removeTag = (tag: string) => {
  selectedTags.value = selectedTags.value.filter(t => t !== tag)
}

const toggleTag = (tag: string) => {
  if (selectedTags.value.includes(tag)) {
    removeTag(tag)
  } else {
    selectedTags.value.push(tag)
  }
}

const confirmTagAction = () => {
  if (selectedTags.value.length > 0) {
    if (tagAction.value === 'add') {
      emit('batch-add-tags', props.selectedIds, selectedTags.value)
    } else {
      emit('batch-remove-tags', props.selectedIds, selectedTags.value)
    }
  }
  showTagDialog.value = false
}

const handleClearSelection = () => {
  emit('clear-selection')
}
</script>

<template>
  <div class="flex items-center justify-between p-3 bg-primary/10 border-b border-primary/20">
    <div class="flex items-center gap-3">
      <Badge variant="secondary" class="bg-primary/20 text-primary">
        {{ selectedCount }} selected
      </Badge>
      
      <div class="flex items-center gap-1">
        <!-- Toggle Favorite -->
        <Button
          variant="outline"
          size="sm"
          :disabled="isProcessing"
          @click="handleToggleFavorite"
          class="h-8"
        >
          <Star class="h-4 w-4 mr-1" />
          {{ favoriteButtonText }}
        </Button>

        <!-- Tag Actions -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="outline"
              size="sm"
              :disabled="isProcessing"
              class="h-8"
            >
              <Tag class="h-4 w-4 mr-1" />
              Tags
              <ChevronDown class="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem @click="handleAddTags">
              <Plus class="h-4 w-4 mr-2" />
              Add Tags
            </DropdownMenuItem>
            <DropdownMenuItem 
              @click="handleRemoveTags"
              :disabled="availableTagsForAction.length === 0"
            >
              <X class="h-4 w-4 mr-2" />
              Remove Tags
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- Delete -->
        <Button
          variant="destructive"
          size="sm"
          :disabled="isProcessing"
          @click="handleDelete"
          class="h-8"
        >
          <Trash2 class="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <Loader2 v-if="isProcessing" class="h-4 w-4 animate-spin text-muted-foreground" />
      
      <Button
        variant="ghost"
        size="sm"
        @click="handleClearSelection"
        class="h-8"
      >
        <X class="h-4 w-4 mr-1" />
        Clear Selection
      </Button>
    </div>
  </div>

  <!-- Delete Confirmation Dialog -->
  <AlertDialog v-model:open="showDeleteDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Selected Notas</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete {{ selectedCount }} nota{{ selectedCount > 1 ? 's' : '' }}?
          This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction @click="confirmDelete" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Delete {{ selectedCount }} Nota{{ selectedCount > 1 ? 's' : '' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- Tag Management Dialog -->
  <Dialog v-model:open="showTagDialog">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{ tagAction === 'add' ? 'Add Tags' : 'Remove Tags' }}
        </DialogTitle>
        <DialogDescription>
          {{ tagAction === 'add' 
            ? `Add tags to ${selectedCount} selected nota${selectedCount > 1 ? 's' : ''}`
            : `Remove tags from ${selectedCount} selected nota${selectedCount > 1 ? 's' : ''}` 
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <!-- Add new tag (only for add action) -->
        <div v-if="tagAction === 'add'" class="flex gap-2">
          <Input
            v-model="newTag"
            placeholder="Add new tag..."
            @keydown.enter="addNewTag"
          />
          <Button @click="addNewTag" size="sm">
            <Plus class="h-4 w-4" />
          </Button>
        </div>

        <!-- Available tags -->
        <div v-if="availableTagsForAction.length > 0">
          <h4 class="text-sm font-medium mb-2">
            {{ tagAction === 'add' ? 'Available Tags' : 'Tags to Remove' }}
          </h4>
          <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            <Badge
              v-for="tag in availableTagsForAction"
              :key="tag"
              :variant="selectedTags.includes(tag) ? 'default' : 'secondary'"
              class="cursor-pointer"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </Badge>
          </div>
        </div>

        <!-- Selected tags -->
        <div v-if="selectedTags.length > 0">
          <h4 class="text-sm font-medium mb-2">Selected Tags</h4>
          <div class="flex flex-wrap gap-2">
            <Badge
              v-for="tag in selectedTags"
              :key="tag"
              variant="default"
              class="cursor-pointer"
              @click="removeTag(tag)"
            >
              {{ tag }}
              <X class="h-3 w-3 ml-1" />
            </Badge>
          </div>
        </div>

        <div v-if="tagAction === 'remove' && availableTagsForAction.length === 0">
          <p class="text-sm text-muted-foreground">No common tags found on selected notas.</p>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <Button variant="outline" @click="showTagDialog = false">
          Cancel
        </Button>
        <Button 
          @click="confirmTagAction"
          :disabled="selectedTags.length === 0"
        >
          {{ tagAction === 'add' ? 'Add Tags' : 'Remove Tags' }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
