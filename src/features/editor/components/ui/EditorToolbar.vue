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
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Image,
  Type,
} from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { Separator } from '@/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select'
import type { FunctionalComponent } from 'vue'
import { ref, onMounted, computed } from 'vue'
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

// Current heading level for the select dropdown
const currentHeadingLevel = computed(() => {
  if (!props.editor) return 'normal'
  
  if (props.editor.isActive('heading', { level: 1 })) return 'h1'
  if (props.editor.isActive('heading', { level: 2 })) return 'h2'
  if (props.editor.isActive('heading', { level: 3 })) return 'h3'
  return 'normal'
})

// Handle heading level change
const setHeadingLevel = (level: string) => {
  if (!props.editor) return
  
  if (level === 'normal') {
    props.editor.chain().focus().setParagraph().run()
  } else {
    const headingLevel = parseInt(level.replace('h', '')) as 1 | 2 | 3
    props.editor.chain().focus().toggleHeading({ level: headingLevel }).run()
  }
}

// Toolbar groups for better organization
const headingOptions = [
  { value: 'normal', label: 'Normal text' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
]
</script>

<template>
  <div v-if="editor" class="border-b bg-background">
    <!-- Main toolbar -->
    <div class="flex flex-wrap items-center gap-1 px-3 py-2">
      <!-- History Group -->
      <div class="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          class="h-8 w-8 p-0"
          title="Undo"
        >
          <Undo class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          class="h-8 w-8 p-0"
          title="Redo"
        >
          <Redo class="h-4 w-4" />
        </Button>
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

      <!-- Text Formatting Group -->
      <div class="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().toggleBold().run()"
          :class="{ 'bg-muted': editor.isActive('bold') }"
          class="h-8 w-8 p-0"
          title="Bold"
        >
          <Bold class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().toggleItalic().run()"
          :class="{ 'bg-muted': editor.isActive('italic') }"
          class="h-8 w-8 p-0"
          title="Italic"
        >
          <Italic class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().toggleCode().run()"
          :class="{ 'bg-muted': editor.isActive('code') }"
          class="h-8 w-8 p-0"
          title="Inline code"
        >
          <Code class="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" class="mx-2 h-6" />

      <!-- Lists Group -->
      <div class="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().toggleBulletList().run()"
          :class="{ 'bg-muted': editor.isActive('bulletList') }"
          class="h-8 w-8 p-0"
          title="Bullet list"
        >
          <List class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().toggleOrderedList().run()"
          :class="{ 'bg-muted': editor.isActive('orderedList') }"
          class="h-8 w-8 p-0"
          title="Numbered list"
        >
          <ListOrdered class="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" class="mx-2 h-6" />

      <!-- Insert Group -->
      <div class="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().insertTable().run()"
          class="h-8 w-8 p-0"
          title="Insert table"
        >
          <Table class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().toggleCodeBlock().run()"
          :class="{ 'bg-muted': editor.isActive('codeBlock') }"
          class="h-8 w-8 p-0"
          title="Code block"
        >
          <FileCode class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().toggleBlockquote().run()"
          :class="{ 'bg-muted': editor.isActive('blockquote') }"
          class="h-8 w-8 p-0"
          title="Quote"
        >
          <Quote class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          @click="editor.chain().focus().setHorizontalRule().run()"
          class="h-8 w-8 p-0"
          title="Horizontal rule"
        >
          <MinusSquare class="h-4 w-4" />
        </Button>
      </div>

      <!-- Spacer to push math toggle to the right -->
      <div class="flex-1"></div>

      <!-- Math Rendering Toggle -->
      <div class="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          @click="toggleMathRendering"
          :title="isRenderingMath ? 'Show LaTeX source code' : 'Show rendered math'"
          :class="{ 'bg-muted': !isRenderingMath }"
          class="h-8 px-3 text-xs"
        >
          <Eye v-if="isRenderingMath" class="h-4 w-4" />
          <EyeOff v-else class="h-4 w-4" />
          <span class="ml-1.5 hidden sm:inline">
            {{ isRenderingMath ? 'Math' : 'Source' }}
          </span>
        </Button>
      </div>
    </div>
  </div>
</template>









