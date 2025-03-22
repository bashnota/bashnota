// Task result management composable
import { computed } from 'vue'
import { ActorType } from '@/types/vibe'
import { useToast } from '@/components/ui/toast/use-toast'
import { getExecutionSummary } from '../utils'
import type { Ref } from 'vue'

/**
 * Composable for handling task results in the Vibe block
 */
export function useTaskResults(editor: Ref<any>, getPos: () => number | undefined) {
  const { toast } = useToast()
  
  /**
   * Check if a task result can be inserted
   */
  const canInsertResult = (task: any) => {
    return !!editor.value && task.status === 'completed' && !!task.result
  }

  /**
   * Insert a task result into the document
   */
  function insertTaskResult(task: any) {
    if (!canInsertResult(task)) return
    
    try {
      // Find the current position of the Vibe block
      const vibePos = getPos()
      console.log('Current Vibe block position:', vibePos)
      
      if (vibePos === undefined) {
        console.error('Could not determine position of Vibe block')
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not determine where to insert content'
        })
        return
      }
      
      // Get the size of the Vibe block to position after it
      const vibeNode = editor.value.state.doc.nodeAt(vibePos)
      if (!vibeNode) {
        console.error('Could not find Vibe node in document')
        return
      }
      
      // Calculate position after the Vibe block
      let currentPos = vibePos + vibeNode.nodeSize
      const originalPos = currentPos
      
      // Create a function to insert content and update the position
      const insertContentAfterBlock = (content: any) => {
        // Insert the content at the current position
        const result = editor.value.commands.insertContentAt(currentPos, content)
        
        // Update position if insertion succeeded
        if (result) {
          // Get the current document to calculate new position
          const currentDoc = editor.value.state.doc
          // Find the node we just inserted
          const insertedNode = currentDoc.nodeAt(currentPos)
          if (insertedNode) {
            // Move current position past the inserted node
            currentPos += insertedNode.nodeSize
          } else {
            // If we can't find the node, estimate position change from content
            if (typeof content === 'string') {
              currentPos += content.length
            } else if (content.type === 'paragraph' && (!content.content || content.content.length === 0)) {
              currentPos += 2 // Empty paragraph
            } else {
              // For complex content, we'll need to increment by a reasonable amount
              // This is less accurate but should work for basic positioning
              currentPos += 5
            }
          }
        }
        return result
      }
      
      // Insert spacing paragraph below
      insertContentAfterBlock({ type: 'paragraph' })
      
      // Insert content based on actor type
      switch (task.actorType) {
        case ActorType.RESEARCHER:
          insertResearcherResult(task, insertContentAfterBlock)
          break
          
        case ActorType.ANALYST:
          insertAnalystResult(task, insertContentAfterBlock)
          break
          
        case ActorType.CODER:
          insertCoderResult(task, insertContentAfterBlock)
          break
          
        default:
          insertContentAfterBlock(
            typeof task.result === 'string' 
              ? task.result 
              : JSON.stringify(task.result, null, 2)
          )
      }
      
      // Add a final paragraph for spacing
      insertContentAfterBlock({ type: 'paragraph' })
      
      toast({
        title: 'Success',
        description: 'Task result has been inserted below the Vibe block'
      })
    } catch (error: any) {
      console.error('Error inserting result:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to insert result into document'
      })
    }
  }

  /**
   * Insert researcher task result
   */
  function insertResearcherResult(task: any, insertContentAfterBlock: (content: any) => void) {
    // For researcher, insert content as paragraphs with proper structure
    if (typeof task.result === 'object') {
      // Insert headings and sections
      insertContentAfterBlock({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Research Results' }] })
      insertContentAfterBlock({ type: 'paragraph' })
      
      // Insert summary if available
      if (task.result.summary) {
        insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Summary' }] })
        insertContentAfterBlock({ type: 'paragraph' })
        insertContentAfterBlock(task.result.summary)
        insertContentAfterBlock({ type: 'paragraph' })
      }
      
      // Insert key findings if available
      if (task.result.keyFindings && task.result.keyFindings.length > 0) {
        insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Key Findings' }] })
        insertContentAfterBlock({ type: 'paragraph' })
        
        // For bullet lists, we need to create the entire list structure at once
        const listItems = task.result.keyFindings.map((finding: string) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: finding }] }]
        }))
        
        insertContentAfterBlock({
          type: 'bulletList',
          content: listItems
        })
        
        insertContentAfterBlock({ type: 'paragraph' })
      }
      
      // Insert content if available
      if (task.result.content) {
        insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Detailed Research' }] })
        insertContentAfterBlock({ type: 'paragraph' })
        insertContentAfterBlock(task.result.content)
      }
    } else {
      insertContentAfterBlock(task.result.toString())
    }
  }

  /**
   * Insert analyst task result
   */
  function insertAnalystResult(task: any, insertContentAfterBlock: (content: any) => void) {
    // For analyst, insert visualizations in a structured manner
    if (typeof task.result === 'object') {
      // Insert title and summary
      insertContentAfterBlock({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Analysis Results' }] })
      insertContentAfterBlock({ type: 'paragraph' })
      
      if (task.result.summary) {
        insertContentAfterBlock(task.result.summary)
        insertContentAfterBlock({ type: 'paragraph' })
      }
      
      // Insert insights
      if (task.result.insights && task.result.insights.length > 0) {
        insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Insights' }] })
        insertContentAfterBlock({ type: 'paragraph' })
        
        // Create bullet list with all items at once
        const insightItems = task.result.insights.map((insight: string) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: insight }] }]
        }))
        
        insertContentAfterBlock({
          type: 'bulletList',
          content: insightItems
        })
        
        insertContentAfterBlock({ type: 'paragraph' })
      }
      
      // Insert visualizations if available
      if (task.result.visualizations && task.result.visualizations.length > 0) {
        insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Visualizations' }] })
        insertContentAfterBlock({ type: 'paragraph' })
        
        // Insert each visualization
        for (const viz of task.result.visualizations) {
          // Insert title
          insertContentAfterBlock({ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: viz.title }] })
          insertContentAfterBlock({ type: 'paragraph' })
          
          // Insert based on type
          insertVisualization(viz, insertContentAfterBlock)
          
          insertContentAfterBlock({ type: 'paragraph' })
        }
      }
    } else {
      insertContentAfterBlock(task.result.toString())
    }
  }

  /**
   * Insert a visualization
   */
  function insertVisualization(viz: any, insertContentAfterBlock: (content: any) => void) {
    switch (viz.type) {
      case 'table':
        insertTableVisualization(viz, insertContentAfterBlock)
        break
      case 'scatter':
        insertScatterVisualization(viz, insertContentAfterBlock)
        break
      case 'mermaid':
        insertContentAfterBlock({
          type: 'mermaid',
          attrs: {
            content: viz.data,
          }
        })
        break
      case 'math':
        insertContentAfterBlock({
          type: 'mathBlock',
          attrs: {
            latex: typeof viz.data === 'object' && viz.data.formula ? viz.data.formula : viz.data,
          }
        })
        break
      default:
        insertContentAfterBlock(JSON.stringify(viz.data))
    }
  }

  /**
   * Insert a table visualization
   */
  function insertTableVisualization(viz: any, insertContentAfterBlock: (content: any) => void) {
    // Parse the data if it's a string
    let tableData = typeof viz.data === 'string' ? JSON.parse(viz.data) : viz.data
    
    // Handle different table data formats
    // If tableData is an object with rows property, use that
    if (tableData && typeof tableData === 'object' && tableData.rows && Array.isArray(tableData.rows)) {
      tableData = tableData.rows
    }
    
    // Ensure tableData is an array at this point
    if (!Array.isArray(tableData)) {
      console.error('Table data is not in a valid format', tableData)
      insertContentAfterBlock({ type: 'paragraph', content: [{ type: 'text', text: 'Could not render table data' }] })
      return
    }
    
    try {
      // Extract headers from the first row or from a headers property
      let headers: string[] = []
      if (tableData[0]) {
        if (Array.isArray(tableData[0])) {
          // It's already in row format
          headers = tableData[0].map(item => String(item))
          tableData = tableData.slice(1) // Remove header row
        } else if (typeof tableData[0] === 'object') {
          // It's in object format, extract keys from first object
          headers = Object.keys(tableData[0])
        }
      }
      
      // Create table structure compatible with Tiptap Table extension
      const table: {
        type: string;
        content: any[];
      } = {
        type: 'table',
        content: []
      }
      
      // Add header row
      const headerRow = {
        type: 'tableRow',
        content: headers.map(header => ({
          type: 'tableHeader',
          content: [{ 
            type: 'paragraph', 
            content: [{ 
              type: 'text', 
              text: String(header) 
            }] 
          }]
        }))
      }
      
      // Add table header row
      table.content.push(headerRow)
      
      // Add data rows
      for (const row of tableData) {
        let rowCells: Array<{
          type: string;
          content: Array<{
            type: string;
            content: Array<{
              type: string;
              text: string;
            }>;
          }>;
        }> = []
        
        if (Array.isArray(row)) {
          // Row is an array of values
          rowCells = row.map(cell => ({
            type: 'tableCell',
            content: [{ 
              type: 'paragraph', 
              content: [{ 
                type: 'text', 
                text: cell === null || cell === undefined ? '' : String(cell) 
              }] 
            }]
          }))
        } else if (typeof row === 'object' && row !== null) {
          // Row is an object, use headers to extract values in order
          rowCells = headers.map(header => ({
            type: 'tableCell',
            content: [{ 
              type: 'paragraph', 
              content: [{ 
                type: 'text', 
                text: row[header] === null || row[header] === undefined ? '' : String(row[header]) 
              }] 
            }]
          }))
        }
        
        if (rowCells.length > 0) {
          table.content.push({
            type: 'tableRow',
            content: rowCells
          })
        }
      }
      
      // Insert the table
      insertContentAfterBlock(table)
    } catch (error) {
      console.error('Error creating table structure:', error)
      insertContentAfterBlock({ type: 'paragraph', content: [{ type: 'text', text: 'Error rendering table data' }] })
    }
  }

  /**
   * Insert a scatter plot visualization
   */
  function insertScatterVisualization(viz: any, insertContentAfterBlock: (content: any) => void) {
    try {
      // Ensure data is an array of points for the scatter plot
      const scatterData = typeof viz.data === 'string' ? JSON.parse(viz.data) : viz.data
      
      // Helper function to validate a data point
      const isValidPoint = (point: any) => {
        // Check if point has both x and y as numbers
        const hasValidX = point.x !== undefined && !isNaN(parseFloat(point.x));
        const hasValidY = point.y !== undefined && !isNaN(parseFloat(point.y));
        
        return hasValidX && hasValidY;
      };
      
      let formattedData: any[] = [];
      
      if (Array.isArray(scatterData)) {
        // Filter out invalid points and ensure x and y are numbers
        formattedData = scatterData
          .filter((point: any) => isValidPoint(point))
          .map((point: any) => ({
            x: parseFloat(point.x),
            y: parseFloat(point.y),
            label: point.label || 'Data'
          }));
      } else if (scatterData.data && Array.isArray(scatterData.data)) {
        // Filter out invalid points from data property and ensure x and y are numbers
        formattedData = scatterData.data
          .filter((point: any) => isValidPoint(point))
          .map((point: any) => ({
            x: parseFloat(point.x),
            y: parseFloat(point.y),
            label: point.label || 'Data'
          }));
      } else if (typeof scatterData === 'object') {
        // Convert object keys to data points if possible, filtering out NaN values
        formattedData = Object.entries(scatterData)
          .map(([key, value]) => {
            const x = parseFloat(key);
            const y = parseFloat(value as any);
            
            return {
              x,
              y, 
              label: 'Data'
            };
          })
          .filter(point => !isNaN(point.x) && !isNaN(point.y));
      }
      
      // If we have valid data points after filtering, insert the scatter plot
      if (formattedData.length > 0) {
        insertContentAfterBlock({
          type: 'scatterPlot',
          attrs: {
            title: viz.title,
            // Store the actual data array in apiData rather than stringifying to data
            apiData: formattedData
          }
        });
      } else {
        // No valid points found, insert a message instead
        insertContentAfterBlock({ 
          type: 'paragraph', 
          content: [{ 
            type: 'text', 
            text: 'Unable to display scatter plot: no valid data points found' 
          }] 
        });
      }
    } catch (error) {
      console.error('Error creating scatter plot:', error);
      insertContentAfterBlock({ 
        type: 'paragraph', 
        content: [{ 
          type: 'text', 
          text: 'Error rendering scatter plot visualization' 
        }] 
      });
    }
  }

  /**
   * Insert coder task result
   */
  function insertCoderResult(task: any, insertContentAfterBlock: (content: any) => void) {
    // For coder, insert code blocks with proper language
    if (typeof task.result === 'object' && task.result.code) {
      // Insert title
      insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: `Generated ${task.result.language} Code` }] })
      insertContentAfterBlock({ type: 'paragraph' })
      
      // Insert code block
      insertContentAfterBlock({
        type: 'executableCodeBlock',
        attrs: {
          language: task.result.language || 'javascript',
          executeable: true,
        },
        content: [{ type: 'text', text: task.result.code }]
      })
      
      // If there's execution output, insert it too
      if (task.result.execution) {
        insertContentAfterBlock({ type: 'paragraph' })
        insertContentAfterBlock({ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'Execution Result' }] })
        insertContentAfterBlock({ type: 'paragraph' })
        
        // Extract execution output text
        const executionText = getExecutionSummary(task.result.execution)
        
        // Parse for image tags
        const imgRegex = /<img\s+src=["']([^"']+)["'][^>]*>/gi
        const images: string[] = []
        let match
        const textWithoutImages = executionText.replace(imgRegex, (match, src) => {
          images.push(src)
          return '' // Remove the img tag from the text
        }).trim()
        
        // Insert execution output text (without images)
        if (textWithoutImages) {
          insertContentAfterBlock({
            type: 'executableCodeBlock',
            attrs: { 
              language: 'console',
              executeable: true 
            },
            content: [{ type: 'text', text: textWithoutImages }]
          })
          insertContentAfterBlock({ type: 'paragraph' })
        }
        
        // Insert images if any were found
        if (images.length > 0) {
          insertContentAfterBlock({ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'Generated Images' }] })
          insertContentAfterBlock({ type: 'paragraph' })
          
          // Insert each image
          for (const imgSrc of images) {
            try {
              insertContentAfterBlock({
                type: 'image',
                attrs: {
                  src: imgSrc,
                  alt: 'Generated image',
                  title: 'Generated image'
                }
              })
              insertContentAfterBlock({ type: 'paragraph' })
            } catch (error) {
              console.error('Failed to insert image:', error)
              insertContentAfterBlock({ 
                type: 'paragraph', 
                content: [{ 
                  type: 'text', 
                  text: `Failed to insert image: ${imgSrc}` 
                }] 
              })
            }
          }
        }
      }
    } else {
      insertContentAfterBlock(task.result.toString())
    }
  }

  return {
    canInsertResult: computed(() => canInsertResult),
    insertTaskResult
  }
} 