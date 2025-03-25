import { BaseActor } from './BaseActor'
import { ActorType, type VibeTask, type CustomActor as CustomActorType } from '@/types/vibe'
import { vibeDB } from '@/services/vibeDB'
import { logger } from '@/services/logger'

/**
 * A custom actor defined by the user
 */
export class CustomActor extends BaseActor {
  private customId: string;
  private customName: string;
  private customDescription: string;

  /**
   * Create a new custom actor
   * @param customActorData The custom actor data
   */
  constructor(customActorData: CustomActorType) {
    super(ActorType.CUSTOM);
    
    // Set custom actor data
    this.customId = customActorData.id;
    this.customName = customActorData.name;
    this.customDescription = customActorData.description;
    
    // Override the config with the custom actor's config
    this.config = { ...customActorData.config };
  }

  /**
   * Get the custom actor's ID
   * @returns The custom actor's ID
   */
  public getCustomId(): string {
    return this.customId;
  }
  
  /**
   * Get the custom actor's name
   * @returns The custom actor's name
   */
  public getCustomName(): string {
    return this.customName;
  }
  
  /**
   * Get the custom actor's description
   * @returns The custom actor's description
   */
  public getCustomDescription(): string {
    return this.customDescription;
  }

  /**
   * Execute the custom actor's task
   * @param task The task to execute
   * @returns The task result
   */
  protected async execute(task: VibeTask): Promise<any> {
    // Try to load the latest custom actor data from the database
    await this.loadLatestCustomActorData();
    
    // Generate a prompt using the custom instructions
    const prompt = this.createPrompt(task);
    
    // Generate text completion using the AI model
    const result = await this.generateCompletion(prompt);
    
    // Return the result
    return {
      content: result,
      actorName: this.customName
    };
  }

  /**
   * Load the latest custom actor data from the database
   */
  private async loadLatestCustomActorData(): Promise<void> {
    try {
      // Get the latest custom actor data from the database
      const latestActorData = await vibeDB.customActors.get(this.customId);
      
      if (latestActorData) {
        // Update the actor with the latest data
        this.customName = latestActorData.name;
        this.customDescription = latestActorData.description;
        this.config = { ...this.config, ...latestActorData.config };
        logger.debug(`Updated custom actor ${this.customId} with latest data from database`);
      }
    } catch (error) {
      logger.error(`Error loading latest custom actor data for ${this.customId}:`, error);
    }
  }

  /**
   * Update the custom actor's instructions
   * @param instructions The new instructions
   * @returns Whether the update was successful
   */
  public async updateInstructions(instructions: string): Promise<boolean> {
    try {
      // Update the instructions in memory
      this.config.customInstructions = instructions;
      
      // Update the custom actor in the database
      await vibeDB.customActors.update(this.customId, {
        config: {
          ...this.config
        },
        updatedAt: new Date()
      });
      
      logger.debug(`Updated instructions for custom actor ${this.customId}`);
      return true;
    } catch (error) {
      logger.error(`Error updating instructions for custom actor ${this.customId}:`, error);
      return false;
    }
  }

  /**
   * Create a prompt for the AI using the custom instructions
   * @param task The task to create a prompt for
   * @returns The prompt for the AI
   */
  private createPrompt(task: VibeTask): string {
    const instructions = this.config.customInstructions || '';
    
    // If there are custom instructions, use them directly
    if (instructions.trim()) {
      // Replace any task placeholders in the instructions
      return instructions
        .replace(/{task}/g, task.description)
        .replace(/{taskDescription}/g, task.description)
        .replace(/{description}/g, task.description);
    }
    
    // Otherwise, create a default prompt using the actor's name and description
    return `You are a custom AI assistant named "${this.customName}" with the following purpose:
${this.customDescription}

TASK:
${task.description}

Please respond with the result of your work on this task.`;
  }
} 