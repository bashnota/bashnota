<script setup lang="ts">
import { Editor } from '@tiptap/vue-3'
import {
  Bold,
  Italic,
  Code,
  FileCode,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Table,
  Undo,
  Redo,
  MinusSquare,
  Eye,
  EyeOff,
} from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { Separator } from '@/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group'
import type { FunctionalComponent } from 'vue'
import { ref, onMounted } from 'vue'
import {
  toggleRenderMathState
} from '@/features/editor/components/extensions/MarkdownExtension'

const emit = defineEmits([
  'run-all',
  'toggle-favorite',
  'share',
  'open-config',
  'export-nota',
])

const props = defineProps<{
  editor: Editor | null
  canRunAll?: boolean
  isExecutingAll?: boolean
  isFavorite?: boolean
}>()

// State to track whether math is rendered or not
const isRenderingMath = ref(true)

// Function to toggle math rendering
const toggleMathRendering = () => {
  if (props.editor) {
    // This will toggle the state and force a redraw
    toggleRenderMathState(props.editor)
    
    // Update our local state to keep button in sync
    isRenderingMath.value = !isRenderingMath.value
  }
}

// Initialize state on mount
onMounted(() => {
  // Check window object for the current state
  if (typeof window !== 'undefined' && window) {
    // @ts-ignore - accessing custom property from window
    isRenderingMath.value = window['markdownAndKatexRenderState'] ?? true
  }
})

// Toolbar groups for better organization
const headingLevels: { icon: FunctionalComponent; level: 1 | 2 | 3 }[] = [
  { icon: Heading1, level: 1 },
  { icon: Heading2, level: 2 },
  { icon: Heading3, level: 3 },
]
</script>

<template>
  <div v-if="editor" class="border-b">
    <div class="flex flex-wrap items-center gap-1 p-1">
      <!-- History Group -->
      <div class="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
        >
          <Undo class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
        >
          <Redo class="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <!-- Headings Group -->
      <ToggleGroup size="sm" type="single">
        <ToggleGroupItem
          v-for="{ icon: Icon, level } in headingLevels"
          :key="level"
          :value="'h' + level"
          :pressed="editor.isActive('heading', { level })"
          @click="editor.chain().focus().toggleHeading({ level }).run()"
        >
          <component :is="Icon" class="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <!-- Text Formatting Group -->
      <ToggleGroup size="sm" type="multiple">
        <ToggleGroupItem
          value="bold"
          :pressed="editor.isActive('bold')"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <Bold class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="italic"
          :pressed="editor.isActive('italic')"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <Italic class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="code"
          :pressed="editor.isActive('code')"
          @click="editor.chain().focus().toggleCode().run()"
        >
          <Code class="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <!-- Lists Group -->
      <ToggleGroup size="sm" type="multiple">
        <ToggleGroupItem
          value="bulletList"
          :pressed="editor.isActive('bulletList')"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <List class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="orderedList"
          :pressed="editor.isActive('orderedList')"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          <ListOrdered class="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <!-- Block Elements Group -->
      <ToggleGroup size="sm" type="multiple">
        <ToggleGroupItem
          value="codeBlock"
          :pressed="editor.isActive('codeBlock')"
          @click="editor.chain().focus().toggleCodeBlock().run()"
        >
          <FileCode class="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="blockquote"
          :pressed="editor.isActive('blockquote')"
          @click="editor.chain().focus().toggleBlockquote().run()"
        >
          <Quote class="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" class="mx-1 h-6" />

      <!-- Insert Group -->
      <div class="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" @click="editor.chain().focus().insertTable().run()">
          <Table class="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" @click="editor.chain().focus().setHorizontalRule().run()">
          <MinusSquare class="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" class="mx-1 h-6" />
      
      <!-- Math Rendering Toggle -->
      <div class="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          @click="toggleMathRendering"
          :title="isRenderingMath ? 'Show LaTeX source code' : 'Show rendered math'"
          :class="{ 'bg-muted': !isRenderingMath }"
        >
          <Eye v-if="isRenderingMath" class="h-4 w-4" />
          <EyeOff v-else class="h-4 w-4" />
          <span class="ml-1 hidden sm:inline">{{ isRenderingMath ? 'Hide Math Source' : 'Show Math Rendered' }}</span>
        </Button>
      </div>
      
    </div>
  </div>
</template>









