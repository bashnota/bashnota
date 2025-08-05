<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Export Document</DialogTitle>
        <DialogDescription>
          Choose the format for exporting "{{ notaTitle }}"
        </DialogDescription>
      </DialogHeader>
      
      <div class="grid gap-4 py-4">
        <div class="space-y-3">
          <!-- .nota format -->
          <div 
            class="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
            :class="{ 'bg-muted': selectedFormat === 'nota' }"
            @click="selectedFormat = 'nota'"
          >
            <div class="flex h-4 w-4 items-center justify-center">
              <div 
                class="h-2 w-2 rounded-full"
                :class="selectedFormat === 'nota' ? 'bg-primary' : 'bg-muted-foreground/30'"
              />
            </div>
            <div class="flex-1">
              <div class="font-medium">Native Format (.nota)</div>
              <div class="text-sm text-muted-foreground">
                Complete document with all metadata - recommended
              </div>
            </div>
            <Badge variant="secondary">Native</Badge>
          </div>

          <!-- HTML format -->
          <div 
            class="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
            :class="{ 'bg-muted': selectedFormat === 'html' }"
            @click="selectedFormat = 'html'"
          >
            <div class="flex h-4 w-4 items-center justify-center">
              <div 
                class="h-2 w-2 rounded-full"
                :class="selectedFormat === 'html' ? 'bg-primary' : 'bg-muted-foreground/30'"
              />
            </div>
            <div class="flex-1">
              <div class="font-medium">Web Page (.html)</div>
              <div class="text-sm text-muted-foreground">
                Standalone web page with styling
              </div>
            </div>
            <Globe class="h-4 w-4 text-muted-foreground" />
          </div>

          <!-- Markdown format -->
          <div 
            class="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
            :class="{ 'bg-muted': selectedFormat === 'markdown' }"
            @click="selectedFormat = 'markdown'"
          >
            <div class="flex h-4 w-4 items-center justify-center">
              <div 
                class="h-2 w-2 rounded-full"
                :class="selectedFormat === 'markdown' ? 'bg-primary' : 'bg-muted-foreground/30'"
              />
            </div>
            <div class="flex-1">
              <div class="font-medium">Markdown (.md)</div>
              <div class="text-sm text-muted-foreground">
                Plain text with markdown formatting
              </div>
            </div>
            <FileText class="h-4 w-4 text-muted-foreground" />
          </div>

          <!-- PDF format (disabled) -->
          <div 
            class="flex items-center space-x-3 p-3 rounded-lg border cursor-not-allowed opacity-50"
          >
            <div class="flex h-4 w-4 items-center justify-center">
              <div class="h-2 w-2 rounded-full bg-muted-foreground/30" />
            </div>
            <div class="flex-1">
              <div class="font-medium">PDF Document (.pdf)</div>
              <div class="text-sm text-muted-foreground">
                Coming soon in a future update
              </div>
            </div>
            <Badge variant="outline">Soon</Badge>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="closeDialog">Cancel</Button>
        <Button @click="exportDocument" :disabled="!selectedFormat">
          <Download class="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, Globe } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

interface Props {
  open: boolean
  nota: any
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = ref(props.open)
const selectedFormat = ref('nota') // Default to .nota format
const notaTitle = ref(props.nota?.title || 'Untitled')

// Watch for prop changes
watch(() => props.open, (newValue) => {
  isOpen.value = newValue
})

watch(() => props.nota, (newNota) => {
  notaTitle.value = newNota?.title || 'Untitled'
})

// Watch for dialog state changes and emit to parent
watch(isOpen, (newValue) => {
  emit('update:open', newValue)
})

const closeDialog = () => {
  isOpen.value = false
}

const exportDocument = () => {
  if (!props.nota || !selectedFormat.value) return

  const title = props.nota.title || 'Untitled'
  const content = props.nota.content || ''
  
  let blob: Blob
  let filename: string
  let description: string
  
  switch (selectedFormat.value) {
    case 'nota':
      // Export as .nota (JSON format with metadata)
      const notaData = {
        id: props.nota.id,
        title: props.nota.title,
        content: props.nota.content,
        tags: props.nota.tags || [],
        favorite: props.nota.favorite || false,
        parentId: props.nota.parentId,
        config: props.nota.config,
        createdAt: props.nota.createdAt,
        updatedAt: props.nota.updatedAt,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
      blob = new Blob([JSON.stringify(notaData, null, 2)], { type: 'application/json' })
      filename = `${title}.nota`
      description = 'exported as native .nota format'
      break
      
    case 'html':
      // Export as HTML
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1, h2, h3, h4, h5, h6 { color: #333; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="content">
        ${content}
    </div>
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
        <p>Exported from Bashnota on ${new Date().toLocaleDateString()}</p>
    </footer>
</body>
</html>`
      blob = new Blob([htmlContent], { type: 'text/html' })
      filename = `${title}.html`
      description = 'exported as HTML document'
      break
      
    case 'markdown':
      // Export as Markdown
      blob = new Blob([content], { type: 'text/markdown' })
      filename = `${title}.md`
      description = 'exported as Markdown'
      break
      
    default:
      toast('Export failed', {
        description: 'Invalid format selected.',
        duration: 3000
      })
      return
  }
  
  // Create download
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  toast('Document exported', {
    description: `"${title}" has been ${description}`,
    duration: 3000
  })
  
  closeDialog()
}
</script>
