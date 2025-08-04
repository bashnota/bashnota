<script setup lang="ts">
import { useEditorStore } from '@/features/editor/stores/editorStore'
import { useUIStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip } from '@/components/ui/tooltip'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  // Editor formatting
  Bold,
  Italic,
  Code,
  FileCode,
  List,
  ListOrdered,
  Quote,
  Table,
  MinusSquare,
  Undo,
  Redo,
  Eye,
  EyeOff,
  
  // Document actions
  Save,
  Clock,
  Star,
  Share2,
  Download,
  PlayCircle,
  Loader2,
  
  // UI controls
  Lock,
  Unlock,
  Pin,
  Type,
} from 'lucide-vue-next'
import { computed, ref, onMounted } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import {
  toggleRenderMathState
} from '@/features/editor/components/extensions/MarkdownExtension'

// Types
type SidebarId = 'toc' | 'references' | 'jupyter' | 'ai' | 'metadata' | 'favorites'

interface ToolbarAction {
  id: string
  icon: any
  label: string
  tooltip: string
  action: () => void
  isActive?: boolean
  isDisabled?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  group?: string
}

// Props and Emits
const props = defineProps<{
  canRunAll?: boolean
  isExecutingAll?: boolean
  isFavorite?: boolean
  wordCount?: number
}>()

const emit = defineEmits<{
  'run-all': []
  'toggle-favorite': []
  'share': []
  'open-config': []
  'export-nota': []
  'save-version': []
  'open-history': []
  'toggle-sidebar': [id: SidebarId]
}>()

// Stores
const editorStore = useEditorStore()
const uiStore = useUIStore()
const editor = computed(() => editorStore.activeEditor as Editor | null)
const isRenderingMath = ref(true)

// Heading options for the select dropdown
const headingOptions = [
  { value: 'normal', label: 'Normal text', icon: Type },
  { value: 'h1', label: 'Heading 1', icon: Type },
  { value: 'h2', label: 'Heading 2', icon: Type },
  { value: 'h3', label: 'Heading 3', icon: Type },
]

// Computed values for editor state
const currentHeadingLevel = computed(() => {
  if (!editor.value) return 'normal'
  
  if (editor.value.isActive('heading', { level: 1 })) return 'h1'
  if (editor.value.isActive('heading', { level: 2 })) return 'h2'
  if (editor.value.isActive('heading', { level: 3 })) return 'h3'
  return 'normal'
})

// Actions
const setHeadingLevel = (level: string) => {
  if (!editor.value) return
  
  if (level === 'normal') {
    editor.value.chain().focus().setParagraph().run()
  } else {
    const headingLevel = parseInt(level.replace('h', '')) as 1 | 2 | 3
    editor.value.chain().focus().toggleHeading({ level: headingLevel }).run()
  }
}

const toggleMathRendering = () => {
  if (editor.value) {
    toggleRenderMathState(editor.value)
    isRenderingMath.value = !isRenderingMath.value
  }
}

// Initialize math rendering state
onMounted(() => {
  if (typeof window !== 'undefined' && window) {
    // @ts-ignore
    isRenderingMath.value = window['markdownAndKatexRenderState'] ?? true
  }
})

// Toolbar actions configuration
const historyActions = computed(() => {
  if (!editor.value) return []
  
  return [
    {
      id: 'undo',
      icon: Undo,
      label: 'Undo',
      tooltip: 'Undo (Ctrl+Z)',
      action: () => editor.value?.chain().focus().undo().run(),
      isDisabled: !editor.value.can().undo(),
      group: 'history'
    },
    {
      id: 'redo',
      icon: Redo,
      label: 'Redo',
      tooltip: 'Redo (Ctrl+Y)',
      action: () => editor.value?.chain().focus().redo().run(),
      isDisabled: !editor.value.can().redo(),
      group: 'history'
    },
  ]
})

const formattingActions = computed(() => {
  if (!editor.value) return []
  
  return [
    {
      id: 'bold',
      icon: Bold,
      label: 'Bold',
      tooltip: 'Bold (Ctrl+B)',
      action: () => editor.value?.chain().focus().toggleBold().run(),
      isActive: editor.value.isActive('bold'),
      group: 'formatting'
    },
    {
      id: 'italic',
      icon: Italic,
      label: 'Italic',
      tooltip: 'Italic (Ctrl+I)',
      action: () => editor.value?.chain().focus().toggleItalic().run(),
      isActive: editor.value.isActive('italic'),
      group: 'formatting'
    },
    {
      id: 'code',
      icon: Code,
      label: 'Inline Code',
      tooltip: 'Inline code (Ctrl+`)',
      action: () => editor.value?.chain().focus().toggleCode().run(),
      isActive: editor.value.isActive('code'),
      group: 'formatting'
    },
  ]
})

const listActions = computed(() => {
  if (!editor.value) return []
  
  return [
    {
      id: 'bulletList',
      icon: List,
      label: 'Bullet List',
      tooltip: 'Bullet list',
      action: () => editor.value?.chain().focus().toggleBulletList().run(),
      isActive: editor.value.isActive('bulletList'),
      group: 'lists'
    },
    {
      id: 'orderedList',
      icon: ListOrdered,
      label: 'Numbered List',
      tooltip: 'Numbered list',
      action: () => editor.value?.chain().focus().toggleOrderedList().run(),
      isActive: editor.value.isActive('orderedList'),
      group: 'lists'
    },
  ]
})

const insertActions = computed(() => {
  if (!editor.value) return []
  
  return [
    {
      id: 'table',
      icon: Table,
      label: 'Table',
      tooltip: 'Insert table',
      action: () => editor.value?.chain().focus().insertTable().run(),
      group: 'insert'
    },
    {
      id: 'codeBlock',
      icon: FileCode,
      label: 'Code Block',
      tooltip: 'Code block',
      action: () => editor.value?.chain().focus().toggleCodeBlock().run(),
      isActive: editor.value.isActive('codeBlock'),
      group: 'insert'
    },
    {
      id: 'blockquote',
      icon: Quote,
      label: 'Quote',
      tooltip: 'Block quote',
      action: () => editor.value?.chain().focus().toggleBlockquote().run(),
      isActive: editor.value.isActive('blockquote'),
      group: 'insert'
    },
    {
      id: 'horizontalRule',
      icon: MinusSquare,
      label: 'Horizontal Rule',
      tooltip: 'Horizontal rule',
      action: () => editor.value?.chain().focus().setHorizontalRule().run(),
      group: 'insert'
    },
  ]
})

// Document actions
const documentActions = computed(() => [
  {
    id: 'run-all',
    icon: props.isExecutingAll ? Loader2 : PlayCircle,
    label: 'Run All',
    tooltip: 'Run all cells',
    action: () => emit('run-all'),
    isDisabled: !props.canRunAll || props.isExecutingAll,
    variant: 'outline' as const,
  },
  {
    id: 'save',
    icon: Save,
    label: 'Save',
    tooltip: 'Save version',
    action: () => emit('save-version'),
  },
  {
    id: 'history',
    icon: Clock,
    label: 'History',
    tooltip: 'Version history',
    action: () => emit('open-history'),
  },
  {
    id: 'favorite',
    icon: Star,
    label: 'Favorite',
    tooltip: props.isFavorite ? 'Remove from favorites' : 'Add to favorites',
    action: () => emit('toggle-favorite'),
    isActive: props.isFavorite,
  },
  {
    id: 'share',
    icon: Share2,
    label: 'Share',
    tooltip: 'Share document',
    action: () => emit('share'),
  },
  {
    id: 'export',
    icon: Download,
    label: 'Export',
    tooltip: 'Export document',
    action: () => emit('export-nota'),
  },
])

// Hover handlers
const handleMouseEnter = () => {
  uiStore.showToolbar()
}

const handleMouseLeave = () => {
  uiStore.hideToolbar()
}

// Utility functions
const getIconClasses = (action: ToolbarAction) => {
  const baseClasses = 'h-4 w-4'
  const favoriteClasses = action.id === 'favorite' && props.isFavorite ? 'text-yellow-400 fill-current' : ''
  const spinClasses = action.id === 'run-all' && props.isExecutingAll ? 'animate-spin' : ''
  
  return `${baseClasses} ${favoriteClasses} ${spinClasses}`.trim()
}
</script>

<template>
  <!-- Toolbar Container with Hover Detection -->
  <div 
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Invisible hover zone that extends beyond visible toolbar -->
    <div class="h-16 w-full" />
    
    <!-- Toolbar Content -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="transform -translate-y-full opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-full opacity-0"
    >
      <Card 
        v-if="uiStore.isToolbarVisible"
        class="mx-4 mt-2 shadow-lg border border-border/50 backdrop-blur-sm bg-background/95"
      >
        <div class="flex items-center justify-between px-4 py-2">
          <!-- Left Section: Editor Tools -->
          <div class="flex items-center gap-1">
            <!-- Lock/Pin Button -->
            <Tooltip :content="uiStore.isToolbarLocked ? 'Unlock toolbar (hide on mouse leave)' : 'Pin toolbar (keep visible)'">
              <Toggle
                :pressed="uiStore.isToolbarLocked"
                @update:pressed="uiStore.toggleToolbarLock"
                size="sm"
                class="h-8 w-8 p-0"
                aria-label="Toggle toolbar lock"
              >
                <Pin v-if="uiStore.isToolbarLocked" class="h-4 w-4 text-primary" />
                <Lock v-else class="h-4 w-4" />
              </Toggle>
            </Tooltip>
            
            <Separator orientation="vertical" class="mx-2 h-6" />

            <!-- History Actions -->
            <div class="flex items-center">
              <ToggleGroup type="multiple" class="gap-0">
                <Tooltip v-for="action in historyActions" :key="action.id" :content="action.tooltip">
                  <ToggleGroupItem
                    :value="action.id"
                    size="sm"
                    class="h-8 w-8 p-0"
                    @click="action.action"
                    :disabled="action.isDisabled"
                    :aria-label="action.label"
                  >
                    <component :is="action.icon" class="h-4 w-4" />
                  </ToggleGroupItem>
                </Tooltip>
              </ToggleGroup>
            </div>

            <Separator orientation="vertical" class="mx-2 h-6" />

            <!-- Text Style Selector -->
            <div class="flex items-center">
              <Select :value="currentHeadingLevel" @update:value="setHeadingLevel">
                <SelectTrigger class="h-8 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in headingOptions"
                    :key="option.value"
                    :value="option.value"
                    class="flex items-center gap-2"
                  >
                    <component :is="option.icon" class="h-4 w-4" />
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator orientation="vertical" class="mx-2 h-6" />

            <!-- Formatting Actions -->
            <div class="flex items-center">
              <ToggleGroup type="multiple" class="gap-0">
                <Tooltip v-for="action in formattingActions" :key="action.id" :content="action.tooltip">
                  <ToggleGroupItem
                    :value="action.id"
                    :pressed="action.isActive"
                    size="sm"
                    class="h-8 w-8 p-0"
                    @click="action.action"
                    :aria-label="action.label"
                  >
                    <component :is="action.icon" class="h-4 w-4" />
                  </ToggleGroupItem>
                </Tooltip>
              </ToggleGroup>
            </div>

            <Separator orientation="vertical" class="mx-2 h-6" />

            <!-- List Actions -->
            <div class="flex items-center">
              <ToggleGroup type="multiple" class="gap-0">
                <Tooltip v-for="action in listActions" :key="action.id" :content="action.tooltip">
                  <ToggleGroupItem
                    :value="action.id"
                    :pressed="action.isActive"
                    size="sm"
                    class="h-8 w-8 p-0"
                    @click="action.action"
                    :aria-label="action.label"
                  >
                    <component :is="action.icon" class="h-4 w-4" />
                  </ToggleGroupItem>
                </Tooltip>
              </ToggleGroup>
            </div>

            <Separator orientation="vertical" class="mx-2 h-6" />

            <!-- Insert Actions -->
            <div class="flex items-center">
              <ToggleGroup type="multiple" class="gap-0">
                <Tooltip v-for="action in insertActions" :key="action.id" :content="action.tooltip">
                  <ToggleGroupItem
                    :value="action.id"
                    :pressed="action.isActive"
                    size="sm"
                    class="h-8 w-8 p-0"
                    @click="action.action"
                    :aria-label="action.label"
                  >
                    <component :is="action.icon" class="h-4 w-4" />
                  </ToggleGroupItem>
                </Tooltip>
              </ToggleGroup>
            </div>

            <Separator orientation="vertical" class="mx-2 h-6" />

            <!-- Math Toggle -->
            <div class="flex items-center">
              <Tooltip :content="isRenderingMath ? 'Show LaTeX source code' : 'Show rendered math'">
                <Toggle
                  :pressed="!isRenderingMath"
                  @update:pressed="toggleMathRendering"
                  size="sm"
                  class="h-8 px-3 text-xs"
                  aria-label="Toggle math rendering"
                >
                  <Eye v-if="isRenderingMath" class="h-4 w-4" />
                  <EyeOff v-else class="h-4 w-4" />
                  <span class="ml-1.5 hidden sm:inline">
                    {{ isRenderingMath ? 'Math' : 'Source' }}
                  </span>
                </Toggle>
              </Tooltip>
            </div>
          </div>

          <!-- Right Section: Document Actions & Status -->
          <div class="flex items-center gap-2">
            <!-- Document Actions -->
            <div class="flex items-center gap-1">
              <Tooltip v-for="action in documentActions" :key="action.id" :content="action.tooltip">
                <Button
                  :variant="action.variant || 'ghost'"
                  size="icon"
                  @click="action.action"
                  :disabled="action.isDisabled"
                  class="h-8 w-8 p-0"
                  :class="{ 'bg-muted': action.isActive }"
                  :aria-label="action.label"
                >
                  <component :is="action.icon" :class="getIconClasses(action)" />
                </Button>
              </Tooltip>
            </div>

            <Separator orientation="vertical" class="mx-2 h-6" />

            <!-- Word Count Badge -->
            <Badge variant="secondary" class="text-xs px-2 py-1">
              {{ props.wordCount || 0 }} words
            </Badge>

            <!-- Save Status Indicator -->
            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition-all duration-200"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <Badge v-if="uiStore.showSaved" variant="default" class="text-xs px-2 py-1 bg-green-500 text-white">
                Saved
              </Badge>
              <Badge v-else-if="uiStore.isSaving" variant="outline" class="text-xs px-2 py-1">
                <Loader2 class="h-3 w-3 mr-1 animate-spin" />
                Saving...
              </Badge>
            </Transition>
          </div>
        </div>
      </Card>
    </Transition>
  </div>
</template> 