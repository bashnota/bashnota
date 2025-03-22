import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask } from '@/types/vibe'
import { DatabaseEntryType } from '@/types/vibe'

/**
 * Result from the Planner actor
 */
export interface PlannerResult {
  plan: TaskPlan
  summary: string
}

/**
 * Task plan created by the Planner
 */
export interface TaskPlan {
  tasks: PlannedTask[]
  mainGoal: string
}

/**
 * Task planned by the Planner
 */
export interface PlannedTask {
  title: string
  description: string
  actorType: ActorType
  dependencies: string[] // IDs of tasks this task depends on
  priority: 'high' | 'medium' | 'low'
  estimatedCompletion: 'short' | 'medium' | 'long'
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
    const prompt = this.createPlanningPrompt(task.description)
    
    // Generate plan using AI
    const planText = await this.generateCompletion(prompt)
    
    // Parse the plan from the generated text
    const plan = this.parsePlanFromText(planText, task.boardId)
    
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
   * @param query The user's query
   * @returns The prompt for the AI
   */
  private createPlanningPrompt(query: string): string {
    return `You are a strategic Planning AI assistant that creates detailed, actionable work plans for complex tasks. You excel at breaking down large objectives into logical, manageable subtasks.
    
The user has requested help with the following task:

"${query}"

Your mission is to create a comprehensive, executable plan to accomplish this task effectively. The plan should be optimized for:
1. Completeness - ensuring all necessary steps are included
2. Logical sequencing - tasks should be ordered in a sensible workflow
3. Dependency management - clearly identifying which tasks depend on others
4. Appropriate task assignment - matching tasks to the right specialist actor

AVAILABLE ACTOR TYPES:
- RESEARCHER: Specializes in information gathering, literature reviews, data collection, and knowledge synthesis. Best for tasks requiring deep domain knowledge, fact-finding, and comprehensive research.

- ANALYST: Specializes in data analysis, visualization, statistical modeling, and insights generation. Best for tasks involving data processing, pattern recognition, drawing conclusions from information, and creating visual representations of data. Strong with mathematical formulations and equations.

- CODER: Specializes in code generation, debugging, and technical implementation. Best for tasks requiring programming, algorithm development, data manipulation through code, and practical software solutions.

PLAN STRUCTURE REQUIREMENTS:
For each task in your plan, provide:
- A descriptive title (2-6 words) that clearly communicates the task's purpose
- A detailed description (2-4 sentences) explaining exactly what needs to be done, including:
  * Specific goals of the task
  * Key methods or approaches to use
  * Expected outputs or deliverables
  * Any special considerations or constraints
- The most appropriate actor type (RESEARCHER, ANALYST, or CODER)
- Dependencies (which tasks must be completed before this one can start)
- Priority level (high, medium, or low) based on task importance and impact
- Estimated completion time (short: <30 min, medium: 30-60 min, long: >60 min)

THE PLAN SHOULD:
- Start with initial information gathering or setup tasks that have no dependencies
- Build in a logical progression toward the final goal
- Include validation or quality check steps where appropriate
- Consider parallel execution paths where tasks don't depend on each other
- Break complex operations into multiple smaller, focused tasks
- Ensure each task has clear, measurable outcomes

Respond with a structured JSON format exactly as follows:
{
  "mainGoal": "Clear statement of the main objective",
  "tasks": [
    {
      "title": "Descriptive Task Title",
      "description": "Detailed task description explaining what needs to be done, methods to use, and expected outputs",
      "actorType": "RESEARCHER|ANALYST|CODER",
      "dependencies": [], // Empty array for tasks with no dependencies, or array of task indices (0-based) for dependent tasks
      "priority": "high|medium|low",
      "estimatedCompletion": "short|medium|long"
    },
    // Additional tasks...
  ]
}

The plan should be highly specific to the requested task and reflect the most efficient approach to accomplish the goal. Avoid generic tasks that would apply to any project. Make sure tasks are concrete, actionable, and appropriate for the actor types available.`
  }

  /**
   * Parse a task plan from the generated text
   * @param planText The text generated by the AI
   * @param boardId The board ID to associate tasks with
   * @returns The parsed task plan
   */
  private parsePlanFromText(planText: string, boardId: string): TaskPlan {
    try {
      // Extract JSON from the response using a more robust approach
      // First, try to find any JSON-like objects with multiple matching strategies
      let jsonPlan: any = null;
      let matched = false;
      
      // Strategy 1: Look for JSON objects with a relaxed pattern that might span multiple lines
      const jsonRegex = /(\{[\s\S]*?\})/g;
      const potentialMatches = [...planText.matchAll(jsonRegex)];
      
      // Try each potential match
      for (const match of potentialMatches) {
        try {
          const trimmedMatch = match[0].trim();
          const parsedJson = JSON.parse(trimmedMatch);
          
          // Basic validation of the structure
          if (parsedJson && typeof parsedJson === 'object' && 
              (parsedJson.mainGoal || parsedJson.tasks || parsedJson.tasks?.length > 0)) {
            jsonPlan = parsedJson;
            matched = true;
            console.log("Matched with strategy 1:", jsonPlan);
            break;
          }
        } catch (e) {
          // Continue to the next match if parsing fails
          continue;
        }
      }
      
      // Strategy 2: Try to find the largest potential JSON block 
      // that starts with { and ends with } if strategy 1 failed
      if (!matched) {
        const fullMatch = planText.match(/\{[\s\S]*\}/);
        if (fullMatch) {
          try {
            const trimmedMatch = fullMatch[0].trim();
            jsonPlan = JSON.parse(trimmedMatch);
            matched = true;
            console.log("Matched with strategy 2:", jsonPlan);
          } catch (e) {
            // If parsing fails, try to fix common JSON issues
            try {
              // Replace non-standard quotes
              let fixedJson = fullMatch[0].replace(/[""]/g, '"');
              
              // Try to fix unquoted property names
              fixedJson = fixedJson.replace(/(\w+)\s*:/g, '"$1":');
              
              // Try to fix single quotes for strings
              fixedJson = fixedJson.replace(/'([^']*)'/g, '"$1"');
              
              jsonPlan = JSON.parse(fixedJson);
              matched = true;
              console.log("Matched with strategy 2 (fixed):", jsonPlan);
            } catch (e2) {
              // Still failed, continue to next strategy
            }
          }
        }
      }
      
      // Strategy 3: Fallback to extracting key information manually using regex if all else fails
      if (!matched) {
        console.log("Using fallback extraction strategy");
        // Try to find the main goal
        const mainGoalMatch = planText.match(/main\s*goal\s*:?\s*["']?(.*?)["']?(?:,|\n|$)/i);
        const mainGoal = mainGoalMatch ? mainGoalMatch[1].trim() : "Generated plan";
        
        // Try to extract tasks
        const taskPattern = /task\s*\d+|title\s*:\s*["']?(.*?)["']?(?:,|\n|$)/gi;
        const taskMatches = [...planText.matchAll(taskPattern)];
        
        const tasks = [];
        if (taskMatches.length > 0) {
          for (let i = 0; i < Math.min(taskMatches.length, 5); i++) {
            tasks.push({
              title: taskMatches[i][1] || `Task ${i+1}`,
              description: `Extracted task ${i+1}`,
              actorType: ActorType.RESEARCHER, // Default to researcher
              dependencies: [],
              priority: 'medium',
              estimatedCompletion: 'medium'
            });
          }
        } else {
          // Create at least one default task
          tasks.push({
            title: "Research task",
            description: "Research the topic and gather information",
            actorType: ActorType.RESEARCHER,
            dependencies: [],
            priority: 'medium',
            estimatedCompletion: 'medium'
          });
        }
        
        jsonPlan = {
          mainGoal: mainGoal,
          tasks: tasks
        };
        
        console.log("Created fallback plan:", jsonPlan);
      }
      
      // Create a minimal valid plan structure if we've still failed
      if (!jsonPlan || typeof jsonPlan !== 'object') {
        console.log("Creating minimal valid plan as last resort");
        jsonPlan = {
          mainGoal: "Complete the requested task",
          tasks: [
            {
              title: "Research task",
              description: "Research the topic thoroughly",
              actorType: "RESEARCHER",
              dependencies: [],
              priority: "medium",
              estimatedCompletion: "medium"
            },
            {
              title: "Analyze findings",
              description: "Analyze the research findings",
              actorType: "ANALYST",
              dependencies: [0],
              priority: "medium",
              estimatedCompletion: "medium"
            }
          ]
        };
      }
      
      // Ensure mainGoal exists
      if (!jsonPlan.mainGoal) {
        jsonPlan.mainGoal = "Complete the task";
      }
      
      // Ensure tasks array exists
      if (!jsonPlan.tasks || !Array.isArray(jsonPlan.tasks) || jsonPlan.tasks.length === 0) {
        jsonPlan.tasks = [
          {
            title: "Research task",
            description: "Research the topic thoroughly",
            actorType: "RESEARCHER",
            dependencies: [],
            priority: "medium",
            estimatedCompletion: "medium"
          }
        ];
      }

      // Process the tasks to ensure they have the correct actor types
      const processedTasks = jsonPlan.tasks.map((task: any, index: number) => {
        // Validate and provide defaults for required fields
        const title = task.title || `Task ${index + 1}`;
        const description = task.description || `Perform task ${index + 1}`;
        
        // Convert actor type string to enum with fallback
        let actorType = ActorType.RESEARCHER; // Default
        const actorTypeStr = (task.actorType || '').toUpperCase();
        
        if (actorTypeStr === 'RESEARCHER') {
          actorType = ActorType.RESEARCHER;
        } else if (actorTypeStr === 'ANALYST') {
          actorType = ActorType.ANALYST;
        } else if (actorTypeStr === 'CODER') {
          actorType = ActorType.CODER;
        }
        
        // Validate dependencies
        let dependencies: string[] = [];
        if (task.dependencies) {
          // Ensure dependencies are valid
          if (Array.isArray(task.dependencies)) {
            // Convert numeric dependencies to strings
            dependencies = task.dependencies
              .filter((dep: any) => dep !== undefined && dep !== null)
              .map((dep: any) => dep.toString());
          }
        }

        return {
          title: title,
          description: description,
          actorType: actorType,
          dependencies: dependencies,
          priority: task.priority || 'medium',
          estimatedCompletion: task.estimatedCompletion || 'medium'
        };
      });

      return {
        mainGoal: jsonPlan.mainGoal,
        tasks: processedTasks
      };
    } catch (error: unknown) {
      console.error('Error parsing plan:', error);
      // Even if parsing fails completely, return a basic valid plan
      return {
        mainGoal: "Explore the topic",
        tasks: [
          {
            title: "Research the topic",
            description: "Gather information about the topic",
            actorType: ActorType.RESEARCHER,
            dependencies: [],
            priority: 'medium',
            estimatedCompletion: 'medium'
          }
        ]
      };
    }
  }
} 