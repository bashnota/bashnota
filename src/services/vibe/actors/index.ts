import { Planner } from './Planner'
import { Researcher } from './Researcher'
import { Analyst } from './Analyst'
import { Coder } from './Coder'
import { Composer } from './Composer'
import { Writer } from './Writer'
import { ActorType } from '@/types/vibe'
import { logger } from '@/services/logger'

// Factory function to create actors by type
export function createActor(type: ActorType) {
  switch (type) {
    case ActorType.PLANNER:
      return new Planner()
    case ActorType.RESEARCHER:
      return new Researcher()
    case ActorType.ANALYST:
      return new Analyst()
    case ActorType.CODER:
      return new Coder()
    case ActorType.COMPOSER:
      return new Composer()
    case ActorType.WRITER:
      return new Writer()
    default:
      throw new Error(`Unknown actor type: ${type}`)
  }
}

// Export all actor classes
export * from './BaseActor'
export * from './Planner'
export * from './Researcher'
export * from './Analyst'
export * from './Coder'
export * from './Composer'
export * from './Writer'