import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'
import { FILE_EXTENSIONS } from '@/constants/app'

export interface ImportOptions {
  onSuccess?: (notaId: string) => void
  onError?: (error: Error) => void
  navigateToNota?: boolean
}

export function useNotaImport(options: ImportOptions = {}) {
  const router = useRouter()
  const notaStore = useNotaStore()
  const blockStore = useBlockStore()
  
  // State
  const isImporting = ref(false)
  const importProgress = ref(0)

  // Default options
  const defaultOptions: ImportOptions = {
    navigateToNota: true,
    ...options
  }

  /**
   * Import nota files (.nota)
   */
  const importNota = async (acceptedExtensions: string[] = [FILE_EXTENSIONS.nota]): Promise<boolean> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = acceptedExtensions.join(',')
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (file) {
          try {
            isImporting.value = true
            const importedNotas = await notaStore.importNotas(file)
            if (importedNotas.length > 0) {
              await notaStore.loadNotas()
              toast('Notas imported successfully')
              
              const firstNotaId = importedNotas[0].id
              if (defaultOptions.navigateToNota) {
                router.push(`/nota/${firstNotaId}`)
              }
              
              defaultOptions.onSuccess?.(firstNotaId)
              resolve(true)
            } else {
              resolve(false)
            }
          } catch (error) {
            logger.error('Import failed:', error)
            const errorMessage = error instanceof Error ? error : new Error('Import failed')
            toast('Failed to import notas', {
              description: 'Import Error'
            })
            defaultOptions.onError?.(errorMessage)
            resolve(false)
          } finally {
            isImporting.value = false
          }
        } else {
          resolve(false)
        }
      }
      
      input.oncancel = () => resolve(false)
      input.click()
    })
  }

  /**
   * Import Jupyter notebook (.ipynb)
   */
  const importJupyterNotebook = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.ipynb'
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (file) {
          try {
            if (!file.name.endsWith('.ipynb')) {
              toast('Please select a .ipynb file', {
                description: 'Invalid File'
              })
              resolve(false)
              return
            }

            isImporting.value = true
            const fileContent = await readFileAsText(file)
            const notebook = JSON.parse(fileContent)
            
            // Convert notebook to nota format
            const notaContent = convertNotebookToNota(notebook)
            
            // Create a new nota with the converted content
            const title = extractNotebookTitle(notebook, file.name)
            const newNota = await notaStore.createItem(title)
            
            // Initialize block structure and convert notebook content to blocks
            await blockStore.initializeNotaBlocks(newNota.id, title)
            
            // TODO: Convert notebook content to blocks
            // For now, the notebook content will be handled when the editor loads

            toast(`Notebook "${title}" imported successfully`)

            if (defaultOptions.navigateToNota) {
              router.push(`/nota/${newNota.id}`)
            }
            
            defaultOptions.onSuccess?.(newNota.id)
            resolve(true)
            
          } catch (error) {
            logger.error('Failed to import notebook:', error)
            const errorMessage = error instanceof Error ? error : new Error('Failed to import notebook')
            toast('Failed to import the notebook file', {
              description: 'Import Failed'
            })
            defaultOptions.onError?.(errorMessage)
            resolve(false)
          } finally {
            isImporting.value = false
            input.value = ''
          }
        } else {
          resolve(false)
        }
      }
      
      input.oncancel = () => resolve(false)
      input.click()
    })
  }

  /**
   * Helper function to read file as text
   */
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Extract title from notebook metadata or filename
   */
  const extractNotebookTitle = (notebook: any, filename: string): string => {
    // Try to get title from notebook metadata
    if (notebook.metadata?.title) {
      return notebook.metadata.title
    }
    
    // Try to get title from first markdown cell
    if (notebook.cells && Array.isArray(notebook.cells)) {
      for (const cell of notebook.cells) {
        if (cell.cell_type === 'markdown' && cell.source && Array.isArray(cell.source)) {
          const firstLine = cell.source[0]?.trim()
          if (firstLine && firstLine.startsWith('#')) {
            return firstLine.replace(/^#+\s*/, '')
          }
        }
      }
    }
    
    // Fallback to filename without extension
    return filename.replace('.ipynb', '')
  }

  /**
   * Convert Jupyter notebook to nota format
   */
  const convertNotebookToNota = (notebook: any) => {
    if (!notebook.cells || !Array.isArray(notebook.cells)) {
      throw new Error('Invalid notebook format: no cells found')
    }

    const notaContent = {
      type: 'doc',
      content: [] as any[]
    }

    for (const cell of notebook.cells) {
      try {
        const convertedCell = convertNotebookCell(cell)
        if (convertedCell) {
          notaContent.content.push(convertedCell)
        }
      } catch (error) {
        logger.warn('Failed to convert notebook cell:', error, cell)
      }
    }

    return notaContent
  }

  /**
   * Convert individual notebook cell to nota format
   */
  const convertNotebookCell = (cell: any) => {
    switch (cell.cell_type) {
      case 'markdown':
        return convertMarkdownCell(cell)
      case 'code':
        return convertCodeCell(cell)
      case 'raw':
        return convertRawCell(cell)
      default:
        logger.warn('Unknown cell type:', cell.cell_type)
        return null
    }
  }

  /**
   * Convert markdown cell to nota format
   */
  const convertMarkdownCell = (cell: any) => {
    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''
    if (!source.trim()) return null

    return {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: source
        }
      ]
    }
  }

  /**
   * Convert code cell to executable code block
   */
  const convertCodeCell = (cell: any) => {
    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''
    if (!source.trim()) return null

    const language = cell.metadata?.language || 'python'
    
    let outputText = ''
    if (cell.outputs && Array.isArray(cell.outputs)) {
      outputText = convertNotebookOutputs(cell.outputs)
    }

    return {
      type: 'executableCodeBlock',
      attrs: {
        id: crypto.randomUUID(),
        language: language,
        executable: true,
        output: outputText || null,
        kernelName: null,
        serverID: null,
        sessionId: null
      },
      content: [
        {
          type: 'text',
          text: source
        }
      ]
    }
  }

  /**
   * Convert raw cell to plain text
   */
  const convertRawCell = (cell: any) => {
    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''
    if (!source.trim()) return null

    return {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: source
        }
      ]
    }
  }

  /**
   * Convert notebook outputs to text representation
   */
  const convertNotebookOutputs = (outputs: any[]): string => {
    let result = ''
    
    for (const output of outputs) {
      try {
        if (output.output_type === 'stream') {
          result += Array.isArray(output.text) ? output.text.join('') : output.text || ''
        } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
          if (output.data) {
            if (output.data['text/plain']) {
              result += Array.isArray(output.data['text/plain']) 
                ? output.data['text/plain'].join('') 
                : output.data['text/plain']
            }
          }
        } else if (output.output_type === 'error') {
          result += `Error: ${output.ename}: ${output.evalue}\n`
          if (output.traceback) {
            result += output.traceback.join('\n')
          }
        }
      } catch (error) {
        logger.warn('Failed to convert output:', error, output)
      }
    }
    
    return result.trim()
  }

  return {
    // State
    isImporting,
    importProgress,
    
    // Methods
    importNota,
    importJupyterNotebook,
    
    // Utility methods (exposed for advanced usage)
    readFileAsText,
    extractNotebookTitle,
    convertNotebookToNota,
    convertNotebookCell,
    convertMarkdownCell,
    convertCodeCell,
    convertRawCell,
    convertNotebookOutputs
  }
} 