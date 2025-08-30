<template>
  <div class="sub-nota-manager">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">Sub-Nota Management</h3>
      <Button @click="showCreateDialog = true" size="sm">
        <Plus class="w-4 h-4 mr-2" />
        Add Sub-Nota
      </Button>
    </div>

    <!-- Hierarchy Display -->
    <div class="hierarchy-display mb-6">
      <h4 class="text-sm font-medium text-muted-foreground mb-3">Current Hierarchy</h4>
      <div class="space-y-2">
        <div 
          v-for="nota in hierarchy" 
          :key="nota.id"
          class="flex items-center gap-2 p-2 rounded-md border"
          :style="{ marginLeft: `${getNotaDepth(nota.id) * 20}px` }"
        >
          <FileText class="w-4 h-4 text-muted-foreground" />
          <span class="flex-1">{{ nota.title }}</span>
          <div class="flex items-center gap-1">
            <Button
              v-if="nota.id !== currentNotaId"
              variant="ghost"
              size="sm"
              @click="moveToNota(nota.id)"
              title="Move current nota here"
            >
              <ArrowDown class="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              @click="editNota(nota.id)"
              title="Edit nota"
            >
              <Edit class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-Notas List -->
    <div class="sub-notas-list">
      <h4 class="text-sm font-medium text-muted-foreground mb-3">
        Sub-Notas ({{ subNotas.length }})
      </h4>
      <div v-if="subNotas.length === 0" class="text-center py-8 text-muted-foreground">
        <FileText class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No sub-notas yet</p>
        <p class="text-sm">Create sub-notas to organize your content hierarchically</p>
      </div>
      <div v-else class="space-y-2">
        <div 
          v-for="subNota in subNotas" 
          :key="subNota.id"
          class="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50"
        >
          <div class="flex items-center gap-3">
            <FileText class="w-4 h-4 text-muted-foreground" />
            <div>
              <div class="font-medium">{{ subNota.title }}</div>
              <div class="text-sm text-muted-foreground">
                {{ formatDate(subNota.updatedAt) }}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              @click="openNota(subNota.id)"
              title="Open nota"
            >
              <ExternalLink class="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              @click="editNota(subNota.id)"
              title="Edit nota"
            >
              <Edit class="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              @click="moveToRoot(subNota.id)"
              title="Move to root level"
            >
              <ArrowUp class="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              @click="deleteSubNota(subNota.id)"
              title="Delete nota"
              class="text-destructive hover:text-destructive"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Sub-Nota Dialog -->
    <Dialog :open="showCreateDialog" @update:open="showCreateDialog = false">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Sub-Nota</DialogTitle>
          <DialogDescription>
            Create a new nota under "{{ currentNota?.title }}"
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <FormField v-slot="{ componentField }" name="title">
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  v-model="newSubNotaTitle"
                  placeholder="Enter sub-nota title"
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showCreateDialog = false">Cancel</Button>
          <Button @click="createSubNota" :disabled="!newSubNotaTitle.trim()">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Move Nota Dialog -->
    <Dialog :open="showMoveDialog" @update:open="showMoveDialog = false">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Nota</DialogTitle>
          <DialogDescription>
            Select a new parent for "{{ notaToMove?.title }}"
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Available Parents</label>
            <div class="max-h-60 overflow-y-auto space-y-1">
              <div
                v-for="nota in availableParents"
                :key="nota.id"
                class="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50"
                @click="selectNewParent(nota.id)"
              >
                <FileText class="w-4 h-4" />
                <span>{{ nota.title }}</span>
              </div>
              <div
                class="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50"
                @click="selectNewParent(null)"
              >
                <Folder class="w-4 h-4" />
                <span>Root Level (No Parent)</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showMoveDialog = false">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  ExternalLink, 
  ArrowDown, 
  ArrowUp, 
  Folder 
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { Nota } from '@/features/nota/types/nota'

interface Props {
  currentNotaId: string
}

const props = defineProps<Props>()
const router = useRouter()
const notaStore = useNotaStore()

const emit = defineEmits<{
  'insert-sub-nota-link': [notaId: string, title: string]
}>()

// State
const showCreateDialog = ref(false)
const showMoveDialog = ref(false)
const newSubNotaTitle = ref('')
const notaToMove = ref<Nota | null>(null)

// Computed
const currentNota = computed(() => notaStore.getItem(props.currentNotaId))
const subNotas = computed(() => notaStore.getChildren(props.currentNotaId))
const hierarchy = computed(() => notaStore.getNotaHierarchy(props.currentNotaId))
const availableParents = computed(() => {
  return notaStore.items.filter(nota => 
    nota.id !== props.currentNotaId && 
    nota.id !== notaToMove.value?.id &&
    !notaStore.wouldCreateCircularReference(notaToMove.value?.id || '', nota.id)
  )
})

// Methods
const getNotaDepth = (notaId: string) => notaStore.getNotaDepth(notaId)

const formatDate = (date: Date | string) => {
  const d = new Date(date)
  return d.toLocaleDateString()
}

const createSubNota = async () => {
  if (!newSubNotaTitle.value.trim()) return
  
  try {
    const newNota = await notaStore.createSubNota(props.currentNotaId, newSubNotaTitle.value.trim())
    newSubNotaTitle.value = ''
    showCreateDialog.value = false
    
    // Emit event to insert a link to the new sub-nota
    emit('insert-sub-nota-link', newNota.id, newNota.title)
    
    toast.success('Sub-nota created successfully')
  } catch (error) {
    toast.error('Failed to create sub-nota')
    console.error(error)
  }
}

const moveToNota = (targetNotaId: string) => {
  notaToMove.value = currentNota.value || null
  if (notaToMove.value) {
    showMoveDialog.value = true
  }
}

const selectNewParent = async (newParentId: string | null) => {
  if (!notaToMove.value) return
  
  try {
    await notaStore.moveNota(notaToMove.value.id, newParentId)
    showMoveDialog.value = false
    notaToMove.value = null
    toast.success('Nota moved successfully')
  } catch (error) {
    toast.error('Failed to move nota')
    console.error(error)
  }
}

const moveToRoot = async (notaId: string) => {
  try {
    await notaStore.moveNota(notaId, null)
    toast.success('Nota moved to root level')
  } catch (error) {
    toast.error('Failed to move nota')
    console.error(error)
  }
}

const openNota = (notaId: string) => {
  router.push(`/nota/${notaId}`)
}

const editNota = (notaId: string) => {
  router.push(`/nota/${notaId}/edit`)
}

const deleteSubNota = async (notaId: string) => {
  if (confirm('Are you sure you want to delete this nota? This action cannot be undone.')) {
    try {
      await notaStore.deleteItem(notaId)
      toast.success('Nota deleted successfully')
    } catch (error) {
      toast.error('Failed to delete nota')
      console.error(error)
    }
  }
}

onMounted(() => {
  if (!currentNota.value) {
    toast.error('Current nota not found')
  }
})
</script>

<style scoped>
.sub-nota-manager {
  @apply p-6 bg-background border rounded-lg;
}

.hierarchy-display {
  @apply bg-muted/30 rounded-lg p-4;
}

.sub-notas-list {
  @apply bg-muted/30 rounded-lg p-4;
}
</style>
