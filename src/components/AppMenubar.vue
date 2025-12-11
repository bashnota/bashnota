<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useEditorStore } from '@/features/editor/stores/editorStore'
import { useSharedSession } from '@/features/editor/composables/useSharedSession'
import { useSidebarManager } from '@/composables/useSidebarManager'
import { toggleRenderMathState } from '@/features/editor/components/extensions/MarkdownExtension'
import { Editor } from '@tiptap/vue-3'
import { useUIStore } from '@/stores/uiStore'

// Action Icons (imported only what's needed for the menu items that might want icons, though standard menubars often use text or small icons)
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
  Pin,
  PinOff,
  Check
} from 'lucide-vue-next'

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar'
import { Badge } from '@/components/ui/badge'

// Props
const props = defineProps<{
  canRunAll?: boolean
  isExecutingAll?: boolean
  isFavorite?: boolean
  wordCount?: number
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
  'open-help': [] // Add this emit
}>()

// Stores
const editorStore = useEditorStore()
const uiStore = useUIStore() // For save status
const { 
  isSharedSessionEnabled, 
  isToggling, 
  toggleSharedSession,
  getSharedSessionInfo 
} = useSharedSession()
const {
  sidebarsByCategory,
  pinnedSidebars,
  toggleSidebar,
  toggleSidebarPin,
  closeAllSidebars, 
  hasActiveSidebar
} = useSidebarManager()

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

// Sub-Nota Link Dialog State (Managed cleanly)
const showSubNotaLinkDialog = ref(false)
// In a real refactor, we'd probably want to emit an event or use a composable for the dialogs 
// to avoid duplicate logic if App.vue owns the dialogs. 
// However, the original EditorToolbar had `openSubNotaLinkDialog`.
// For now, let's just emit an intent to insert things if complex, or handle simple things here.
// Actually, `SubNotaDialog` is in `App.vue` (globally). 
// The EditorToolbar logic for `insertSubNotaLink` was:
// `editor.value.chain().focus().setSubNotaLink(...)`.
// We should probably rely on the global dialogs mechanism or similar.
// But wait, `SubNotaDialog` is global. EditorToolbar imported it? No, EditorToolbar just had the logic to OPEN it?
// EditorToolbar.vue had: `showSubNotaLinkDialog = ref(false)` and `SubNotaDialog` was NOT in its template?
// Wait, checking EditorToolbar content... 
// It DID NOT have `SubNotaDialog` in template. It had `openSubNotaLinkDialog` leading to `showSubNotaLinkDialog.value = true`.
// But where was the dialog? Ah, looking at `App.vue`, `SubNotaDialog` is there.
// `EditorToolbar` seemed to rely on `showSubNotaLinkDialog` but didn't seem to render it?
// Re-reading `EditorToolbar.vue`: 
// It has `const showSubNotaLinkDialog = ref(false)`.
// It has `openSubNotaLinkDialog`. 
// It has `insertSubNotaLink`.
// But `SubNotaDialog` component is NOT in EditorToolbar template. 
// Wait, `SubNotaDialog` in `App.vue`... how did it trigger?
// In `App.vue`: `<SubNotaDialog />`. It seems self-contained or store-driven?
// Or maybe I missed something.
// Let's assume for now standard editor commands work fine. 
// For "Sub-Nota Link", I will assume we might need to trigger a global event or use a store if the dialog is global.
// Actually, `activeEditor` commands are synchronous.
// Let's skip the complex "Sub-Nota Link" dialog logic for this specific file for a moment and focus on the main menu structure.
// If it's needed, I'll add an emit `insert-sub-nota` or similar.

onMounted(() => {
  if (typeof window !== 'undefined' && window) {
    // @ts-ignore
    isRenderingMath.value = window['markdownAndKatexRenderState'] ?? true
  }
})

</script>

<template>
  <div class="flex items-center w-full border-b bg-background px-2 h-10">
    <Menubar class="border-none bg-transparent shadow-none h-auto p-0">
      
      <!-- FILE MENU -->
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem @click="emit('save-version')" :disabled="!editor">
            <Save class="w-4 h-4 mr-2" />
            Save Version
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
        </MenubarContent>
      </MenubarMenu>

      <!-- EDIT MENU -->
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <!-- Undo/Redo -->
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
          
          <!-- Formatting Submenu -->
          <MenubarSub>
            <MenubarSubTrigger>Formatting</MenubarSubTrigger>
            <MenubarSubContent>
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
            </MenubarSubContent>
          </MenubarSub>

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
        </MenubarContent>
      </MenubarMenu>

      <!-- VIEW MENU (Including Sidebars) -->
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
          
          <!-- Sidebars Section -->
          <MenubarSub>
            <MenubarSubTrigger>Sidebars</MenubarSubTrigger>
            <MenubarSubContent class="w-64">
              <!-- Content similar to MenubarSidebars.vue -->
              
              <!-- Pinned Sidebars -->
              <div v-if="pinnedSidebars.length > 0">
                 <div class="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Pin class="h-3 w-3" />
                    Pinned Sidebars
                  </div>
                  <MenubarItem 
                    v-for="sidebar in pinnedSidebars"
                    :key="sidebar.id"
                    @click="toggleSidebar(sidebar.id)"
                  >
                    <component :is="getIcon(sidebar.icon)" class="h-4 w-4 mr-2" />
                    {{ sidebar.title }}
                    <Badge v-if="sidebar.isOpen" class="ml-auto text-[10px] h-4">Active</Badge>
                  </MenubarItem>
                  <MenubarSeparator />
              </div>

              <!-- Categories -->
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
                    <!-- Tiny pin action inside the item is tricky in standard MenubarItem, 
                         usually menu items are single action. 
                         For now, we'll keep it simple: Click to toggle.
                         Maybe add a submenu for "Manage"? Or just toggle.
                    -->
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

    <!-- Right-aligned Status / Info -->
    <div class="ml-auto flex items-center gap-3 text-sm">
       <!-- Word Count -->
      <div v-if="wordCount" class="text-muted-foreground text-xs">
        {{ wordCount }} words
      </div>
      
      <!-- Save Status -->
      <div class="flex items-center">
         <Badge 
           v-if="uiStore.showSaved" 
           variant="outline" 
           class="h-5 px-1 bg-green-500/10 text-green-600 border-green-200"
         >
            <Check class="w-3 h-3 mr-1" />
            Saved
         </Badge>
         <Badge 
           v-else-if="uiStore.isSaving" 
           variant="outline" 
           class="h-5 px-1"
         >
            <Loader2 class="w-3 h-3 mr-1 animate-spin" />
            Saving...
         </Badge>
      </div>
    </div>
  </div>
</template>
