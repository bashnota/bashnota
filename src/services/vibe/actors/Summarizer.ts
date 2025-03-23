import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask, DatabaseEntryType } from '@/types/vibe'
import { notaExtensionService } from '@/services/notaExtensionService'
import { logger } from '@/services/logger'

/**
 * Result structure for the summarizer
 */
export interface SummaryResult {
  summary: string
  keyPoints: string[]
  executiveSummary?: string
  technicalSummary?: string
}

/**
 * Summarizer actor that creates concise summaries of complex information
 */
export class Summarizer extends BaseActor {
  constructor() {
    super(ActorType.SUMMARIZER)
  }
  
  /**
   * Executes a summarization task
   * @param task The task to execute
   * @returns The summary result
   */
  protected async execute(task: VibeTask): Promise<SummaryResult> {
    // Create a summary database table if it doesn't exist
    const summaryTable = await this.createTable(
      task.boardId,
      'summaries',
      'Stores summary results and key points',
      {
        summary: 'string',
        keyPoints: 'array',
        executiveSummary: 'string',
        technicalSummary: 'string'
      }
    )
    
    // Gather dependency results
    const dependencyResults = await this.gatherDependencyResults(task)
    
    // Generate summary based on the task description and dependency results
    const summary = await this.generateSummary(task.description, dependencyResults)
    
    // Store the complete summary in the database
    await this.createEntry(
      summaryTable.id,
      task.id,
      DatabaseEntryType.RESULT,
      'summary_result',
      summary
    )
    
    // Store key points separately for easier access
    await this.createEntry(
      summaryTable.id,
      task.id,
      DatabaseEntryType.DATA,
      'key_points',
      summary.keyPoints
    )
    
    if (summary.executiveSummary) {
      await this.createEntry(
        summaryTable.id,
        task.id,
        DatabaseEntryType.TEXT,
        'executive_summary',
        summary.executiveSummary
      )
    }
    
    if (summary.technicalSummary) {
      await this.createEntry(
        summaryTable.id,
        task.id,
        DatabaseEntryType.TEXT,
        'technical_summary',
        summary.technicalSummary
      )
    }
    
    logger.log('Summarizer: Generated summary and stored in database')
    
    return summary
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
   * Generates a summary based on input data
   * @param description The task description
   * @param dependencyResults Results from dependency tasks
   * @returns Structured summary result
   */
  private async generateSummary(description: string, dependencyResults: any[]): Promise<SummaryResult> {
    // Create a prompt for the AI to generate the analysis
    const prompt = this.createSummaryPrompt(description, dependencyResults)
    
    // Generate the summary content
    const summaryContent = await this.generateCompletion(prompt)
    
    // Parse the summary content
    return this.parseSummaryContent(summaryContent)
  }
  
  /**
   * Creates a prompt for generating a summary
   * @param description The task description
   * @param dependencyResults Results from dependency tasks
   * @returns The prompt for the AI
   */
  private createSummaryPrompt(description: string, dependencyResults: any[]): string {
    // Format dependency results for inclusion in the prompt
    const formattedResults = dependencyResults.map(dep => {
      return `
Task: ${dep.taskTitle} (${dep.actorType})
Result: ${JSON.stringify(dep.result, null, 2)}
`
    }).join('\n---\n')
    
    // Create the prompt
    return `
You are an expert summarizer with the ability to distill complex information into clear, concise, and actionable summaries. Your task is to create different types of summaries based on the following task description and input data:

TASK DESCRIPTION:
${description}

INPUT DATA:
${formattedResults || 'No input data available.'}

Create a comprehensive set of summaries with the following components:

1. MAIN SUMMARY (250-400 words):
   - A concise but comprehensive overview of the key information
   - Capture all essential points, findings, and implications
   - Balance technical accuracy with accessibility
   - Use clear structure with logical flow

2. KEY POINTS (5-10 bullet points):
   - The most important takeaways in bullet point format
   - Each point should be 1-2 sentences maximum
   - Prioritize points by importance
   - Ensure each point is substantive and informative

3. EXECUTIVE SUMMARY (150-200 words):
   - Business-focused summary for decision-makers
   - Emphasize implications, recommendations, and business value
   - Avoid technical details unless critically important
   - Focus on actionable insights and strategic implications

4. TECHNICAL SUMMARY (200-300 words):
   - Detailed technical overview for subject matter experts
   - Include relevant methodologies, techniques, and specialized terminology
   - Focus on technical accuracy and specificity
   - Provide technical context and rationale for findings

FORMAT GUIDELINES:
- Use clear, concise language free of jargon (except in the Technical Summary)
- Maintain objective tone while highlighting important implications
- Structure information in a logical flow with clear organization
- For any mathematical content, use proper notation and ensure clarity

Return the content in the following structure:
\`\`\`json
{
  "summary": "Main comprehensive summary text...",
  "keyPoints": [
    "First key point",
    "Second key point",
    "Additional key points..."
  ],
  "executiveSummary": "Business-focused executive summary...",
  "technicalSummary": "Detailed technical summary..."
}
\`\`\`

${this.config.customInstructions || 'Create summaries that balance comprehensiveness with brevity. Focus on extracting the essential information while maintaining accuracy and clarity.'}
`
  }
  
  /**
   * Parses the generated summary content to extract structured information
   * @param summaryContent The AI-generated summary content
   * @returns Structured summary data
   */
  private parseSummaryContent(summaryContent: string): SummaryResult {
    try {
      // Try multiple approaches to extract JSON
      let jsonContent = '';
      
      // First, check for standard code blocks with JSON
      const codeBlockMatch = summaryContent.match(/```(?:json)?([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
      } else {
        // If no code blocks, try to find any JSON-like structure in the content
        const jsonObjectMatch = summaryContent.match(/(\{[\s\S]*\})/);
        if (jsonObjectMatch) {
          jsonContent = jsonObjectMatch[0].trim();
        } else {
          // Fallback to using the entire content
          jsonContent = summaryContent.trim();
        }
      }
      
      // Try to parse the JSON
      try {
        const parsed = JSON.parse(jsonContent);
        
        // Validate the structure and provide default values
        return {
          summary: parsed.summary || '',
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
          executiveSummary: parsed.executiveSummary || undefined,
          technicalSummary: parsed.technicalSummary || undefined
        };
      } catch (parseError) {
        logger.warn('Failed to parse JSON content:', parseError);
        
        // Fallback: Return a minimal valid structure with the raw content
        return {
          summary: summaryContent,
          keyPoints: [],
          executiveSummary: undefined,
          technicalSummary: undefined
        };
      }
    } catch (error) {
      logger.error('Error in parseSummaryContent:', error);
      
      // If parsing fails, return a simple structure with the raw content
      return {
        summary: summaryContent,
        keyPoints: [],
        executiveSummary: undefined,
        technicalSummary: undefined
      }
    }
  }
  
  /**
   * Inserts the summary into the editor
   * @param summary The generated summary
   */
  private async insertSummaryToEditor(summary: SummaryResult): Promise<void> {
    // Insert the main summary as a heading and paragraph
    notaExtensionService.setHeading(2)
    notaExtensionService.insertContent('Summary')
    notaExtensionService.insertContent({ type: 'paragraph' })
    
    notaExtensionService.setParagraph()
    notaExtensionService.insertContent(summary.summary)
    
    // Insert key points if available
    if (summary.keyPoints && summary.keyPoints.length > 0) {
      notaExtensionService.insertContent({ type: 'paragraph' })
      notaExtensionService.setHeading(3)
      notaExtensionService.insertContent('Key Points')
      notaExtensionService.insertContent({ type: 'paragraph' })
      
      // Insert key points as bullet points
      notaExtensionService.toggleBulletList()
      for (const point of summary.keyPoints) {
        notaExtensionService.insertContent(point)
        if (point !== summary.keyPoints[summary.keyPoints.length - 1]) {
          notaExtensionService.enter()
        }
      }
      
      notaExtensionService.insertContent({ type: 'paragraph' })
    }
    
    // Insert executive summary if available
    if (summary.executiveSummary) {
      notaExtensionService.insertContent({ type: 'paragraph' })
      notaExtensionService.setHeading(3)
      notaExtensionService.insertContent('Executive Summary')
      notaExtensionService.insertContent({ type: 'paragraph' })
      
      notaExtensionService.setParagraph()
      notaExtensionService.insertContent(summary.executiveSummary)
      notaExtensionService.insertContent({ type: 'paragraph' })
    }
    
    // Insert technical summary if available
    if (summary.technicalSummary) {
      notaExtensionService.insertContent({ type: 'paragraph' })
      notaExtensionService.setHeading(3)
      notaExtensionService.insertContent('Technical Summary')
      notaExtensionService.insertContent({ type: 'paragraph' })
      
      notaExtensionService.setParagraph()
      notaExtensionService.insertContent(summary.technicalSummary)
      notaExtensionService.insertContent({ type: 'paragraph' })
    }
  }
} 