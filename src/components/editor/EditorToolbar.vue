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
  Save,
  History
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Badge } from '@/components/ui/badge'
import type { FunctionalComponent } from 'vue'

const props = defineProps<{
  editor: Editor | null,
  isSavingVersion?: boolean,
  wordCount?: number
}>()

const emit = defineEmits(['save-version', 'show-history'])

// Toolbar groups for better organization
const headingLevels: { icon: FunctionalComponent; level: 1 | 2 | 3 }[] = [
  { icon: Heading1, level: 1 },
  { icon: Heading2, level: 2 },
  { icon: Heading3, level: 3 },
]
</script>

<template>
  <div v-if="editor" class="border-b">
    <div class="flex flex-wrap items-center justify-between gap-1 p-1">
      <!-- Main toolbar section -->
      <div class="flex flex-wrap items-center gap-1">
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
      </div>
      
      <!-- Right-aligned section with version controls and terminal -->
      <div class="flex items-center gap-2 ml-auto">
        <!-- Word count -->
        <span class="text-xs text-muted-foreground">{{ wordCount || 0 }} words</span>
        
        <!-- Version controls -->
        <Button
          variant="outline"
          size="sm"
          @click="$emit('save-version')"
          :disabled="isSavingVersion"
          class="flex items-center gap-1"
        >
          <span v-if="isSavingVersion" class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
          <Save class="h-4 w-4 mr-1" />
          <span>Save Version</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          @click="$emit('show-history')"
          class="flex items-center gap-1"
        >
          <History class="h-4 w-4 mr-1" />
          <span>History</span>
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* No styles needed after terminal button removal */
</style>
