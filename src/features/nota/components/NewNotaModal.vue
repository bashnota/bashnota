<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useRouter } from 'vue-router'
import { 
  FileText, 
  Calculator, 
  Code, 
  BookOpen, 
  Lightbulb,
  Clipboard,
  Brain,
  LineChart,
  Coffee,
  Rocket,
  Search,
  X
} from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/ui/dialog'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
import { Badge } from '@/ui/badge'
import { ScrollArea } from '@/ui/scroll-area'
import { logger } from '@/services/logger'
import type { Nota } from '@/features/nota/types/nota'
import { markdownToTiptap } from '@/lib/markdownToTiptap'

interface NotaTemplate {
  id: string
  name: string
  description: string
  icon: any
  category: string
  content: string
  tags: string[]
}

const props = defineProps<{
  open: boolean
  parentId?: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': [nota: any]
}>()

const notaStore = useNotaStore()
const router = useRouter()

// Form state
const title = ref('')
const description = ref('')
const selectedTemplate = ref<NotaTemplate | null>(null)
const searchQuery = ref('')
const isCreating = ref(false)

// Template definitions
const templates = ref<NotaTemplate[]>([
  {
    id: 'blank',
    name: 'Blank Note',
    description: 'Start with a clean slate',
    icon: FileText,
    category: 'Basic',
    content: '',
    tags: []
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Structured template for meeting minutes',
    icon: Clipboard,
    category: 'Work',
    content: `# Meeting Notes\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:** \n**Duration:** \n\n## Agenda\n- \n\n## Discussion Points\n- \n\n## Action Items\n- [ ] \n\n## Next Steps\n- \n\n## Notes\n`,
    tags: ['meeting', 'work']
  },
  {
    id: 'idea-capture',
    name: 'Idea Capture',
    description: 'Quick template for capturing and developing ideas',
    icon: Lightbulb,
    category: 'Creative',
    content: `# Idea: [Brief Title]\n\n## The Spark 💡\nWhat triggered this idea? What's the core concept?\n\n## The Vision\nWhat would this look like when fully realized?\n\n## Potential Benefits\n- \n- \n- \n\n## Challenges to Consider\n- \n- \n\n## Next Actions\n- [ ] Research similar concepts\n- [ ] Define requirements\n- [ ] Create prototype/mockup\n- [ ] Get feedback\n\n## Related Ideas\n- \n\n## Resources\n- `,
    tags: ['idea', 'creative', 'brainstorming']
  },
  {
    id: 'daily-journal',
    name: 'Daily Journal',
    description: 'Template for daily reflection and planning',
    icon: Coffee,
    category: 'Personal',
    content: `# ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n## Today's Focus 🎯\nWhat are the 3 most important things to accomplish today?\n1. \n2. \n3. \n\n## Gratitude 🙏\nWhat am I grateful for today?\n- \n- \n- \n\n## Reflection 🤔\n### What went well yesterday?\n- \n\n### What could I improve?\n- \n\n### What did I learn?\n- \n\n## Tonight's Goal 🌙\nHow do I want to feel at the end of today?\n\n## Random Thoughts 💭\nFree space for anything on my mind...\n\n`,
    tags: ['journal', 'personal', 'reflection']
  }
])

// Computed properties
const filteredTemplates = computed(() => {
  if (!searchQuery.value) return templates.value
  
  const query = searchQuery.value.toLowerCase()
  return templates.value.filter(template => 
    template.name.toLowerCase().includes(query) ||
    template.description.toLowerCase().includes(query) ||
    template.category.toLowerCase().includes(query) ||
    template.tags.some(tag => tag.toLowerCase().includes(query))
  )
})

const categories = computed(() => {
  const cats = new Set(templates.value.map(t => t.category))
  return Array.from(cats)
})

const templatesByCategory = computed(() => {
  const grouped: Record<string, NotaTemplate[]> = {}
  
  filteredTemplates.value.forEach(template => {
    if (!grouped[template.category]) {
      grouped[template.category] = []
    }
    grouped[template.category].push(template)
  })
  
  return grouped
})

// Methods
const selectTemplate = (template: NotaTemplate) => {
  selectedTemplate.value = template
  if (!title.value && template.id !== 'blank') {
    title.value = template.name
  }
}

const createNota = async () => {
  if (!title.value.trim()) {
    title.value = selectedTemplate.value?.name || 'Untitled Nota'
  }

  isCreating.value = true

  try {
    // Create the nota first
    const nota = await notaStore.createItem(
      title.value.trim(),
      props.parentId || null
    )

    // Consolidate updates for content and tags
    const updates: Partial<Nota> = {}
    if (selectedTemplate.value?.content) {
      // Convert markdown to Tiptap JSON before saving
      const tiptapContent = markdownToTiptap(selectedTemplate.value.content)
      updates.content = JSON.stringify(tiptapContent)
    }
    if (selectedTemplate.value?.tags && selectedTemplate.value.tags.length > 0) {
      updates.tags = selectedTemplate.value.tags
    }

    // Apply updates in a single call before navigating
    if (Object.keys(updates).length > 0) {
      await notaStore.saveNota({
        id: nota.id,
        ...updates,
      })
    }

    if (updates.tags) {
      logger.info('Created nota with template tags:', updates.tags)
    }

    emit('created', nota)
    emit('update:open', false)
    
    // Reset form before navigating
    const newNotaId = nota.id
    resetForm()

    // Navigate to the new nota AFTER saving is complete
    await router.push(`/nota/${newNotaId}`)
    
  } catch (error) {
    logger.error('Failed to create nota:', error)
  } finally {
    isCreating.value = false
  }
}

const resetForm = () => {
  title.value = ''
  description.value = ''
  selectedTemplate.value = null
  searchQuery.value = ''
}

// Watch for modal close to reset form
watch(() => props.open, (open) => {
  if (!open) {
    resetForm()
  } else {
    // Auto-select blank template by default
    selectedTemplate.value = templates.value[0]
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-4xl max-h-[90vh] p-0">
      <DialogHeader class="p-6 pb-0">
        <DialogTitle class="text-xl font-semibold">Create New Nota</DialogTitle>
        <DialogDescription class="text-muted-foreground">
          Create a new nota from a template or start with a blank canvas.
        </DialogDescription>
      </DialogHeader>

      <div class="flex h-[70vh]">
        <!-- Template Selection Panel -->
        <div class="w-1/2 border-r flex flex-col">
          <!-- Search -->
          <div class="p-4 border-b">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                :value="searchQuery"
                @input="searchQuery = ($event.target as HTMLInputElement).value"
                placeholder="Search templates..."
                class="pl-9"
              />
            </div>
          </div>

          <!-- Templates -->
          <ScrollArea class="flex-1 p-4">
            <div class="space-y-6">
              <div v-for="category in categories" :key="category">
                <h3 class="text-sm font-medium text-muted-foreground mb-3">{{ category }}</h3>
                <div class="grid gap-2">
                  <div
                    v-for="template in templatesByCategory[category]"
                    :key="template.id"
                    class="p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm"
                    :class="selectedTemplate?.id === template.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'"
                    @click="selectTemplate(template)"
                  >
                    <div class="flex items-start gap-3">
                      <div class="p-2 rounded-md bg-muted">
                        <component :is="template.icon" class="h-4 w-4" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-sm mb-1">{{ template.name }}</h4>
                        <p class="text-xs text-muted-foreground mb-2">{{ template.description }}</p>
                        <div class="flex flex-wrap gap-1">
                          <Badge v-for="tag in template.tags" :key="tag" variant="secondary" class="text-xs">
                            {{ tag }}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <!-- Preview and Form Panel -->
        <div class="w-1/2 flex flex-col">
          <!-- Form -->
          <div class="p-4 border-b space-y-4">
            <div>
              <label class="text-sm font-medium mb-2 block">Title</label>
              <Input
                :value="title"
                @input="title = ($event.target as HTMLInputElement).value"
                placeholder="Enter nota title..."
                class="w-full"
              />
            </div>
            
            <div v-if="selectedTemplate && selectedTemplate.id !== 'blank'">
              <label class="text-sm font-medium mb-2 block">Description (Optional)</label>
              <Textarea
                v-model="description"
                placeholder="Add a description..."
                class="w-full resize-none"
                rows="2"
              />
            </div>
          </div>

          <!-- Preview -->
          <div class="flex-1 p-4">
            <div v-if="selectedTemplate">
              <div class="flex items-center gap-2 mb-3">
                <component :is="selectedTemplate.icon" class="h-5 w-5" />
                <h3 class="font-medium">{{ selectedTemplate.name }}</h3>
              </div>
              
              <div v-if="selectedTemplate.content" class="space-y-2">
                <h4 class="text-sm font-medium text-muted-foreground">Template Preview</h4>
                <div class="bg-muted/30 p-3 rounded-md text-xs font-mono max-h-64 overflow-y-auto">
                  <pre class="whitespace-pre-wrap">{{ selectedTemplate.content.slice(0, 500) }}{{ selectedTemplate.content.length > 500 ? '...' : '' }}</pre>
                </div>
              </div>
              
              <div v-else class="text-sm text-muted-foreground italic">
                Start with a blank canvas - perfect for any type of content.
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="p-4 border-t flex justify-end gap-2">
            <Button 
              variant="outline" 
              @click="$emit('update:open', false)"
              :disabled="isCreating"
            >
              Cancel
            </Button>
            <Button 
              @click="createNota"
              :disabled="isCreating || !selectedTemplate"
              class="min-w-[100px]"
            >
              <div v-if="isCreating" class="flex items-center gap-2">
                <div class="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </div>
              <span v-else>Create Nota</span>
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style> 