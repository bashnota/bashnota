import { ActorType } from '@/types/vibe'
import type { Edge, Node } from '@vue-flow/core'

export interface TaskNodeData {
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  actorType: ActorType | string
  description: string
}

export type TaskNode = Node<TaskNodeData>

export type TaskEdge = Edge

export interface Task {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  actorType: ActorType | string
  description: string
  dependencies?: string[]
}

export interface TaskGraphProps {
  tasks: Task[]
  selectedTaskId?: string | null
} 