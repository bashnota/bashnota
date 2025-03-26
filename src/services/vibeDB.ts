import Dexie, { type Table } from 'dexie'
import { type ActorConfig, type CustomActor, ActorType } from '@/types/vibe'
import { defaultPrompts, actorDescriptions, defaultActorConfigs } from '@/config/actorDefaults'
import { logger } from '@/services/logger'

/**
 * Stored actor configuration with ID
 */
export interface StoredActorConfig extends ActorConfig {
  id: string
  name: string
  description: string
  isDefault: boolean
  updatedAt: Date
}

/**
 * Database for Vibe actors
 */
export class VibeDB extends Dexie {
  actorConfigs!: Table<StoredActorConfig>
  customActors!: Table<CustomActor>

  constructor() {
    super('vibeDB')
    this.version(1).stores({
      actorConfigs: 'id, name, enabled, isDefault',
      customActors: 'id, name, enabled, updatedAt'
    })
  }

  /**
   * Check if the database needs initialization
   */
  private async needsInitialization(): Promise<boolean> {
    try {
      const count = await this.actorConfigs.count()
      return count === 0
    } catch (error) {
      logger.error('Error checking database initialization:', error)
      return true // Initialize if we can't check
    }
  }

  /**
   * Clear and reinitialize the database
   */
  async clearAndReinitialize() {
    try {
      // Clear all tables
      await this.actorConfigs.clear()
      await this.customActors.clear()
      
      // Reinitialize with defaults
      await this.initializeDefaults()
      logger.log('Database cleared and reinitialized')
    } catch (error) {
      logger.error('Error clearing and reinitializing database:', error)
      throw error
    }
  }

  /**
   * Restore all actors to their default values
   */
  async restoreToDefaults() {
    try {
      // Clear custom actors
      await this.customActors.clear()
      
      // Update all actor configs to their defaults
      const configsToStore: StoredActorConfig[] = Object.entries(defaultActorConfigs).map(([id, config]) => ({
        id,
        name: id,
        description: actorDescriptions[id as ActorType] || '',
        isDefault: true,
        updatedAt: new Date(),
        customInstructions: defaultPrompts[id as ActorType] || '',
        ...config
      }))
      
      // Update all configs in a transaction
      await this.transaction('rw', this.actorConfigs, async () => {
        for (const config of configsToStore) {
          await this.actorConfigs.put(config)
        }
      })
      
      logger.log('All actors restored to default values')
    } catch (error) {
      logger.error('Error restoring defaults:', error)
      throw error
    }
  }

  /**
   * Initialize default actor configurations if they don't exist
   */
  async initializeDefaults() {
    try {
      // Only initialize if the database is empty
      if (!(await this.needsInitialization())) {
        logger.log('Database already initialized')
        return
      }

      // Add all default configs
      const configsToAdd: StoredActorConfig[] = Object.entries(defaultActorConfigs).map(([id, config]) => ({
        id,
        name: id,
        description: actorDescriptions[id as ActorType] || '',
        isDefault: true,
        updatedAt: new Date(),
        customInstructions: defaultPrompts[id as ActorType] || '',
        ...config
      }))
      
      await this.actorConfigs.bulkAdd(configsToAdd)
      logger.log('Default actor configurations initialized')
    } catch (error) {
      logger.error('Error initializing default configurations:', error)
      throw error
    }
  }
}

export const vibeDB = new VibeDB() 