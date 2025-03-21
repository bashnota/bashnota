import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask, DatabaseEntryType } from '@/types/vibe'
import { useCitationStore } from '@/stores/citationStore'
import { notaExtensionService } from '@/services/notaExtensionService'

/**
 * Result structure for the researcher
 */
export interface ResearchResult {
  content: string
  citations: {
    key: string
    text: string
  }[]
  sections: {
    title: string
    content: string
  }[]
}

/**
 * Researcher actor that creates academic reports and content
 */
export class Researcher extends BaseActor {
  private citationStore = useCitationStore()
  
  constructor() {
    super(ActorType.RESEARCHER)
  }
  
  /**
   * Executes a research task
   * @param task The task to execute
   * @returns The research result
   */
  protected async execute(task: VibeTask): Promise<ResearchResult> {
    // Create a research database table if it doesn't exist
    const researchTable = await this.createTable(
      task.boardId,
      'research',
      'Stores research data and reports',
      {
        title: 'string',
        content: 'string',
        sections: 'array',
        citations: 'array'
      }
    )

    // First, gather information from the task dependencies
    const dependencyResults = await this.gatherDependencyResults(task)
    
    // Generate the research report based on the task and dependency results
    const report = await this.generateReport(task.description, dependencyResults)
    
    // Store the report in the database
    await this.createEntry(
      researchTable.id,
      task.id,
      DatabaseEntryType.RESULT,
      'report',
      report
    )

    // Also create individual entries for sections to make them easier to access
    for (const section of report.sections) {
      await this.createEntry(
        researchTable.id,
        task.id,
        DatabaseEntryType.DATA,
        `section_${section.title.toLowerCase().replace(/\s+/g, '_')}`,
        section
      )
    }

    // Store the citations
    if (report.citations.length > 0) {
      await this.createEntry(
        researchTable.id,
        task.id,
        DatabaseEntryType.DATA,
        'citations',
        report.citations
      )
    }
    
    // Insert the report into the document
    await this.insertReportToEditor(report)
    
    return report
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
        // Get results from the database entries related to this task
        const entries = await this.getEntriesForTask(depId)
        
        if (entries.length > 0) {
          // Find the main result entry
          const resultEntry = entries.find(e => e.type === DatabaseEntryType.RESULT)
          
          // Get the dependency task from the board for additional context
          const depTask = await this.vibeStore.getTaskFromBoard(task.boardId, depId)
          
          if (depTask && resultEntry) {
            results.push({
              taskId: depId,
              taskTitle: depTask.title,
              actorType: depTask.actorType,
              result: resultEntry.value,
              // Include any additional data entries
              additionalData: entries
                .filter(e => e.type === DatabaseEntryType.DATA)
                .map(e => ({ key: e.key, value: e.value }))
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
   * Generates a comprehensive research report
   * @param description The task description
   * @param dependencyResults Results from dependency tasks
   * @returns Structured research report
   */
  private async generateReport(description: string, dependencyResults: any[]): Promise<ResearchResult> {
    // Get available citations from the citation store
    const availableCitations = Array.from(this.citationStore.citations.values())
    
    // Create a prompt for the AI to generate the report
    const prompt = this.createReportPrompt(description, dependencyResults, availableCitations)
    
    // Generate the report content
    const reportContent = await this.generateCompletion(prompt)
    
    // Extract sections and citations from the generated content
    const { content, sections, citations } = this.parseReportContent(reportContent)
    
    return {
      content,
      sections,
      citations
    }
  }
  
  /**
   * Creates a prompt for generating a research report
   * @param description The task description
   * @param dependencyResults Results from dependency tasks
   * @param availableCitations Available citations that can be used
   * @returns The prompt for the AI
   */
  private createReportPrompt(description: string, dependencyResults: any[], availableCitations: any[]): string {
    // Format dependency results for inclusion in the prompt
    const formattedResults = dependencyResults.map(dep => {
      return `
Task: ${dep.taskTitle} (${dep.actorType})
Result: ${JSON.stringify(dep.result, null, 2)}
`
    }).join('\n---\n')
    
    // Format citations for inclusion in the prompt
    const formattedCitations = availableCitations.slice(0, 10).map(citation => {
      return `
Citation Key: ${citation.key}
Title: ${citation.title}
Authors: ${citation.authors?.join(', ') || 'Unknown'}
Year: ${citation.year || 'Unknown'}
Journal: ${citation.journal || 'N/A'}
`
    }).join('\n---\n')
    
    // Create the prompt
    return `
You are an academic researcher and writer. Your task is to create a comprehensive report based on the following task description and results from previous analyses:

TASK DESCRIPTION:
${description}

PREVIOUS RESULTS:
${formattedResults || 'No previous results available.'}

AVAILABLE CITATIONS:
${formattedCitations || 'No citations available.'}

Create a well-structured academic report with the following:
1. A clear title and introduction
2. Multiple sections with appropriate headings
3. Citations where relevant (use the citation keys provided)
4. A conclusion summarizing the findings

Format your response as follows:
- Use markdown formatting for headings, lists, etc.
- Use citation keys in square brackets [citation_key] when citing sources
- Include at least 3-5 distinct sections depending on the content

Return the content in the following structure:
\`\`\`json
{
  "title": "Report Title",
  "content": "Full markdown content of the report",
  "sections": [
    {
      "title": "Section Title",
      "content": "Section content with appropriate citations and analysis"
    },
    // Additional sections
  ],
  "citations": [
    {
      "key": "citation_key",
      "text": "How this citation is used in the report"
    }
    // All citations used
  ]
}
\`\`\`

${this.config.customInstructions || 'Make the report academically rigorous but accessible to an educated reader.'}
`
  }
  
  /**
   * Parses the generated report content to extract structured information
   * @param reportContent The AI-generated report content
   * @returns Structured report data
   */
  private parseReportContent(reportContent: string): ResearchResult {
    try {
      // Extract JSON from the response if it's in a code block
      const jsonMatch = reportContent.match(/```(?:json)?([\s\S]*?)```/)
      const jsonContent = jsonMatch ? jsonMatch[1].trim() : reportContent
      
      // Parse the JSON
      const parsed = JSON.parse(jsonContent)
      
      return {
        content: parsed.content || '',
        sections: parsed.sections || [],
        citations: parsed.citations || []
      }
    } catch (error) {
      console.error('Error parsing report content:', error)
      
      // If parsing fails, return a simple structure with the raw content
      return {
        content: reportContent,
        sections: [],
        citations: []
      }
    }
  }
  
  /**
   * Inserts the generated report into the editor
   * @param report The generated research report
   */
  private async insertReportToEditor(report: ResearchResult): Promise<void> {
    // Insert the title as a heading
    notaExtensionService.setHeading(1)
    
    // Extract a title from the first section or use a default title
    const title = report.sections.length > 0 ? report.sections[0].title : 'Research Report'
    notaExtensionService.insertContent(title)
    notaExtensionService.insertContent({ type: 'paragraph' })
    
    // Insert each section
    for (const section of report.sections) {
      // Insert section title as a heading
      notaExtensionService.setHeading(2)
      notaExtensionService.insertContent(section.title)
      notaExtensionService.insertContent({ type: 'paragraph' })
      
      // Insert section content
      notaExtensionService.setParagraph()
      notaExtensionService.insertContent(section.content)
      notaExtensionService.insertContent({ type: 'paragraph' })
    }
    
    // Insert a bibliography section if there are citations
    if (report.citations.length > 0) {
      notaExtensionService.setHeading(2)
      notaExtensionService.insertContent('References')
      notaExtensionService.insertContent({ type: 'paragraph' })
      
      // Insert bibliography
      notaExtensionService.insertContent({
        type: 'bibliography'
      })
    }
  }
} 