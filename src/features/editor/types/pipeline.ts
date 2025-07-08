export interface PipelineNodeData {
  id: string
  title?: string
  code?: string
  output?: any
  status?: 'idle' | 'running' | 'completed' | 'error' | 'queued'
  executionTime?: number
  kernelName?: string
  serverID?: string
  sessionId?: string
  serverConfig?: any
  useSharedKernel?: boolean
  hasError?: boolean
  error?: string | Error
  createdAt?: number
  updatedAt?: number
}

export interface PipelineNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: PipelineNodeData
  selected?: boolean
  dragging?: boolean
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
  type?: string
  animated?: boolean
  style?: Record<string, any>
  markerEnd?: any
  data?: {
    condition?: string
    label?: string
  }
}

export interface PipelineViewport {
  x: number
  y: number
  zoom: number
}

export interface PipelineExecutionSummary {
  total: number
  executed: number
  skipped: number
  errors: number
  startTime?: number
  endTime?: number
}

export interface PipelineSettings {
  kernelMode: 'shared' | 'isolated' | 'mixed'
  sharedKernelName?: string
  executionOrder: 'topological' | 'sequential' | 'parallel'
  stopOnError: boolean
  autoSave: boolean
}

export interface PipelineNodeState {
  isSelected?: boolean
  isExecuting?: boolean
  isHovered?: boolean
  isFocused?: boolean
  isVisible?: boolean
}

export interface PipelineTemplate {
  id: string
  name: string
  description: string
  category: string
  nodes: Partial<PipelineNodeData>[]
  edges: Partial<PipelineEdge>[]
  icon?: string
}

export interface NodeConnectionInfo {
  inputs: PipelineEdge[]
  outputs: PipelineEdge[]
  hasMultipleInputs: boolean
  hasMultipleOutputs: boolean
}

export interface PipelineContextMenuAction {
  id: string
  label: string
  icon?: string
  shortcut?: string
  separator?: boolean
  disabled?: boolean
  action: () => void
}

export interface PipelineError {
  nodeId?: string
  message: string
  stack?: string
  timestamp: number
  type: 'execution' | 'validation' | 'connection'
} 