import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask, DatabaseEntryType } from '@/types/vibe'
import { notaExtensionService } from '@/services/notaExtensionService'
import { logger } from '@/services/logger'

/**
 * Result structure for the analyst
 */
export interface AnalysisResult {
  summary: string
  insights: string[]
  visualizations: {
    type: 'table' | 'mermaid' | 'math'
    title: string
    data: any
  }[]
}

/**
 * Analyst actor that analyzes data and provides insights
 */
export class Analyst extends BaseActor {
  constructor() {
    super(ActorType.ANALYST)
  }
  
  /**
   * Executes an analysis task
   * @param task The task to execute
   * @returns The analysis result
   */
  protected async execute(task: VibeTask): Promise<AnalysisResult> {
    // Create an analysis database table if it doesn't exist
    const analysisTable = await this.createTable(
      task.boardId,
      'analysis',
      'Stores analysis results and visualizations',
      {
        summary: 'string',
        insights: 'array',
        visualizations: 'array'
      }
    )
    
    // Gather dependency results
    const dependencyResults = await this.gatherDependencyResults(task)
    
    // Generate analysis based on the task description and dependency results
    const analysis = await this.generateAnalysis(task.description, dependencyResults)
    
    // Store the complete analysis in the database
    await this.createEntry(
      analysisTable.id,
      task.id,
      DatabaseEntryType.RESULT,
      'analysis_result',
      analysis
    )
    
    // Store summary separately for easier access
    await this.createEntry(
      analysisTable.id,
      task.id,
      DatabaseEntryType.TEXT,
      'summary',
      analysis.summary
    )
    
    // Store insights separately
    await this.createEntry(
      analysisTable.id,
      task.id,
      DatabaseEntryType.DATA,
      'insights',
      analysis.insights
    )
    
    // Store each visualization separately
    for (let i = 0; i < analysis.visualizations.length; i++) {
      const viz = analysis.visualizations[i]
      await this.createEntry(
        analysisTable.id,
        task.id,
        DatabaseEntryType.DATA,
        `visualization_${viz.type}_${i}`,
        viz
      )
    }
    
    // No longer automatically insert visualizations - user will do this manually
    logger.log('Analyst: Generated analysis and stored in database with', 
      analysis.visualizations.length, 'visualizations')
    
    return analysis
  }
  
  /**
   * Gathers results from dependency tasks
   * @param task The current task
   * @returns Aggregated dependency results
   */
  private async gatherDependencyResults(task: VibeTask): Promise<any[]> {
    if (!task.dependencies || task.dependencies.length === 0) {
      return []
    }
    
    const results = []
    
    for (const depId of task.dependencies) {
      try {
        // First try to get results from the database
        const entries = await this.getEntriesForTask(depId)
        
        if (entries.length > 0) {
          // Find the main result entry
          const resultEntry = entries.find(e => e.type === DatabaseEntryType.RESULT)
          
          // Get the dependency task from the board for additional context
          const depTask = await this.vibeStore.getTaskFromBoard(task.boardId, depId)
          
          if (depTask) {
            results.push({
              taskId: depId,
              taskTitle: depTask.title,
              actorType: depTask.actorType,
              // Use database entry if available, otherwise fall back to task result
              result: resultEntry ? resultEntry.value : depTask.result,
              // Include any additional data entries
              additionalData: entries
                .filter(e => e.type !== DatabaseEntryType.RESULT)
                .map(e => ({ key: e.key, type: e.type, value: e.value }))
            })
          }
        } else {
          // Fallback to the traditional method if no database entries found
          const depTask = await this.vibeStore.getTaskFromBoard(task.boardId, depId)
          
          if (depTask && depTask.result) {
            results.push({
              taskId: depId,
              taskTitle: depTask.title,
              actorType: depTask.actorType,
              result: depTask.result
            })
          }
        }
      } catch (error) {
        logger.error(`Error gathering dependency result for task ${depId}:`, error)
      }
    }
    
    return results
  }
  
  /**
   * Generates analysis and visualizations based on input data
   * @param description The task description
   * @param dependencyResults Results from dependency tasks
   * @returns Structured analysis result
   */
  private async generateAnalysis(description: string, dependencyResults: any[]): Promise<AnalysisResult> {
    // Create a prompt for the AI to generate the analysis
    const prompt = this.createAnalysisPrompt(description, dependencyResults)
    
    // Generate the analysis content
    const analysisContent = await this.generateCompletion(prompt)
    
    // Parse the analysis content
    return this.parseAnalysisContent(analysisContent)
  }
  
  /**
   * Creates a prompt for generating analysis
   * @param description The task description
   * @param dependencyResults Results from dependency tasks
   * @returns The prompt for the AI
   */
  private createAnalysisPrompt(description: string, dependencyResults: any[]): string {
    // Format dependency results for inclusion in the prompt
    const formattedResults = dependencyResults.map(dep => {
      return `
Task: ${dep.taskTitle} (${dep.actorType})
Result: ${JSON.stringify(dep.result, null, 2)}
`
    }).join('\n---\n')
    
    // Create the prompt
    return `
You are a data analyst with expertise in data visualization, statistical analysis, and mathematical modeling. Your task is to analyze data and provide insightful, actionable findings based on the following task description and input data:

TASK DESCRIPTION:
${description}

INPUT DATA:
${formattedResults || 'No input data available.'}

Create a comprehensive analysis with the following:
1. A clear and concise summary of the data and key findings
2. A detailed list of specific insights derived from the data, including patterns, correlations, and anomalies
3. Strategic recommendations based on your analysis, if applicable
4. Visualizations that effectively illustrate your findings

For visualizations, you can create:
- Tables: Structured data in rows and columns with clear headers and formatting
- Mermaid diagrams: For flowcharts, sequences, or relationship diagrams
- Mathematical visualizations: For formulas and mathematical relationships

IMPORTANT FOR MATHEMATICAL CONTENT:
- Format all mathematical expressions and equations using LaTeX syntax
- Wrap inline math expressions with single dollar signs: $x^2 + y^2 = z^2$
- Wrap block/display math with double dollar signs: $$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$
- Use proper LaTeX notation for fractions (\\frac{num}{denom}), subscripts (x_i), superscripts (x^2), etc.
- Include explanations for complex mathematical concepts

Return the content in the following structure:
\`\`\`json
{
  "summary": "Overall summary of the analysis",
  "insights": [
    "Specific insight 1 with supporting evidence",
    "Specific insight 2 with supporting evidence",
    "..."
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "..."
  ],
  "visualizations": [
    {
      "type": "table",
      "title": "Descriptive title for the table",
      "description": "Brief explanation of what the table shows",
      "data": {
        "headers": ["Column1", "Column2", "..."],
        "rows": [
          ["Value1", "Value2", "..."],
          ["Value1", "Value2", "..."]
        ]
      }
    },
    {
      "type": "mermaid",
      "title": "Descriptive title for the diagram",
      "description": "What the diagram represents",
      "data": "graph TD;\\nA-->B;\\nA-->C;\\nB-->D;\\nC-->D;"
    },
    {
      "type": "math",
      "title": "Descriptive title for the mathematical expression",
      "description": "What this formula represents or calculates",
      "data": "\\sum_{i=1}^{n} x_i = \\frac{n(n+1)}{2}"
    }
  ]
}
\`\`\`

${this.config.customInstructions || 'Ensure your analysis is thorough, insightful, and backed by the data. Present information in a way that is accessible to both technical and non-technical audiences.'}
`
  }
  
  /**
   * Parses the generated analysis content to extract structured information
   * @param analysisContent The AI-generated analysis content
   * @returns Structured analysis data
   */
  private parseAnalysisContent(analysisContent: string): AnalysisResult {
    try {
      // Try multiple approaches to extract JSON
      let jsonContent = '';
      
      // First, check for standard code blocks with JSON
      const codeBlockMatch = analysisContent.match(/```(?:json)?([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
      } else {
        // If no code blocks, try to find any JSON-like structure in the content
        const jsonObjectMatch = analysisContent.match(/(\{[\s\S]*\})/);
        if (jsonObjectMatch) {
          jsonContent = jsonObjectMatch[0].trim();
        } else {
          // Fallback to using the entire content
          jsonContent = analysisContent.trim();
        }
      }
      
      // Try to parse the JSON
      try {
        const parsed = JSON.parse(jsonContent);
        
        // Validate the structure and provide default values
        return {
          summary: parsed.summary || '',
          insights: Array.isArray(parsed.insights) ? parsed.insights : [],
          visualizations: Array.isArray(parsed.visualizations) ? parsed.visualizations : []
        };
      } catch (parseError) {
        logger.warn('Failed to parse JSON content:', parseError);
        
        // Fallback: Return a minimal valid structure with the raw content
        return {
          summary: analysisContent,
          insights: [],
          visualizations: []
        };
      }
    } catch (error) {
      logger.error('Error in parseAnalysisContent:', error);
      
      // If parsing fails, return a simple structure with the raw content
      return {
        summary: analysisContent,
        insights: [],
        visualizations: []
      }
    }
  }
  
  /**
   * Inserts visualizations into the editor
   * @param analysis The generated analysis
   */
  private async insertVisualizationsToEditor(analysis: AnalysisResult): Promise<void> {
    // Insert the summary as a heading and paragraph
    notaExtensionService.setHeading(2)
    notaExtensionService.insertContent('Analysis Summary')
    notaExtensionService.insertContent({ type: 'paragraph' })
    
    notaExtensionService.setParagraph()
    notaExtensionService.insertContent(analysis.summary)
    
    // Insert insights if available
    if (analysis.insights && analysis.insights.length > 0) {
      notaExtensionService.insertContent({ type: 'paragraph' })
      notaExtensionService.setHeading(2)
      notaExtensionService.insertContent('Key Insights')
      notaExtensionService.insertContent({ type: 'paragraph' })
      
      // Insert insights as bullet points
      notaExtensionService.toggleBulletList()
      for (const insight of analysis.insights) {
        notaExtensionService.insertContent(insight)
      }
      notaExtensionService.insertContent({ type: 'paragraph' })
    }
    
    // Insert visualizations if available
    if (analysis.visualizations && analysis.visualizations.length > 0) {
      notaExtensionService.insertContent({ type: 'paragraph' })
      notaExtensionService.setHeading(2)
      notaExtensionService.insertContent('Visualizations')
      
      // Process each visualization
      for (const viz of analysis.visualizations) {
        notaExtensionService.insertContent({ type: 'paragraph' })
        notaExtensionService.setHeading(3)
        notaExtensionService.insertContent(viz.title || 'Visualization')
        notaExtensionService.insertContent({ type: 'paragraph' })
        
        // Insert description if available
        if ('description' in viz && viz.description) {
          notaExtensionService.setParagraph()
          notaExtensionService.insertContent(viz.description as string)
          notaExtensionService.insertContent({ type: 'paragraph' })
        }
        
        try {
          // Insert visualization based on type
          switch (viz.type?.toLowerCase()) {
            case 'table':
              this.insertTableVisualization(viz.data)
              break
            case 'mermaid':
              this.insertMermaidVisualization(viz.data)
              break
            case 'math':
              this.insertMathVisualization(viz.data)
              break
            default:
              // For unknown types, just insert as text
              notaExtensionService.setParagraph()
              notaExtensionService.insertContent(`Visualization data: ${JSON.stringify(viz.data, null, 2)}`)
              break
          }
        } catch (error: unknown) {
          logger.error(`Error inserting visualization of type ${viz.type}:`, error)
          notaExtensionService.setParagraph()
          notaExtensionService.insertContent(`Error displaying visualization: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }
  }
  
  /**
   * Inserts a table visualization
   * @param data Table data (rows and columns)
   */
  private insertTableVisualization(data: any): void {
    try {
      // Create a table with appropriate dimensions
      const rows = Array.isArray(data) ? data.length : 0
      const cols = (rows > 0 && Array.isArray(data[0])) ? data[0].length : 0
      
      if (rows > 0 && cols > 0) {
        notaExtensionService.insertTable(rows, cols)
        
        // TODO: Populate the table cells with data
        // This requires more complex editor manipulation that's beyond the scope of this example
      }
    } catch (error) {
      logger.error('Error inserting table visualization:', error)
    }
  }
  
  
  /**
   * Inserts a mermaid diagram
   * @param data The mermaid diagram syntax
   */
  private insertMermaidVisualization(data: string): void {
    try {
      notaExtensionService.insertMermaid(data)
    } catch (error) {
      logger.error('Error inserting mermaid visualization:', error)
    }
  }
  
  /**
   * Inserts a mathematical formula
   * @param data The LaTeX formula
   */
  private insertMathVisualization(data: string): void {
    try {
      // Clean the expression to ensure proper LaTeX rendering
      let cleanExpression = data.trim();
      
      // Check if the expression is already wrapped in LaTeX delimiters
      const hasInlineDelimiters = cleanExpression.startsWith('$') && cleanExpression.endsWith('$');
      const hasDisplayDelimiters = cleanExpression.startsWith('$$') && cleanExpression.endsWith('$$');
      
      // Remove existing delimiters if present
      if (hasInlineDelimiters) {
        cleanExpression = cleanExpression.substring(1, cleanExpression.length - 1);
      } else if (hasDisplayDelimiters) {
        cleanExpression = cleanExpression.substring(2, cleanExpression.length - 2);
      }
      
      // Insert as a display math block if it appears to be a complex formula
      // or as inline math if it's simpler
      const isComplexFormula = cleanExpression.includes('\\frac') || 
                              cleanExpression.includes('\\sum') || 
                              cleanExpression.includes('\\int') ||
                              cleanExpression.includes('\\begin{');
      
      notaExtensionService.setParagraph();
      
      if (isComplexFormula) {
        // Insert as display math (centered, larger)
        notaExtensionService.insertContent(`$$${cleanExpression}$$`);
      } else {
        // Insert as inline math within a paragraph
        notaExtensionService.insertContent(`$${cleanExpression}$`);
      }
      
      // Add some space after the equation
      notaExtensionService.insertContent({ type: 'paragraph' });
    } catch (error: unknown) {
      logger.error('Error inserting math visualization:', error);
      notaExtensionService.setParagraph();
      notaExtensionService.insertContent(`Unable to render the mathematical expression: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 