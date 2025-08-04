# Editor Blocks (`src/features/editor/components/blocks`)

This directory contains all the custom content blocks available in the rich text editor. Each block is a self-contained feature, usually consisting of a Tiptap Node extension and a Vue component to render it.

## General Components

-   **`CommandsList.vue`**: A clean, modular command list component built with shadcn/ui Command components. Features TypeScript support, grouped commands with separators, keyboard navigation, search functionality, icons, descriptions, keyboard shortcuts, and customizable styling. See below for detailed documentation.
-   **`CommandsListExample.vue`**: Example component demonstrating proper usage of CommandsList with sample commands, icons, and categories.
-   **`index.ts`**: A central file that exports all the block extensions, making them easy to register with the main Tiptap editor instance.
-   **`SubNotaDialog.vue`**: A dialog component used for creating or linking "sub-notas," which are likely nested or related documents.

---

# CommandsList Component

A clean, modular command list component built with shadcn/ui Command components following Vue.js and TypeScript best practices.

## Features

- ✅ Built with shadcn/ui Command components
- ✅ TypeScript support with proper type safety
- ✅ Grouped commands with separators
- ✅ Keyboard navigation support
- ✅ Search functionality via CommandInput
- ✅ Icons, descriptions, and keyboard shortcuts
- ✅ Disabled state support
- ✅ Customizable styling and props
- ✅ Clean, semantic template structure

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Calendar, Settings } from 'lucide-vue-next'
import CommandsList from './CommandsList.vue'
import type { CommandItem } from '@/composables/useCommandList'

const commands: CommandItem[] = [
  {
    title: 'Calendar',
    description: 'Open calendar',
    icon: Calendar,
    category: 'Suggestions',
    shortcut: '⌘C',
    disabled: false,
    command: () => console.log('Opening calendar'),
  },
]

const handleCommand = (item: CommandItem) => {
  console.log('Command executed:', item)
}
</script>

<template>
  <CommandsList
    :items="commands"
    :command="handleCommand"
    placeholder="Type a command or search..."
    @select="handleCommand"
  />
</template>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `CommandItem[]` | - | Array of command items to display |
| `command` | `(item: CommandItem) => void` | - | Function called when a command is executed |
| `placeholder` | `string` | `'Type a command or search...'` | Placeholder text for the search input |
| `className` | `string` | - | Additional CSS classes |
| `maxHeight` | `string` | `'320px'` | Maximum height of the command list |
| `emptyMessage` | `string` | `'No commands found'` | Message shown when no commands match |
| `emptyDescription` | `string` | `'Try a different search term'` | Description for empty state |

## CommandItem Interface

```typescript
interface CommandItem {
  title: string
  icon: any // Vue component (e.g., from lucide-vue-next)
  command: (props: any) => void
  category: string
  shortcut?: string
  disabled?: boolean
  description?: string
}
```

---

## Block Subdirectories

Each subdirectory is a self-contained block with its own logic and Vue component:

-   `citation-block`: For creating and managing bibliographic citations.
-   `confusion-matrix`: For displaying a confusion matrix, a common tool in machine learning.
-   `executable-code-block`: For code blocks that can be executed, with language selection and output display.
-   `inline-ai-generation`: For triggering and displaying AI-generated content directly within the text flow.
-   `math-block`: For writing and rendering mathematical equations, likely using KaTeX or MathJax.
-   `nota-config`: For configuring metadata and settings for the entire document ("nota").
-   `subfigure-block`: For arranging and captioning a group of figures.
-   `table-block`: For creating and editing structured tables.
-   `theorem-block`: For special-cased blocks like theorems, definitions, and proofs.
-   `youtube-block`: For embedding and displaying YouTube videos. 