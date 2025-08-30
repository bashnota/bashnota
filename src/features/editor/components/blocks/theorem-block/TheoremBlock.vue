<template>
  <node-view-wrapper 
    class="theorem-block group" 
    :class="{ 
      'my-4': true,
      'cursor-pointer': !isReadOnly && !isEditing
    }"
    @keydown="handleKeyDown"
  >
    <Card class="shadow-sm theorem-card transition-all duration-200 hover:shadow-md" :class="{
      'border-primary/20 bg-primary/5': isTheorem,
      'border-blue-500/20 bg-blue-500/5': isLemma,
      'border-amber-500/20 bg-amber-500/5': isProposition,
      'border-emerald-500/20 bg-emerald-500/5': isCorollary,
      'border-violet-500/20 bg-violet-500/5': isDefinition,
      'ring-2 ring-primary/20': isEditing
    }">
      <CardHeader class="pb-3 space-y-0">
        <div class="flex items-start justify-between">
          <div class="flex flex-col space-y-1">
            <div class="flex items-center space-x-2">
              <Badge variant="secondary" :class="{
                'bg-primary/10 text-primary hover:bg-primary/20': isTheorem,
                'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20': isLemma,
                'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20': isProposition,
                'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20': isCorollary,
                'bg-violet-500/10 text-violet-500 hover:bg-violet-500/20': isDefinition
              }">
                {{ capitalizeType }}{{ number ? ' ' + number : '' }}
              </Badge>
              <div v-if="currentTitle" class="text-sm font-medium text-muted-foreground">
                {{ currentTitle }}
              </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-1" v-if="!isReadOnly">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    @click="startEditing" 
                    v-if="!isEditing"
                    class="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                  >
                    <Pencil class="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit theorem</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenu v-if="!isEditing">
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  class="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                >
                  <MoreVertical class="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem @click="startEditing">
                  <Pencil class="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem @click="duplicateTheorem">
                  <Copy class="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="deleteTheorem" class="text-destructive">
                  <Trash2 class="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent class="pt-0">
        <!-- View mode -->
        <div v-if="!isEditing" @click="!isReadOnly && startEditing()" :class="{ 'cursor-pointer': !isReadOnly }">
          <!-- Theorem content with LaTeX rendering -->
          <div class="theorem-content mb-4 text-sm leading-relaxed">
            <MixedContentDisplay 
              :content="currentContent" 
            />
          </div>
          
          <!-- Collapsible proof section with better styling -->
          <Collapsible v-if="currentProof" v-model:open="isProofOpen" @click.stop>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                class="flex items-center w-auto h-auto px-2 py-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50" 
                @click.stop
              >
                <ChevronRight v-if="!isProofOpen" class="h-4 w-4 mr-1 transition-transform duration-200" />
                <ChevronDown v-else class="h-4 w-4 mr-1 transition-transform duration-200" />
                <span class="font-medium">Proof</span>
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent class="overflow-hidden transition-all duration-300 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div class="pl-4 border-l-2 ml-2 mb-2 mt-3 relative" :class="{
                'border-primary/30': isTheorem,
                'border-blue-500/30': isLemma,
                'border-amber-500/30': isProposition,
                'border-emerald-500/30': isCorollary,
                'border-violet-500/30': isDefinition
              }">
                <div class="theorem-proof text-sm leading-relaxed text-muted-foreground">
                  <MixedContentDisplay 
                    :content="currentProof" 
                  />
                </div>
                <div class="flex justify-end mt-3">
                  <div class="proof-end text-lg font-bold" :class="{
                    'text-primary': isTheorem,
                    'text-blue-500': isLemma,
                    'text-amber-500': isProposition,
                    'text-emerald-500': isCorollary,
                    'text-violet-500': isDefinition
                  }">■</div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        
        <!-- Edit mode with improved UX -->
        <div v-else class="space-y-6" @click.stop>
          <form ref="formRef" @submit="onSubmit" class="space-y-6" @click.stop>
            <!-- Header section with type and title -->
            <div class="p-3 bg-muted/30 rounded-lg border" @click.stop>
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <div class="lg:col-span-2">
                  <FormField v-slot="{ componentField }" name="type">
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <ToggleGroup 
                          type="single" 
                          @update:value="updateType"
                          class="justify-start flex-wrap gap-1"
                          v-bind="componentField"
                        >
                          <ToggleGroupItem value="theorem" aria-label="Theorem" class="flex items-center space-x-1.5 h-8 px-3 text-sm">
                            <div class="w-2.5 h-2.5 rounded-full bg-primary"></div>
                            <span>Theorem</span>
                          </ToggleGroupItem>
                          <ToggleGroupItem value="lemma" aria-label="Lemma" class="flex items-center space-x-1.5 h-8 px-3 text-sm">
                            <div class="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                            <span>Lemma</span>
                          </ToggleGroupItem>
                          <ToggleGroupItem value="proposition" aria-label="Proposition" class="flex items-center space-x-1.5 h-8 px-3 text-sm">
                            <div class="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                            <span>Proposition</span>
                          </ToggleGroupItem>
                          <ToggleGroupItem value="corollary" aria-label="Corollary" class="flex items-center space-x-1.5 h-8 px-3 text-sm">
                            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                            <span>Corollary</span>
                          </ToggleGroupItem>
                          <ToggleGroupItem value="definition" aria-label="Definition" class="flex items-center space-x-1.5 h-8 px-3 text-sm">
                            <div class="w-2.5 h-2.5 rounded-full bg-violet-500"></div>
                            <span>Definition</span>
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>
                
                <div>
                  <FormField v-slot="{ componentField }" name="title">
                    <FormItem>
                      <FormLabel>
                        Title 
                        <span class="text-xs text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Fundamental Theorem"
                          class="w-full h-8"
                          @click.stop
                          v-bind="componentField"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>
              </div>
            </div>

            <!-- Content and Proof Tabs -->
            <Tabs v-model="activeTab" class="w-full" @click.stop>
              <TabsList class="grid w-full grid-cols-2 mb-4" @click.stop>
                <TabsTrigger value="content" class="flex items-center space-x-2" @click.stop>
                  <FileText class="h-4 w-4" />
                  <span>Content</span>
                </TabsTrigger>
                <TabsTrigger value="proof" class="flex items-center space-x-2" @click.stop>
                  <BookOpen class="h-4 w-4" />
                  <span>Proof</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" class="mt-0 space-y-4" @click.stop>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <Label for="theorem-content" class="text-sm font-medium">Content</Label>
                    <div class="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Keyboard class="h-3 w-3" />
                      <span>LaTeX supported</span>
                      <Separator orientation="vertical" class="h-3" />
                      <span>Ctrl+Enter to save</span>
                    </div>
                  </div>
                  <FormField v-slot="{ componentField }" name="content">
                    <FormItem>
                      <FormControl>
                        <Textarea
                          id="theorem-content"
                          placeholder="Enter theorem content... e.g., Let $f: \mathbb{R} \to \mathbb{R}$ be a continuous function..."
                          rows="8"
                          class="font-mono text-sm resize-y min-h-[200px] focus:ring-2"
                          ref="contentTextareaRef"
                          @click.stop
                          v-bind="componentField"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <p class="text-xs text-muted-foreground">
                    Use LaTeX syntax for mathematical expressions. Wrap inline math with $...$ and display math with $$...$$.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="proof" class="mt-0 space-y-4" @click.stop>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <Label for="theorem-proof" class="text-sm font-medium">
                      Proof 
                      <span class="text-xs text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <div class="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Keyboard class="h-3 w-3" />
                      <span>LaTeX supported</span>
                    </div>
                  </div>
                  <FormField v-slot="{ componentField }" name="proof">
                    <FormItem>
                      <FormControl>
                        <Textarea
                          id="theorem-proof"
                          placeholder="Enter proof... e.g., Suppose $x \in X$. Then by definition..."
                          rows="10"
                          class="font-mono text-sm resize-y min-h-[250px] focus:ring-2"
                          @click.stop
                          v-bind="componentField"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <div class="bg-muted/50 p-3 rounded-md border">
                    <p class="text-xs text-muted-foreground">
                      <strong>Tip:</strong> Leave empty for definitions or axioms. A proof end symbol (■) will be automatically added for non-empty proofs.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <!-- Action buttons with better styling -->
            <div class="flex justify-between items-center pt-4 border-t bg-muted/30 -mx-6 px-6 pb-2 rounded-b-lg" @click.stop>
              <div class="text-xs text-muted-foreground">
                Press <kbd class="px-1 py-0.5 text-xs font-mono bg-background border rounded">Esc</kbd> to cancel
              </div>
              <div class="flex space-x-3">
                <Button type="button" variant="outline" @click.stop="cancelEditing" class="w-24">
                  Cancel
                </Button>
                <Button type="submit" class="w-24">
                  <Check class="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"
import * as z from "zod"
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'
import { 
  Pencil, 
  ChevronRight, 
  ChevronDown, 
  Keyboard, 
  MoreVertical, 
  Copy, 
  Trash2, 
  Check,
  FileText,
  BookOpen
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import {
  ToggleGroup,
  ToggleGroupItem
} from '@/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
const number = ref(props.node.attrs.number || null)

// Track active tab to properly initialize fields
const activeTab = ref('content')

// Form schema
const theoremFormSchema = toTypedSchema(z.object({
  title: z.string().optional(),
  content: z.string()
    .min(1, "Content is required")
    .max(5000, "Content must be less than 5000 characters"),
  proof: z.string().optional(),
  type: z.enum(['theorem', 'lemma', 'proposition', 'corollary', 'definition'])
}))

// Form setup
const { handleSubmit, resetForm, setValues, values } = useForm({
  validationSchema: theoremFormSchema,
  initialValues: {
    title: props.node.attrs.title || '',
    content: props.node.attrs.content || '',
    proof: props.node.attrs.proof || '',
    type: (props.node.attrs.type || 'theorem') as 'theorem' | 'lemma' | 'proposition' | 'corollary' | 'definition'
  }
})

// Computed properties
const isReadOnly = computed(() => !props.editor.isEditable)
const currentType = computed(() => isEditing.value ? values.type : props.node.attrs.type || 'theorem')
const currentTitle = computed(() => isEditing.value ? values.title : props.node.attrs.title || '')
const currentContent = computed(() => isEditing.value ? values.content : props.node.attrs.content || '')
const currentProof = computed(() => isEditing.value ? values.proof : props.node.attrs.proof || '')

const capitalizeType = computed(() => {
  return currentType.value.charAt(0).toUpperCase() + currentType.value.slice(1)
})

// Type-specific computed properties for styling
const isTheorem = computed(() => currentType.value === 'theorem')
const isLemma = computed(() => currentType.value === 'lemma')
const isProposition = computed(() => currentType.value === 'proposition')
const isCorollary = computed(() => currentType.value === 'corollary')
const isDefinition = computed(() => currentType.value === 'definition')

// Automatically open proof when editing
watch(isEditing, (newValue) => {
  if (newValue && currentProof.value) {
    isProofOpen.value = true
  }
})

// Update methods
const updateType = (value: string | undefined) => {
  // ToggleGroup can emit undefined when deselecting, so we need to handle it
  if (value) {
    setValues({ ...values, type: value as any })
  }
}

// Editing methods
const startEditing = () => {
  if (isReadOnly.value) return
  
  // Set form values from node attributes before editing
  setValues({
    title: props.node.attrs.title || '',
    content: props.node.attrs.content || '',
    proof: props.node.attrs.proof || '',
    type: props.node.attrs.type || 'theorem'
  })
  
  isEditing.value = true
  focusContentTextarea()
}

const cancelEditing = () => {
  isEditing.value = false
  resetForm()
}

const onSubmit = handleSubmit((formValues) => {
  try {
    theoremLogger.debug('Starting save process with form values:', formValues)
    
    isEditing.value = false
    
    // Update the node attributes
    props.updateAttributes({
      title: formValues.title || '',
      content: formValues.content,
      proof: formValues.proof || '',
      type: formValues.type,
    })
    
    // Verify that the update was applied
    theoremLogger.debug('Node attributes after update:', props.node.attrs)
    
    // Show success message
    savedSuccessfully()
  } catch (err) {
    theoremLogger.error('Error saving theorem:', err)
    toast('Error saving theorem')
  }
})

// Vue lifecycle hooks
onMounted(() => {
  theoremLogger.debug('TheoremBlock mounted with initial attrs:', props.node.attrs)
})

// Watch for external changes to the node with immediate handler
watch(
  () => props.node.attrs,
  (newAttrs) => {
    theoremLogger.debug('Node attrs changed:', newAttrs)
    
    // Update form values when not editing
    if (!isEditing.value) {
      setValues({
        title: newAttrs.title || '',
        content: newAttrs.content || '',
        proof: newAttrs.proof || '',
        type: newAttrs.type || 'theorem'
      })
    }
    number.value = newAttrs.number || null
  },
  { deep: true, immediate: true } // Immediate ensures it runs on component creation
)

// Watch for changes in read-only status
watch(isReadOnly, (newValue) => {
  // Force stop editing when switched to read-only
  if (newValue && isEditing.value) {
    onSubmit()
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
    onSubmit()
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

// Duplicate theorem function
const duplicateTheorem = () => {
  try {
    // Create a new theorem with the same content
    const newTheorem = {
      type: 'theorem',
      attrs: {
        title: currentTitle.value,
        content: currentContent.value,
        proof: currentProof.value,
        type: currentType.value,
        number: null // Let the system assign a new number
      }
    }
    
    // Insert the new theorem after the current one
    const pos = props.getPos() + props.node.nodeSize
    props.editor.chain().focus().insertContentAt(pos, newTheorem).run()
    
    toast('Theorem duplicated successfully')
  } catch (err) {
    theoremLogger.error('Error duplicating theorem:', err)
    toast('Error duplicating theorem')
  }
}

// Delete theorem function
const deleteTheorem = () => {
  try {
    if (confirm(`Are you sure you want to delete this ${currentType.value}?`)) {
      props.deleteNode()
      toast(`${capitalizeType.value} deleted`)
    }
  } catch (err) {
    theoremLogger.error('Error deleting theorem:', err)
    toast('Error deleting theorem')
  }
}
</script>

<style scoped>
.theorem-block .proof-end {
  width: 1.5em;
  text-align: right;
  font-weight: bold;
}

.theorem-content, .theorem-proof {
  line-height: 1.7;
}

.theorem-proof {
  font-style: italic;
}

.theorem-block {
  position: relative;
  isolation: isolate;
}

.theorem-block:hover {
  z-index: 10;
}

.theorem-block:hover .theorem-card {
  transform: translateY(-1px);
}

/* Enhanced animations for collapsible content */
.animate-collapsible-down {
  animation: collapsibleDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.animate-collapsible-up {
  animation: collapsibleUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes collapsibleDown {
  from {
    height: 0;
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    height: var(--radix-collapsible-content-height);
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes collapsibleUp {
  from {
    height: var(--radix-collapsible-content-height);
    opacity: 1;
    transform: translateY(0);
  }
  to {
    height: 0;
    opacity: 0;
    transform: translateY(-10px);
  }
}

/* Keyboard shortcut styling */
kbd {
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  color: hsl(var(--muted-foreground));
  background-color: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  padding: 0.125rem 0.375rem;
}

/* Focus states for better accessibility */
.theorem-card:focus-within {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Improved form styling */
.theorem-block .space-y-6 > * + * {
  margin-top: 1.5rem;
}

.theorem-block .space-y-4 > * + * {
  margin-top: 1rem;
}

.theorem-block .space-y-3 > * + * {
  margin-top: 0.75rem;
}

/* Better visual hierarchy */
.theorem-block h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.theorem-block p {
  margin-bottom: 0.75rem;
}

/* Responsive improvements */
@media (max-width: 768px) {
  .theorem-block .grid-cols-1.md\\:grid-cols-2 {
    grid-template-columns: 1fr;
  }
  
  .theorem-block .flex.justify-between {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .theorem-block .w-24 {
    width: 100%;
  }
  
  /* Make toggle group stack on mobile for better usability */
  .theorem-block [data-toggle-group] {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }
  
  .theorem-block [data-toggle-group] [data-toggle-group-item] {
    justify-content: flex-start;
    width: 100%;
  }
}

@media (max-width: 1024px) {
  /* Stack type and title vertically on tablet and mobile */
  .theorem-block .grid-cols-1.lg\\:grid-cols-3 {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>








