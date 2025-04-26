<template>
  <node-view-wrapper 
    class="theorem-block" 
    :class="{ 
      'border border-border rounded-md p-4 my-4': !isReadOnly,
      'my-4': isReadOnly
    }"
  >
    <Card class="shadow-sm">
      <CardHeader class="pb-2">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-2">
            <div class="theorem-type font-bold text-primary">
              {{ capitalizeType }}{{ number ? ' ' + number : '' }}
            </div>
            <div v-if="title" class="theorem-title font-medium">
              ({{ title }})
            </div>
          </div>
          <div class="flex items-center space-x-2" v-if="!isReadOnly">
            <Button 
              variant="ghost" 
              size="sm" 
              title="Edit theorem"
              @click="startEditing" 
              v-if="!isEditing"
            >
              <Pencil class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <!-- View mode -->
        <div v-if="!isEditing">
          <!-- Theorem content with LaTeX rendering -->
          <div class="theorem-content mb-4">
            <MathDisplay 
              :latex="content" 
              :isReadOnly="true"
              :numbered="false"
            />
          </div>
          
          <!-- Collapsible proof section -->
          <Collapsible v-if="proof">
            <div class="flex items-center space-x-2 mb-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" class="flex items-center">
                  <ChevronRight v-if="!isProofOpen" class="h-4 w-4 mr-1" />
                  <ChevronDown v-else class="h-4 w-4 mr-1" />
                  <span class="font-medium italic">Proof</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            
            <CollapsibleContent>
              <div class="pl-4 border-l-2 border-muted-foreground/20 ml-2 mb-2">
                <div class="theorem-proof">
                  <MathDisplay 
                    :latex="proof" 
                    :isReadOnly="true"
                    :numbered="false"
                  />
                </div>
                <div class="flex justify-end mt-2">
                  <div class="proof-end">■</div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        
        <!-- Edit mode -->
        <div v-else class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="theorem-type">Type</Label>
              <Select :value="type" @update:value="updateType">
                <SelectTrigger>
                  <SelectValue :placeholder="capitalizeType" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="theorem">Theorem</SelectItem>
                  <SelectItem value="lemma">Lemma</SelectItem>
                  <SelectItem value="proposition">Proposition</SelectItem>
                  <SelectItem value="corollary">Corollary</SelectItem>
                  <SelectItem value="definition">Definition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div class="space-y-2">
              <Label for="theorem-title">Title (optional)</Label>
              <Input
                id="theorem-title"
                :value="title"
                @input="updateTitle"
                placeholder="Theorem title"
              />
            </div>
          </div>
          
          <div class="space-y-2">
            <Label for="theorem-content">Content (LaTeX)</Label>
            <Textarea
              id="theorem-content"
              :value="content"
              @input="updateContent"
              placeholder="Enter theorem content in LaTeX..."
              rows="4"
              class="font-mono"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="theorem-proof">Proof (LaTeX, optional)</Label>
            <Textarea
              id="theorem-proof"
              :value="proof"
              @input="updateProof"
              placeholder="Enter proof in LaTeX..."
              rows="6"
              class="font-mono"
            />
          </div>
          
          <div class="flex justify-end space-x-2">
            <Button variant="outline" @click="cancelEditing">
              Cancel
            </Button>
            <Button @click="saveChanges">
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'
import { Pencil, ChevronRight, ChevronDown } from 'lucide-vue-next'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import MathDisplay from '../math-block/MathDisplay.vue'
import { logger } from '@/services/logger'

// Props - use NodeViewProps interface
const props = defineProps<NodeViewProps>()

// State
const isEditing = ref(false)
const isProofOpen = ref(false)
const title = ref(props.node.attrs.title || '')
const content = ref(props.node.attrs.content || '')
const proof = ref(props.node.attrs.proof || '')
const type = ref(props.node.attrs.type || 'theorem')
const number = ref(props.node.attrs.number || null)

// Computed properties
const isReadOnly = computed(() => !props.editor.isEditable)
const capitalizeType = computed(() => {
  return type.value.charAt(0).toUpperCase() + type.value.slice(1)
})

// Update methods
const updateTitle = (event: Event) => {
  title.value = (event.target as HTMLInputElement).value
}

const updateContent = (event: Event) => {
  content.value = (event.target as HTMLTextAreaElement).value
}

const updateProof = (event: Event) => {
  proof.value = (event.target as HTMLTextAreaElement).value
}

const updateType = (value: string) => {
  type.value = value
}

// Editing methods
const startEditing = () => {
  if (isReadOnly.value) return
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
  // Reset to the original values
  title.value = props.node.attrs.title || ''
  content.value = props.node.attrs.content || ''
  proof.value = props.node.attrs.proof || ''
  type.value = props.node.attrs.type || 'theorem'
}

const saveChanges = () => {
  isEditing.value = false
  props.updateAttributes({
    title: title.value,
    content: content.value,
    proof: proof.value,
    type: type.value,
  })
}

// Watch for external changes to the node
watch(
  () => props.node.attrs,
  (newAttrs) => {
    title.value = newAttrs.title || ''
    content.value = newAttrs.content || ''
    proof.value = newAttrs.proof || ''
    type.value = newAttrs.type || 'theorem'
    number.value = newAttrs.number || null
  },
  { deep: true }
)

// Watch for changes in read-only status
watch(isReadOnly, (newValue) => {
  // Force stop editing when switched to read-only
  if (newValue && isEditing.value) {
    saveChanges()
  }
})
</script>

<style>
.theorem-block .proof-end {
  width: 1.5em;
  text-align: right;
  font-weight: bold;
}

.theorem-type {
  color: var(--primary);
}

.theorem-content, .theorem-proof {
  line-height: 1.6;
}

.theorem-proof {
  font-style: italic;
}
</style>