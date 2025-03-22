import { Planner } from './Planner'
import { Researcher } from './Researcher'
import { Analyst } from './Analyst'
import { Coder } from './Coder'
import { Summarizer } from './Summarizer'
import { Reviewer } from './Reviewer'
import { Visualizer } from './Visualizer'
import { ActorType } from '@/types/vibe'

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
    case ActorType.SUMMARIZER:
      return new Summarizer()
    case ActorType.REVIEWER:
      return new Reviewer()
    case ActorType.VISUALIZER:
      return new Visualizer()
    case ActorType.COMPOSER:
      // Temporarily use Planner as a fallback for Composer
      console.warn('Composer actor not implemented, using Planner as fallback')
      return new Planner()
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
export * from './Reviewer'
export * from './Visualizer'
export * from './Summarizer' 