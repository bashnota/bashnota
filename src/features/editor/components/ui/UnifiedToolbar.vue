<script setup lang="ts">
import { useEditorStore } from '@/features/editor/stores/editorStore'
import { Button } from '@/ui/button'
import { Separator } from '@/ui/separator'
import { Tooltip } from '@/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select'
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
  
  // Sidebar toggles
  BookIcon,
  ServerIcon,
  BrainIcon,
  Tag,
  Link2,
  
  // UI controls
  ChevronUp,
  ChevronDown,
  Menu,
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
}

interface ToolbarGroup {
  id: string
  label: string
  actions: ToolbarAction[]
  priority: number // Lower number = higher priority (shown first)
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

// Store and computed values
const editorStore = useEditorStore()
const editor = computed(() => editorStore.activeEditor as Editor | null)
const isToolbarCollapsed = computed(() => editorStore.isToolbarCollapsed)
const isRenderingMath = ref(true)

// Heading options for the select dropdown
const headingOptions = [
  { value: 'normal', label: 'Normal text' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
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

// Toolbar groups configuration
const toolbarGroups = computed<ToolbarGroup[]>(() => {
  if (!editor.value) return []

  return [
    // History group
    {
      id: 'history',
      label: 'History',
      priority: 1,
      actions: [
        {
          id: 'undo',
          icon: Undo,
          label: 'Undo',
          tooltip: 'Undo (Ctrl+Z)',
          action: () => editor.value?.chain().focus().undo().run(),
          isDisabled: !editor.value.can().undo(),
        },
        {
          id: 'redo',
          icon: Redo,
          label: 'Redo',
          tooltip: 'Redo (Ctrl+Y)',
          action: () => editor.value?.chain().focus().redo().run(),
          isDisabled: !editor.value.can().redo(),
        },
      ],
    },
    
    // Text formatting group
    {
      id: 'formatting',
      label: 'Text Formatting',
      priority: 2,
      actions: [
        {
          id: 'bold',
          icon: Bold,
          label: 'Bold',
          tooltip: 'Bold (Ctrl+B)',
          action: () => editor.value?.chain().focus().toggleBold().run(),
          isActive: editor.value.isActive('bold'),
        },
        {
          id: 'italic',
          icon: Italic,
          label: 'Italic',
          tooltip: 'Italic (Ctrl+I)',
          action: () => editor.value?.chain().focus().toggleItalic().run(),
          isActive: editor.value.isActive('italic'),
        },
        {
          id: 'code',
          icon: Code,
          label: 'Inline Code',
          tooltip: 'Inline code (Ctrl+`)',
          action: () => editor.value?.chain().focus().toggleCode().run(),
          isActive: editor.value.isActive('code'),
        },
      ],
    },
    
    // Lists group
    {
      id: 'lists',
      label: 'Lists',
      priority: 3,
      actions: [
        {
          id: 'bulletList',
          icon: List,
          label: 'Bullet List',
          tooltip: 'Bullet list',
          action: () => editor.value?.chain().focus().toggleBulletList().run(),
          isActive: editor.value.isActive('bulletList'),
        },
        {
          id: 'orderedList',
          icon: ListOrdered,
          label: 'Numbered List',
          tooltip: 'Numbered list',
          action: () => editor.value?.chain().focus().toggleOrderedList().run(),
          isActive: editor.value.isActive('orderedList'),
        },
      ],
    },
    
    // Insert group
    {
      id: 'insert',
      label: 'Insert',
      priority: 4,
      actions: [
        {
          id: 'table',
          icon: Table,
          label: 'Table',
          tooltip: 'Insert table',
          action: () => editor.value?.chain().focus().insertTable().run(),
        },
        {
          id: 'codeBlock',
          icon: FileCode,
          label: 'Code Block',
          tooltip: 'Code block',
          action: () => editor.value?.chain().focus().toggleCodeBlock().run(),
          isActive: editor.value.isActive('codeBlock'),
        },
        {
          id: 'blockquote',
          icon: Quote,
          label: 'Quote',
          tooltip: 'Block quote',
          action: () => editor.value?.chain().focus().toggleBlockquote().run(),
          isActive: editor.value.isActive('blockquote'),
        },
        {
          id: 'horizontalRule',
          icon: MinusSquare,
          label: 'Horizontal Rule',
          tooltip: 'Horizontal rule',
          action: () => editor.value?.chain().focus().setHorizontalRule().run(),
        },
      ],
    },
  ]
})

// Sidebar actions
const sidebarActions = [
  { id: 'references', icon: BookIcon, label: 'References', tooltip: 'References' },
  { id: 'jupyter', icon: ServerIcon, label: 'Jupyter', tooltip: 'Jupyter Servers' },
  { id: 'ai', icon: BrainIcon, label: 'AI', tooltip: 'AI Assistant' },
  { id: 'metadata', icon: Tag, label: 'Metadata', tooltip: 'Metadata' },
  { id: 'favorites', icon: Star, label: 'Favorites', tooltip: 'Favorite Blocks' },
  { id: 'toc', icon: Menu, label: 'TOC', tooltip: 'Table of Contents' },
]

// Document actions
const documentActions = computed(() => [
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
    id: 'run-all',
    icon: props.isExecutingAll ? Loader2 : PlayCircle,
    label: 'Run All',
    tooltip: 'Run all cells',
    action: () => emit('run-all'),
    isDisabled: !props.canRunAll || props.isExecutingAll,
    variant: 'outline' as const,
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

// Utility functions
const getButtonClasses = (action: ToolbarAction) => {
  const baseClasses = 'h-8 w-8 p-0'
  const activeClasses = action.isActive ? 'bg-muted' : ''
  const animationClasses = action.id === 'run-all' && props.isExecutingAll ? 'animate-spin' : ''
  
  return `${baseClasses} ${activeClasses} ${animationClasses}`.trim()
}

const getIconClasses = (action: ToolbarAction) => {
  const baseClasses = 'h-4 w-4'
  const favoriteClasses = action.id === 'favorite' && props.isFavorite ? 'text-yellow-400 fill-current' : ''
  
  return `${baseClasses} ${favoriteClasses}`.trim()
}
</script>

<template>
  <div class="border-b bg-background sticky top-0 z-10 transition-all duration-300">
    <!-- Collapsed View -->
    <div v-if="isToolbarCollapsed" class="flex items-center justify-between px-4 py-2">
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          class="h-6 w-6"
          @click="editorStore.toggleToolbar"
          title="Expand toolbar"
        >
          <ChevronDown class="h-4 w-4" />
        </Button>
        <span class="text-sm text-muted-foreground">{{ props.wordCount || 0 }} words</span>
      </div>
      
      <div class="flex items-center gap-1">
        <!-- Essential actions only in collapsed mode -->
        <Tooltip v-for="action in documentActions.slice(0, 3)" :key="action.id" :content="action.tooltip">
          <Button
            :variant="action.variant || 'ghost'"
            size="icon"
            class="h-6 w-6"
            @click="action.action"
            :disabled="action.isDisabled"
          >
            <component :is="action.icon" :class="getIconClasses(action)" />
          </Button>
        </Tooltip>
      </div>
    </div>

    <!-- Expanded View -->
    <template v-else>
      <!-- Main Editor Toolbar -->
      <div class="flex flex-wrap items-center gap-1 px-4 py-2">
        <!-- History Actions -->
        <div class="flex items-center gap-0.5">
          <Tooltip v-for="action in toolbarGroups.find(g => g.id === 'history')?.actions || []" :key="action.id" :content="action.tooltip">
            <Button
              variant="ghost"
              size="sm"
              :class="getButtonClasses(action)"
              @click="action.action"
              :disabled="action.isDisabled"
            >
              <component :is="action.icon" class="h-4 w-4" />
            </Button>
          </Tooltip>
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
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" class="mx-2 h-6" />

        <!-- Formatting, Lists, and Insert Groups -->
        <template v-for="group in toolbarGroups.filter(g => ['formatting', 'lists', 'insert'].includes(g.id))" :key="group.id">
          <div class="flex items-center gap-0.5">
            <Tooltip v-for="action in group.actions" :key="action.id" :content="action.tooltip">
              <Button
                variant="ghost"
                size="sm"
                :class="getButtonClasses(action)"
                @click="action.action"
                :disabled="action.isDisabled"
              >
                <component :is="action.icon" class="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
          <Separator orientation="vertical" class="mx-2 h-6" />
        </template>

        <!-- Math Toggle -->
        <div class="flex items-center">
          <Tooltip :content="isRenderingMath ? 'Show LaTeX source code' : 'Show rendered math'">
            <Button
              variant="ghost"
              size="sm"
              @click="toggleMathRendering"
              :class="{ 'bg-muted': !isRenderingMath }"
              class="h-8 px-3 text-xs"
            >
              <Eye v-if="isRenderingMath" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
              <span class="ml-1.5 hidden sm:inline">
                {{ isRenderingMath ? 'Math' : 'Source' }}
              </span>
            </Button>
          </Tooltip>
        </div>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- Collapse Button -->
        <Tooltip content="Collapse toolbar">
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6"
            @click="editorStore.toggleToolbar"
          >
            <ChevronUp class="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>

      <!-- Secondary Toolbar -->
      <div class="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground border-t">
        <!-- Sidebar Toggles -->
        <div class="flex items-center gap-2">
          <Tooltip v-for="sidebar in sidebarActions" :key="sidebar.id" :content="sidebar.tooltip">
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
              @click="$emit('toggle-sidebar', sidebar.id as SidebarId)"
            >
              <component :is="sidebar.icon" class="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>

        <!-- Document Actions & Status -->
        <div class="flex items-center gap-2">
          <Tooltip v-for="action in documentActions" :key="action.id" :content="action.tooltip">
            <Button
              :variant="action.variant || 'ghost'"
              size="icon"
              class="h-8 w-8 p-0"
              @click="action.action"
              :disabled="action.isDisabled"
            >
              <component :is="action.icon" :class="getIconClasses(action)" />
            </Button>
          </Tooltip>
          
          <Separator orientation="vertical" class="mx-2 h-4" />
          <span class="text-xs">{{ props.wordCount || 0 }} words</span>
        </div>
      </div>
    </template>
  </div>
</template> 