<template>
  <div class="markdown-input-component">
    <Dialog v-model="isOpen" :open="isOpen">
      <DialogContent class="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Insert Markdown Content</DialogTitle>
          <DialogDescription>
            Paste or type markdown content. Preview and validate blocks before inserting them into your document.
          </DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
          <!-- Left Side - Input -->
          <div class="space-y-4">
            <div>
              <Label for="markdown-input">Markdown Content</Label>
              <Textarea
                id="markdown-input"
                v-model="markdownContent"
                :rows="20"
                class="font-mono text-sm resize-none"
                placeholder="Paste or type your markdown content here...

# Example Heading

This is a paragraph with **bold** and *italic* text.

```python
def hello_world():
    print('Hello, World!')
```

$$E = mc^2$$

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

> This is a blockquote

- List item 1
- List item 2
  - Nested item

```{python,output=true}
import pandas as pd
df = pd.DataFrame({'A': [1, 2, 3]})
print(df)
```"
              />
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="clearContent"
                  :disabled="!markdownContent.trim()"
                >
                  <Trash2 class="h-4 w-4 mr-2" />
                  Clear
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  @click="loadExample"
                >
                  <FileText class="h-4 w-4 mr-2" />
                  Load Example
                </Button>
              </div>
              
              <div class="text-sm text-muted-foreground">
                {{ markdownContent.length }} characters
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="space-y-2">
              <Label class="text-sm font-medium">Quick Actions</Label>
              <div class="grid grid-cols-2 gap-2">
                <Button
                  v-for="action in quickActions"
                  :key="action.name"
                  variant="outline"
                  size="sm"
                  @click="insertQuickAction(action)"
                  class="justify-start text-xs"
                >
                  <component :is="action.icon" class="h-3 w-3 mr-2" />
                  {{ action.name }}
                </Button>
              </div>
            </div>
          </div>

          <!-- Right Side - Preview -->
          <div class="space-y-4">
            <BlockPreviewComponent
              :content="markdownContent"
              @insert-blocks="handleInsertBlocks"
              @cancel="closeDialog"
            />
          </div>
        </div>

        <DialogFooter class="gap-2">
          <Button variant="outline" @click="closeDialog">
            Cancel
          </Button>
          
          <Button
            @click="insertAllValidBlocks"
            :disabled="!hasValidBlocks || isProcessing"
          >
            <Plus class="h-4 w-4 mr-2" />
            Insert All Valid Blocks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Trash2, 
  FileText, 
  Plus, 
  Code, 
  Table, 
  Image, 
  Link, 
  List, 
  Quote, 
  Heading1, 
  Hash, 
  Play 
} from 'lucide-vue-next'
import BlockPreviewComponent from './BlockPreviewComponent.vue'
import { markdownParserService } from '@/features/editor/services/MarkdownParserService'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  insertBlocks: [blocks: any[]]
}>()

// State
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const markdownContent = ref('')
const isProcessing = ref(false)

// Computed
const hasValidBlocks = computed(() => {
  if (!markdownContent.value.trim()) return false
  try {
    const result = markdownParserService.parseMarkdown(markdownContent.value)
    return result.blocks.some(block => block.metadata.isValid)
  } catch {
    return false
  }
})

// Quick actions for common markdown patterns
const quickActions = [
  {
    name: 'Heading',
    icon: Heading1,
    template: '# Heading\n\nContent goes here...'
  },
  {
    name: 'Code Block',
    icon: Code,
    template: '```python\n# Your code here\nprint("Hello, World!")\n```'
  },
  {
    name: 'Table',
    icon: Table,
    template: '| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Data 1   | Data 2   | Data 3   |\n| Data 4   | Data 5   | Data 6   |'
  },
  {
    name: 'Image',
    icon: Image,
    template: '![Alt text](image-url "Optional title")'
  },
  {
    name: 'Link',
    icon: Link,
    template: '[Link text](https://example.com)'
  },
  {
    name: 'List',
    icon: List,
    template: '- Item 1\n- Item 2\n  - Nested item\n- Item 3'
  },
  {
    name: 'Quote',
    icon: Quote,
    template: '> This is a blockquote\n> It can span multiple lines'
  },
  {
    name: 'Math',
    icon: Hash,
    template: '$$\nE = mc^2\n$$'
  },
  {
    name: 'Executable Code',
    icon: Play,
    template: '```{python,output=true}\nimport pandas as pd\ndf = pd.DataFrame({\'A\': [1, 2, 3]})\nprint(df)\n```'
  }
]

// Methods
const clearContent = () => {
  markdownContent.value = ''
}

const loadExample = () => {
  markdownContent.value = `# Sample Document

This is a sample markdown document demonstrating various block types.

## Code Example

Here's a Python code block:

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

## Mathematical Expression

Inline math: $E = mc^2$

Display math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## Table

| Feature | Status | Notes |
|---------|--------|-------|
| Headings | ✅ | All levels supported |
| Code | ✅ | Syntax highlighting |
| Math | ✅ | KaTeX rendering |
| Tables | ✅ | Responsive design |

## List

- **Unordered list**
  - Nested item
  - Another nested item
- **Ordered list**
  1. First item
  2. Second item

## Blockquote

> This is a blockquote that demonstrates how quoted text appears.
> It can span multiple lines and provides visual distinction.

## Executable Code

\`\`\`{python,output=true}
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.plot(x, y)
plt.title('Sine Wave')
plt.show()
\`\`\`

## Image

![Sample Image](https://via.placeholder.com/400x200 "Placeholder Image")

## Link

Visit [our documentation](https://example.com/docs) for more information.

---

*This document showcases the rich markdown capabilities available.*`
}

const insertQuickAction = (action: typeof quickActions[0]) => {
  const cursorPos = (document.getElementById('markdown-input') as HTMLTextAreaElement)?.selectionStart || 0
  const before = markdownContent.value.substring(0, cursorPos)
  const after = markdownContent.value.substring(cursorPos)
  
  markdownContent.value = before + '\n\n' + action.template + '\n\n' + after
  
  // Focus back to textarea
  nextTick(() => {
    const textarea = document.getElementById('markdown-input') as HTMLTextAreaElement
    if (textarea) {
      textarea.focus()
      const newPos = before.length + 2 + action.template.length + 2
      textarea.setSelectionRange(newPos, newPos)
    }
  })
}

const handleInsertBlocks = (blocks: any[]) => {
  emit('insertBlocks', blocks)
  closeDialog()
}

const insertAllValidBlocks = async () => {
  if (!markdownContent.value.trim()) return
  
  isProcessing.value = true
  try {
    const result = markdownParserService.parseMarkdown(markdownContent.value)
    const validBlocks = result.blocks.filter(block => block.metadata.isValid)
    
    if (validBlocks.length > 0) {
      const tiptapBlocks = markdownParserService.convertToTiptap(validBlocks)
      emit('insertBlocks', tiptapBlocks)
      closeDialog()
    }
  } catch (error) {
    console.error('Error processing markdown:', error)
  } finally {
    isProcessing.value = false
  }
}

const closeDialog = () => {
  isOpen.value = false
  markdownContent.value = ''
}

// Watch for dialog open to load example if empty
watch(isOpen, (newValue) => {
  if (newValue && !markdownContent.value.trim()) {
    loadExample()
  }
})
</script>

<style scoped>
.markdown-input-component {
  /* Component styles */
}
</style>
