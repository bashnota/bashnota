import { ActorType } from '@/types/vibe'
import type { Edge, Node } from '@vue-flow/core'

export interface TaskNodeData {
  id?: string
  title: string
  status: string
  actorType: ActorType | string
  description?: string
}

export type TaskNode = Node<TaskNodeData>

export type TaskEdge = Edge

export interface Task {
  id: string
  title: string
  status: string
  actorType: ActorType | string
  description?: string
  dependencies?: string[]
}

export interface TaskGraphProps {
  tasks: Task[]
  selectedTaskId?: string
} 