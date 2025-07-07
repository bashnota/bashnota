import { ref, computed, reactive, nextTick, watch, onUnmounted } from 'vue'
import { 
  useVueFlow,
  type Connection,
  type Edge,
  type Node,
  type GraphNode,
  type ViewportFunctions
} from '@vue-flow/core'
import { MarkerType } from '@vue-flow/core'
import { nanoid } from 'nanoid'

export interface PipelineFlowState {
  nodes: Node[]
  edges: Edge[]
  isEditMode: boolean
  isExecuting: boolean
  selectedNodeId: string | null
  viewport: { x: number; y: number; zoom: number } | null
}

export interface FlowHandlers {
  onConnect: (connection: Connection) => void
  onNodeClick: (event: { node: Node }) => void
  onEdgeClick: (event: { edge: Edge }) => void
  onNodeDragStart: (event: { node: Node }) => void
  onNodeDrag: (event: { node: Node }) => void
  onNodeDragStop: (event: { node: Node }) => void
  onConnectStart: (event: any) => void
  onConnectEnd: (event: any) => void
  onPaneReady: (instance: ViewportFunctions) => void
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void
}

export function usePipelineFlow(initialState: PipelineFlowState) {
  // VueFlow instance reference
  const flowInstance = ref<ViewportFunctions | null>(null)
  
  // Reactive state
  const state = reactive<PipelineFlowState>({
    nodes: initialState.nodes || [],
    edges: initialState.edges || [],
    isEditMode: initialState.isEditMode ?? true,
    isExecuting: false,
    selectedNodeId: null,
    viewport: initialState.viewport
  })

  // Connection and interaction state
  const isConnecting = ref(false)
  const connectingFrom = ref<string | null>(null)
  const connectingFromHandle = ref<string | null>(null)
  const isDragging = ref(false)
  const potentialTargets = ref<string[]>([])

  // Node states for visual feedback
  const nodeStates = reactive(new Map<string, {
    isHovered: boolean
    isDragging: boolean
    isSelected: boolean
    isExecuting: boolean
    isConnectingSource: boolean
    isPotentialTarget: boolean
  }>())

  // Computed properties
  const hasValidPipeline = computed(() => 
    state.nodes.length > 0 && state.nodes.some(node => node.data?.code)
  )

  const selectedNode = computed(() => 
    state.selectedNodeId ? state.nodes.find(n => n.id === state.selectedNodeId) : null
  )

  // VueFlow composable (only available inside VueFlow component)
  let vueFlowComposable: ReturnType<typeof useVueFlow> | null = null

  // Initialize VueFlow composable
  const initializeVueFlow = () => {
    try {
      vueFlowComposable = useVueFlow()
      return true
    } catch (error) {
      console.warn('VueFlow composable not available:', error)
      return false
    }
  }

  // Utility functions
  const updateNodeState = (nodeId: string, updates: Partial<{
    isHovered: boolean
    isDragging: boolean
    isSelected: boolean
    isExecuting: boolean
    isConnectingSource: boolean
    isPotentialTarget: boolean
  }>) => {
    const currentState = nodeStates.get(nodeId) || {
      isHovered: false,
      isDragging: false,
      isSelected: false,
      isExecuting: false,
      isConnectingSource: false,
      isPotentialTarget: false
    }
    nodeStates.set(nodeId, { ...currentState, ...updates })
  }

  const clearAllSelections = () => {
    state.nodes.forEach(node => {
      updateNodeState(node.id, { isSelected: false })
    })
    state.selectedNodeId = null
  }

  const clearConnectionState = () => {
    isConnecting.value = false
    connectingFrom.value = null
    connectingFromHandle.value = null
    potentialTargets.value = []
    
    // Clear visual states
    state.nodes.forEach(node => {
      updateNodeState(node.id, { 
        isConnectingSource: false, 
        isPotentialTarget: false 
      })
    })
  }

  const startConnection = (sourceNodeId: string, sourceHandle: string) => {
    if (!state.isEditMode) return false
    
    // If already connecting, cancel
    if (isConnecting.value) {
      clearConnectionState()
      return false
    }

    isConnecting.value = true
    connectingFrom.value = sourceNodeId
    connectingFromHandle.value = sourceHandle
    
    // Mark source node
    updateNodeState(sourceNodeId, { isConnectingSource: true })
    
    // Find and mark potential targets
    const targets = state.nodes
      .map(n => n.id)
      .filter(nodeId => {
        if (nodeId === sourceNodeId) return false
        return isValidConnection({
          source: sourceNodeId,
          sourceHandle: sourceHandle,
          target: nodeId,
          targetHandle: `${nodeId}-input`
        })
      })
    
    potentialTargets.value = targets
    targets.forEach(nodeId => {
      updateNodeState(nodeId, { isPotentialTarget: true })
    })
    
    return true
  }

  const completeConnection = (targetNodeId: string, targetHandle: string) => {
    if (!isConnecting.value || !connectingFrom.value || !connectingFromHandle.value) return false
    
    const connection = {
      source: connectingFrom.value,
      sourceHandle: connectingFromHandle.value,
      target: targetNodeId,
      targetHandle: targetHandle
    }
    
    if (!isValidConnection(connection)) {
      clearConnectionState()
      return false
    }
    
    const newEdge: Edge = {
      id: nanoid(),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'smoothstep',
      animated: true,
      markerEnd: MarkerType.ArrowClosed,
      style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' }
    }
    
    state.edges.push(newEdge)
    clearConnectionState()
    return true
  }

  const handleHandleClick = (nodeId: string, handleId: string, handleType: 'source' | 'target') => {
    if (!state.isEditMode) return
    
    if (handleType === 'source') {
      // Starting a connection from this output handle
      startConnection(nodeId, handleId)
    } else if (handleType === 'target') {
      // Completing a connection to this input handle
      if (isConnecting.value && potentialTargets.value.includes(nodeId)) {
        completeConnection(nodeId, handleId)
      } else {
        // Cancel if clicking invalid target
        clearConnectionState()
      }
    }
  }

  const isValidConnection = (connection: Connection): boolean => {
    if (!connection.source || !connection.target) return false
    if (connection.source === connection.target) return false
    
    const sourceIsOutput = connection.sourceHandle?.endsWith('-output')
    if (!sourceIsOutput) return false
    
    // Check for existing connections to target
    const hasExistingInput = state.edges.some(edge => 
      edge.target === connection.target && edge.targetHandle === connection.targetHandle
    )
    if (hasExistingInput) return false
    
    // Check for cycles
    return !wouldCreateCycle(connection.source, connection.target)
  }

  const wouldCreateCycle = (sourceId: string, targetId: string): boolean => {
    const visited = new Set<string>()
    
    const dfs = (nodeId: string): boolean => {
      if (nodeId === sourceId) return true
      if (visited.has(nodeId)) return false
      
      visited.add(nodeId)
      const outgoingEdges = state.edges.filter(edge => edge.source === nodeId)
      
      return outgoingEdges.some(edge => dfs(edge.target))
    }
    
    return dfs(targetId)
  }

  // Flow handlers
  const handlers: FlowHandlers = {
    onConnect: (connection: Connection) => {
      if (!state.isEditMode) return
      
      // Validate connection has required properties
      if (!connection.source || !connection.target) {
        console.warn('Connection missing source or target:', {
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle
        })
        return
      }
      
      if (!isValidConnection(connection)) return
      
      const newEdge: Edge = {
        id: nanoid(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || null,
        targetHandle: connection.targetHandle || null,
        type: 'smoothstep',
        animated: true,
        markerEnd: MarkerType.ArrowClosed,
        style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' }
      }

      state.edges.push(newEdge)
    },

    onNodeClick: (event: { node: Node }) => {
      if (!state.isEditMode) return
      
      clearAllSelections()
      updateNodeState(event.node.id, { isSelected: true })
      state.selectedNodeId = event.node.id
    },

    onEdgeClick: (event: { edge: Edge }) => {
      if (!state.isEditMode) return
      
      const edgeIndex = state.edges.findIndex(e => e.id === event.edge.id)
      if (edgeIndex !== -1) {
        state.edges.splice(edgeIndex, 1)
      }
    },

    onNodeDragStart: (event: { node: Node }) => {
      updateNodeState(event.node.id, { isDragging: true })
      isDragging.value = true
    },

    onNodeDrag: (event: { node: Node }) => {
      // Update connected edges with visual feedback
      const connectedEdges = state.edges.filter(edge => 
        edge.source === event.node.id || edge.target === event.node.id
      )
      
      connectedEdges.forEach(edge => {
        edge.style = {
          ...edge.style,
          strokeDasharray: '5,5'
        }
      })
    },

    onNodeDragStop: (event: { node: Node }) => {
      updateNodeState(event.node.id, { isDragging: false })
      isDragging.value = false

      // Reset edge styles
      const connectedEdges = state.edges.filter(edge => 
        edge.source === event.node.id || edge.target === event.node.id
      )
      
      connectedEdges.forEach(edge => {
        edge.style = {
          ...edge.style,
          strokeDasharray: undefined
        }
      })
    },

    onConnectStart: (event: any) => {
      isConnecting.value = true
      connectingFrom.value = event.nodeId
      
      if (event.handleId?.endsWith('-output')) {
        potentialTargets.value = state.nodes
          .map(n => n.id)
          .filter(nodeId => isValidConnection({
            source: event.nodeId!,
            sourceHandle: event.handleId,
            target: nodeId,
            targetHandle: `${nodeId}-input`
          }))
      }
    },

    onConnectEnd: () => {
      isConnecting.value = false
      connectingFrom.value = null
      potentialTargets.value = []
    },

    onPaneReady: (instance: ViewportFunctions) => {
      flowInstance.value = instance
      
      // Apply initial viewport if available
      if (state.viewport) {
        instance.setViewport(state.viewport)
      } else {
        nextTick(() => {
          instance.fitView({ padding: 0.2 })
        })
      }
    },

    onViewportChange: (viewport: { x: number; y: number; zoom: number }) => {
      state.viewport = viewport
    }
  }

  // Node management
  const addNode = (nodeData: Partial<Node>) => {
    const newNode: Node = {
      id: nanoid(),
      type: 'codeblock',
      position: { x: 100, y: 100 },
      data: {
        title: 'New Code Block',
        code: '',
        language: 'python',
        status: 'idle',
        ...nodeData.data
      },
      ...nodeData
    }

    // Find optimal position
    const optimalPosition = findOptimalPosition(newNode)
    newNode.position = optimalPosition

    state.nodes.push(newNode)
    
    // Auto-connect if possible
    tryAutoConnect(newNode)

    return newNode
  }

  const removeNode = (nodeId: string) => {
    const nodeIndex = state.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex !== -1) {
      state.nodes.splice(nodeIndex, 1)
    }

    // Remove connected edges
    state.edges = state.edges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    )

    // Clear selection if this node was selected
    if (state.selectedNodeId === nodeId) {
      state.selectedNodeId = null
    }

    nodeStates.delete(nodeId)
  }

  const findOptimalPosition = (newNode: Node) => {
    if (state.nodes.length === 0) {
      return { x: 100, y: 100 }
    }

    // Try to connect to last selected node
    if (state.selectedNodeId) {
      const selectedNode = state.nodes.find(n => n.id === state.selectedNodeId)
      if (selectedNode) {
        const hasDownstreamConnections = state.edges.some(edge => edge.source === selectedNode.id)
        if (!hasDownstreamConnections) {
          return {
            x: selectedNode.position.x,
            y: selectedNode.position.y + 200
          }
        }
      }
    }

    // Find empty space in grid
    const gridSize = 350
    const occupiedPositions = new Set(
      state.nodes.map(n => `${Math.floor(n.position.x/gridSize)},${Math.floor(n.position.y/gridSize)}`)
    )
    
    let col = 0, row = 0
    while (occupiedPositions.has(`${col},${row}`)) {
      col++
      if (col > Math.ceil(Math.sqrt(state.nodes.length))) {
        col = 0
        row++
      }
    }
    
    return {
      x: col * gridSize + 100,
      y: row * gridSize + 100
    }
  }

  const tryAutoConnect = (newNode: Node) => {
    if (!state.selectedNodeId) return

    const sourceNode = state.nodes.find(n => n.id === state.selectedNodeId)
    if (!sourceNode) return

    const hasDownstreamConnections = state.edges.some(edge => edge.source === sourceNode.id)
    if (hasDownstreamConnections) return

    const newEdge: Edge = {
      id: nanoid(),
      source: sourceNode.id,
      target: newNode.id,
      sourceHandle: `${sourceNode.id}-output`,
      targetHandle: `${newNode.id}-input`,
      type: 'smoothstep',
      animated: true,
      markerEnd: MarkerType.ArrowClosed,
      style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' }
    }

    state.edges.push(newEdge)
  }

  // Layout utilities
  const applySmartLayout = () => {
    if (state.nodes.length === 0) return

    const rootNodes = state.nodes.filter(node => 
      !state.edges.some(edge => edge.target === node.id)
    )

    if (rootNodes.length === 1) {
      // Linear layout
      applyLinearLayout()
    } else {
      // Hierarchical layout
      applyHierarchicalLayout()
    }

    nextTick(() => {
      flowInstance.value?.fitView({ padding: 0.2, duration: 500 })
    })
  }

  const applyLinearLayout = () => {
    const sortedNodes = topologicalSort()
    
    sortedNodes.forEach((nodeId, index) => {
      const node = state.nodes.find(n => n.id === nodeId)
      if (node) {
        node.position = {
          x: 100,
          y: index * 250 + 100
        }
      }
    })
  }

  const applyHierarchicalLayout = () => {
    const layers = new Map<number, string[]>()
    
    const assignLayer = (nodeId: string, layer: number) => {
      if (!layers.has(layer)) layers.set(layer, [])
      if (!layers.get(layer)!.includes(nodeId)) {
        layers.get(layer)!.push(nodeId)
        
        // Process children
        state.edges
          .filter(edge => edge.source === nodeId)
          .forEach(edge => assignLayer(edge.target, layer + 1))
      }
    }

    // Start with root nodes
    const rootNodes = state.nodes.filter(node => 
      !state.edges.some(edge => edge.target === node.id)
    )
    rootNodes.forEach(node => assignLayer(node.id, 0))

    // Position nodes by layer
    Array.from(layers.entries()).forEach(([layer, nodeIds]) => {
      nodeIds.forEach((nodeId, index) => {
        const node = state.nodes.find(n => n.id === nodeId)
        if (node) {
          node.position = {
            x: layer * 350 + 100,
            y: index * 200 + 100
          }
        }
      })
    })
  }

  const topologicalSort = (): string[] => {
    const visited = new Set<string>()
    const order: string[] = []
    
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)
      
      // Visit dependencies first
      state.edges
        .filter(e => e.target === nodeId)
        .forEach(edge => visit(edge.source))
      
      order.push(nodeId)
    }

    // Start with root nodes
    state.nodes
      .filter(node => !state.edges.some(edge => edge.target === node.id))
      .forEach(node => visit(node.id))

    return order
  }

  // Viewport utilities
  const focusOnNode = (nodeId: string) => {
    const node = state.nodes.find(n => n.id === nodeId)
    if (!node || !flowInstance.value) return

    clearAllSelections()
    updateNodeState(nodeId, { isSelected: true })
    state.selectedNodeId = nodeId

    flowInstance.value.setCenter(
      node.position.x + 150,
      node.position.y + 100,
      { duration: 500, zoom: Math.max(flowInstance.value.getViewport().zoom, 0.8) }
    )
  }

  const focusOnAllNodes = () => {
    if (!flowInstance.value) return
    flowInstance.value.fitView({ padding: 0.1, duration: 500 })
  }

  // Cleanup
  onUnmounted(() => {
    nodeStates.clear()
    flowInstance.value = null
    vueFlowComposable = null
  })

  return {
    // State
    state,
    nodeStates,
    flowInstance,
    
    // Computed
    hasValidPipeline,
    selectedNode,
    
    // Interaction state
    isConnecting,
    connectingFrom,
    connectingFromHandle,
    isDragging,
    potentialTargets,
    
    // Handlers
    handlers,
    
    // Node management
    addNode,
    removeNode,
    updateNodeState,
    clearAllSelections,
    
    // Connection management
    clearConnectionState,
    startConnection,
    completeConnection,
    handleHandleClick,
    
    // Layout
    applySmartLayout,
    
    // Viewport
    focusOnNode,
    focusOnAllNodes,
    
    // Utilities
    isValidConnection,
    initializeVueFlow
  }
} 