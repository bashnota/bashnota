<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useEditorStore } from '@/features/editor/stores/editorStore'
import { useSharedSession } from '@/features/editor/composables/useSharedSession'
import { useSidebarManager } from '@/composables/useSidebarManager'
import { useSubNotaDialog } from '@/features/editor/composables/useSubNotaDialog'
import { toggleRenderMathState } from '@/features/editor/components/extensions/MarkdownExtension'
import { Editor } from '@tiptap/vue-3'

// Action Icons
import {
  Save,
  Share2,
  Download,
  Star,
  Clock,
  Undo,
  Redo,
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Table,
  FileCode,
  Quote,
  MinusSquare,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Link2,
  Loader2,
  PlayCircle,
  Eye,
  EyeOff,
  Menu,
  BookIcon,
  ServerIcon,
  BrainIcon,
  Tag,
  Check,
  FileText,
  Trash2,
  Settings
} from 'lucide-vue-next'

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar'

// Props
const props = defineProps<{
  canRunAll?: boolean
  isExecutingAll?: boolean
  isFavorite?: boolean
}>()

// Emits
const emit = defineEmits<{
  'run-all': []
  'toggle-favorite': []
  'share': []
  'open-config': []
  'export-nota': []
  'save-version': []
  'open-history': []
  'toggle-sidebar': [id: string]
  'open-help': []
}>()

// Stores
const editorStore = useEditorStore()
const { 
  isSharedSessionEnabled, 
  isToggling, 
  toggleSharedSession 
} = useSharedSession()
const {
  sidebarsByCategory,
  toggleSidebar,
  closeAllSidebars, 
  hasActiveSidebar
} = useSidebarManager()

const { openSubNotaDialog } = useSubNotaDialog()

// Computed
const editor = computed(() => editorStore.activeEditor as Editor | null)
const isRenderingMath = ref(true)

// Sidebar Icons Map
const iconMap = {
  Menu,
  BookIcon,
  ServerIcon,
  BrainIcon,
  Tag,
  Star,
}
const getIcon = (iconName: string) => iconMap[iconName as keyof typeof iconMap] || Menu

// Editor Actions
const toggleMathRendering = () => {
  if (editor.value) {
    toggleRenderMathState(editor.value)
    isRenderingMath.value = !isRenderingMath.value
  }
}

// Sub-Nota Link Handler
const handleSubNotaLink = () => {
  const parentId = editorStore.activeEditorComponent?.currentNota?.id || ''
  
  openSubNotaDialog(
    parentId,
    (newNotaId, title) => {
      // Optional: Add link to editor if active
      if (editor.value) {
        editor.value.chain().focus().setSubNotaLink({
          targetNotaId: newNotaId,
          targetNotaTitle: title,
          displayText: title,
          linkStyle: 'inline'
        }).run()
      }
    },
    () => {} // No-op for cancel
  )
}

onMounted(() => {
  if (typeof window !== 'undefined' && window) {
    // @ts-ignore
    isRenderingMath.value = window['markdownAndKatexRenderState'] ?? true
  }
})
</script>

<template>
  <Menubar class="border-none bg-transparent shadow-none h-auto p-0">
    
    <!-- FILE MENU -->
    <MenubarMenu>
      <MenubarTrigger>File</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="emit('save-version')" :disabled="!editor">
          <Save class="w-4 h-4 mr-2" />
          Save The Version
          <MenubarShortcut>⌘S</MenubarShortcut>
        </MenubarItem>
        <MenubarItem @click="emit('open-history')">
          <Clock class="w-4 h-4 mr-2" />
          Version History
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="emit('toggle-favorite')">
          <Star class="w-4 h-4 mr-2" :class="{ 'fill-yellow-400 text-yellow-400': isFavorite }" />
          {{ isFavorite ? 'Remove from Favorites' : 'Add to Favorites' }}
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="emit('share')">
          <Share2 class="w-4 h-4 mr-2" />
          Share...
        </MenubarItem>
        <MenubarItem @click="emit('export-nota')">
          <Download class="w-4 h-4 mr-2" />
          Export...
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="emit('open-config')">
          <Settings class="w-4 h-4 mr-2" />
          Properties
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- EDIT MENU -->
    <MenubarMenu>
      <MenubarTrigger>Edit</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="editor?.chain().focus().undo().run()" :disabled="!editor?.can().undo()">
          <Undo class="w-4 h-4 mr-2" />
          Undo
          <MenubarShortcut>⌘Z</MenubarShortcut>
        </MenubarItem>
        <MenubarItem @click="editor?.chain().focus().redo().run()" :disabled="!editor?.can().redo()">
          <Redo class="w-4 h-4 mr-2" />
          Redo
          <MenubarShortcut>⌘Y</MenubarShortcut>
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem disabled>
          Cut
          <MenubarShortcut>⌘X</MenubarShortcut>
        </MenubarItem>
        <MenubarItem disabled>
          Copy
          <MenubarShortcut>⌘C</MenubarShortcut>
        </MenubarItem>
        <MenubarItem disabled>
          Paste
          <MenubarShortcut>⌘V</MenubarShortcut>
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="editor?.chain().focus().unsetAllMarks().run()" :disabled="!editor">
          <Trash2 class="w-4 h-4 mr-2" />
          Clear Formatting
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- INSERT MENU -->
    <MenubarMenu>
      <MenubarTrigger>Insert</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="editor?.chain().focus().insertTable().run()" :disabled="!editor">
          <Table class="w-4 h-4 mr-2" />
          Table
        </MenubarItem>
        <MenubarItem @click="editor?.chain().focus().toggleCodeBlock().run()" :disabled="!editor">
          <FileCode class="w-4 h-4 mr-2" />
          Code Block
        </MenubarItem>
        <MenubarItem @click="editor?.chain().focus().toggleBlockquote().run()" :disabled="!editor">
          <Quote class="w-4 h-4 mr-2" />
          Block Quote
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="editor?.chain().focus().setHorizontalRule().run()" :disabled="!editor">
          <MinusSquare class="w-4 h-4 mr-2" />
          Horizontal Rule
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="handleSubNotaLink" :disabled="!editor">
          <FileText class="w-4 h-4 mr-2" />
          Sub-Nota Link
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- FORMAT MENU (New) -->
    <MenubarMenu>
      <MenubarTrigger>Format</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="editor?.chain().focus().toggleBold().run()" :disabled="!editor">
          <Bold class="w-4 h-4 mr-2" />
          Bold
          <MenubarShortcut>⌘B</MenubarShortcut>
        </MenubarItem>
        <MenubarItem @click="editor?.chain().focus().toggleItalic().run()" :disabled="!editor">
          <Italic class="w-4 h-4 mr-2" />
          Italic
          <MenubarShortcut>⌘I</MenubarShortcut>
        </MenubarItem>
        <MenubarItem @click="editor?.chain().focus().toggleCode().run()" :disabled="!editor">
          <Code class="w-4 h-4 mr-2" />
          Inline Code
          <MenubarShortcut>⌘E</MenubarShortcut>
        </MenubarItem>
        <MenubarSeparator />
        
        <!-- Headings Submenu -->
        <MenubarSub>
          <MenubarSubTrigger>Headings</MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem @click="editor?.chain().focus().setParagraph().run()" :disabled="!editor">
              <Pilcrow class="w-4 h-4 mr-2" />
              Normal Text
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()" :disabled="!editor">
              <Heading1 class="w-4 h-4 mr-2" />
              Heading 1
            </MenubarItem>
            <MenubarItem @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()" :disabled="!editor">
              <Heading2 class="w-4 h-4 mr-2" />
              Heading 2
            </MenubarItem>
            <MenubarItem @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()" :disabled="!editor">
              <Heading3 class="w-4 h-4 mr-2" />
              Heading 3
            </MenubarItem>
          </MenubarSubContent>
        </MenubarSub>

        <!-- Lists Submenu -->
        <MenubarSub>
          <MenubarSubTrigger>Lists</MenubarSubTrigger>
          <MenubarSubContent>
            <MenubarItem @click="editor?.chain().focus().toggleBulletList().run()" :disabled="!editor">
              <List class="w-4 h-4 mr-2" />
              Bullet List
            </MenubarItem>
            <MenubarItem @click="editor?.chain().focus().toggleOrderedList().run()" :disabled="!editor">
              <ListOrdered class="w-4 h-4 mr-2" />
              Numbered List
            </MenubarItem>
          </MenubarSubContent>
        </MenubarSub>

      </MenubarContent>
    </MenubarMenu>

    <!-- VIEW MENU (With Sidebars) -->
    <MenubarMenu>
      <MenubarTrigger>View</MenubarTrigger>
      <MenubarContent>
        <MenubarCheckboxItem 
          :checked="isRenderingMath"
          @click="toggleMathRendering"
        >
          <component :is="isRenderingMath ? Eye : EyeOff" class="w-4 h-4 mr-2" />
          Render Math (LaTeX)
        </MenubarCheckboxItem>

        <MenubarSeparator />
        
        <!-- Sidebars Section (Full list for discoverability, even if pinned ones are visible outside) -->
        <MenubarSub>
          <MenubarSubTrigger>Sidebars</MenubarSubTrigger>
          <MenubarSubContent class="w-64">
            <template v-for="category in sidebarsByCategory" :key="category.id">
                <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                  {{ category.title }}
                </div>
                <MenubarCheckboxItem
                  v-for="sidebar in category.sidebars"
                  :key="sidebar.id"
                  :checked="sidebar.isOpen"
                  @click="toggleSidebar(sidebar.id)"
                >
                  <component :is="getIcon(sidebar.icon)" class="h-4 w-4 mr-2" />
                  <span class="flex-1">{{ sidebar.title }}</span>
                </MenubarCheckboxItem>
            </template>
            
              <MenubarSeparator />
              <MenubarItem @click="closeAllSidebars" :disabled="!hasActiveSidebar">
                Close All Sidebars
              </MenubarItem>
          </MenubarSubContent>
        </MenubarSub>
      </MenubarContent>
    </MenubarMenu>

    <!-- RUN MENU -->
    <MenubarMenu>
      <MenubarTrigger>Run</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="emit('run-all')" :disabled="!canRunAll || isExecutingAll">
          <component :is="isExecutingAll ? Loader2 : PlayCircle" class="w-4 h-4 mr-2" :class="{ 'animate-spin': isExecutingAll }" />
          Run All Cells
        </MenubarItem>
        
        <MenubarSeparator />
        
        <MenubarCheckboxItem 
          :checked="isSharedSessionEnabled" 
          @click="toggleSharedSession"
          :disabled="isToggling"
        >
          <Link2 class="w-4 h-4 mr-2" />
          Shared Session Mode
        </MenubarCheckboxItem>
      </MenubarContent>
    </MenubarMenu>

    <!-- HELP MENU -->
    <MenubarMenu>
      <MenubarTrigger>Help</MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="emit('open-help')">
          Documentation
          <MenubarShortcut>F1</MenubarShortcut>
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem asChild>
          <a href="https://github.com/bashnota/bashnota" target="_blank" class="flex items-center">
            GitHub Repository
          </a>
        </MenubarItem>
        <MenubarItem asChild>
          <a href="https://github.com/bashnota/bashnota/issues" target="_blank" class="flex items-center">
            Report an Issue
          </a>
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>

  </Menubar>
</template>
