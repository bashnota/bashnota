import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'
import { FILE_EXTENSIONS } from '@/constants/app'
import { db } from '@/db'

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
            
            // Create a new nota with the extracted title
            const title = extractNotebookTitle(notebook, file.name)
            const newNota = await notaStore.createItem(title)
            
            // Initialize block structure
            await blockStore.initializeNotaBlocks(newNota.id, title)
            
            // Convert notebook cells to Nota blocks
            const cells = convertNotebookToNota(notebook)
            const blocks: any[] = []
            
            for (let i = 0; i < cells.length; i++) {
              const cell = cells[i]
              try {
                const block = convertNotebookCell(cell, i, newNota.id)
                if (block) {
                  blocks.push(block)
                }
              } catch (error) {
                logger.warn('Failed to convert cell:', error, cell)
                // Add error block
                blocks.push(createTextBlock(
                  `[Failed to convert cell: ${cell.cell_type || 'unknown'}]`,
                  i,
                  newNota.id
                ))
              }
            }
            
            // Save all blocks to the database
            for (const block of blocks) {
              try {
                await db.saveBlock(block)
              } catch (error) {
                logger.error('Failed to save block:', error, block)
              }
            }
            
            // Update block structure with the new blocks
            const structure = await blockStore.getBlockStructure(newNota.id)
            if (structure) {
              structure.blockOrder = blocks.map(b => b.id).filter(Boolean)
              structure.version++
              structure.lastModified = new Date()
              await blockStore.saveBlockStructure(structure)
            }

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
   * Create a text block
   */
  const createTextBlock = (content: string, order: number, notaId: string) => {
    return {
      type: 'text',
      order,
      notaId,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    }
  }

  /**
   * Create a heading block
   */
  const createHeadingBlock = (content: string, level: number, order: number, notaId: string) => {
    return {
      type: 'heading',
      order,
      notaId,
      content,
      level,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    }
  }

  /**
   * Create an executable code block
   */
  const createExecutableCodeBlock = (content: string, language: string, output: string, order: number, notaId: string) => {
    return {
      type: 'executableCodeBlock',
      order,
      notaId,
      content,
      language,
      output: output || null,
      sessionId: null,
      isExecuting: false,
      executionTime: null,
      error: null,
      kernelPreferences: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    }
  }

  /**
   * Extract title from notebook metadata or filename
   */
  const extractNotebookTitle = (notebook: any, filename: string): string => {
    try {
      // Try to get title from notebook metadata
      if (notebook.metadata?.title) {
        return notebook.metadata.title
      }
      
      // Try to get title from notebook info
      if (notebook.info?.title) {
        return notebook.info.title
      }
      
      // Try to get title from notebook name
      if (notebook.name) {
        return notebook.name
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
      
      // Try to get title from worksheets (Jupyter v3 format)
      if (notebook.worksheets && Array.isArray(notebook.worksheets)) {
        for (const worksheet of notebook.worksheets) {
          if (worksheet.cells && Array.isArray(worksheet.cells)) {
            for (const cell of worksheet.cells) {
              if (cell.cell_type === 'markdown' && cell.source && Array.isArray(cell.source)) {
                const firstLine = cell.source[0]?.trim()
                if (firstLine && firstLine.startsWith('#')) {
                  return firstLine.replace(/^#+\s*/, '')
                }
              }
            }
          }
        }
      }
      
      // Fallback to filename without extension
      const cleanFilename = filename.replace(/\.(ipynb|json)$/i, '')
      if (cleanFilename && cleanFilename !== filename) {
        return cleanFilename
      }
      
      // Final fallback
      return 'Imported Notebook'
    } catch (error) {
      logger.error('Error extracting notebook title:', error)
      // Fallback to filename or default title
      const cleanFilename = filename.replace(/\.(ipynb|json)$/i, '')
      return cleanFilename || 'Imported Notebook'
    }
  }

  /**
   * Convert Jupyter notebook to nota format
   */
  const convertNotebookToNota = (notebook: any) => {
    try {
      // Handle different ipynb format versions
      let cells = notebook.cells
      
      // Some ipynb versions use different property names
      if (!cells && notebook.worksheets) {
        // Jupyter notebook v3 format
        cells = notebook.worksheets[0]?.cells || []
      } else if (!cells && notebook.sheets) {
        // Some alternative formats
        cells = notebook.sheets[0]?.cells || []
      }
      
      if (!cells || !Array.isArray(cells)) {
        throw new Error('Invalid notebook format: no cells found')
      }

      // Return the cells array for block creation instead of Tiptap content
      return cells
    } catch (error) {
      logger.error('Error converting notebook to nota format:', error, notebook)
      throw new Error(`Failed to convert notebook: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert individual notebook cell to nota block
   */
  const convertNotebookCell = (cell: any, order: number, notaId: string): any => {
    try {
      // Handle different ipynb format versions and cell structures
      const cellType = cell.cell_type || cell.type || 'unknown'
      
      switch (cellType) {
        case 'markdown':
          return convertMarkdownCell(cell, order, notaId)
        case 'code':
          return convertCodeCell(cell, order, notaId)
        case 'raw':
          return convertRawCell(cell, order, notaId)
        case 'heading': // Some ipynb versions use 'heading' instead of 'markdown'
          return convertMarkdownCell(cell, order, notaId)
        default:
          logger.warn('Unknown cell type:', cellType, 'Cell:', cell)
          // Try to convert as markdown as fallback
          return convertMarkdownCell(cell, order, notaId)
      }
    } catch (error) {
      logger.error('Error converting notebook cell:', error, cell)
      // Return a simple text block as fallback
      return createTextBlock(
        `[Error converting cell: ${cell.cell_type || 'unknown'}]`,
        order,
        notaId
      )
    }
  }

  /**
   * Convert markdown cell to nota heading or text block
   */
  const convertMarkdownCell = (cell: any, order: number, notaId: string): any => {
    try {
      // Handle different source formats in ipynb files
      let source = ''
      
      if (Array.isArray(cell.source)) {
        source = cell.source.join('')
      } else if (typeof cell.source === 'string') {
        source = cell.source
      } else if (cell.text) {
        // Some ipynb versions use 'text' instead of 'source'
        source = Array.isArray(cell.text) ? cell.text.join('') : cell.text
      } else if (cell.content) {
        // Some ipynb versions use 'content' instead of 'source'
        source = Array.isArray(cell.content) ? cell.content.join('') : cell.content
      }
      
      if (!source || !source.trim()) return null

      // Handle heading cells specifically
      if (cell.cell_type === 'heading' || cell.type === 'heading') {
        const level = cell.level || 1
        const headingText = source.trim().replace(/^#+\s*/, '')
        
        return createHeadingBlock(headingText, level, order, notaId)
      }

      // Check if it's a markdown heading
      const headingMatch = source.trim().match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const headingText = headingMatch[2].trim()
        return createHeadingBlock(headingText, level, order, notaId)
      }

      // Regular markdown content
      return createTextBlock(source, order, notaId)
    } catch (error) {
      logger.error('Error converting markdown cell:', error, cell)
      return createTextBlock('[Error converting markdown cell]', order, notaId)
    }
  }

  /**
   * Convert code cell to executable code block
   */
  const convertCodeCell = (cell: any, order: number, notaId: string): any => {
    try {
      // Handle different source formats in ipynb files
      let source = ''
      
      if (Array.isArray(cell.source)) {
        source = cell.source.join('')
      } else if (typeof cell.source === 'string') {
        source = cell.source
      } else if (cell.input) {
        // Some ipynb versions use 'input' instead of 'source'
        source = Array.isArray(cell.input) ? cell.input.join('') : cell.input
      } else if (cell.code) {
        // Some ipynb versions use 'code' instead of 'source'
        source = Array.isArray(cell.code) ? cell.code.join('') : cell.code
      }
      
      if (!source || !source.trim()) return null

      // Detect language from metadata or cell content
      let language = 'python' // Default to python
      
      if (cell.metadata?.language) {
        language = cell.metadata.language
      } else if (cell.metadata?.kernelspec?.language) {
        language = cell.metadata.kernelspec.language
      } else if (cell.metadata?.kernel_spec?.language) {
        language = cell.metadata.kernel_spec.language
      } else if (cell.language) {
        language = cell.language
      }
      
      // Normalize language names
      const languageMap: Record<string, string> = {
        'python': 'python',
        'python3': 'python',
        'python2': 'python',
        'javascript': 'javascript',
        'js': 'javascript',
        'typescript': 'typescript',
        'ts': 'typescript',
        'r': 'r',
        'julia': 'julia',
        'matlab': 'matlab',
        'octave': 'octave',
        'bash': 'bash',
        'shell': 'bash',
        'sh': 'bash',
        'sql': 'sql',
        'html': 'html',
        'css': 'css',
        'cpp': 'cpp',
        'c++': 'cpp',
        'c': 'c',
        'java': 'java',
        'scala': 'scala',
        'go': 'go',
        'rust': 'rust',
        'swift': 'swift',
        'kotlin': 'kotlin',
        'php': 'php',
        'ruby': 'ruby',
        'perl': 'perl'
      }
      
      language = languageMap[language.toLowerCase()] || 'python'
      
      let outputText = ''
      if (cell.outputs && Array.isArray(cell.outputs)) {
        outputText = convertNotebookOutputs(cell.outputs)
      }

      return createExecutableCodeBlock(source, language, outputText, order, notaId)
    } catch (error) {
      logger.error('Error converting code cell:', error, cell)
      return createTextBlock('[Error converting code cell]', order, notaId)
    }
  }

  /**
   * Convert raw cell to plain text block
   */
  const convertRawCell = (cell: any, order: number, notaId: string): any => {
    try {
      // Handle different source formats in ipynb files
      let source = ''
      
      if (Array.isArray(cell.source)) {
        source = cell.source.join('')
      } else if (typeof cell.source === 'string') {
        source = cell.source
      } else if (cell.text) {
        source = Array.isArray(cell.text) ? cell.text.join('') : cell.text
      } else if (cell.content) {
        source = Array.isArray(cell.content) ? cell.content.join('') : cell.content
      }
      
      if (!source || !source.trim()) return null

      return createTextBlock(source, order, notaId)
    } catch (error) {
      logger.error('Error converting raw cell:', error, cell)
      return createTextBlock('[Error converting raw cell]', order, notaId)
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
    convertNotebookOutputs,
    
    // Block creation helpers
    createTextBlock,
    createHeadingBlock,
    createExecutableCodeBlock
  }
} 