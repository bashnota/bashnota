<script setup lang="ts">
import { useEditorStore } from '@/features/editor/stores/editorStore'
import { useUIStore } from '@/stores/uiStore'
import { useSharedSession } from '@/features/editor/composables/useSharedSession'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
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
  Edit3,
  Type,
  Settings,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Link2,
  FileText,
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

// Stores and composables
const editorStore = useEditorStore()
const uiStore = useUIStore()
const { 
  isSharedSessionEnabled, 
  isToggling, 
  toggleSharedSession,
  getSharedSessionInfo 
} = useSharedSession()
const editor = computed(() => editorStore.activeEditor as Editor | null)
const isRenderingMath = ref(true)

// Heading options for buttons
const headingActions = computed(() => {
  if (!editor.value) return [
    {
      id: 'normal',
      icon: Pilcrow,
      label: 'Normal text',
      tooltip: 'Normal text',
      action: () => {},
      isActive: false,
      isDisabled: true,
      group: 'heading'
    },
    {
      id: 'h1',
      icon: Heading1,
      label: 'Heading 1',
      tooltip: 'Heading 1',
      action: () => {},
      isActive: false,
      isDisabled: true,
      group: 'heading'
    },
    {
      id: 'h2',
      icon: Heading2,
      label: 'Heading 2',
      tooltip: 'Heading 2',
      action: () => {},
      isActive: false,
      isDisabled: true,
      group: 'heading'
    },
    {
      id: 'h3',
      icon: Heading3,
      label: 'Heading 3',
      tooltip: 'Heading 3',
      action: () => {},
      isActive: false,
      isDisabled: true,
      group: 'heading'
    },
  ]
  
  return [
    {
      id: 'normal',
      icon: Pilcrow,
      label: 'Normal text',
      tooltip: 'Normal text',
      action: () => editor.value?.chain().focus().setParagraph().run(),
      isActive: !editor.value.isActive('heading'),
      group: 'heading'
    },
    {
      id: 'h1',
      icon: Heading1,
      label: 'Heading 1',
      tooltip: 'Heading 1',
      action: () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.value.isActive('heading', { level: 1 }),
      group: 'heading'
    },
    {
      id: 'h2',
      icon: Heading2,
      label: 'Heading 2',
      tooltip: 'Heading 2',
      action: () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.value.isActive('heading', { level: 2 }),
      group: 'heading'
    },
    {
      id: 'h3',
      icon: Heading3,
      label: 'Heading 3',
      tooltip: 'Heading 3',
      action: () => editor.value?.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.value.isActive('heading', { level: 3 }),
      group: 'heading'
    },
  ]
})

const toggleMathRendering = () => {
  if (editor.value) {
    toggleRenderMathState(editor.value)
    isRenderingMath.value = !isRenderingMath.value
  }
}

// Shared session toggle with proper error handling
const handleToggleSharedSession = async () => {
  try {
    await toggleSharedSession()
  } catch (error) {
    console.error('Error toggling shared session mode:', error)
    // Could add user notification here
  }
}

// Computed tooltip content for shared session
const sharedSessionTooltip = computed(() => {
  const info = getSharedSessionInfo.value
  if (info.enabled) {
    return `Disable shared session mode (${info.cellCount} cells sharing session)`
  }
  return 'Enable shared session mode - code blocks share variables'
})

// Initialize math rendering state
onMounted(() => {
  if (typeof window !== 'undefined' && window) {
    // @ts-ignore
    isRenderingMath.value = window['markdownAndKatexRenderState'] ?? true
  }
})

// Sub-Nota Link Dialog
const showSubNotaLinkDialog = ref(false)
const selectedNotaForLink = ref<any>(null)

const openSubNotaLinkDialog = () => {
  showSubNotaLinkDialog.value = true
}

const insertSubNotaLink = (nota: any) => {
  if (editor.value && nota) {
    editor.value.chain().focus().setSubNotaLink({
      targetNotaId: nota.id,
      targetNotaTitle: nota.title,
      displayText: nota.title,
      linkStyle: 'inline'
    }).run()
    showSubNotaLinkDialog.value = false
  }
}

// Toolbar actions configuration
const historyActions = computed(() => {
  if (!editor.value) return [
    {
      id: 'undo',
      icon: Undo,
      label: 'Undo',
      tooltip: 'Undo (Ctrl+Z)',
      action: () => {},
      isDisabled: true,
      group: 'history'
    },
    {
      id: 'redo',
      icon: Redo,
      label: 'Redo',
      tooltip: 'Redo (Ctrl+Y)',
      action: () => {},
      isDisabled: true,
      group: 'history'
    },
  ]
  
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
  if (!editor.value) return [
    {
      id: 'bold',
      icon: Bold,
      label: 'Bold',
      tooltip: 'Bold (Ctrl+B)',
      action: () => {},
      isActive: false,
      isDisabled: true,
      group: 'formatting'
    },
    {
      id: 'italic',
      icon: Italic,
      label: 'Italic',
      tooltip: 'Italic (Ctrl+I)',
      action: () => {},
      isActive: false,
      isDisabled: true,
      group: 'formatting'
    },
    {
      id: 'code',
      icon: Code,
      label: 'Inline Code',
      tooltip: 'Inline code (Ctrl+`)',
      action: () => {},
      isActive: false,
      isDisabled: true,
      group: 'formatting'
    },
  ]
  
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
  if (!editor.value) return [
    {
      id: 'bulletList',
      icon: List,
      label: 'Bullet List',
      tooltip: 'Bullet list',
      action: () => {},
      isActive: false,
      isDisabled: true,
      group: 'lists'
    },
    {
      id: 'orderedList',
      icon: ListOrdered,
      label: 'Numbered List',
      tooltip: 'Numbered list',
      action: () => {},
      isActive: false,
      isDisabled: true,
      group: 'lists'
    },
  ]
  
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
  if (!editor.value) return [
    {
      id: 'table',
      icon: Table,
      label: 'Table',
      tooltip: 'Insert table',
      action: () => {},
      isDisabled: true,
      group: 'insert'
    },
    {
      id: 'codeBlock',
      icon: FileCode,
      label: 'Code Block',
      tooltip: 'Code block',
      action: () => {},
      isActive: false,
      isDisabled: true,
      group: 'insert'
    },
    {
      id: 'blockquote',
      icon: Quote,
      label: 'Quote',
      tooltip: 'Block quote',
      action: () => {},
      isActive: false,
      isDisabled: true,
      group: 'insert'
    },
    {
      id: 'horizontalRule',
      icon: MinusSquare,
      label: 'Horizontal Rule',
      tooltip: 'Horizontal rule',
      action: () => {},
      isDisabled: true,
      group: 'insert'
    },
  ]
  
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
    {
      id: 'subNotaLink',
      icon: FileText,
      label: 'Sub-Nota Link',
      tooltip: 'Insert link to sub-nota',
      action: () => {
        // Show a dialog to select the target nota
        openSubNotaLinkDialog()
      },
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

// Utility functions
const getIconClasses = (action: ToolbarAction) => {
  const baseClasses = 'h-4 w-4'
  const favoriteClasses = action.id === 'favorite' && props.isFavorite ? 'text-yellow-400 fill-current' : ''
  const spinClasses = action.id === 'run-all' && props.isExecutingAll ? 'animate-spin' : ''
  
  return `${baseClasses} ${favoriteClasses} ${spinClasses}`.trim()
}
</script>

<template>
  <NavigationMenu class="relative z-10 flex max-w-max flex-1 items-center justify-center">
    <NavigationMenuList class="group flex flex-1 list-none items-center justify-center space-x-1">
      <!-- Editor Tools Menu -->
      <NavigationMenuItem>
        <NavigationMenuTrigger 
          :class="!editor ? 'opacity-50' : ''"
          class="group inline-flex h-9 w-max items-center justify-center gap-2 rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
        >
          <Edit3 class="h-4 w-4" />
          Editor Tools
          <span v-if="!editor" class="text-xs text-muted-foreground ml-1">(No editor)</span>
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <div class="w-[320px] max-w-[85vw] p-3">
            <!-- Compact Tool Grid -->
            <div class="grid grid-cols-8 gap-1">
              <!-- Heading Tools -->
              <Tooltip v-for="action in headingActions" :key="action.id" :content="action.tooltip">
                <Toggle
                  :pressed="action.isActive"
                  @click="action.action"
                  :disabled="'isDisabled' in action ? action.isDisabled : false"
                  size="sm"
                  class="h-8 w-8 p-0"
                  :aria-label="action.label"
                >
                  <component :is="action.icon" class="h-4 w-4" />
                </Toggle>
              </Tooltip>

              <!-- Formatting Tools -->
              <Tooltip v-for="action in formattingActions" :key="action.id" :content="action.tooltip">
                <Toggle
                  :pressed="action.isActive"
                  @click="action.action"
                  :disabled="'isDisabled' in action ? action.isDisabled : false"
                  size="sm"
                  class="h-8 w-8 p-0"
                  :aria-label="action.label"
                >
                  <component :is="action.icon" class="h-4 w-4" />
                </Toggle>
              </Tooltip>

              <!-- List Tools -->
              <Tooltip v-for="action in listActions" :key="action.id" :content="action.tooltip">
                <Toggle
                  :pressed="action.isActive"
                  @click="action.action"
                  :disabled="'isDisabled' in action ? action.isDisabled : false"
                  size="sm"
                  class="h-8 w-8 p-0"
                  :aria-label="action.label"
                >
                  <component :is="action.icon" class="h-4 w-4" />
                </Toggle>
              </Tooltip>

              <!-- History Tools -->
              <Tooltip v-for="action in historyActions" :key="action.id" :content="action.tooltip">
                <Button
                  @click="action.action"
                  :disabled="action.isDisabled"
                  variant="ghost"
                  size="sm"
                  class="h-8 w-8 p-0"
                  :aria-label="action.label"
                >
                  <component :is="action.icon" class="h-4 w-4" />
                </Button>
              </Tooltip>

              <!-- Insert Tools -->
              <Tooltip v-for="action in insertActions" :key="action.id" :content="action.tooltip">
                <Toggle
                  :pressed="action.isActive"
                  @click="action.action"
                  :disabled="'isDisabled' in action ? action.isDisabled : false"
                  size="sm"
                  class="h-8 w-8 p-0"
                  :aria-label="action.label"
                >
                  <component :is="action.icon" class="h-4 w-4" />
                </Toggle>
              </Tooltip>

              <!-- Math Rendering Toggle -->
              <Tooltip :content="isRenderingMath ? 'Show LaTeX source code' : 'Show rendered math'">
                <Toggle
                  :pressed="!isRenderingMath"
                  @click="toggleMathRendering"
                  size="sm"
                  class="h-8 w-8 p-0"
                  aria-label="Toggle math rendering"
                >
                  <Eye v-if="isRenderingMath" class="h-4 w-4" />
                  <EyeOff v-else class="h-4 w-4" />
                </Toggle>
              </Tooltip>

              <!-- Shared Session Toggle -->
              <Tooltip :content="sharedSessionTooltip">
                <Toggle
                  :pressed="isSharedSessionEnabled"
                  :disabled="isToggling"
                  @click="handleToggleSharedSession"
                  size="sm"
                  class="h-8 w-8 p-0"
                  :class="{
                    'opacity-50': isToggling,
                    'bg-primary/20 border-primary/50': isSharedSessionEnabled
                  }"
                  aria-label="Toggle shared session mode"
                >
                  <Link2 class="h-4 w-4" />
                </Toggle>
              </Tooltip>
            </div>
          </div>
        </NavigationMenuContent>
      </NavigationMenuItem>

      <!-- Document Actions Menu -->
      <NavigationMenuItem>
        <NavigationMenuTrigger class="group inline-flex h-9 w-max items-center justify-center gap-2 rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
          <Settings class="h-4 w-4" />
          Document
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <div class="w-[280px] max-w-[85vw] p-3">
            <div class="grid grid-cols-6 gap-1">
              <Tooltip v-for="action in documentActions" :key="action.id" :content="action.tooltip">
                <Button
                  :variant="action.variant || 'ghost'"
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
          </div>
        </NavigationMenuContent>
      </NavigationMenuItem>

      <!-- Quick Status Display -->
      <NavigationMenuItem class="ml-2">
        <div class="flex items-center gap-1">
          <!-- Word Count Badge -->
          <Badge variant="secondary" class="text-xs px-1.5 py-0.5 h-6">
            {{ props.wordCount || 0 }}w
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
            <Badge v-if="uiStore.showSaved" variant="default" class="text-xs px-1.5 py-0.5 h-6 bg-green-500 text-white">
              ✓
            </Badge>
            <Badge v-else-if="uiStore.isSaving" variant="outline" class="text-xs px-1.5 py-0.5 h-6">
              <Loader2 class="h-3 w-3 animate-spin" />
            </Badge>
          </Transition>
        </div>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
</template>
