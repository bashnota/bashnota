import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask, DatabaseEntryType } from '@/types/vibe'
import { logger } from '@/services/logger'

/**
 * Writer actor for creating comprehensive markdown reports
 * Specializes in formatting, structuring, and incorporating visualizations
 */
export class Writer extends BaseActor {
  constructor() {
    super(ActorType.WRITER)
    this.config = {
      ...this.config,
      temperature: 0.5,
      maxTokens: 6000
    }
  }

  /**
   * Execute a writing task
   * @param task The task to execute
   * @returns The task result
   */
  protected async execute(task: VibeTask): Promise<any> {
    // Get all entries for this task's board to access other task results
    const board = this.vibeStore.getBoard(task.boardId)
    if (!board) {
      throw new Error(`Board ${task.boardId} not found`)
    }

    // Find relevant tasks and their results (completed tasks)
    const completedTasks = board.tasks.filter(t => 
      t.status === 'completed' && t.id !== task.id
    )

    // Extract images from Analyst or other tasks
    const images = await this.extractImagesFromTasks(completedTasks)
    logger.log(`Found ${images.length} images to include in the report`)

    // Extract text content from tasks
    const contentBySection = await this.extractContentBySections(completedTasks)

    // Create a comprehensive prompt with all information
    const prompt = this.createWriterPrompt(task, contentBySection, images)

    // Generate the report
    const reportContent = await this.generateCompletion(prompt)

    // Process the report to properly format any subfigure blocks
    const formattedReport = this.processReportWithSubfigures(reportContent, images)

    // Return the formatted report directly without wrapping in markdown code blocks
    return {
      content: formattedReport,
      format: 'markdown'
    }
  }

  /**
   * Extract images from completed tasks
   * @param tasks Completed tasks to extract images from
   * @returns Array of image objects with metadata
   */
  private async extractImagesFromTasks(tasks: VibeTask[]): Promise<ImageResource[]> {
    const images: ImageResource[] = []

    // Primarily look for images in Analyst tasks
    for (const task of tasks) {
      if (task.result && task.actorType === ActorType.ANALYST) {
        // Extract images from analyst results
        if (Array.isArray(task.result.visualizations)) {
          task.result.visualizations.forEach((viz: any, index: number) => {
            if (viz.imageData) {
              images.push({
                id: `${task.id}_viz_${index}`,
                taskId: task.id,
                taskTitle: task.title,
                data: viz.imageData,
                caption: viz.caption || `Visualization from "${task.title}"`,
                description: viz.description || '',
                type: 'visualization'
              })
            }
          })
        }
      }

      // Also check database entries for the task
      const taskEntries = this.vibeStore.getEntriesForTask(task.id)
      const imageEntries = taskEntries.filter(
        entry => entry.type === DatabaseEntryType.IMAGE
      )

      // Add each image entry
      imageEntries.forEach(entry => {
        images.push({
          id: entry.id,
          taskId: task.id,
          taskTitle: task.title,
          data: entry.value,
          caption: entry.metadata?.caption || `Image from "${task.title}"`,
          description: entry.metadata?.description || '',
          type: 'database_entry'
        })
      })
    }

    return images
  }

  /**
   * Extract content by sections from completed tasks
   * @param tasks Completed tasks to extract content from
   * @returns Map of section names to content
   */
  private async extractContentBySections(tasks: VibeTask[]): Promise<Record<string, string>> {
    const contentBySection: Record<string, string> = {}

    // Extract content from researcher tasks
    const researcherTasks = tasks.filter(t => t.actorType === ActorType.RESEARCHER)
    if (researcherTasks.length > 0) {
      contentBySection['Research Findings'] = researcherTasks
        .map(t => `### ${t.title}\n${this.extractContentFromResult(t.result)}`)
        .join('\n\n')
    }

    // Extract content from analyst tasks
    const analystTasks = tasks.filter(t => t.actorType === ActorType.ANALYST)
    if (analystTasks.length > 0) {
      contentBySection['Analysis'] = analystTasks
        .map(t => `### ${t.title}\n${this.extractContentFromResult(t.result)}`)
        .join('\n\n')
    }

    // Extract content from coder tasks
    const coderTasks = tasks.filter(t => t.actorType === ActorType.CODER)
    if (coderTasks.length > 0) {
      contentBySection['Implementation Details'] = coderTasks
        .map(t => `### ${t.title}\n${this.extractContentFromResult(t.result)}`)
        .join('\n\n')
    }

    return contentBySection
  }

  /**
   * Extract text content from a task result
   * @param result Task result to extract content from
   * @returns Extracted text content
   */
  private extractContentFromResult(result: any): string {
    if (!result) return ''

    if (typeof result === 'string') {
      return result
    }

    if (typeof result === 'object') {
      if (result.content) {
        return typeof result.content === 'string' 
          ? result.content 
          : JSON.stringify(result.content)
      }
      
      // Try to convert the result to a string
      try {
        return JSON.stringify(result, null, 2)
      } catch (e) {
        return 'Content not available in text format'
      }
    }

    return ''
  }

  /**
   * Create a comprehensive prompt for the Writer
   * @param task The writing task
   * @param contentBySection Content organized by sections
   * @param images Available images
   * @returns Prompt for the Writer
   */
  private createWriterPrompt(
    task: VibeTask, 
    contentBySection: Record<string, string>,
    images: ImageResource[]
  ): string {
    const imagesList = images.map((img, index) => 
      `${index + 1}. "${img.caption}" (ID: ${img.id}) - From task: ${img.taskTitle}`
    ).join('\n')

    return `You are a professional Writer specializing in creating comprehensive reports in markdown format.

TASK:
${task.description}

AVAILABLE INFORMATION:
${Object.entries(contentBySection)
  .map(([section, content]) => `--- ${section} ---\n${content ? content : 'No content available'}`)
  .join('\n\n')}

AVAILABLE IMAGES (${images.length}):
${imagesList || 'No images available'}

INSTRUCTIONS:
1. Create a comprehensive, well-structured report in markdown format.
2. Use appropriate headings, lists, tables, and emphasis to organize information.
3. Reference images using the following syntax: {{image:ID:caption}} where ID is the image ID from the list above.
4. For multiple related images, create subfigure blocks using:
   {{subfigures:
   ID1:caption1
   ID2:caption2
   :main_caption}}
5. Ensure your report has a clear introduction, structured body, and conclusion.
6. Make the report engaging, factual, and based on the information provided.
7. Add appropriate citations when referencing specific findings.

Your report must be in markdown format. Focus on creating a professional, well-organized document that effectively communicates the findings.`
  }

  /**
   * Process the report to properly format subfigure blocks
   * @param report The generated report
   * @param images Available images
   * @returns Formatted report with proper subfigure blocks
   */
  private processReportWithSubfigures(report: string, images: ImageResource[]): string {
    // Create a map of image IDs to image data for quick lookup
    const imageMap = new Map<string, ImageResource>()
    images.forEach(img => imageMap.set(img.id, img))

    // Process single image references
    let processedReport = report.replace(/{{image:(.*?):(.*?)}}/g, (_, id, caption) => {
      const img = imageMap.get(id.trim())
      if (!img) return `[Image Not Found: ${id}]`
      
      return `![${caption.trim() || img.caption}](${img.data})`
    })

    // Process subfigure blocks
    processedReport = processedReport.replace(/{{subfigures:([\s\S]*?):(.*?)}}/g, (_, imageList, mainCaption) => {
      const imageIds = imageList.trim().split('\n').map((line: string) => line.trim())
      const subfigures = imageIds.map((line: string) => {
        const [id, caption] = line.split(':').map((part: string) => part.trim())
        const img = imageMap.get(id)
        if (!img) return `[Image Not Found: ${id}]`
        
        return `![${caption || img.caption}](${img.data})`
      })

      // Create subfigure layout with flexbox
      return `<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 15px;">
${subfigures.map((fig: string) => `  <div style="flex: 1; min-width: 250px; text-align: center;">
    ${fig}
  </div>`).join('\n')}
</div>

<div style="text-align: center; font-style: italic; margin-bottom: 20px;">
  ${mainCaption.trim()}
</div>`
    })

    return processedReport
  }
}

/**
 * Interface for image resources
 */
interface ImageResource {
  id: string
  taskId: string
  taskTitle: string
  data: string
  caption: string
  description: string
  type: string
} 