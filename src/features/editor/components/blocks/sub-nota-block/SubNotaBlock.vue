<template>
  <NodeViewWrapper class="sub-nota-block">
    <div 
      class="sub-nota-link block w-full p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors relative group"
      :class="linkStyleClasses"
      @click="navigateToNota"
      :title="`Go to: ${targetNotaTitle}`"
    >
      <!-- Drag handle -->
      <div 
        class="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        @mousedown="startDrag"
        title="Drag to reorder"
      >
        <div class="w-1 h-8 bg-muted-foreground/30 rounded-full"></div>
      </div>
      
      <div class="flex items-center justify-between ml-6">
        <div class="flex items-center gap-2">
          <FileText class="w-4 h-4 text-muted-foreground" />
          <span class="font-medium">{{ displayText || targetNotaTitle }}</span>
        </div>
        
        <!-- Edit button -->
        <button
          v-if="isEditing"
          @click.stop="editLink"
          class="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          title="Edit link"
        >
          <Edit class="w-4 h-4" />
        </button>
      </div>
      
      <!-- Additional metadata -->
      <div class="mt-2 text-sm text-muted-foreground ml-6">
        <span>📄 Sub-nota link</span>
        <span v-if="targetNotaTitle" class="ml-2">• {{ targetNotaTitle }}</span>
      </div>
    </div>

    <!-- Edit Dialog -->
    <Dialog :open="showEditDialog" @update:open="showEditDialog = false">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Sub-Nota Link</DialogTitle>
          <DialogDescription>
            Modify the link to the sub-nota
          </DialogDescription>
        </DialogHeader>
        
        <div class="space-y-4">
          <FormField v-slot="{ componentField }" name="displayText">
            <FormItem>
              <FormLabel>Display Text</FormLabel>
              <FormControl>
                <Input
                  v-model="editForm.displayText"
                  placeholder="Text to display"
                  v-bind="componentField"
                />
              </FormControl>
              <FormDescription>
                Optional custom text to display instead of the nota title
              </FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="linkStyle">
            <FormItem>
              <FormLabel>Link Style</FormLabel>
              <FormControl>
                <Select v-model="editForm.linkStyle" v-bind="componentField">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inline">Inline</SelectItem>
                    <SelectItem value="button">Button</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                Choose how the link should be displayed
              </FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showEditDialog = false">Cancel</Button>
          <Button @click="saveChanges">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'
import { FileText, Edit } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'vue-sonner'
import { NodeViewWrapper } from '@tiptap/vue-3'

interface Props {
  node: {
    attrs: {
      targetNotaId: string
      targetNotaTitle: string
      displayText?: string
      linkStyle?: 'inline' | 'button' | 'card'
    }
  }
  updateAttributes: (attrs: any) => void
  isEditing?: boolean
}

const props = defineProps<Props>()
const router = useRouter()
const notaStore = useNotaStore()

// State
const showEditDialog = ref(false)
const editForm = ref({
  displayText: props.node.attrs.displayText || '',
  linkStyle: props.node.attrs.linkStyle || 'inline'
})

// Computed
const targetNotaId = computed(() => props.node.attrs.targetNotaId)
const targetNotaTitle = computed(() => props.node.attrs.targetNotaTitle)
const displayText = computed(() => props.node.attrs.displayText || props.node.attrs.targetNotaTitle)
const linkStyle = computed(() => props.node.attrs.linkStyle || 'inline')

const linkStyleClasses = computed(() => {
  switch (linkStyle.value) {
    case 'button':
      return 'bg-primary text-primary-foreground hover:bg-primary/90'
    case 'card':
      return 'bg-card text-card-foreground border-2 shadow-sm'
    default:
      return 'bg-background text-foreground'
  }
})

// Methods
const navigateToNota = () => {
  if (targetNotaId.value) {
    router.push(`/nota/${targetNotaId.value}`)
  } else {
    toast.error('Invalid nota link')
  }
}

const editLink = () => {
  editForm.value = {
    displayText: props.node.attrs.displayText || '',
    linkStyle: props.node.attrs.linkStyle || 'inline'
  }
  showEditDialog.value = true
}

const saveChanges = () => {
  props.updateAttributes({
    displayText: editForm.value.displayText || undefined,
    linkStyle: editForm.value.linkStyle
  })
  showEditDialog.value = false
  toast.success('Link updated successfully')
}

const startDrag = (event: MouseEvent) => {
  // Prevent the click event from firing
  event.stopPropagation()
  
  // The drag and drop functionality is handled by Tiptap's built-in drag and drop
  // This just provides a visual handle for users to grab
}

onMounted(() => {
  // Verify the target nota exists
  if (targetNotaId.value) {
    const targetNota = notaStore.getItem(targetNotaId.value)
    if (!targetNota) {
      toast.error(`Target nota not found: ${targetNotaTitle.value}`)
    }
  }
})
</script>

<style scoped>
.sub-nota-block {
  @apply select-none;
}
</style>
