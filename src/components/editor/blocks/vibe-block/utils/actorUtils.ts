// Utility functions for working with actors in the Vibe system
import { ActorType } from '@/types/vibe'

/**
 * Get a human-readable actor name from actor type
 */
export function getActorName(actorType: string): string {
  switch (actorType) {
    case ActorType.RESEARCHER: return 'Researcher'
    case ActorType.ANALYST: return 'Analyst'
    case ActorType.CODER: return 'Coder'
    case ActorType.PLANNER: return 'Planner'
    case ActorType.COMPOSER: return 'Composer'
    case ActorType.SUMMARIZER: return 'Summarizer'
    case ActorType.REVIEWER: return 'Reviewer'
    case ActorType.VISUALIZER: return 'Visualizer'
    default: return actorType
  }
}

// Define TaskStatus enum if not already defined in vibe types
export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const

// Define TaskPriority enum if not already defined in vibe types
export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus]
export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority] 