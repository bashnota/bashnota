import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask, DatabaseEntryType } from '@/types/vibe'
import { useCitationStore } from '@/stores/citationStore'
import { notaExtensionService } from '@/services/notaExtensionService'

/**
 * Result structure for the researcher
 */
export interface ResearchResult {
  sections: {
    title: string
    content: string
  }[]
  citations: {
    id: string
    title: string
    url: string
    authors: string[]
    date: string
  }[]
  summary?: string
  keyFindings?: string[]
  content?: string
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
      'Stores research findings and citations',
      {
        query: 'string',
        summary: 'string',
        findings: 'array',
        content: 'string',
        citations: 'array'
      }
    )
  
    // Generate research content based on task description
    console.log('Researcher: Generating research content for task:', task.description)
    const report = await this.generateReport(task.description, [])
  
    // Make sure the report has all necessary fields
    if (!report.summary) {
      report.summary = "Research results for: " + task.description;
    }
  
    if (!report.keyFindings) {
      report.keyFindings = report.sections.map((section: {title: string, content: string}) => section.title);
    }
  
    if (!report.content) {
      report.content = report.sections.map((section: {title: string, content: string}) => 
        `## ${section.title}\n\n${section.content}`
      ).join('\n\n');
    }
  
    // Store the research content in the database
    await this.createEntry(
      researchTable.id,
      task.id,
      DatabaseEntryType.RESULT,
      'research_report',
      report
    )
  
    // No longer automatically insert the report - user will do this manually
    console.log('Researcher: Generated report and stored in database')
  
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
You are an expert academic researcher and technical writer specializing in producing high-quality scholarly content. Your task is to create a comprehensive, well-structured report based on the following task description and results from previous analyses:

TASK DESCRIPTION:
${description}

PREVIOUS RESULTS:
${formattedResults || 'No previous results available.'}

AVAILABLE CITATIONS:
${formattedCitations || 'No citations available.'}

Create a professional academic report with the following components:
1. A compelling title and executive summary that clearly conveys the core findings
2. A methodical introduction establishing context and relevance
3. Multiple well-structured sections with descriptive headings
4. Precise citations where relevant (using the citation keys provided)
5. A thorough conclusion summarizing findings and suggesting areas for further research

FORMATTING GUIDELINES:
- Use markdown formatting for headings (##, ###), lists, emphasis, etc.
- Use citation keys in square brackets [citation_key] when citing sources
- Structure complex data in tables using markdown table syntax
- Include visual elements described as markdown diagrams where appropriate

IMPORTANT FOR MATHEMATICAL CONTENT:
- Format all mathematical expressions and equations using LaTeX syntax
- Wrap inline math expressions with single dollar signs: $x^2 + y^2 = z^2$
- Wrap block/display math with double dollar signs: $$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$
- Use proper LaTeX notation for fractions (\\frac{num}{denom}), subscripts (x_i), superscripts (x^2), etc.
- Include explanations alongside complex mathematical concepts

CONTENT REQUIREMENTS:
- Include at least 4-6 distinct sections with appropriate headings based on the topic
- Ensure logical flow between sections with clear transitions
- Balance technical precision with accessibility
- Support key claims with evidence from available citations
- Identify limitations in the current research when appropriate

Return the content in the following structure:
\`\`\`json
{
  "title": "Descriptive and Engaging Report Title",
  "content": "Full markdown content of the report, including all sections properly formatted",
  "summary": "Concise executive summary capturing key findings (150-250 words)",
  "keyFindings": [
    "Key finding 1 with supporting evidence",
    "Key finding 2 with supporting evidence",
    "Key finding 3 with supporting evidence"
  ],
  "sections": [
    {
      "title": "Descriptive Section Title",
      "content": "Comprehensive section content with appropriate citations, analysis, and any relevant mathematical formulas properly formatted in LaTeX"
    },
    // Additional sections with similar structure
  ],
  "citations": [
    {
      "key": "citation_key",
      "text": "Detailed description of how this citation is used in the report and its relevance"
    }
    // All citations used in the report
  ]
}
\`\`\`

${this.config.customInstructions || 'Produce content that is academically rigorous yet accessible, balancing scholarly depth with clarity of expression for an educated audience.'}
`
  }
  
  /**
   * Parses the generated report content to extract structured information
   * @param reportContent The AI-generated report content
   * @returns Structured report data
   */
  private parseReportContent(reportContent: string): ResearchResult {
    try {
      // Try multiple approaches to extract JSON
      let jsonContent = '';
      
      // First, check for standard code blocks with JSON
      const codeBlockMatch = reportContent.match(/```(?:json)?([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1].trim();
      } else {
        // If no code blocks, try to find any JSON-like structure in the content
        const jsonObjectMatch = reportContent.match(/(\{[\s\S]*\})/);
        if (jsonObjectMatch) {
          jsonContent = jsonObjectMatch[0].trim();
        } else {
          // Fallback to using the entire content
          jsonContent = reportContent.trim();
        }
      }
      
      // Try to parse the JSON
      try {
        const parsed = JSON.parse(jsonContent);
        
        // Validate the structure and provide default values
        return {
          content: parsed.content || '',
          sections: Array.isArray(parsed.sections) ? parsed.sections : [],
          citations: Array.isArray(parsed.citations) ? parsed.citations : []
        };
      } catch (parseError) {
        console.warn('Failed to parse JSON content:', parseError);
        
        // Fallback: Return a minimal valid structure
        return {
          content: reportContent,
          sections: [],
          citations: []
        };
      }
    } catch (error) {
      console.error('Error in parseReportContent:', error);
      
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
    console.log('Researcher: Attempting to insert report to editor')
    
    // Check if editor is available before attempting to insert
    if (!notaExtensionService.hasEditor()) {
      console.warn('Researcher: Cannot insert report to editor - no editor instance available')
      return;
    }
    
    try {
      // Use safelyInsertContent instead of direct insertion
      
      // Insert heading
      this.safelyExecuteCommand('setHeading', { level: 2 })
      this.safelyInsertContent('Research Results')
      this.safelyInsertContent({ type: 'paragraph' })
      
      // Insert summary section
      if (report.summary) {
        this.safelyExecuteCommand('setHeading', { level: 3 })
        this.safelyInsertContent('Summary')
        this.safelyInsertContent({ type: 'paragraph' })
        this.safelyInsertContent(report.summary)
        this.safelyInsertContent({ type: 'paragraph' })
      }
      
      // Insert key findings
      if (report.keyFindings && report.keyFindings.length > 0) {
        this.safelyExecuteCommand('setHeading', { level: 3 })
        this.safelyInsertContent('Key Findings')
        this.safelyInsertContent({ type: 'paragraph' })
        
        // Create a bullet list
        this.safelyExecuteCommand('toggleBulletList')
        
        for (const finding of report.keyFindings) {
          this.safelyInsertContent(finding)
          
          if (finding !== report.keyFindings[report.keyFindings.length - 1]) {
            this.safelyExecuteCommand('enter')
          }
        }
        
        this.safelyExecuteCommand('liftListItem', 'listItem')
        this.safelyInsertContent({ type: 'paragraph' })
      }
      
      // Insert full content
      if (report.content) {
        this.safelyExecuteCommand('setHeading', { level: 3 })
        this.safelyInsertContent('Detailed Research')
        this.safelyInsertContent({ type: 'paragraph' })
        this.safelyInsertContent(report.content)
      }
      
      console.log('Researcher: Successfully inserted report to editor')
    } catch (error) {
      console.error('Researcher: Error inserting report to editor:', error)
    }
  }
} 