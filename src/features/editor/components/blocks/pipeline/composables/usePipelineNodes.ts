import { ref, computed, reactive, type Component } from 'vue'
import { nanoid } from 'nanoid'
import type { Node } from '@vue-flow/core'
import { 
  Database as DatabaseIcon,
  BarChart as BarChartIcon,
  Brain as BrainIcon,
  PieChart as PieChartIcon,
} from 'lucide-vue-next'

export interface NodeTemplate {
  id: string
  title: string
  description: string
  icon: Component
  code: string
  language: string
  category?: string
}

export interface NodeData {
  title: string
  code: string
  language: string
  status: 'idle' | 'running' | 'completed' | 'error'
  useSharedKernel?: boolean
  kernelName?: string
  serverID?: string
  sessionId?: string
  output?: any
  executionTime?: number
}

export function usePipelineNodes() {
  const templates = ref<NodeTemplate[]>([
    {
      id: 'data-load',
      title: 'Data Loading',
      description: 'Load data from CSV, JSON, or database',
      icon: DatabaseIcon,
      code: 'import pandas as pd\n\ndf = pd.read_csv("data.csv")\nprint(df.head())',
      language: 'python',
      category: 'data'
    },
    {
      id: 'data-analysis',
      title: 'Data Analysis',
      description: 'Basic data exploration and statistics',
      icon: BarChartIcon,
      code: 'import pandas as pd\nimport matplotlib.pyplot as plt\n\nprint(df.describe())\ndf.plot()\nplt.show()',
      language: 'python',
      category: 'analysis'
    },
    {
      id: 'ml-model',
      title: 'ML Model',
      description: 'Train a machine learning model',
      icon: BrainIcon,
      code: 'from sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LinearRegression\n\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)\nmodel = LinearRegression()\nmodel.fit(X_train, y_train)',
      language: 'python',
      category: 'ml'
    },
    {
      id: 'visualization',
      title: 'Visualization',
      description: 'Create charts and plots',
      icon: PieChartIcon,
      code: 'import matplotlib.pyplot as plt\nimport seaborn as sns\n\nplt.figure(figsize=(10, 6))\nsns.scatterplot(data=df, x="x", y="y")\nplt.title("My Chart")\nplt.show()',
      language: 'python',
      category: 'visualization'
    }
  ])

  const focusedNodeId = ref<string | null>(null)
  const nodeCounter = ref(0)

  // Node state management
  const nodeStates = reactive(new Map<string, {
    isHovered: boolean
    isDragging: boolean
    isSelected: boolean
    isExecuting: boolean
    isFocused: boolean
  }>())

  // Computed properties
  const templatesByCategory = computed(() => {
    const categories = new Map<string, NodeTemplate[]>()
    
    templates.value.forEach(template => {
      const category = template.category || 'general'
      if (!categories.has(category)) {
        categories.set(category, [])
      }
      categories.get(category)!.push(template)
    })
    
    return categories
  })

  const focusedNode = computed(() => {
    return focusedNodeId.value
  })

  // Node factory
  const createNode = (template?: NodeTemplate, position?: { x: number; y: number }): Node => {
    nodeCounter.value++
    
    const nodeData: NodeData = template ? {
      title: template.title,
      code: template.code,
      language: template.language,
      status: 'idle'
    } : {
      title: `Code Block ${nodeCounter.value}`,
      code: '',
      language: 'python',
      status: 'idle'
    }

    return {
      id: nanoid(),
      type: 'codeblock',
      position: position || { x: 100, y: 100 },
      data: nodeData
    }
  }

  // Create node from template
  const createFromTemplate = (templateId: string, position?: { x: number; y: number }): Node | null => {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return null
    
    return createNode(template, position)
  }

  // Update node state
  const updateNodeState = (nodeId: string, updates: Partial<{
    isHovered: boolean
    isDragging: boolean
    isSelected: boolean
    isExecuting: boolean
    isFocused: boolean
  }>) => {
    const currentState = nodeStates.get(nodeId) || {
      isHovered: false,
      isDragging: false,
      isSelected: false,
      isExecuting: false,
      isFocused: false
    }
    nodeStates.set(nodeId, { ...currentState, ...updates })
  }

  // Clear all selections
  const clearAllSelections = (nodes: Node[]) => {
    nodes.forEach(node => {
      updateNodeState(node.id, { isSelected: false, isFocused: false })
    })
    focusedNodeId.value = null
  }

  // Focus on node
  const focusOnNode = (nodeId: string, nodes: Node[]) => {
    clearAllSelections(nodes)
    updateNodeState(nodeId, { isSelected: true, isFocused: true })
    focusedNodeId.value = nodeId
  }

  // Navigate between nodes
  const navigateToNextNode = (nodes: Node[]) => {
    if (nodes.length === 0) return null

    const currentIndex = focusedNodeId.value ? 
      nodes.findIndex(n => n.id === focusedNodeId.value) : -1
    const nextIndex = (currentIndex + 1) % nodes.length
    
    const nextNodeId = nodes[nextIndex].id
    focusOnNode(nextNodeId, nodes)
    return nextNodeId
  }

  const navigateToPreviousNode = (nodes: Node[]) => {
    if (nodes.length === 0) return null

    const currentIndex = focusedNodeId.value ? 
      nodes.findIndex(n => n.id === focusedNodeId.value) : 0
    const prevIndex = currentIndex <= 0 ? nodes.length - 1 : currentIndex - 1
    
    const prevNodeId = nodes[prevIndex].id
    focusOnNode(prevNodeId, nodes)
    return prevNodeId
  }

  const navigateToFirstNode = (nodes: Node[]) => {
    if (nodes.length === 0) return null
    
    const firstNodeId = nodes[0].id
    focusOnNode(firstNodeId, nodes)
    return firstNodeId
  }

  const navigateToLastNode = (nodes: Node[]) => {
    if (nodes.length === 0) return null
    
    const lastNodeId = nodes[nodes.length - 1].id
    focusOnNode(lastNodeId, nodes)
    return lastNodeId
  }

  // Duplicate node
  const duplicateNode = (node: Node): Node => {
    const duplicated = createNode(undefined, {
      x: node.position.x + 50,
      y: node.position.y + 50
    })
    
    duplicated.data = {
      ...node.data,
      title: `${node.data.title} (Copy)`,
      status: 'idle',
      output: null,
      executionTime: undefined
    }
    
    return duplicated
  }

  // Get node preview text
  const getNodePreview = (code: string): string => {
    if (!code) return '# Add your code here'
    
    const lines = code.split('\n')
    const preview = lines.slice(0, 3).join('\n')
    return lines.length > 3 ? `${preview}\n...` : preview
  }

  // Get execution time display
  const getExecutionTime = (data: NodeData): string => {
    return data.executionTime ? `${data.executionTime}ms` : 'N/A'
  }

  // Get node status class
  const getNodeStatusClass = (status: NodeData['status']) => ({
    'status-idle': status === 'idle',
    'status-running': status === 'running',
    'status-completed': status === 'completed',
    'status-error': status === 'error'
  })

  // Find optimal position for new node
  const findOptimalPosition = (
    existingNodes: Node[],
    selectedNodeId?: string | null
  ): { x: number; y: number } => {
    if (existingNodes.length === 0) {
      return { x: 100, y: 100 }
    }

    // Try to position relative to selected node
    if (selectedNodeId) {
      const selectedNode = existingNodes.find(n => n.id === selectedNodeId)
      if (selectedNode) {
        return {
          x: selectedNode.position.x,
          y: selectedNode.position.y + 250
        }
      }
    }

    // Find empty space in grid
    const gridSize = 350
    const occupiedPositions = new Set(
      existingNodes.map(n => 
        `${Math.floor(n.position.x/gridSize)},${Math.floor(n.position.y/gridSize)}`
      )
    )
    
    let col = 0, row = 0
    while (occupiedPositions.has(`${col},${row}`)) {
      col++
      if (col > Math.ceil(Math.sqrt(existingNodes.length))) {
        col = 0
        row++
      }
    }
    
    return {
      x: col * gridSize + 100,
      y: row * gridSize + 100
    }
  }

  // Add custom template
  const addTemplate = (template: Omit<NodeTemplate, 'id'>) => {
    const newTemplate: NodeTemplate = {
      ...template,
      id: nanoid()
    }
    templates.value.push(newTemplate)
    return newTemplate
  }

  // Remove template
  const removeTemplate = (templateId: string) => {
    const index = templates.value.findIndex(t => t.id === templateId)
    if (index !== -1) {
      templates.value.splice(index, 1)
    }
  }

  // Keyboard navigation handler
  const handleKeydown = (event: KeyboardEvent, nodes: Node[]) => {
    if (event.ctrlKey || event.metaKey) return // Let parent handle these
    
    switch (event.key) {
      case 'Tab':
        event.preventDefault()
        if (event.shiftKey) {
          navigateToPreviousNode(nodes)
        } else {
          navigateToNextNode(nodes)
        }
        break
      case 'Home':
        event.preventDefault()
        navigateToFirstNode(nodes)
        break
      case 'End':
        event.preventDefault()
        navigateToLastNode(nodes)
        break
    }
  }

  // Cleanup
  const cleanup = () => {
    nodeStates.clear()
    focusedNodeId.value = null
    nodeCounter.value = 0
  }

  return {
    // State
    templates,
    focusedNodeId,
    nodeStates,
    
    // Computed
    templatesByCategory,
    focusedNode,
    
    // Node creation
    createNode,
    createFromTemplate,
    duplicateNode,
    
    // Node state management
    updateNodeState,
    clearAllSelections,
    focusOnNode,
    
    // Navigation
    navigateToNextNode,
    navigateToPreviousNode,
    navigateToFirstNode,
    navigateToLastNode,
    
    // Utilities
    getNodePreview,
    getExecutionTime,
    getNodeStatusClass,
    findOptimalPosition,
    
    // Template management
    addTemplate,
    removeTemplate,
    
    // Event handlers
    handleKeydown,
    
    // Cleanup
    cleanup
  }
} 