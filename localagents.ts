import { AIService, GenerationOptions, GenerationResult } from './src/services/aiService';
import { JupyterService } from './src/services/jupyterService';
import { CodeExecutionService } from './src/services/codeExecutionService';
import { logger } from './src/services/logger';

/**
 * Agent types provided by default
 */
export enum AgentType {
  PLANNER = 'PLANNER',
  RESEARCHER = 'RESEARCHER',
  ANALYST = 'ANALYST',
  CODER = 'CODER',
  WORKER = 'WORKER',
  ASSISTANT = 'ASSISTANT'
}

/**
 * Agent task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Configuration for an agent
 */
export interface AgentConfig {
  enabled: boolean;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  customInstructions?: string;
  name?: string;
  description?: string;
  providerId?: string;
  apiKey?: string;
}

/**
 * Task for an agent to execute
 */
export interface AgentTask {
  id: string;
  title: string;
  description: string;
  agentType: AgentType | string;
  status: TaskStatus;
  dependencies?: string[];
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Base class for all agents
 */
export abstract class BaseAgent {
  protected config: AgentConfig;
  protected aiService: AIService;
  protected taskLogger: any;

  constructor(protected agentType: AgentType | string) {
    // Default configuration that can be overridden
    this.config = {
      enabled: true,
      temperature: 0.7,
      maxTokens: 2000
    };

    this.aiService = new AIService();
    this.taskLogger = logger.createPrefixedLogger(`Agent:${agentType}`);
  }

  /**
   * Update the agent's configuration
   */
  public updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Execute a task and handle its lifecycle
   */
  public async executeTask(task: AgentTask): Promise<any> {
    if (!this.config.enabled) {
      throw new Error(`Agent ${this.agentType} is disabled`);
    }

    try {
      // Update task status to in progress
      task.status = 'in_progress';
      task.startedAt = new Date();

      // Execute the task
      const result = await this.execute(task);

      // Update task with result
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();

      return result;
    } catch (error: unknown) {
      this.taskLogger.error(`Error executing task (${task.id}):`, error);

      // Update task with error
      const errorMessage = error instanceof Error ? error.message : String(error);
      task.status = 'failed';
      task.error = errorMessage;

      throw error;
    }
  }

  /**
   * Generate text completion using the configured AI service
   */
  protected async generateCompletion(prompt: string): Promise<string> {
    try {
      const providerId = this.config.providerId || 'gemini';
      const apiKey = this.config.apiKey || '';

      if (!apiKey && providerId !== 'webllm') {
        throw new Error(`API key required for provider ${providerId}`);
      }

      const options: GenerationOptions = {
        prompt,
        maxTokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.7
      };

      const response = await this.aiService.generateText(
        providerId,
        apiKey,
        options,
        this.config.modelId
      );

      return response.text;
    } catch (error) {
      this.taskLogger.error('Error generating completion:', error);
      throw error;
    }
  }

  /**
   * The core implementation of the agent's task execution logic
   * Must be implemented by each agent subclass
   */
  protected abstract execute(task: AgentTask): Promise<any>;
}

/**
 * A planning agent that organizes work
 */
export class PlannerAgent extends BaseAgent {
  constructor() {
    super(AgentType.PLANNER);
  }

  protected async execute(task: AgentTask): Promise<any> {
    const prompt = `
      You are a planning assistant. Your task is to create a detailed plan.
      
      TASK: ${task.description}
      
      ${this.config.customInstructions || ''}
      
      Format your plan as:
      
      ## Plan
      - Step 1: ...
      - Step 2: ...
      
      ## Estimated Timeline
      - Step 1: X time
      - Step 2: X time
      
      ## Resources Needed
      - Resource 1
      - Resource 2
    `;

    return await this.generateCompletion(prompt);
  }
}

/**
 * A research agent that gathers information
 */
export class ResearcherAgent extends BaseAgent {
  constructor() {
    super(AgentType.RESEARCHER);
  }

  protected async execute(task: AgentTask): Promise<any> {
    const prompt = `
      You are a research assistant. Your task is to gather and summarize information.
      
      RESEARCH TOPIC: ${task.description}
      
      ${this.config.customInstructions || ''}
      
      Format your research as:
      
      ## Summary
      
      ## Key Points
      - Point 1
      - Point 2
      
      ## Detailed Information
      
      ## Sources
    `;

    return await this.generateCompletion(prompt);
  }
}

/**
 * An analyst agent that processes data
 */
export class AnalystAgent extends BaseAgent {
  constructor() {
    super(AgentType.ANALYST);
  }

  protected async execute(task: AgentTask): Promise<any> {
    const prompt = `
      You are a data analysis assistant. Your task is to analyze data and provide insights.
      
      DATA DESCRIPTION: ${task.description}
      
      ${this.config.customInstructions || ''}
      
      Format your analysis as:
      
      ## Analysis Summary
      
      ## Key Findings
      - Finding 1
      - Finding 2
      
      ## Detailed Analysis
      
      ## Recommendations
    `;

    return await this.generateCompletion(prompt);
  }
}

/**
 * A coding agent that writes and explains code
 */
export class CoderAgent extends BaseAgent {
  constructor() {
    super(AgentType.CODER);
    // Default to a higher temperature for more creative code generation
    this.config.temperature = 0.5;
    this.config.maxTokens = 4000;
  }

  protected async execute(task: AgentTask): Promise<any> {
    const prompt = `
      You are a programming assistant. Your task is to write code based on the requirements.
      
      REQUIREMENTS: ${task.description}
      
      ${this.config.customInstructions || ''}
      
      Please provide:
      
      ## Solution
      \`\`\`
      // Your code here
      \`\`\`
      
      ## Explanation
      Brief explanation of how the code works.
      
      ## Usage Example
      How to use this code.
    `;

    return await this.generateCompletion(prompt);
  }
}

/**
 * A code execution agent that can run code
 */
export class CodeExecutionAgent extends BaseAgent {
  private jupyterService: JupyterService;
  private codeExecutionService: CodeExecutionService;
  private server: any = null;
  private kernelId: string | null = null;

  constructor() {
    super(AgentType.WORKER);
    this.jupyterService = new JupyterService();
    this.codeExecutionService = new CodeExecutionService();
  }

  /**
   * Configure the Jupyter server connection
   */
  public async configureJupyter(serverUrl: string, kernelName: string = 'python3'): Promise<void> {
    try {
      // Parse the server URL
      this.server = this.jupyterService.parseJupyterUrl(serverUrl);
      
      if (!this.server) {
        throw new Error('Failed to parse Jupyter server URL');
      }
      
      // Test the connection
      const connectionTest = await this.jupyterService.testConnection(this.server);
      if (!connectionTest.success) {
        throw new Error(`Failed to connect to Jupyter server: ${connectionTest.message}`);
      }
      
      // Create a kernel
      this.kernelId = await this.codeExecutionService.createKernel(this.server, kernelName);
      this.taskLogger.log(`Successfully connected to Jupyter server with kernel ID: ${this.kernelId}`);
    } catch (error) {
      this.taskLogger.error('Error configuring Jupyter:', error);
      throw new Error(`Failed to configure Jupyter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute code using the configured Jupyter server
   */
  public async executeCode(code: string, onOutput?: (output: string) => void): Promise<any> {
    if (!this.server || !this.kernelId) {
      throw new Error('Jupyter server not configured. Call configureJupyter first.');
    }
    
    try {
      return await this.codeExecutionService.executeCode(
        this.server,
        this.kernelId,
        code,
        onOutput
      );
    } catch (error) {
      this.taskLogger.error('Error executing code:', error);
      throw error;
    }
  }

  protected async execute(task: AgentTask): Promise<any> {
    // Check if the task metadata contains code to execute
    if (!task.metadata?.code) {
      throw new Error('No code provided in task metadata');
    }
    
    // Execute the code
    return await this.executeCode(task.metadata.code as string);
  }

  /**
   * Clean up resources when done
   */
  public async dispose(): Promise<void> {
    if (this.server && this.kernelId) {
      try {
        await this.codeExecutionService.deleteKernel(this.server, this.kernelId);
        this.kernelId = null;
        this.taskLogger.log('Kernel deleted');
      } catch (error) {
        this.taskLogger.error('Error deleting kernel:', error);
      }
    }
  }
}

/**
 * An assistant agent for conversational interactions
 */
export class AssistantAgent extends BaseAgent {
  private conversationHistory: { role: 'system' | 'user' | 'assistant', content: string }[] = [];

  constructor() {
    super(AgentType.ASSISTANT);
    this.config.temperature = 0.8;
  }

  /**
   * Set the system prompt for the assistant
   */
  public setSystemPrompt(prompt: string): void {
    // Clear existing system messages
    this.conversationHistory = this.conversationHistory.filter(msg => msg.role !== 'system');
    // Add the new system prompt
    this.conversationHistory.unshift({ role: 'system', content: prompt });
  }

  /**
   * Add a user message to the conversation
   */
  public async addUserMessage(message: string): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: message });
    const response = await this.getResponse();
    this.conversationHistory.push({ role: 'assistant', content: response });
    return response;
  }

  /**
   * Get a response based on the current conversation history
   */
  private async getResponse(): Promise<string> {
    // Format the conversation history as a prompt
    const prompt = this.conversationHistory
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n') + '\n\nASSISTANT:';

    return await this.generateCompletion(prompt);
  }

  /**
   * Clear the conversation history
   */
  public clearConversation(): void {
    const systemMessages = this.conversationHistory.filter(msg => msg.role === 'system');
    this.conversationHistory = [...systemMessages];
  }

  protected async execute(task: AgentTask): Promise<any> {
    // For assistant, we treat the task description as a user message
    return await this.addUserMessage(task.description);
  }
}

/**
 * Factory function to create agents by type
 */
export function createAgent(type: AgentType | string): BaseAgent {
  switch (type) {
    case AgentType.PLANNER:
      return new PlannerAgent();
    case AgentType.RESEARCHER:
      return new ResearcherAgent();
    case AgentType.ANALYST:
      return new AnalystAgent();
    case AgentType.CODER:
      return new CoderAgent();
    case AgentType.WORKER:
      return new CodeExecutionAgent();
    case AgentType.ASSISTANT:
      return new AssistantAgent();
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}

/**
 * Main agent orchestrator class
 */
export class AgentOrchestrator {
  private agents: Map<string, BaseAgent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private taskIdCounter: number = 0;
  
  constructor() {
    // Initialize with default agents
    Object.values(AgentType).forEach(type => {
      this.agents.set(type, createAgent(type));
    });
  }

  /**
   * Register a custom agent
   */
  public registerAgent(agentType: string, agent: BaseAgent): void {
    this.agents.set(agentType, agent);
  }

  /**
   * Configure an agent
   */
  public configureAgent(agentType: AgentType | string, config: Partial<AgentConfig>): void {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Agent ${agentType} not found`);
    }
    
    agent.updateConfig(config);
  }

  /**
   * Get an agent instance
   */
  public getAgent(agentType: AgentType | string): BaseAgent {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Agent ${agentType} not found`);
    }
    
    return agent;
  }

  /**
   * Create a new task
   */
  public createTask(
    title: string,
    description: string,
    agentType: AgentType | string,
    metadata?: Record<string, any>,
    dependencies?: string[]
  ): string {
    const id = `task-${++this.taskIdCounter}`;
    
    const task: AgentTask = {
      id,
      title,
      description,
      agentType,
      status: 'pending',
      dependencies,
      createdAt: new Date(),
      metadata
    };
    
    this.tasks.set(id, task);
    return id;
  }

  /**
   * Execute a specific task
   */
  public async executeTask(taskId: string): Promise<any> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Check if dependencies are completed
    if (task.dependencies && task.dependencies.length > 0) {
      for (const depId of task.dependencies) {
        const depTask = this.tasks.get(depId);
        if (!depTask || depTask.status !== 'completed') {
          throw new Error(`Dependency ${depId} not completed`);
        }
      }
    }
    
    const agent = this.agents.get(task.agentType);
    if (!agent) {
      throw new Error(`Agent ${task.agentType} not found`);
    }
    
    try {
      const result = await agent.executeTask(task);
      // Update the task in our map
      this.tasks.set(taskId, task);
      return result;
    } catch (error) {
      // Update the task in our map
      this.tasks.set(taskId, task);
      throw error;
    }
  }

  /**
   * Get the status of a task
   */
  public getTaskStatus(taskId: string): TaskStatus {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    return task.status;
  }

  /**
   * Get the result of a completed task
   */
  public getTaskResult(taskId: string): any {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    if (task.status !== 'completed') {
      throw new Error(`Task ${taskId} is not completed`);
    }
    
    return task.result;
  }

  /**
   * Execute all pending tasks in dependency order
   */
  public async executeAllTasks(): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const pendingTasks = Array.from(this.tasks.values()).filter(t => t.status === 'pending');
    
    // Create a dependency graph
    const dependencyGraph: Record<string, string[]> = {};
    const reverseDependencyGraph: Record<string, string[]> = {};
    
    // Initialize graphs
    for (const task of pendingTasks) {
      dependencyGraph[task.id] = task.dependencies || [];
      reverseDependencyGraph[task.id] = [];
    }
    
    // Build reverse graph
    for (const task of pendingTasks) {
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          if (reverseDependencyGraph[depId]) {
            reverseDependencyGraph[depId].push(task.id);
          }
        }
      }
    }
    
    // Execute tasks in dependency order
    while (true) {
      // Find tasks with no pending dependencies
      const readyTasks = pendingTasks.filter(task => 
        task.status === 'pending' && 
        (!task.dependencies || task.dependencies.every(depId => {
          const depTask = this.tasks.get(depId);
          return depTask && depTask.status === 'completed';
        }))
      );
      
      if (readyTasks.length === 0) {
        // Check if there are still pending tasks (would indicate a dependency cycle)
        const remainingPending = pendingTasks.filter(t => t.status === 'pending');
        if (remainingPending.length > 0) {
          throw new Error('Dependency cycle detected in tasks');
        }
        break;
      }
      
      // Execute all ready tasks in parallel
      await Promise.all(readyTasks.map(async task => {
        try {
          const result = await this.executeTask(task.id);
          results.set(task.id, result);
        } catch (error) {
          logger.error(`Error executing task ${task.id}:`, error);
          // We continue execution even if a task fails
        }
      }));
    }
    
    return results;
  }

  /**
   * Clean up resources when done
   */
  public async dispose(): Promise<void> {
    // Clean up all agents
    for (const agent of this.agents.values()) {
      if ('dispose' in agent && typeof (agent as any).dispose === 'function') {
        await (agent as any).dispose();
      }
    }
    
    // Clear maps
    this.agents.clear();
    this.tasks.clear();
  }
} 