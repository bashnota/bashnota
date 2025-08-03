<template>
  <node-view-wrapper 
    class="theorem-block" 
    :class="{ 
      'border border-border rounded-md p-4 my-4': !isReadOnly,
      'my-4': isReadOnly,
      'cursor-pointer': !isReadOnly && !isEditing
    }"
    @keydown="handleKeyDown"
    @dblclick="!isReadOnly && startEditing()"
  >
    <Card class="shadow-sm theorem-card" :class="{
      'border-primary/10 bg-primary/5': isTheorem,
      'border-blue-500/10 bg-blue-500/5': isLemma,
      'border-amber-500/10 bg-amber-500/5': isProposition,
      'border-emerald-500/10 bg-emerald-500/5': isCorollary,
      'border-violet-500/10 bg-violet-500/5': isDefinition
    }">
      <CardHeader class="pb-2 flex-row justify-between items-center space-y-0">
        <div class="flex items-center space-x-2">
          <div class="theorem-type font-bold" :class="{
            'text-primary': isTheorem,
            'text-blue-500': isLemma,
            'text-amber-500': isProposition,
            'text-emerald-500': isCorollary,
            'text-violet-500': isDefinition
          }">
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
            class="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil class="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <!-- View mode -->
        <div v-if="!isEditing" @click="!isReadOnly && startEditing()" class="cursor-pointer">
          <!-- Theorem content with LaTeX rendering -->
          <div class="theorem-content mb-4">
            <MixedContentDisplay 
              :content="content" 
            />
          </div>
          
          <!-- Collapsible proof section -->
          <Collapsible v-if="proof" v-model:open="isProofOpen" @click.stop>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" class="flex items-center w-auto h-auto px-2 py-1 text-muted-foreground hover:text-foreground transition-colors" @click.stop>
                <ChevronRight v-if="!isProofOpen" class="h-4 w-4 mr-1 transition-transform" />
                <ChevronDown v-else class="h-4 w-4 mr-1 transition-transform" />
                <span class="font-medium italic">Proof</span>
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent
              class="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
            >
              <div class="pl-4 border-l-2 border-muted-foreground/20 ml-2 mb-2 mt-2">
                <div class="theorem-proof">
                  <MixedContentDisplay 
                    :content="proof" 
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
          <form ref="formRef" @submit.prevent="saveChanges">
            <Tabs v-model="activeTab" class="w-full">
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="proof">Proof</TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" class="space-y-4 mt-2">
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
                      v-model="title"
                      placeholder="Theorem title"
                    />
                  </div>
                </div>
                
                <div class="space-y-2">
                  <Label for="theorem-content" class="flex items-center justify-between">
                    <span>Content (LaTeX)</span>
                    <div class="flex items-center text-xs text-muted-foreground">
                      <Keyboard class="h-3 w-3 mr-1" />
                      <span>Supports LaTeX math syntax</span>
                    </div>
                  </Label>
                  <Textarea
                    id="theorem-content"
                    v-model="content"
                    placeholder="Enter theorem content in LaTeX... e.g., Let $f: \\mathbb{R} \\to \\mathbb{R}$ be a function..."
                    rows="6"
                    class="font-mono resize-y"
                    ref="contentTextareaRef"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="proof" class="space-y-4 mt-2">
                <div class="space-y-2">
                  <Label for="theorem-proof" class="flex items-center justify-between">
                    <span>Proof (LaTeX, optional)</span>
                    <div class="flex items-center text-xs text-muted-foreground">
                      <Keyboard class="h-3 w-3 mr-1" />
                      <span>Supports LaTeX math syntax</span>
                    </div>
                  </Label>
                  <Textarea
                    id="theorem-proof"
                    v-model="proof"
                    placeholder="Enter proof in LaTeX... e.g., Suppose $x \\in X$. Then..."
                    rows="8"
                    class="font-mono resize-y"
                  />
                  <p class="text-xs text-muted-foreground mt-1">
                    Leave empty if no proof is needed (e.g., for definitions). 
                    A proof end symbol (■) will be automatically added.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            
            <div class="flex justify-end space-x-2 pt-2 border-t mt-4">
              <Button type="button" variant="outline" @click="cancelEditing" class="w-24">
                Cancel
              </Button>
              <Button type="submit" class="w-24">
                Save
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'
import { Pencil, ChevronRight, ChevronDown, Keyboard } from 'lucide-vue-next'
import { Card, CardContent, CardHeader } from '@/ui/card'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
import { Label } from '@/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/ui/select'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/ui/collapsible'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/ui/tabs'
import MixedContentDisplay from './MixedContentDisplay.vue'
import { logger } from '@/services/logger'
import { toast } from 'vue-sonner'

// Props - use NodeViewProps interface
const props = defineProps<NodeViewProps>()

// Create a prefixed logger for better debugging
const theoremLogger = logger.createPrefixedLogger('TheoremBlock')

// State
const isEditing = ref(false)
const isProofOpen = ref(false)
const title = ref(props.node.attrs.title || '')
const content = ref(props.node.attrs.content || '')
const proof = ref(props.node.attrs.proof || '')
const type = ref(props.node.attrs.type || 'theorem')
const number = ref(props.node.attrs.number || null)

// Track active tab to properly initialize fields
const activeTab = ref('content')

// Computed properties
const isReadOnly = computed(() => !props.editor.isEditable)
const capitalizeType = computed(() => {
  return type.value.charAt(0).toUpperCase() + type.value.slice(1)
})

// Type-specific computed properties for styling
const isTheorem = computed(() => type.value === 'theorem')
const isLemma = computed(() => type.value === 'lemma')
const isProposition = computed(() => type.value === 'proposition')
const isCorollary = computed(() => type.value === 'corollary')
const isDefinition = computed(() => type.value === 'definition')

// Automatically open proof when editing
watch(isEditing, (newValue) => {
  if (newValue && proof.value) {
    isProofOpen.value = true
  }
})

// Update methods
const updateType = (value: string) => {
  type.value = value
}

// Editing methods
const startEditing = () => {
  if (isReadOnly.value) return
  
  // Ensure values are correctly set from node attributes before editing
  title.value = props.node.attrs.title || ''
  content.value = props.node.attrs.content || ''
  proof.value = props.node.attrs.proof || ''
  type.value = props.node.attrs.type || 'theorem'
  
  isEditing.value = true
  focusContentTextarea()
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
  try {
    theoremLogger.debug('Starting save process with current values:', {
      title: title.value,
      content: content.value,
      proof: proof.value,
      type: type.value
    })
    
    if (!content.value.trim()) {
      theoremLogger.warn('Empty content detected, showing error toast')
      toast('Please add content to your theorem before saving.', { description: 'Content Required' })
      return
    }
    
    isEditing.value = false
    
    // Log the values being sent to updateAttributes
    theoremLogger.debug('Calling updateAttributes with:', {
      title: title.value,
      content: content.value,
      proof: proof.value,
      type: type.value
    })
    
    // Update the node attributes
    props.updateAttributes({
      title: title.value,
      content: content.value,
      proof: proof.value,
      type: type.value,
    })
    
    // Verify that the update was applied
    theoremLogger.debug('Node attributes after update:', props.node.attrs)
    
    // Show success message
    savedSuccessfully()
  } catch (err) {
    theoremLogger.error('Error saving theorem:', err)
    toast('Error saving theorem', { description: 'Save Error' })
  }
}

// Vue lifecycle hooks
onMounted(() => {
  theoremLogger.debug('TheoremBlock mounted with initial attrs:', props.node.attrs)
})

// Watch for external changes to the node with immediate handler
watch(
  () => props.node.attrs,
  (newAttrs) => {
    theoremLogger.debug('Node attrs changed:', newAttrs)
    
    // Update the local state with the new values from node attributes
    title.value = newAttrs.title || ''
    content.value = newAttrs.content || ''
    proof.value = newAttrs.proof || ''
    type.value = newAttrs.type || 'theorem'
    number.value = newAttrs.number || null
  },
  { deep: true, immediate: true } // Immediate ensures it runs on component creation
)

// Watch for changes in read-only status
watch(isReadOnly, (newValue) => {
  // Force stop editing when switched to read-only
  if (newValue && isEditing.value) {
    saveChanges()
  }
})

// Handle tab change
const handleTabChange = (tab: string) => {
  activeTab.value = tab
  theoremLogger.debug('Tab changed to:', tab)
}

// Focus the content textarea when entering edit mode
const focusContentTextarea = () => {
  nextTick(() => {
    const contentTextarea = document.getElementById('theorem-content')
    if (contentTextarea && typeof contentTextarea.focus === 'function') {
      contentTextarea.focus()
      theoremLogger.debug('Successfully focused content textarea by ID')
    } else {
      theoremLogger.warn('Could not focus content textarea by ID')
    }
  })
}

// Keyboard shortcuts for the theorem block
const handleKeyDown = (event: KeyboardEvent) => {
  // Only process when in edit mode
  if (!isEditing.value) return
  
  // Save on Ctrl+Enter or Cmd+Enter
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    saveChanges()
    return
  }
  
  // Cancel on Escape
  if (event.key === 'Escape') {
    event.preventDefault()
    cancelEditing()
    return
  }
}

// Success message when theorem is saved
const savedSuccessfully = () => {
  toast(`${capitalizeType.value} saved successfully`)
}
</script>

<style>
.theorem-block .proof-end {
  width: 1.5em;
  text-align: right;
  font-weight: bold;
}

.theorem-content, .theorem-proof {
  line-height: 1.6;
}

.theorem-proof {
  font-style: italic;
}

.theorem-block {
  position: relative;
}

.theorem-block:hover .theorem-card {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
}

/* Only show edit button on hover */
.theorem-block {
  isolation: isolate;
}

.theorem-block:hover {
  z-index: 10;
}

/* Animations for collapsible content */
.animate-collapsible-down {
  animation: collapsibleDown 0.2s ease-out;
}

.animate-collapsible-up {
  animation: collapsibleUp 0.2s ease-out;
}

@keyframes collapsibleDown {
  from {
    height: 0;
    opacity: 0;
  }
  to {
    height: var(--radix-collapsible-content-height);
    opacity: 1;
  }
}

@keyframes collapsibleUp {
  from {
    height: var(--radix-collapsible-content-height);
    opacity: 1;
  }
  to {
    height: 0;
    opacity: 0;
  }
}
</style>








