// Task result management composable
import { computed } from 'vue'
import { ActorType } from '@/types/vibe'
import { useToast } from '@/components/ui/toast/use-toast'
import { getExecutionSummary, getActorName } from '../utils'
import type { Ref } from 'vue'
import { logger } from '@/services/logger'

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
   * Format JSON data for better display using proper blocks
   */
  function formatJSONContent(content: any, insertContentAfterBlock: (content: any) => void) {
    if (!content) return;
    
    try {
      // If it's already a string, just insert it
      if (typeof content === 'string') {
        insertContentAfterBlock(content);
        return;
      }
      
      // If it's a markdown string with code blocks, convert it directly
      if (typeof content === 'object' && content.markdown) {
        insertContentAfterBlock(content.markdown);
        return;
      }
      
      // If it contains a diagram, use Mermaid extension
      if (typeof content === 'object' && content.diagram) {
        insertContentAfterBlock({
          type: 'mermaid',
          attrs: { content: content.diagram }
        });
        return;
      }
      
      // If it's mathematical formula, use Math block
      if (typeof content === 'object' && content.formula) {
        insertContentAfterBlock({
          type: 'mathBlock',
          attrs: { latex: content.formula }
        });
        return;
      }
      
      // If it's a section with title and content
      if (typeof content === 'object' && content.title && content.content) {
        insertContentAfterBlock({
          type: 'heading',
          attrs: { level: 4 },
          content: [{ type: 'text', text: content.title }]
        });
        
        if (typeof content.content === 'string') {
          insertContentAfterBlock(content.content);
        } else {
          // Recursively format the nested content
          formatJSONContent(content.content, insertContentAfterBlock);
        }
        return;
      }
      
      // If it's a collection of sections
      if (typeof content === 'object' && content.sections && Array.isArray(content.sections)) {
        content.sections.forEach((section: any) => {
          if (section.title) {
            insertContentAfterBlock({
              type: 'heading',
              attrs: { level: 4 },
              content: [{ type: 'text', text: section.title }]
            });
          }
          
          if (section.content) {
            if (typeof section.content === 'string') {
              insertContentAfterBlock(section.content);
            } else {
              // Recursively format the nested content
              formatJSONContent(section.content, insertContentAfterBlock);
            }
          }
          
          insertContentAfterBlock({ type: 'paragraph' });
        });
        return;
      }
      
      // If it's an array of items with consistent structure (list of objects)
      if (Array.isArray(content) && content.length > 0 && typeof content[0] === 'object') {
        // Check if it looks like a bullet list (objects with text/content property)
        const isBulletList = content.every(item => 
          item.text || item.content || (typeof item === 'object' && Object.keys(item).length === 1)
        );
        
        if (isBulletList) {
          const listItems = content.map(item => ({
            type: 'listItem',
            content: [{ 
              type: 'paragraph', 
              content: [{ 
                type: 'text', 
                text: item.text || item.content || Object.values(item)[0] || String(item)
              }] 
            }]
          }));
          
          insertContentAfterBlock({
            type: 'bulletList',
            content: listItems
          });
          return;
        }
        
        // Otherwise, check if it's a table structure
        insertTableContent(content, insertContentAfterBlock);
        return;
      }
      
      // For table data with columns/rows structure
      if (typeof content === 'object' && (content.columns || content.rows || 
          (content.headers && Array.isArray(content.headers)))) {
        insertTableContent(content, insertContentAfterBlock);
        return;
      }
      
      // For executable code with language specification
      if (typeof content === 'object' && content.code && content.language) {
        // Use proper executable code block for actual programming code
        insertContentAfterBlock({
          type: 'executableCodeBlock',
          attrs: {
            language: content.language,
            content: content.code
          }
        });
        return;
      }
      
      // Simple key-value object that's not covered by other cases
      if (typeof content === 'object' && !Array.isArray(content) && 
          Object.keys(content).length > 0 && Object.keys(content).length <= 5) {
        // Create a simple key-value display for small objects
        Object.entries(content).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            insertContentAfterBlock({
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'bold' }], text: `${key}: ` },
                { type: 'text', text: String(value) }
              ]
            });
          }
        });
        return;
      }
      
      // Default: Format as JSON in a regular code block
      insertContentAfterBlock({
        type: 'codeBlock',
        attrs: {
          language: 'json',
        },
        content: [{ type: 'text', text: JSON.stringify(content, null, 2) }]
      });
    } catch (error) {
      // Fallback to string representation
      logger.error('Error formatting JSON content:', error);
      insertContentAfterBlock({
        type: 'paragraph',
        content: [{ type: 'text', text: String(content) }]
      });
    }
  }

  /**
   * Insert a task result into the document
   */
  function insertTaskResult(task: any) {
    if (!canInsertResult(task)) return
    
    try {
      // Find the current position of the Vibe block
      const vibePos = getPos()
      logger.log('Current Vibe block position:', vibePos)
      
      if (vibePos === undefined) {
        logger.error('Could not determine position of Vibe block')
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
        logger.error('Could not find Vibe node in document')
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
      
      // Insert title with task name
      insertContentAfterBlock({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: task.title }]
      })
      
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
          
        case ActorType.PLANNER:
          // Insert plan result with better formatting
          if (task.result && task.result.plan) {
            insertContentAfterBlock({ 
              type: 'heading', 
              attrs: { level: 3 }, 
              content: [{ type: 'text', text: 'Plan Overview' }] 
            });
            
            if (task.result.plan.mainGoal) {
              insertContentAfterBlock({ 
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Main Goal: ' },
                  { type: 'text', text: task.result.plan.mainGoal }
                ]
              });
            }
            
            // Create a mermaid diagram for the task plan
            if (task.result.plan.tasks && task.result.plan.tasks.length > 0) {
              const mermaidDiagram = generateTaskFlowDiagram(task.result.plan.tasks);
              insertContentAfterBlock({
                type: 'mermaid',
                attrs: { content: mermaidDiagram }
              });
            }
            
            // Insert task list
            insertContentAfterBlock({ 
              type: 'heading', 
              attrs: { level: 3 }, 
              content: [{ type: 'text', text: 'Tasks' }] 
            });
            
            // Create a task list for each planned task
            if (task.result.plan.tasks && task.result.plan.tasks.length > 0) {
              const taskListItems = task.result.plan.tasks.map((t: any, index: number) => ({
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ 
                  type: 'paragraph', 
                  content: [{ 
                    type: 'text', 
                    text: `${t.title} (${getActorName(t.actorType)})` 
                  }] 
                }]
              }));
              
              insertContentAfterBlock({
                type: 'taskList',
                content: taskListItems
              });
            }
          } else {
            insertContentAfterBlock(
              typeof task.result === 'string' 
                ? task.result 
                : JSON.stringify(task.result, null, 2)
            );
          }
          break;

        case ActorType.WRITER:
          insertWriterResult(task, insertContentAfterBlock);
          break;
          
        case ActorType.COMPOSER:
          insertComposerResult(task, insertContentAfterBlock);
          break;
          
        case ActorType.CUSTOM:
          // Handle custom actor results in a generic way
          if (typeof task.result === 'string') {
            insertContentAfterBlock(task.result);
          } else if (typeof task.result === 'object') {
            formatJSONContent(task.result, insertContentAfterBlock);
          } else {
            insertContentAfterBlock(String(task.result));
          }
          break;
          
        default:
          // For other actor types, try to format intelligently
          if (typeof task.result === 'string') {
            insertContentAfterBlock(task.result);
          } else if (typeof task.result === 'object') {
            formatJSONContent(task.result, insertContentAfterBlock);
          } else {
            insertContentAfterBlock(String(task.result));
          }
      }
      
      // Add a final paragraph for spacing
      insertContentAfterBlock({ type: 'paragraph' })
      
      toast({
        title: 'Success',
        description: 'Task result has been inserted below the Vibe block'
      })
    } catch (error: any) {
      logger.error('Error inserting result:', error)
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
      
      // Insert detailed content if available, parsing it properly
      if (task.result.content) {
        insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Detailed Research' }] })
        insertContentAfterBlock({ type: 'paragraph' })
        
        if (typeof task.result.content === 'string') {
          // If it's just text, insert as paragraphs
          insertContentAfterBlock(task.result.content)
        } else if (typeof task.result.content === 'object') {
          // Try to parse sections if they exist
          if (Array.isArray(task.result.content.sections)) {
            task.result.content.sections.forEach((section: any) => {
              if (section.title) {
                insertContentAfterBlock({ 
                  type: 'heading', 
                  attrs: { level: 4 }, 
                  content: [{ type: 'text', text: section.title }] 
                });
              }
              
              if (section.content) {
                if (typeof section.content === 'string') {
                  insertContentAfterBlock(section.content);
                } else {
                  formatJSONContent(section.content, insertContentAfterBlock);
                }
              }
              
              // Insert a paragraph for spacing
              insertContentAfterBlock({ type: 'paragraph' });
            });
          } else {
            // Format other JSON content appropriately
            formatJSONContent(task.result.content, insertContentAfterBlock);
          }
        }
      }
      
      // Insert references if available
      if (task.result.references && task.result.references.length > 0) {
        insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'References' }] })
        insertContentAfterBlock({ type: 'paragraph' })
        
        const refItems = task.result.references.map((ref: string) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: ref }] }]
        }))
        
        insertContentAfterBlock({
          type: 'orderedList',
          content: refItems
        })
      }
    } else if (typeof task.result === 'string') {
      // Simple string result
      insertContentAfterBlock(task.result)
    } else {
      // Fallback for any other format
      insertContentAfterBlock({
        type: 'codeBlock',
        attrs: {
          language: 'json',
        },
        content: [{ type: 'text', text: JSON.stringify(task.result, null, 2) }]
      });
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
      logger.error('Table data is not in a valid format', tableData)
      insertContentAfterBlock({ 
        type: 'paragraph', 
        content: [{ 
          type: 'text', 
          text: 'Error rendering table visualization' 
        }] 
      })
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
      logger.error('Error creating table structure:', error)
      insertContentAfterBlock({ 
        type: 'paragraph', 
        content: [{ 
          type: 'text', 
          text: 'Error rendering table visualization' 
        }] 
      })
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
          executable: true
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
            type: 'codeBlock',
            attrs: { 
              language: 'console',
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
              logger.error('Failed to insert image:', error)
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

  /**
   * Generate a mermaid flowchart diagram from plan tasks
   */
  function generateTaskFlowDiagram(tasks: any[]): string {
    let diagram = 'graph TD\n';
    
    // First add all nodes
    tasks.forEach((task, index) => {
      const actorName = task.actorType.charAt(0) + task.actorType.slice(1).toLowerCase();
      diagram += `    T${index}["Task ${index}: ${task.title}\\n(${actorName})"]\n`;
    });
    
    // Then add connections based on dependencies
    tasks.forEach((task, index) => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach((dep: string | number) => {
          const depIndex = typeof dep === 'string' ? parseInt(dep, 10) : dep;
          if (!isNaN(depIndex) && depIndex >= 0 && depIndex < tasks.length) {
            diagram += `    T${depIndex} --> T${index}\n`;
          }
        });
      }
    });
    
    return diagram;
  }

  /**
   * Insert table content with proper table extension formatting
   */
  function insertTableContent(data: any, insertContentAfterBlock: (content: any) => void) {
    try {
      let columns: string[] = [];
      let rows: any[] = [];
      
      // Determine columns and rows based on the data structure
      if (data.columns && Array.isArray(data.columns)) {
        columns = data.columns;
      } else if (data.headers && Array.isArray(data.headers)) {
        columns = data.headers;
      } else if (Array.isArray(data) && data.length > 0) {
        if (Array.isArray(data[0])) {
          // Handle array of arrays format (first row is headers)
          columns = data[0].map((item: any) => String(item));
          rows = data.slice(1);
        } else if (typeof data[0] === 'object') {
          // Get columns from first object keys for array of objects
          columns = Object.keys(data[0]);
          rows = data;
        }
      } else if (data.rows && Array.isArray(data.rows)) {
        rows = data.rows;
        if (!columns.length && rows.length > 0) {
          // Get keys from first object in rows
          if (Array.isArray(rows[0])) {
            // First row might be headers in some formats
            if (data.hasHeaderRow) {
              columns = rows[0].map((item: any) => String(item));
              rows = rows.slice(1);
            } else {
              // Create numeric headers
              columns = Array.from({ length: rows[0].length }, (_, i) => `Column ${i+1}`);
            }
          } else if (typeof rows[0] === 'object') {
            columns = Object.keys(rows[0]);
          }
        }
      } else if (typeof data === 'object' && !Array.isArray(data)) {
        // Simple object to single-row table conversion
        columns = Object.keys(data);
        rows = [data];
      }
      
      // If we still don't have columns, check for data.data format used in some visualizations
      if (columns.length === 0 && data.data) {
        if (Array.isArray(data.data)) {
          if (data.data.length > 0) {
            if (Array.isArray(data.data[0])) {
              // Matrix format
              columns = Array.from({ length: data.data[0].length }, (_, i) => `Column ${i+1}`);
              rows = data.data;
            } else if (typeof data.data[0] === 'object') {
              // Array of objects
              columns = Object.keys(data.data[0]);
              rows = data.data;
            }
          }
        } else if (typeof data.data === 'object') {
          // Object format
          columns = Object.keys(data.data);
          rows = [data.data];
        }
      }
      
      // Ensure we have valid column headers
      if (columns.length === 0 && rows.length > 0) {
        // Create default column headers based on row structure
        if (Array.isArray(rows[0])) {
          columns = Array.from({ length: rows[0].length }, (_, i) => `Column ${i+1}`);
        } else if (typeof rows[0] === 'object') {
          columns = Object.keys(rows[0]);
        }
      }
      
      // If we have valid table data
      if (columns.length > 0) {
        // Create the table with proper typing
        const table: any = {
          type: 'table',
          content: [] as any[]
        };
        
        // Create header row
        const headerRow: any = {
          type: 'tableRow',
          content: columns.map(col => ({
            type: 'tableHeader',
            attrs: { colspan: 1, rowspan: 1 },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: col }] }]
          }))
        };
        
        // Add header row to table
        table.content.push(headerRow);
        
        // Add data rows
        rows.forEach(row => {
          let cellValues: any[] = [];
          
          // Extract cell values based on row format
          if (Array.isArray(row)) {
            // Row is array of values
            cellValues = row.map((cell, index) => {
              return {
                columnName: index < columns.length ? columns[index] : `Column ${index+1}`,
                value: cell
              };
            });
          } else if (typeof row === 'object' && row !== null) {
            // Row is an object, extract values by column names
            cellValues = columns.map(colName => {
              return {
                columnName: colName,
                value: row[colName]
              };
            });
          }
          
          // Create table row with cells
          const tableRow: any = {
            type: 'tableRow',
            content: cellValues.map(cell => ({
              type: 'tableCell',
              attrs: { colspan: 1, rowspan: 1 },
              content: [{ 
                type: 'paragraph', 
                content: [{ 
                  type: 'text', 
                  text: cell.value !== undefined && cell.value !== null 
                    ? String(cell.value) 
                    : '' 
                }] 
              }]
            }))
          };
          
          table.content.push(tableRow);
        });
        
        insertContentAfterBlock(table);
      } else {
        // Fallback if we can't determine the table structure
        logger.warn('Unable to determine table structure from data:', data);
        insertContentAfterBlock({
          type: 'codeBlock',
          attrs: {
            language: 'json',
          },
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
        });
      }
    } catch (error) {
      // Fallback for errors
      logger.error('Error creating table structure:', error);
      insertContentAfterBlock({
        type: 'codeBlock',
        attrs: {
          language: 'json',
        },
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
      });
    }
  }

  /**
   * Insert writer task result
   */
  function insertWriterResult(task: any, insertContentAfterBlock: (content: any) => void) {
    // Writer typically creates structured reports/documents
    if (typeof task.result === 'object') {
      // Handle markdown content if present
      if (task.result.content && task.result.format === 'markdown') {
        // Split content into blocks and process each one
        const blocks = task.result.content.split(/(?=```)/);
        
        blocks.forEach((block: string) => {
          // Check if this is a code block
          const codeMatch = block.match(/```(\w+)?\n([\s\S]*?)```/);
          if (codeMatch) {
            // It's a code block - convert to executable code block
            const [, language, code] = codeMatch;
            insertContentAfterBlock({
              type: 'executableCodeBlock',
              attrs: {
                language: language || 'javascript',
                executable: true
              },
              content: [{ type: 'text', text: code.trim() }]
            });
          } else {
            // Regular markdown content
            insertContentAfterBlock(block.trim());
          }
        });
        return;
      }
      
      // Insert headings and sections
      insertContentAfterBlock({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Written Content' }] })
      insertContentAfterBlock({ type: 'paragraph' })
      
      // Handle structured writer result with sections
      if (task.result.sections && Array.isArray(task.result.sections)) {
        task.result.sections.forEach((section: any) => {
          if (section.title) {
            insertContentAfterBlock({
              type: 'heading',
              attrs: { level: 4 },
              content: [{ type: 'text', text: section.title }]
            });
          }
          
          if (section.content) {
            if (typeof section.content === 'string') {
              insertContentAfterBlock(section.content);
            } else {
              formatJSONContent(section.content, insertContentAfterBlock);
            }
          }
          
          insertContentAfterBlock({ type: 'paragraph' });
        });
      } 
      // Handle summary and content structure
      else {
        // Insert summary if available
        if (task.result.summary) {
          insertContentAfterBlock({
            type: 'paragraph',
            content: [{ 
              type: 'text', 
              marks: [{ type: 'bold' }], 
              text: 'Summary: ' 
            }]
          });
          insertContentAfterBlock(task.result.summary);
          insertContentAfterBlock({ type: 'paragraph' });
        }
        
        // Insert main content
        if (task.result.content) {
          if (typeof task.result.content === 'string') {
            insertContentAfterBlock(task.result.content);
          } else {
            formatJSONContent(task.result.content, insertContentAfterBlock);
          }
        }
      }
      
      // Insert references if available
      if (task.result.references && task.result.references.length > 0) {
        insertContentAfterBlock({ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'References' }] })
        insertContentAfterBlock({ type: 'paragraph' })
        
        const refItems = task.result.references.map((ref: string) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: ref }] }]
        }))
        
        insertContentAfterBlock({
          type: 'orderedList',
          content: refItems
        })
      }
    } else if (typeof task.result === 'string') {
      // Simple string result - just insert it directly
      insertContentAfterBlock(task.result);
    } else {
      // Fallback for any other format
      insertContentAfterBlock({
        type: 'codeBlock',
        attrs: {
          language: 'json',
        },
        content: [{ type: 'text', text: JSON.stringify(task.result, null, 2) }]
      });
    }
  }

  /**
   * Insert composer task result
   */
  function insertComposerResult(task: any, insertContentAfterBlock: (content: any) => void) {
    // Composer typically coordinates multiple tasks and provides summary information
    if (typeof task.result === 'object') {
      // Insert summary if available
      if (task.result.summary) {
        insertContentAfterBlock({ 
          type: 'heading', 
          attrs: { level: 3 }, 
          content: [{ type: 'text', text: 'Composition Summary' }] 
        });
        insertContentAfterBlock({ type: 'paragraph' });
        insertContentAfterBlock(task.result.summary);
        insertContentAfterBlock({ type: 'paragraph' });
      }
      
      // Display tasks created and execution info
      if (task.result.tasksCreated !== undefined) {
        insertContentAfterBlock({ 
          type: 'paragraph',
          content: [{ 
            type: 'text', 
            marks: [{ type: 'bold' }], 
            text: `Tasks Created: ${task.result.tasksCreated}` 
          }] 
        });
      }
      
      // Show task database information if available
      if (task.result.taskDatabase) {
        insertContentAfterBlock({ 
          type: 'heading', 
          attrs: { level: 3 }, 
          content: [{ type: 'text', text: 'Task Execution Summary' }] 
        });
        
        // Create table for completed tasks
        if (task.result.taskDatabase.completedTasks && task.result.taskDatabase.completedTasks.length > 0) {
          // List completed tasks
          insertContentAfterBlock({ 
            type: 'paragraph',
            content: [{ 
              type: 'text', 
              marks: [{ type: 'bold' }], 
              text: `Completed Tasks: ${task.result.taskDatabase.completedTasks.length}` 
            }] 
          });
          
          // Create list of completed tasks if we have task details
          if (task.result.taskDatabase.tasks) {
            const completedTaskItems = task.result.taskDatabase.completedTasks
              .map((taskId: string) => {
                const taskInfo = task.result.taskDatabase.tasks[taskId];
                return {
                  type: 'listItem',
                  content: [{ 
                    type: 'paragraph', 
                    content: [{ 
                      type: 'text', 
                      text: taskInfo ? `${taskInfo.title} (${getActorName(taskInfo.actorType)})` : taskId 
                    }] 
                  }]
                };
              });
            
            if (completedTaskItems.length > 0) {
              insertContentAfterBlock({
                type: 'bulletList',
                content: completedTaskItems
              });
            }
          }
        }
        
        // List failed tasks if any
        if (task.result.taskDatabase.failedTasks && task.result.taskDatabase.failedTasks.length > 0) {
          insertContentAfterBlock({ type: 'paragraph' });
          insertContentAfterBlock({ 
            type: 'paragraph',
            content: [{ 
              type: 'text', 
              marks: [{ type: 'textStyle', attrs: { color: '#ef4444', bold: true } }], 
              text: `Failed Tasks: ${task.result.taskDatabase.failedTasks.length}` 
            }] 
          });
          
          // Create list of failed tasks if we have task details
          if (task.result.taskDatabase.tasks) {
            const failedTaskItems = task.result.taskDatabase.failedTasks
              .map((taskId: string) => {
                const taskInfo = task.result.taskDatabase.tasks[taskId];
                return {
                  type: 'listItem',
                  content: [{ 
                    type: 'paragraph', 
                    content: [{ 
                      type: 'text', 
                      text: taskInfo ? `${taskInfo.title} (${getActorName(taskInfo.actorType)})` : taskId 
                    }] 
                  }]
                };
              });
            
            if (failedTaskItems.length > 0) {
              insertContentAfterBlock({
                type: 'bulletList',
                content: failedTaskItems
              });
            }
          }
        }
      }
      
      // Show execution results if available
      if (task.result.executionResults && Object.keys(task.result.executionResults).length > 0) {
        insertContentAfterBlock({ 
          type: 'heading', 
          attrs: { level: 3 }, 
          content: [{ type: 'text', text: 'Execution Results' }] 
        });
        
        // For each execution result, show a summary
        Object.entries(task.result.executionResults).forEach(([taskId, result]: [string, any]) => {
          const taskInfo = task.result.taskDatabase?.tasks?.[taskId];
          const taskTitle = taskInfo ? taskInfo.title : taskId;
          const actorType = taskInfo ? taskInfo.actorType : 'Unknown';
          
          insertContentAfterBlock({ 
            type: 'heading', 
            attrs: { level: 4 }, 
            content: [{ type: 'text', text: `${taskTitle} (${getActorName(actorType)})` }] 
          });
          
          // Insert the result in a condensed format
          if (typeof result === 'object') {
            if (result.summary) {
              insertContentAfterBlock(result.summary);
            } else {
              formatJSONContent(result, insertContentAfterBlock);
            }
          } else if (typeof result === 'string') {
            insertContentAfterBlock(result);
          }
          
          insertContentAfterBlock({ type: 'paragraph' });
        });
      }
    } else if (typeof task.result === 'string') {
      // Simple string result
      insertContentAfterBlock(task.result);
    } else {
      // Fallback for any other format
      insertContentAfterBlock({
        type: 'codeBlock',
        attrs: {
          language: 'json',
        },
        content: [{ type: 'text', text: JSON.stringify(task.result, null, 2) }]
      });
    }
  }

  return {
    canInsertResult: computed(() => canInsertResult),
    insertTaskResult
  }
} 