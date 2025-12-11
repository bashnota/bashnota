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
              <div class="font-medium">Web Site (.zip)</div>
              <div class="text-sm text-muted-foreground">
                Complete website with pages and assets
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
import { useNotaStore } from '@/features/nota/stores/nota'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { Editor } from '@tiptap/vue-3'
import { getEditorExtensions } from '@/features/editor/components/extensions'
import { exportNotaToHtml } from '@/features/editor/services/exportService'

interface Props {
  open: boolean
  nota: any
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const notaStore = useNotaStore()
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

// Helper function to convert Tiptap content to Markdown
const tiptapToMarkdown = (content: any): string => {
  if (!content || !content.content) return ''
  
  let markdown = ''
  
  const processNode = (node: any): string => {
    if (!node) return ''
    
    switch (node.type) {
      case 'paragraph':
        if (node.content) {
          const text = node.content.map((child: any) => processNode(child)).join('')
          return text + '\n\n'
        }
        return '\n\n'
        
      case 'heading':
        if (node.content) {
          const level = node.attrs?.level || 1
          const text = node.content.map((child: any) => processNode(child)).join('')
          return '#'.repeat(level) + ' ' + text + '\n\n'
        }
        return '\n\n'
        
      case 'text':
        let text = node.text || ''
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            switch (mark.type) {
              case 'bold':
                text = `**${text}**`
                break
              case 'italic':
                text = `*${text}*`
                break
              case 'code':
                text = `\`${text}\``
                break
              case 'link':
                text = `[${text}](${mark.attrs?.href || ''})`
                break
            }
          })
        }
        return text
        
      case 'codeBlock':
        if (node.content) {
          const language = node.attrs?.language || ''
          const code = node.content.map((child: any) => processNode(child)).join('')
          return `\`\`\`${language}\n${code}\n\`\`\`\n\n`
        }
        return '\n\n'
        
      case 'blockquote':
        if (node.content) {
          const text = node.content.map((child: any) => processNode(child)).join('')
          return '> ' + text.replace(/\n/g, '\n> ') + '\n\n'
        }
        return '\n\n'
        
      case 'bulletList':
        if (node.content) {
          return node.content.map((child: any) => processNode(child)).join('')
        }
        return ''
        
      case 'orderedList':
        if (node.content) {
          return node.content.map((child: any, index: number) => processNode(child)).join('')
        }
        return ''
        
      case 'listItem':
        if (node.content) {
          const text = node.content.map((child: any) => processNode(child)).join('')
          return '- ' + text.replace(/\n/g, '\n  ') + '\n'
        }
        return ''
        
      case 'horizontalRule':
        return '---\n\n'
        
      case 'table':
        if (node.content) {
          let tableMarkdown = ''
          node.content.forEach((row: any, rowIndex: number) => {
            if (row.type === 'tableRow') {
              const cells = row.content?.map((cell: any) => {
                const cellText = cell.content?.map((child: any) => processNode(child)).join('') || ''
                return `| ${cellText} `
              }).join('') || ''
              tableMarkdown += cells + '|\n'
              
              // Add separator row after header
              if (rowIndex === 0) {
                const separator = row.content?.map(() => '| --- ').join('') || ''
                tableMarkdown += separator + '|\n'
              }
            }
          })
          return tableMarkdown + '\n'
        }
        return ''
        
      case 'executableCodeBlock':
        if (node.content) {
          const language = node.attrs?.language || 'text'
          const code = node.content.map((child: any) => processNode(child)).join('')
          return `\`\`\`${language}\n${code}\n\`\`\`\n\n`
        }
        return '\n\n'
        
      case 'math':
        if (node.attrs?.displayMode) {
          return `$$\n${node.attrs.latex || ''}\n$$\n\n`
        } else {
          return `$${node.attrs.latex || ''}$`
        }
        
      case 'confusionMatrix':
        const matrixTitle = node.attrs?.title || 'Confusion Matrix'
        return `## ${matrixTitle}\n\n[Confusion Matrix - ${matrixTitle}]\n\n`
        
      case 'theorem':
        const theoremType = node.attrs?.theoremType || 'theorem'
        const theoremTitle = node.attrs?.title || 'Theorem'
        const theoremNumber = node.attrs?.number ? ` ${node.attrs.number}` : ''
        const theoremContent = node.attrs?.content || ''
        const theoremProof = node.attrs?.proof || ''
        
        let theoremMarkdown = `**${theoremType.charAt(0).toUpperCase() + theoremType.slice(1)}${theoremNumber}: ${theoremTitle}**\n\n`
        if (theoremContent) theoremMarkdown += `${theoremContent}\n\n`
        if (theoremProof) theoremMarkdown += `**Proof:** ${theoremProof}\n\n`
        return theoremMarkdown
        
      case 'pipeline':
        const pipelineTitle = node.attrs?.title || 'Pipeline'
        const pipelineDesc = node.attrs?.description || ''
        let pipelineMarkdown = `## ${pipelineTitle}\n\n`
        if (pipelineDesc) pipelineMarkdown += `${pipelineDesc}\n\n`
        pipelineMarkdown += `[Execution Pipeline - ${pipelineTitle}]\n\n`
        return pipelineMarkdown
        
      case 'mermaid':
        const mermaidContent = node.attrs?.content || ''
        const mermaidTitle = node.attrs?.title || 'Diagram'
        return `## ${mermaidTitle}\n\n\`\`\`mermaid\n${mermaidContent}\n\`\`\`\n\n`
        
      case 'subNotaLink':
        const linkText = node.attrs?.displayText || node.attrs?.targetNotaTitle || 'Untitled Nota'
        const linkStyle = node.attrs?.linkStyle || 'inline'
        if (linkStyle === 'button') {
          return `[${linkText}](nota://${node.attrs?.targetNotaId || ''})\n\n`
        } else {
          return `[${linkText}](nota://${node.attrs?.targetNotaId || ''})\n\n`
        }
        
      case 'youtube':
        const videoId = node.attrs?.videoId || ''
        const videoTitle = node.attrs?.title || 'YouTube Video'
        return `## ${videoTitle}\n\n[YouTube Video: ${videoTitle}](https://youtube.com/watch?v=${videoId})\n\n`
        
      case 'drawio':
        const diagramTitle = node.attrs?.title || 'Diagram'
        return `## ${diagramTitle}\n\n[Draw.io Diagram - ${diagramTitle}]\n\n`
        
      case 'citation':
        const citationKey = node.attrs?.citationKey || ''
        return `[${citationKey}]\n\n`
        
      case 'bibliography':
        const bibTitle = node.attrs?.title || 'References'
        return `## ${bibTitle}\n\n[Bibliography]\n\n`
        
      case 'subfigure':
        const subfigureTitle = node.attrs?.title || 'Figure'
        const layout = node.attrs?.layout || 'horizontal'
        return `## ${subfigureTitle}\n\n[Subfigure Layout: ${layout}]\n\n`
        
      case 'notaTable':
        const tableTitle = node.attrs?.title || 'Table'
        return `## ${tableTitle}\n\n[Data Table - ${tableTitle}]\n\n`
        
      case 'aiGeneration':
        const aiTitle = node.attrs?.title || 'AI Generated Content'
        const aiPrompt = node.attrs?.prompt || ''
        let aiMarkdown = `## ${aiTitle}\n\n`
        if (aiPrompt) aiMarkdown += `**Prompt:** ${aiPrompt}\n\n`
        aiMarkdown += `[AI Generated Content]\n\n`
        return aiMarkdown
        
      case 'image':
        const imageSrc = node.attrs?.src || ''
        const imageAlt = node.attrs?.alt || ''
        const imageTitle = node.attrs?.title || ''
        if (imageTitle) {
          return `![${imageAlt}](${imageSrc} "${imageTitle}")\n\n`
        } else {
          return `![${imageAlt}](${imageSrc})\n\n`
        }
        
      case 'quote':
        if (node.content) {
          const text = node.content.map((child: any) => processNode(child)).join('')
          return '> ' + text.replace(/\n/g, '\n> ') + '\n\n'
        }
        return '\n\n'
        
      case 'list':
        // This should be handled by bulletList/orderedList, but adding as fallback
        if (node.content) {
          return node.content.map((child: any) => processNode(child)).join('')
        }
        return ''
        
      default:
        if (node.content) {
          return node.content.map((child: any) => processNode(child)).join('')
        }
        return ''
    }
  }
  
  if (content.content) {
    content.content.forEach((node: any) => {
      markdown += processNode(node)
    })
  }
  
  return markdown.trim()
}

const exportDocument = async () => {
  if (!props.nota || !selectedFormat.value) return

  const title = props.nota.title || 'Untitled'
  
  // Get content from block system instead of legacy content field
  const blockStore = useBlockStore()
  const tiptapContent = blockStore.getTiptapContent(props.nota.id)
  
  let blob: Blob
  let filename: string
  let description: string
  
  switch (selectedFormat.value) {
    case 'nota':
      // Export as .nota using the store method for proper format
      try {
        await notaStore.exportNota(props.nota.id)
        return // The store method handles the download
      } catch (error) {
        toast('Export failed', {
          description: 'Failed to export as .nota format.',
          duration: 3000
        })
        return
      }
      
    case 'html':
      // Export as HTML using the recursive export service
      try {
        await exportNotaToHtml({
          title: title,
          content: tiptapContent,
          citations: props.nota.citations || [],
          rootNotaId: props.nota.id,
          fetchNota: async (id: string) => {
            // Avoid refetching current nota if requested
            if (id === props.nota.id) {
                return { title: title, content: tiptapContent, citations: props.nota.citations || [] }
            }
            // Get metadata
            let targetNota = notaStore.getItem(id)
            if (!targetNota) {
                targetNota = await notaStore.loadNota(id) as any
            }
            if (!targetNota) return null
            
            // Get content
            const notaContent = await notaStore.getNotaContentAsTiptap(id)
            return { title: targetNota.title, content: notaContent, citations: targetNota.citations || [] }
          }
        })
        
        toast('Export completed', {
          description: `"${title}" has been exported to ZIP archive.`,
          duration: 3000
        })
      } catch (error) {
        console.error('HTML Export failed', error)
        toast('Export failed', {
          description: 'Failed to export HTML package.',
          duration: 3000
        })
      }
      closeDialog()
      return // exportNotaToHtml handles the download
      
    case 'markdown':
      // Export as Markdown - convert Tiptap content to markdown
      let markdownContent = ''
      
      if (tiptapContent) {
        try {
          // Convert Tiptap content to markdown using our custom function
          markdownContent = tiptapToMarkdown(tiptapContent)
        } catch (error) {
          console.error('Error converting Tiptap to Markdown:', error)
          // Fallback to JSON string if conversion fails
          markdownContent = JSON.stringify(tiptapContent, null, 2)
        }
      }
      
      blob = new Blob([markdownContent], { type: 'text/markdown' })
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
