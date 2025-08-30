<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TagsInput } from '@/components/ui/tags-input'
import TagsInputItem from '@/components/ui/tags-input/TagsInputItem.vue'
import TagsInputItemDelete from '@/components/ui/tags-input/TagsInputItemDelete.vue'
import TagsInputItemText from '@/components/ui/tags-input/TagsInputItemText.vue'
import TagsInputInput from '@/components/ui/tags-input/TagsInputInput.vue'
import {
  Edit,
  Star,
  Share2,
  Download,
  Trash2,
  Plus
} from 'lucide-vue-next'
import type { Nota } from '@/features/nota/types/nota'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'
import PublishNotaModal from '@/features/editor/components/dialogs/PublishNotaModal.vue'

interface Props {
  nota: Nota
  size?: 'sm' | 'default'
  variant?: 'ghost' | 'outline' | 'default'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  variant: 'ghost'
})

const emit = defineEmits<{
  'nota-updated': [nota: Nota]
  'nota-deleted': [id: string]
}>()

const router = useRouter()
const notaStore = useNotaStore()

// Dialog states
const showEditDialog = ref(false)
const showShareDialog = ref(false)
const isDeleting = ref(false)
const activeTab = ref('general')

// Form data
const editTitle = ref('')
const editTags = ref<string[]>([])
const isSaving = ref(false)

// Get all unique tags for suggestions
const allTags = computed(() => {
  const tagSet = new Set<string>()
  notaStore.items.forEach(nota => {
    if (nota.tags) {
      nota.tags.forEach(tag => tagSet.add(tag))
    }
  })
  return Array.from(tagSet).sort()
})

// Start editing nota
const startEdit = () => {
  editTitle.value = props.nota.title
  editTags.value = [...(props.nota.tags || [])]
  showEditDialog.value = true
  activeTab.value = 'general'
}

// Save all changes
const saveChanges = async () => {
  if (!editTitle.value.trim()) {
    toast({
      title: 'Error',
      description: 'Title cannot be empty',
      variant: 'destructive'
    })
    return
  }

  isSaving.value = true
  try {
    // Validate and clean tags
    const validatedTags = editTags.value
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .filter((tag, index, self) => self.indexOf(tag) === index)
      .map(tag => tag.length > 30 ? tag.substring(0, 30) : tag)

    // Update title if changed
    if (editTitle.value.trim() !== props.nota.title) {
      await notaStore.renameItem(props.nota.id, editTitle.value.trim())
    }

    // Update tags if changed
    const currentTags = props.nota.tags || []
    if (JSON.stringify(validatedTags.sort()) !== JSON.stringify(currentTags.sort())) {
      await notaStore.saveNota({
        id: props.nota.id,
        tags: validatedTags,
        updatedAt: new Date()
      })
    }

    const updatedNota = notaStore.getItem(props.nota.id)
    if (updatedNota) {
      emit('nota-updated', updatedNota)
    }
    
    showEditDialog.value = false
    toast({
      title: 'Success',
      description: 'Nota updated successfully'
    })
  } catch (error) {
    logger.error('Failed to update nota:', error)
    toast({
      title: 'Error',
      description: 'Failed to update nota',
      variant: 'destructive'
    })
  } finally {
    isSaving.value = false
  }
}

// Toggle favorite
const toggleFavorite = async () => {
  try {
    await notaStore.toggleFavorite(props.nota.id)
    const updatedNota = notaStore.getItem(props.nota.id)
    if (updatedNota) {
      emit('nota-updated', updatedNota)
    }
    toast({
      title: 'Success',
      description: props.nota.favorite ? 'Removed from favorites' : 'Added to favorites'
    })
  } catch (error) {
    logger.error('Failed to toggle favorite:', error)
    toast({
      title: 'Error',
      description: 'Failed to update favorite status',
      variant: 'destructive'
    })
  }
}

// Export/Download nota
const exportNota = async () => {
  try {
    await notaStore.exportNota(props.nota.id)
    
    toast({
      title: 'Success',
      description: 'Nota exported successfully'
    })
  } catch (error) {
    logger.error('Error exporting nota:', error)
    toast({
      title: 'Error',
      description: 'Failed to export nota',
      variant: 'destructive'
    })
  }
}

// Delete nota
const deleteNota = async () => {
  if (!confirm('Are you sure you want to delete this nota? This action cannot be undone.')) {
    return
  }

  isDeleting.value = true
  try {
    await notaStore.deleteItem(props.nota.id)
    emit('nota-deleted', props.nota.id)
    toast({
      title: 'Success',
      description: 'Nota deleted successfully'
    })
    
    // Navigate away if we're currently viewing this nota
    if (router.currentRoute.value.params.id === props.nota.id) {
      router.push('/')
    }
  } catch (error) {
    logger.error('Failed to delete nota:', error)
    toast({
      title: 'Error',
      description: 'Failed to delete nota',
      variant: 'destructive'
    })
  } finally {
    isDeleting.value = false
  }
}

// Share nota
const shareNota = () => {
  showShareDialog.value = true
}

// Add quick tag
const addQuickTag = (tag: string) => {
  if (!editTags.value.includes(tag)) {
    editTags.value.push(tag)
  }
}

// Get recent tags that aren't already on this nota
const recentTags = computed(() => {
  const currentTags = props.nota.tags || []
  
  return notaStore.items
    .filter(nota => nota.id !== props.nota.id)
    .sort((a, b) => {
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)
      return dateB.getTime() - dateA.getTime()
    })
    .flatMap(nota => nota.tags || [])
    .filter(tag => tag && !currentTags.includes(tag))
    .filter((tag, index, self) => self.indexOf(tag) === index)
    .slice(0, 5)
})

// Format date for display
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return 'N/A'
  const dateObj = date instanceof Date ? date : new Date(date)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}
</script>

<template>
  <Button
    :variant="variant"
    :size="size === 'sm' ? 'icon' : 'default'"
    :class="size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'"
    title="Edit nota"
    @click="startEdit"
  >
    <Edit class="h-4 w-4" />
  </Button>

  <!-- Unified Edit Dialog -->
  <Dialog v-model:open="showEditDialog">
    <DialogContent class="max-w-2xl max-h-[80vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle>Edit Nota</DialogTitle>
      </DialogHeader>
      
      <Tabs v-model="activeTab" class="flex-1 overflow-hidden">
        <TabsList class="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="metadata">Info</TabsTrigger>
        </TabsList>
        
        <div class="mt-4 overflow-y-auto max-h-[60vh]">
          <TabsContent value="general" class="space-y-6 mt-0">
            <!-- Title Section -->
            <div class="space-y-2">
              <Label for="nota-title" class="text-sm font-medium">Title</Label>
              <Input
                id="nota-title"
                v-model="editTitle"
                placeholder="Enter nota title..."
                class="w-full"
              />
            </div>
            
            <!-- Tags Section -->
            <div class="space-y-2">
              <Label class="text-sm font-medium">Tags</Label>
              <TagsInput v-model="editTags" class="relative">
                <TagsInputItem v-for="tag in editTags" :key="tag" :value="tag">
                  <TagsInputItemText />
                  <TagsInputItemDelete />
                </TagsInputItem>
                <TagsInputInput :placeholder="editTags.length ? '+' : 'Add tags...'" />
              </TagsInput>
              
              <!-- Recent tags suggestions -->
              <div v-if="recentTags.length > 0" class="space-y-2">
                <div class="text-xs text-muted-foreground">Recent tags:</div>
                <div class="flex flex-wrap gap-1">
                  <Button
                    v-for="tag in recentTags"
                    :key="tag"
                    variant="outline"
                    size="sm"
                    class="text-xs h-6 px-2"
                    @click="addQuickTag(tag)"
                  >
                    <Plus class="h-3 w-3 mr-1" />
                    {{ tag }}
                  </Button>
                </div>
              </div>
            </div>
            
            <!-- Favorite Toggle -->
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div class="font-medium">Favorite</div>
                <div class="text-sm text-muted-foreground">Mark this nota as a favorite</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                @click="toggleFavorite"
                class="flex items-center gap-2"
              >
                <Star 
                  class="h-4 w-4" 
                  :class="nota.favorite ? 'text-yellow-500 fill-current' : ''" 
                />
                {{ nota.favorite ? 'Remove' : 'Add' }}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="actions" class="space-y-6 mt-0">
            <!-- Quick Actions -->
            <div class="space-y-4">
              <div>
                <Label class="text-sm font-medium mb-3 block">Quick Actions</Label>
                <div class="space-y-3">
                  <!-- Favorite Toggle -->
                  <div class="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div class="font-medium">Favorite</div>
                      <div class="text-sm text-muted-foreground">Mark this nota as a favorite</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      @click="toggleFavorite"
                      class="flex items-center gap-2"
                    >
                      <Star 
                        class="h-4 w-4" 
                        :class="nota.favorite ? 'text-yellow-500 fill-current' : ''" 
                      />
                      {{ nota.favorite ? 'Remove' : 'Add' }}
                    </Button>
                  </div>
                  
                  <!-- Share -->
                  <Button
                    variant="outline"
                    size="sm"
                    @click="shareNota"
                    class="w-full justify-start gap-2"
                  >
                    <Share2 class="h-4 w-4" />
                    Share Nota
                  </Button>
                  
                  <!-- Export -->
                  <Button
                    variant="outline"
                    size="sm"
                    @click="() => { exportNota(); showEditDialog = false }"
                    class="w-full justify-start gap-2"
                  >
                    <Download class="h-4 w-4" />
                    Export/Download
                  </Button>
                </div>
              </div>
              
              <!-- Danger Zone -->
              <div class="pt-4 border-t">
                <Label class="text-sm font-medium mb-3 block text-destructive">Danger Zone</Label>
                <Button
                  variant="destructive"
                  size="sm"
                  @click="() => { deleteNota(); showEditDialog = false }"
                  :disabled="isDeleting"
                  class="w-full justify-start gap-2"
                >
                  <Trash2 class="h-4 w-4" />
                  {{ isDeleting ? 'Deleting...' : 'Delete Nota' }}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="metadata" class="space-y-6 mt-0">
            <!-- Nota Info -->
            <div class="space-y-4">
              <div class="space-y-2">
                <Label class="text-sm font-medium">Created</Label>
                <div class="text-sm text-muted-foreground">
                  {{ formatDate(nota.createdAt) }}
                </div>
              </div>
              
              <div class="space-y-2">
                <Label class="text-sm font-medium">Last Modified</Label>
                <div class="text-sm text-muted-foreground">
                  {{ formatDate(nota.updatedAt) }}
                </div>
              </div>
              
              <div class="space-y-2">
                <Label class="text-sm font-medium">Nota ID</Label>
                <div class="text-xs text-muted-foreground font-mono break-all">
                  {{ nota.id }}
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
      
      <!-- Dialog Actions -->
      <div class="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" @click="showEditDialog = false" :disabled="isSaving">
          Cancel
        </Button>
        <Button @click="saveChanges" :disabled="!editTitle.trim() || isSaving">
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Share Dialog -->
  <PublishNotaModal
    v-if="nota.id"
    :nota-id="nota.id"
    :open="showShareDialog"
    @update:open="showShareDialog = $event"
  />
</template>
