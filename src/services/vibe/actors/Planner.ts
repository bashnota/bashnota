import { BaseActor } from './BaseActor'
import { ActorType, TaskPriority, type VibeTask } from '@/types/vibe'
import { DatabaseEntryType } from '@/types/vibe'
import { logger } from '@/services/logger'

/**
 * The response format that the Planner actor expects from the LLM
 */
interface PlannerResponse {
  mainGoal: string
  tasks: {
    title: string
    description: string
    actorType: string
    dependencies: (string | number)[]
    priority: string
    estimatedCompletion?: string
    customActorId?: string
  }[]
}

/**
 * A task planned by the Planner actor
 */
interface PlannedTask {
  title: string
  description: string
  actorType: ActorType
  dependencies: string[]
  priority: TaskPriority
  estimatedCompletion?: string
  customActorId?: string
}

/**
 * A plan created by the Planner actor
 */
export interface TaskPlan {
  mainGoal: string
  tasks: PlannedTask[]
}

/**
 * Result from the Planner actor
 */
export interface PlannerResult {
  plan: TaskPlan
  summary: string
}

/**
 * The Planner actor - responsible for creating task plans
 */
export class Planner extends BaseActor {
  constructor() {
    super(ActorType.PLANNER)
  }

  /**
   * Execute the Planner actor
   * @param task The planning task
   * @returns The planning result
   */
  protected async execute(task: VibeTask): Promise<PlannerResult> {
    // Create a "plans" table for storing planning data
    const plansTable = this.createTable(
      task.boardId,
      'plans',
      'Contains planning data for tasks',
      {
        mainGoal: 'string',
        tasks: 'array',
        summary: 'string'
      }
    )
    
    // Create a prompt for the AI to generate a plan
    const prompt = this.createPlanningPrompt(task)
    
    // Generate plan using AI
    const rawText = await this.generateCompletion(prompt)
    
    // Parse the plan from the generated text
    const plan = this.parsePlanFromText(rawText)
    
    // Filter for enabled actors if specified in the task metadata
    if (task.metadata?.enabledActors && Array.isArray(task.metadata.enabledActors)) {
      // Convert all actor types to uppercase for comparison
      const enabledActors = task.metadata.enabledActors.map(actor => 
        typeof actor === 'string' ? actor.toUpperCase() : actor
      );
      
      // Filter tasks to only include enabled actors
      plan.tasks = plan.tasks.filter(plannedTask => 
        enabledActors.includes(plannedTask.actorType)
      );
      
      // Log the filtered plan
      logger.log(`Filtered plan to include only enabled actors: ${enabledActors.join(', ')}`);
    }
    
    // Store the plan in the database
    this.createEntry(
      plansTable.id,
      task.id,
      DatabaseEntryType.DATA,
      'plan',
      plan,
      {
        mainGoal: plan.mainGoal,
        taskCount: plan.tasks.length
      }
    )
    
    // Create a summary of the plan
    const summary = `Created a plan with ${plan.tasks.length} tasks to achieve the goal: ${plan.mainGoal}`
    
    // Store the summary in the database
    this.createEntry(
      plansTable.id,
      task.id,
      DatabaseEntryType.TEXT,
      'summary',
      summary
    )
    
    // Return the planning result
    return {
      plan,
      summary
    }
  }

  /**
   * Create a prompt for the AI to generate a plan
   * @param task The planning task
   * @returns The prompt for the AI
   */
  private createPlanningPrompt(task: VibeTask): string {
    // Only use custom instructions if explicitly requested in task metadata
    if (task.metadata?.useCustomPrompt === true && this.config.customInstructions) {
      return this.config.customInstructions
        .replace(/{task}/g, task.description)
        .replace(/{taskDescription}/g, task.description);
    }
    
    // Get enabled actors from task metadata or use all actors
    let actorsList = '';
    if (task.metadata?.enabledActors && Array.isArray(task.metadata.enabledActors)) {
      // Get list of requested actors
      const enabledActors = task.metadata.enabledActors.map(actor => 
        typeof actor === 'string' ? actor.toUpperCase() : actor
      );
      
      // Build actor descriptions only for enabled actors - excluding PLANNER
      const actorDescriptions = [
        { type: 'RESEARCHER', desc: 'Gathers in-depth information, performs literature reviews, and synthesizes knowledge from diverse sources' },
        { type: 'ANALYST', desc: 'Performs data analysis, statistical evaluation, pattern recognition, and creates visualizations to draw insights' },
        { type: 'CODER', desc: 'Writes efficient, well-structured code for various programming tasks, handles data processing, and creates technical solutions' },
        { type: 'COMPOSER', desc: 'Coordinates and orchestrates the execution of complex workflows, ensuring proper task sequencing and collaboration' },
        { type: 'WRITER', desc: 'Creates high-quality written content, including documentation, reports, articles, and creative material' },
        { type: 'CUSTOM', desc: 'A specialized actor with custom instructions for domain-specific tasks' }
      ].filter(actor => enabledActors.includes(actor.type));
      
      // Format the actors list
      actorsList = actorDescriptions.map(actor => `- ${actor.type}: ${actor.desc}`).join('\n');
    } else {
      // Default to showing all actors except PLANNER
      actorsList = `- RESEARCHER: Gathers in-depth information, performs literature reviews, and synthesizes knowledge from diverse sources
- ANALYST: Performs data analysis, statistical evaluation, pattern recognition, and creates visualizations to draw insights
- CODER: Writes efficient, well-structured code for various programming tasks, handles data processing, and creates technical solutions
- COMPOSER: Coordinates and orchestrates the execution of complex workflows, ensuring proper task sequencing and collaboration
- WRITER: Creates high-quality written content, including documentation, reports, articles, and creative material
- CUSTOM: A specialized actor with custom instructions for domain-specific tasks`;
    }
    
    // Default prompt with instructions for the planner
    return `You are an expert project planner specialized in breaking down complex problems into logical, actionable steps. I need a detailed execution plan for the following task:
  
TASK:
${task.description}

Your mission is to create a comprehensive, well-structured plan that will efficiently accomplish this task.

AVAILABLE ACTORS:
The plan will be executed by these specialized AI actors, each with unique capabilities:
${actorsList}

PLANNING REQUIREMENTS:

1. Analyze the task thoroughly to understand its components, challenges, and objectives
2. Break down the task into logical, sequenced steps with appropriate dependencies
3. Assign each step to the most suitable actor based on their specialized capabilities
4. Consider both parallel execution (independent tasks) and sequential dependencies where necessary
5. Balance task distribution across actors to maximize efficiency
6. Include sufficient context and details in each task description so actors can work independently
7. Consider potential challenges and include steps to address them
8. Avoid unnecessary steps like testing, validation, or documentation unless explicitly requested
9. Structure the plan to build toward the final outcome incrementally

TASK DESIGN PRINCIPLES:

- Tasks should be atomic and focused on a single objective
- Task descriptions should be detailed and action-oriented (what to do, how to do it, and expected outcome)
- Dependencies should be clearly identified and logically sound
- Tasks should include all necessary context required by the actor
- Prioritize tasks appropriately based on importance and urgency
- For coding tasks, consolidate related functionality into single tasks rather than splitting across multiple CODER actors unnecessarily
- For coding tasks, clearly specify programming language, primary functionality, and technical requirements
- For research tasks, specify what information to gather and how it should be structured
- For analytical tasks, clarify what insights should be derived from which data

IMPORTANT: 
- Do not include any PLANNER tasks in your plan - only use the actors listed above
- Do not create tasks for testing or validating other actors' work
- Focus on direct implementation and completion rather than quality assurance
- For coding implementations, prefer fewer, more comprehensive tasks over many small fragmented tasks
- Avoid creating separate CODER tasks that could logically be combined into a single implementation

I need your response in the following JSON format:

\`\`\`json
{
  "mainGoal": "Clear, comprehensive statement of the main objective",
  "tasks": [
    {
      "title": "Concise, descriptive task title",
      "description": "Detailed explanation with all necessary context and specific instructions",
      "actorType": "ACTOR_TYPE",
      "dependencies": ["0", "1"], 
      "priority": "high|medium|low|critical",
      "estimatedCompletion": "short|medium|long"
    }
  ]
}
\`\`\`

For CUSTOM actors, use the format "CUSTOM:actorId" as the actorType, where actorId is the identifier of the custom actor.

Remember to:
- Ensure task dependencies create a logical workflow without circular dependencies
- Balance depth and breadth in your plan
- Focus on outcomes and deliverables for each task
- Make each task description specific enough to be executed without additional context
- Do not include PLANNER as an actorType for any task
- Return ONLY valid JSON that matches the exact format requested above`
  }

  /**
   * Parse a plan from the AI-generated text
   * @param planText Plan text from the AI
   * @returns The parsed plan
   */
  private parsePlanFromText(planText: string): TaskPlan {
    try {
      // Find the JSON in the text - it might be surrounded by other content
      const jsonMatch = planText.match(/\{[\s\S]*\}/m)
      if (!jsonMatch) {
        throw new Error('No JSON object found in response')
      }
      
      const jsonText = jsonMatch[0]
      const planData = JSON.parse(jsonText) as PlannerResponse
      
      // Validate the structure of the response
      if (!planData.mainGoal || !planData.tasks || !Array.isArray(planData.tasks)) {
        throw new Error('Invalid plan structure')
      }
      
      // Validate and transform the tasks
      const validTasks = planData.tasks.map((task, index) => {
        // Validate required fields
        if (!task.title || !task.description || !task.actorType) {
          throw new Error(`Task ${index} is missing required fields`)
        }
        
        // Normalize dependencies to ensure they are strings
        const dependencies = (task.dependencies || []).map(dep => String(dep))
        
        // Check if it's a custom actor and extract customActorId
        let customActorId: string | undefined
        let actorType = task.actorType as ActorType
        
        if (typeof actorType === 'string' && actorType.startsWith('CUSTOM:')) {
          const parts = actorType.split(':')
          if (parts.length >= 2) {
            customActorId = parts[1]
            actorType = ActorType.CUSTOM
          }
        }
        
        // Ensure priority is a valid TaskPriority
        const priority = Object.values(TaskPriority).includes(task.priority as TaskPriority)
          ? task.priority as TaskPriority
          : TaskPriority.MEDIUM
        
        // Create a planned task with validated fields
        return {
          title: task.title,
          description: task.description,
          actorType,
          dependencies,
          priority,
          estimatedCompletion: task.estimatedCompletion,
          customActorId
        } as PlannedTask
      })
      
      return {
        mainGoal: planData.mainGoal,
        tasks: validTasks
      }
    } catch (error) {
      logger.error('Error parsing plan:', error)
      return this.extractPlanFromText(planText)
    }
  }

  /**
   * Attempt to extract a plan from text if JSON parsing fails
   * @param text The text to extract a plan from
   * @returns A fallback plan with basic tasks
   */
  private extractPlanFromText(text: string): TaskPlan {
    logger.debug('Using fallback plan extraction from text')
    
    // Simple fallback implementation for now - this could be improved
    return {
      mainGoal: "Complete the requested task",
      tasks: [
        {
          title: "Research task",
          description: "Research information related to the task",
          actorType: ActorType.RESEARCHER,
          dependencies: [],
          priority: TaskPriority.HIGH,
        },
        {
          title: "Analyze findings",
          description: "Analyze the research findings and draw conclusions",
          actorType: ActorType.ANALYST,
          dependencies: ["0"],  // Depend on first task
          priority: TaskPriority.MEDIUM,
        }
      ]
    }
  }
}