import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask, DatabaseEntryType } from '@/types/vibe'
import { notaExtensionService } from '@/services/notaExtensionService'

/**
 * Result structure for the analyst
 */
export interface AnalysisResult {
  summary: string
  insights: string[]
  visualizations: {
    type: 'table' | 'scatter' | 'mermaid' | 'math'
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
    console.log('Analyst: Generated analysis and stored in database with', 
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
        console.error(`Error gathering dependency result for task ${depId}:`, error)
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
You are a data analyst. Your task is to analyze data and provide insights based on the following task description and input data:

TASK DESCRIPTION:
${description}

INPUT DATA:
${formattedResults || 'No input data available.'}

Create a comprehensive analysis with the following:
1. A summary of the data and key findings
2. A list of specific insights derived from the data
3. Visualizations to illustrate the findings

For visualizations, you can create:
- Tables (structured data in rows and columns)
- Scatter plots (for showing relationships between variables)
- Mermaid diagrams (for flowcharts, sequences, or relationship diagrams)
- Mathematical visualizations (for formulas and mathematical relationships)

Return the content in the following structure:
\`\`\`json
{
  "summary": "Overall summary of the analysis",
  "insights": [
    "Specific insight 1",
    "Specific insight 2",
    "..."
  ],
  "visualizations": [
    {
      "type": "table | scatter | mermaid | math",
      "title": "Visualization title",
      "data": {
        // For tables: rows and columns of data
        // For scatter: x and y values
        // For mermaid: diagram syntax
        // For math: LaTeX formula
      }
    },
    // Additional visualizations
  ]
}
\`\`\`

${this.config.customInstructions || 'Make the analysis clear, insightful, and backed by the data.'}
`
  }
  
  /**
   * Parses the generated analysis content to extract structured information
   * @param analysisContent The AI-generated analysis content
   * @returns Structured analysis data
   */
  private parseAnalysisContent(analysisContent: string): AnalysisResult {
    try {
      // Extract JSON from the response if it's in a code block
      const jsonMatch = analysisContent.match(/```(?:json)?([\s\S]*?)```/)
      const jsonContent = jsonMatch ? jsonMatch[1].trim() : analysisContent
      
      // Parse the JSON
      const parsed = JSON.parse(jsonContent)
      
      return {
        summary: parsed.summary || '',
        insights: parsed.insights || [],
        visualizations: parsed.visualizations || []
      }
    } catch (error) {
      console.error('Error parsing analysis content:', error)
      
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
    notaExtensionService.insertContent({ type: 'paragraph' })
    
    // Insert insights as a list
    if (analysis.insights.length > 0) {
      notaExtensionService.setHeading(3)
      notaExtensionService.insertContent('Key Insights')
      notaExtensionService.insertContent({ type: 'paragraph' })
      
      // Create a bullet list using the correct command
      notaExtensionService.toggleBulletList()
      
      for (const insight of analysis.insights) {
        notaExtensionService.insertContent(insight)
        
        if (insight !== analysis.insights[analysis.insights.length - 1]) {
          notaExtensionService.enter()
        }
      }
      
      notaExtensionService.liftListItem('listItem')
      notaExtensionService.insertContent({ type: 'paragraph' })
    }
    
    // Insert visualizations
    if (analysis.visualizations.length > 0) {
      notaExtensionService.setHeading(2)
      notaExtensionService.insertContent('Visualizations')
      notaExtensionService.insertContent({ type: 'paragraph' })
      
      for (const viz of analysis.visualizations) {
        // Insert visualization title
        notaExtensionService.setHeading(3)
        notaExtensionService.insertContent(viz.title)
        notaExtensionService.insertContent({ type: 'paragraph' })
        
        // Insert the visualization based on its type
        switch (viz.type) {
          case 'table':
            this.insertTableVisualization(viz.data)
            break
          case 'scatter':
            this.insertScatterVisualization(viz.title, viz.data)
            break
          case 'mermaid':
            this.insertMermaidVisualization(viz.data)
            break
          case 'math':
            this.insertMathVisualization(viz.data)
            break
        }
        
        notaExtensionService.insertContent({ type: 'paragraph' })
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
      console.error('Error inserting table visualization:', error)
    }
  }
  
  /**
   * Inserts a scatter plot visualization
   * @param title The plot title
   * @param data The scatter plot data (x and y values)
   */
  private insertScatterVisualization(title: string, data: any): void {
    try {
      notaExtensionService.insertScatterPlot(title, data)
    } catch (error) {
      console.error('Error inserting scatter plot visualization:', error)
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
      console.error('Error inserting mermaid visualization:', error)
    }
  }
  
  /**
   * Inserts a mathematical formula
   * @param data The LaTeX formula
   */
  private insertMathVisualization(data: string): void {
    try {
      notaExtensionService.insertMathBlock(data)
    } catch (error) {
      console.error('Error inserting math visualization:', error)
    }
  }
} 