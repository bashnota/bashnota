<template>
  <NodeViewWrapper 
    class="pipeline-container" 
    :class="[
      { 'pipeline-focused': selected },
      fullscreenClass
    ]"
  >
    <div ref="containerRef" class="pipeline-wrapper">
    <PipelineHeader
      v-model:title="title"
      :is-edit-mode="isEditMode"
      :is-executing="isExecuting"
      :has-valid-pipeline="hasValidPipeline"
      :node-count="flowState.nodes.length"
      :is-fullscreen="isFullscreen"
      :execution-progress="executionProgress"
      :executed-nodes="executedNodes"
      :total-executable-nodes="totalExecutableNodes"
      :current-executing-node="currentExecutingNodeTitle"
      @title-blur="handleTitleUpdate"
      @toggle-edit="toggleEditMode"
      @add-node="handleAddNode"
      @show-templates="showTemplateSelector = true"
      @auto-layout="handleAutoLayout"
      @reset-outputs="handleResetAllOutputs"
      @show-settings="showKernelSettings = true"
      @execute="handleExecutePipeline"
      @cancel-execution="handleCancelExecution"
      @toggle-fullscreen="handleToggleFullscreen"
    />
    
    <div 
      class="pipeline-content" 
      :class="{ 'pipeline-executing': isExecuting }"
      @keydown="handleKeydown" 
      @contextmenu="(e) => handleContextMenu(e, 'pane')"
      tabindex="0"
      ref="contentRef"
    >
      <PipelineEmptyState 
        v-if="flowState.nodes.length === 0"
        @add-node="handleAddNode"
        @show-templates="showTemplateSelector = true"
      />

      <VueFlow
        v-else
        v-model:nodes="flowState.nodes"
        v-model:edges="flowState.edges"
        :class="{ 'vue-flow-readonly': !isEditMode }"
        @node-click="flowHandlers.onNodeClick"
        @edge-click="flowHandlers.onEdgeClick"
        @node-drag-start="flowHandlers.onNodeDragStart"
        @node-drag="flowHandlers.onNodeDrag"
        @node-drag-stop="flowHandlers.onNodeDragStop"
        @pane-ready="flowHandlers.onPaneReady"
        @viewport-change="handleViewportChange"
        @node-mouse-enter="e => updateNodeState(e.node.id, { isHovered: true })"
        @node-mouse-leave="e => updateNodeState(e.node.id, { isHovered: false })"
        :connection-mode="ConnectionMode.Loose"
        :snap-to-grid="true"
        :snap-grid="[20, 20]"
        :min-zoom="0.1"
        :max-zoom="4"
        :auto-connect="false"
        :elevate-edges-on-select="true"
        :fit-view-on-init="true"
        :prevent-scrolling="true"
        :delete-key-code="['Delete', 'Backspace']"
        :selection-key-code="null"
        :multi-selection-key-code="['Control', 'Meta']"
        :nodes-connectable="false"
        :default-edge-options="defaultEdgeOptions"
        :default-viewport="initialViewport"
      >
        <Background 
          pattern-color="hsl(var(--muted-foreground) / 0.3)" 
          :gap="20" 
          :size="1"
          variant="dots"
        />
        
        <MiniMap 
          :zoom-step="0.25"
          :pan-step="10"
          :node-stroke-width="3"
          :node-color="getNodeColor"
          position="bottom-right"
        />
        
        <Controls 
          position="bottom-left"
          :show-zoom="true"
          :show-fit-view="true"
          :show-interactive="true"
        />
        
        <!-- Connection line template -->
        <template #connection-line="{ sourceX, sourceY, targetX, targetY }">
          <path
            :d="`M${sourceX},${sourceY} C${sourceX},${targetY} ${targetX},${sourceY} ${targetX},${targetY}`"
            stroke="hsl(var(--primary))"
            stroke-width="2"
            fill="none"
            stroke-dasharray="5,5"
            class="animated-dash"
          />
        </template>
        
        <!-- Custom node template -->
        <template #node-codeblock="{ data, id }">
          <div @contextmenu="(e) => handleContextMenu(e, 'node', id)">
            <PipelineCodeNode
              :id="id"
              :data="data"
              :is-edit-mode="isEditMode"
              :node-state="nodeStates.get(id)"
              :is-potential-target="potentialTargets.includes(id)"
              :is-focused="focusedNodeId === id"
              @duplicate="handleDuplicateNode"
              @delete="handleDeleteNode"
              @handle-click="handleHandleClick"
            />
          </div>
        </template>
      </VueFlow>
      
      <!-- Navigation Panel -->
      <PipelineNavigationPanel
        v-if="showNavigationPanel"
        :nodes="navigationNodes"
        :viewport-info="viewportInfo"
        :history-info="historyInfo"
        :visible-nodes-count="visibleNodesCount"
        @close="showNavigationPanel = false"
        @focus-all="handleFocusAll"
        @navigate-first="handleNavigateFirst"
        @navigate-previous="handleNavigatePrevious"
        @navigate-next="handleNavigateNext"
        @navigate-last="handleNavigateLast"
        @set-zoom="handleSetZoom"
        @undo-viewport="handleUndoViewport"
        @redo-viewport="handleRedoViewport"
        @toggle-tracking="handleToggleTracking"
      />
      
      <!-- Quick Navigation Button -->
      <div v-if="flowState.nodes.length > 1 && !showNavigationPanel" class="quick-nav-overlay">
        <button @click="showNavigationPanel = true" class="quick-nav-btn" title="Show Navigator (N)">
          <NavigationIcon class="w-4 h-4" />
        </button>
        <div class="quick-nav-hint">Press N for navigation</div>
            </div>

      <!-- Viewport Hints -->
      <div v-if="showViewportHint" class="viewport-hint">
        <span v-if="isViewportTracking">Viewport tracking enabled</span>
        <span v-else>Viewport tracking disabled</span>
                </div>
      
      <!-- Instructional Overlay -->
      <div v-if="isEditMode && flowState.nodes.length > 1 && !hasMadeConnection && !isConnecting" class="instructional-overlay">
        <MousePointerClickIcon class="w-4 h-4" />
        <span>Click an output handle to start connecting. Supports both one-to-many and many-to-one connections.</span>
      </div>
      
      <!-- Connection Active Overlay -->
      <div v-if="isConnecting" class="instructional-overlay connecting-overlay">
        <MousePointerClickIcon class="w-4 h-4" />
        <span>Click any input to connect. Multiple connections to/from nodes are allowed.</span>
        <button @click="clearConnectionState" class="cancel-connection-btn">Finish</button>
      </div>
      
      <!-- Floating Add Button -->
      <div v-if="isEditMode && flowState.nodes.length > 0" class="floating-add-btn" @click="handleAddNode">
        <PlusIcon class="w-5 h-5" />
      </div>
    </div>
    
    <!-- Modals -->
    <PipelineTemplateSelector
      v-if="showTemplateSelector"
      :templates="templates"
      @close="showTemplateSelector = false"
      @select="handleTemplateSelect"
    />
    
    <PipelineCodeEditorModal
      v-if="selectedNode && showCodeEditor"
      :node-id="selectedNode.id"
      v-model:node-data="selectedNode.data"
      :nota-id="notaId"
      :is-executing="selectedNode.data.status === 'running'"
      :available-kernels="availableKernels"
      @close="handleCloseCodeEditor"
      @save="handleSaveCodeBlock"
      @delete="handleDeleteCodeBlock"
      @run-node="handleRunNode"
      @reset-all-outputs="handleResetAllOutputs"
    />
    
    <PipelineSettingsModal
      v-if="showKernelSettings"
      :settings="pipelineSettings"
      :available-kernels="availableKernels"
      @update:settings="updatePipelineSettings"
      @close="showKernelSettings = false"
      @apply="handleApplyKernelSettings"
    />
    
    <!-- Context Menu -->
    <PipelineContextMenu
      :visible="contextMenu.visible"
      :position="contextMenu.position"
      :actions="contextMenuActions"
      @close="closeContextMenu"
    />
    
    <!-- Toast Notifications -->
    <PipelineToast
      :toasts="toasts"
      :nodes="toastNodes"
      @dismiss="dismissToast"
    />
    </div>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { 
  VueFlow, 
  ConnectionMode, 
  MarkerType, 
  type Node,
  type Edge
} from '@vue-flow/core'
import { 
  type PipelineNodeData, 
  type PipelineNode, 
  type PipelineEdge, 
  type PipelineSettings, 
  type PipelineExecutionSummary,
  type PipelineNodeState,
  type PipelineError
} from '@/features/editor/types/pipeline'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import { 
  Plus as PlusIcon,
  Loader as LoaderIcon,
  MousePointerClick as MousePointerClickIcon,
  Navigation as NavigationIcon,
  Edit as EditIcon,
  Play as PlayIcon,
  Copy as CopyIcon,
  Trash2 as DeleteIcon,
  Eye as ViewIcon,
  Layout as LayoutIcon,
  Settings as SettingsIcon,
  Square as StopIcon
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { useJupyterServers } from '@/features/jupyter/composables/useJupyterServers'

// Import composables
import { usePipelineFlow } from './composables/usePipelineFlow'
import { usePipelineFullscreen } from './composables/usePipelineFullscreen'
import { usePipelineViewport } from './composables/usePipelineViewport'
import { usePipelineNodes } from './composables/usePipelineNodes'

// Import child components
import PipelineHeader from './components/PipelineHeader.vue'
import PipelineEmptyState from './components/PipelineEmptyState.vue'
import PipelineTemplateSelector from './components/PipelineTemplateSelector.vue'
import PipelineCodeEditorModal from './components/PipelineCodeEditorModal.vue'
import PipelineSettingsModal from './components/PipelineSettingsModal.vue'
import PipelineNavigationPanel from './components/PipelineNavigationPanel.vue'
import PipelineCodeNode from './components/PipelineCodeNode.vue'
import PipelineContextMenu from './components/PipelineContextMenu.vue'
import PipelineToast, { type PipelineToast as ToastType } from './components/PipelineToast.vue'
import type { NodeViewProps } from '@tiptap/vue-3'
import type { PipelineContextMenuAction } from '../../../types/pipeline'

const props = defineProps<NodeViewProps & {
  node: {
    attrs: {
      id: string
      nodes: PipelineNode[]
      edges: PipelineEdge[]
      viewport: { x: number; y: number; zoom: number }
      title: string
      kernelMode?: 'shared' | 'isolated' | 'mixed'
      sharedKernelName?: string
      executionOrder?: 'topological' | 'sequential' | 'parallel'
      stopOnError?: boolean
      autoSave?: boolean
      hasMadeConnection?: boolean
      isEditMode?: boolean
    }
  }
}>()

// External dependencies
const router = useRouter()
const codeExecutionStore = useCodeExecutionStore()
const jupyterStore = useJupyterStore()
const { servers } = useJupyterServers()
const notaId = computed(() => router.currentRoute.value.params.id as string)

// DOM references
const containerRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)

// Core state
const title = ref(props.node.attrs.title || 'Pipeline')
const isEditMode = ref(props.node.attrs.isEditMode ?? true)
const isExecuting = ref(false)
const executedNodes = ref(0)
const hasMadeConnection = ref(props.node.attrs.hasMadeConnection || false)

// Execution state tracking
const currentExecutingNode = ref<string | null>(null)
const executionStartTime = ref<number | null>(null)
const executionSummary = reactive<PipelineExecutionSummary>({
  total: 0,
  executed: 0,
  skipped: 0,
  errors: 0
})

// Error tracking
const pipelineErrors = ref<PipelineError[]>([])

// Toast notifications
const toasts = ref<ToastType[]>([])

// Debounced save function
const saveTimeoutId = ref<number | null>(null)
const debouncedSave = (delay = 300) => {
  if (saveTimeoutId.value) {
    clearTimeout(saveTimeoutId.value)
  }
  saveTimeoutId.value = window.setTimeout(() => {
    saveToAttributes()
    saveTimeoutId.value = null
  }, delay)
}

// Error handling utilities
const addPipelineError = (error: Omit<PipelineError, 'timestamp'>) => {
  const pipelineError: PipelineError = {
    ...error,
    timestamp: Date.now()
  }
  pipelineErrors.value.unshift(pipelineError)
  
  // Keep only last 50 errors to prevent memory issues
  if (pipelineErrors.value.length > 50) {
    pipelineErrors.value = pipelineErrors.value.slice(0, 50)
  }
  
  // Show toast for execution errors
  if (error.type === 'execution') {
    showToast({
      type: 'error',
      title: 'Execution Error',
      message: error.message,
      nodeId: error.nodeId,
      dismissible: true,
      duration: 8000
    })
  }
  
  console.error('Pipeline Error:', pipelineError)
}

const clearPipelineErrors = (nodeId?: string) => {
  if (nodeId) {
    pipelineErrors.value = pipelineErrors.value.filter(error => error.nodeId !== nodeId)
  } else {
    pipelineErrors.value = []
  }
}

// Toast utilities
const showToast = (toast: Omit<ToastType, 'id' | 'timestamp'>) => {
  const newToast: ToastType = {
    ...toast,
    id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now()
  }
  
  toasts.value.unshift(newToast)
  
  // Auto-dismiss if duration is set
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      dismissToast(newToast.id)
    }, newToast.duration)
  }
  
  // Keep only last 10 toasts
  if (toasts.value.length > 10) {
    toasts.value = toasts.value.slice(0, 10)
  }
}

const dismissToast = (id: string) => {
  const index = toasts.value.findIndex(toast => toast.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// Modal states
const showCodeEditor = ref(false)
const showKernelSettings = ref(false)
const showTemplateSelector = ref(false)
const showNavigationPanel = ref(false)

// Context menu state
const contextMenu = reactive({
  visible: false,
  position: { x: 0, y: 0 },
  target: null as { type: 'node' | 'pane'; nodeId?: string } | null
})

// Context menu actions
const getNodeContextActions = (nodeId: string): PipelineContextMenuAction[] => {
  const node = flowState.nodes.find(n => n.id === nodeId)
  if (!node) return []
  
  const hasCode = node.data?.code && node.data.code.trim().length > 0
  const isRunning = node.data?.status === 'running'
  
  return [
    {
      id: 'edit-code',
      label: 'Edit Code',
      icon: EditIcon,
      shortcut: 'Enter',
      action: () => {
        flowState.selectedNodeId = nodeId
        showCodeEditor.value = true
      }
    },
    {
      id: 'run-node',
      label: isRunning ? 'Stop Execution' : 'Run Node',
      icon: isRunning ? StopIcon : PlayIcon,
      shortcut: 'Ctrl+Enter',
      disabled: !hasCode && !isRunning,
      action: () => {
        if (isRunning) {
          // TODO: Implement node-specific cancellation
          console.log('Node-specific cancellation not yet implemented')
        } else {
          flowState.selectedNodeId = nodeId
          handleRunNode()
        }
      }
    },
    {
      id: 'view-output',
      label: 'View Output',
      icon: ViewIcon,
      disabled: !node.data?.output,
      action: () => {
        // TODO: Implement output viewer
        console.log('Output viewer not yet implemented')
      }
    },
    {
      id: 'separator-1',
      label: '',
      separator: true,
      action: () => {}
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: CopyIcon,
      shortcut: 'Ctrl+D',
      action: () => handleDuplicateNode(nodeId)
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: DeleteIcon,
      shortcut: 'Delete',
      action: () => handleDeleteNode(nodeId)
    }
  ]
}

const getPaneContextActions = (): PipelineContextMenuAction[] => {
  return [
    {
      id: 'add-node',
      label: 'Add Node',
      icon: PlusIcon,
      shortcut: 'Ctrl+N',
      disabled: !isEditMode.value,
      action: () => handleAddNode()
    },
    {
      id: 'show-templates',
      label: 'Insert Template',
      icon: LayoutIcon,
      disabled: !isEditMode.value,
      action: () => {
        showTemplateSelector.value = true
      }
    },
    {
      id: 'separator-1',
      label: '',
      separator: true,
      action: () => {}
    },
    {
      id: 'auto-layout',
      label: 'Auto Layout',
      icon: LayoutIcon,
      shortcut: 'Ctrl+L',
      disabled: !isEditMode.value || flowState.nodes.length < 2,
      action: () => handleAutoLayout()
    },
    {
      id: 'fit-view',
      label: 'Fit to View',
      shortcut: 'Ctrl+F',
      action: () => handleFocusAll()
    },
    {
      id: 'separator-2',
      label: '',
      separator: true,
      action: () => {}
    },
    {
      id: 'execute-pipeline',
      label: isExecuting.value ? 'Cancel Execution' : 'Execute Pipeline',
      icon: isExecuting.value ? StopIcon : PlayIcon,
      shortcut: 'Ctrl+Enter',
      disabled: !hasValidPipeline.value && !isExecuting.value,
      action: () => {
        if (isExecuting.value) {
          handleCancelExecution()
        } else {
          handleExecutePipeline()
        }
      }
    },
    {
      id: 'reset-outputs',
      label: 'Reset All Outputs',
      disabled: flowState.nodes.length === 0,
      action: () => handleResetAllOutputs()
    },
    {
      id: 'pipeline-settings',
      label: 'Pipeline Settings',
      icon: SettingsIcon,
      action: () => {
        showKernelSettings.value = true
      }
    }
  ]
}

const contextMenuActions = computed((): PipelineContextMenuAction[] => {
  if (!contextMenu.target) return []
  
  if (contextMenu.target.type === 'node' && contextMenu.target.nodeId) {
    return getNodeContextActions(contextMenu.target.nodeId)
  } else {
    return getPaneContextActions()
  }
})

// Pipeline settings
const pipelineSettings = reactive<PipelineSettings>({
  kernelMode: props.node.attrs.kernelMode || 'mixed',
  sharedKernelName: props.node.attrs.sharedKernelName || '',
  executionOrder: props.node.attrs.executionOrder || 'topological',
  stopOnError: props.node.attrs.stopOnError ?? true,
  autoSave: props.node.attrs.autoSave ?? false,
})

const availableKernels = computed(() => {
  // Get all kernels from all available servers
  const allKernels: any[] = []
  for (const server of jupyterStore.jupyterServers) {
    const serverKey = `${server.ip}:${server.port}`
    const serverKernels = jupyterStore.kernels[serverKey] || []
    allKernels.push(...serverKernels.map(k => ({
      ...k,
      serverInfo: `${server.name} (${server.ip}:${server.port})`
    })))
  }
  return allKernels
})

// Computed property for toast nodes (transform Vue Flow nodes to expected format)
const toastNodes = computed(() => {
  return flowState.nodes.map(node => ({
    id: node.id,
    data: { title: node.data?.title }
  }))
})

// Computed property for navigation panel nodes (ensure data property is present)
const navigationNodes = computed(() => {
  return flowState.nodes.map(node => ({
    ...node,
    data: node.data || { title: 'Untitled' }
  }))
})

// Initialize composables
const initialViewport = props.node.attrs.viewport

// Convert PipelineNode[] to Vue Flow Node[] format
const convertToVueFlowNodes = (pipelineNodes: PipelineNode[]): Node[] => {
  return pipelineNodes.map(node => ({
    id: node.id,
    type: node.type || 'codeblock',
    position: node.position,
    data: node.data || {
      id: node.id,
      title: 'Code Block',
      code: '',
      status: 'idle'
    },
    selected: node.selected,
    dragging: node.dragging
  }))
}

// Flow composable
const {
  state: flowState,
  handlers: flowHandlers,
  nodeStates,
  nodeConnections,
  flowInstance,
  hasValidPipeline,
  selectedNode,
  isConnecting,
  potentialTargets,
  addNode,
  removeNode,
  updateNodeState,
  clearAllSelections,
  clearConnectionState,
  handleHandleClick,
  applySmartLayout,
  focusOnNode,
  focusOnAllNodes,
  isValidConnection,
  getNodeConnectionInfo,
  getNodeOutputTargets,
  getNodeInputSources,
  canNodeAcceptMoreOutputs,
  canNodeAcceptInput,
  getNodeDescendants,
  getNodeAncestors
} = usePipelineFlow({
  nodes: convertToVueFlowNodes(props.node.attrs.nodes || []),
  edges: props.node.attrs.edges || [],
  isEditMode: isEditMode.value,
  isExecuting: false,
  selectedNodeId: null,
  viewport: initialViewport
})

// Fullscreen composable
const {
  isFullscreen,
  fullscreenClass,
  toggleFullscreen
} = usePipelineFullscreen(containerRef)

// Viewport composable
const {
  isTracking: isViewportTracking,
  showHint: showViewportHint,
  canUndo,
  canRedo,
  nodeVisibility,
  updateNodeVisibility,
  getVisibleNodesCount,
  handleViewportChange: onViewportChange,
  undoViewport,
  redoViewport,
  setZoomLevel,
  fitToContent,
  toggleTracking
} = usePipelineViewport(flowInstance, initialViewport)

// Node management composable
const {
  templates,
  focusedNodeId,
  createNode,
  createFromTemplate,
  duplicateNode,
  navigateToNextNode,
  navigateToFirstNode,
  navigateToLastNode,
  navigateToPreviousNode,
  getNodePreview,
  getExecutionTime,
  getNodeStatusClass,
  findOptimalPosition
} = usePipelineNodes()

// Computed properties
const totalExecutableNodes = computed(() => 
  flowState.nodes.filter(n => n.data?.code && n.data.code.trim().length > 0).length
)

const executionProgress = computed(() => 
  totalExecutableNodes.value > 0 ? (executedNodes.value / totalExecutableNodes.value) * 100 : 0
)

const currentExecutingNodeTitle = computed(() => {
  if (!currentExecutingNode.value) return null
  const node = flowState.nodes.find(n => n.id === currentExecutingNode.value)
  return node?.data?.title || currentExecutingNode.value
})

const defaultEdgeOptions = computed(() => ({
  type: 'smoothstep',
  animated: true,
  markerEnd: MarkerType.ArrowClosed,
  style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' }
}))

const viewportInfo = computed(() => ({
  zoom: Math.round((flowInstance.value?.getViewport()?.zoom || 1) * 100),
  nodes: flowState.nodes.length,
  visible: getVisibleNodesCount()
}))

const historyInfo = computed(() => ({
  canUndo: canUndo.value,
  canRedo: canRedo.value
}))

const visibleNodesCount = computed(() => getVisibleNodesCount())

// Connection tracking helpers
const logConnectionInfo = (nodeId: string) => {
  const info = getNodeConnectionInfo(nodeId)
  console.log(`Node ${nodeId} connection info:`, {
    inputs: info.inputs.length,
    outputs: info.outputs.length,
    hasMultipleOutputs: info.hasMultipleOutputs,
    hasMultipleInputs: info.hasMultipleInputs,
    outputTargets: getNodeOutputTargets(nodeId),
    inputSources: getNodeInputSources(nodeId),
    descendants: getNodeDescendants(nodeId),
    ancestors: getNodeAncestors(nodeId)
  })
}

// Event handlers
const handleTitleUpdate = () => {
  saveToAttributes()
}

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
  flowState.isEditMode = isEditMode.value
  saveToAttributes()
}

// Context menu handlers
const handleContextMenu = (event: MouseEvent, type: 'node' | 'pane', nodeId?: string) => {
  event.preventDefault()
  event.stopPropagation()
  
  contextMenu.visible = true
  contextMenu.position = { x: event.clientX, y: event.clientY }
  contextMenu.target = { type, nodeId }
}

const closeContextMenu = () => {
  contextMenu.visible = false
  contextMenu.target = null
}

const handleToggleFullscreen = () => {
  // Ensure container is available before toggling fullscreen
  if (!containerRef.value) {
    nextTick(() => {
      if (containerRef.value) {
        toggleFullscreen()
      } else {
        console.warn('Container ref not available for fullscreen')
      }
    })
  } else {
    toggleFullscreen()
  }
}

const handleAddNode = () => {
  if (!isEditMode.value) return
  
  const position = findOptimalPosition(flowState.nodes, flowState.selectedNodeId)
  const newNode = createNode(undefined, position)
  addNode(newNode.data)
  
  nextTick(() => {
    fitToContent(0.2)
  })
}

const handleAutoLayout = () => {
  applySmartLayout()
}

const handleTemplateSelect = (template: any) => {
  const position = findOptimalPosition(flowState.nodes, flowState.selectedNodeId)
  const newNode = createFromTemplate(template.id, position)
  if (newNode) {
    addNode(newNode.data)
  }
  showTemplateSelector.value = false
  
  nextTick(() => {
    fitToContent(0.2)
  })
}

const handleDuplicateNode = (nodeId: string) => {
  const node = flowState.nodes.find(n => n.id === nodeId)
  if (node) {
    const duplicated = duplicateNode(node)
    addNode(duplicated.data)
  }
}

const handleDeleteNode = (nodeId: string) => {
  removeNode(nodeId)
  if (flowState.selectedNodeId === nodeId) {
    showCodeEditor.value = false
  }
}

const handleCloseCodeEditor = () => {
  showCodeEditor.value = false
  clearAllSelections()
}

const handleSaveCodeBlock = () => {
  showCodeEditor.value = false
  saveToAttributes()
}

const handleDeleteCodeBlock = () => {
  if (selectedNode.value) {
    handleDeleteNode(selectedNode.value.id)
  }
  showCodeEditor.value = false
}

const handleResetAllOutputs = () => {
  console.log('Resetting outputs for all pipeline nodes')
  
  // Reset output and status for all nodes
  flowState.nodes.forEach(node => {
    Object.assign(node.data, {
      output: null,
      status: null,
      executionTime: null
    })
  })
  
  // Reset execution state
  executedNodes.value = 0
  currentExecutingNode.value = null
  executionStartTime.value = null
  
  // Reset execution summary
  executionSummary.total = 0
  executionSummary.executed = 0
  executionSummary.skipped = 0
  executionSummary.errors = 0
  
  // Save changes
  saveToAttributes()
  
  console.log(`Reset outputs for ${flowState.nodes.length} nodes`)
}

const handleRunNode = async () => {
  if (!selectedNode.value) return
  
  // Ensure server availability
  const serversAvailable = await ensureServerAvailability()
  if (!serversAvailable) {
    console.error('Cannot execute node: No Jupyter servers available')
    return
  }
  
  const node = selectedNode.value
  console.log(`Executing single node ${node.id}: ${node.data.title || 'Untitled'}`)
  
  // Ensure reactive updates
  Object.assign(node.data, { status: 'running' })
  updateNodeState(node.id, { isExecuting: true })
  
  try {
    const startTime = Date.now()
    await executeCodeBlock(node)
    // Ensure reactive updates
    Object.assign(node.data, {
      status: 'completed',
      executionTime: Date.now() - startTime
    })
            console.log(`Node ${node.id} completed successfully in ${node.data.executionTime}ms`)
        
        // Show success toast
        showToast({
          type: 'success',
          title: 'Node Executed',
          message: `Completed in ${node.data.executionTime}ms`,
          nodeId: node.id,
          dismissible: true,
          duration: 3000
        })
      } catch (error) {
      // Ensure reactive updates
      Object.assign(node.data, { status: 'error' })
      
      // Track the error
      addPipelineError({
        nodeId: node.id,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: 'execution'
      })
    } finally {
    updateNodeState(node.id, { isExecuting: false })
    saveToAttributes()
  }
}

const handleApplyKernelSettings = () => {
  if (pipelineSettings.kernelMode === 'shared') {
    flowState.nodes.forEach(node => {
      // Ensure reactive updates
      Object.assign(node.data, {
        useSharedKernel: true,
        kernelName: pipelineSettings.sharedKernelName
      })
    })
  }
  saveToAttributes()
  showKernelSettings.value = false
}

const ensureServerAvailability = async (): Promise<boolean> => {
  // Check if we have any configured servers
  if (!jupyterStore.jupyterServers || jupyterStore.jupyterServers.length === 0) {
    console.error('No Jupyter servers configured for pipeline execution')
    return false
  }

  // For shared mode, try to ensure shared session
  if (pipelineSettings.kernelMode === 'shared') {
    try {
      if (!codeExecutionStore.sharedSessionMode) {
        await codeExecutionStore.toggleSharedSessionMode(notaId.value)
      }
      await codeExecutionStore.ensureSharedSession()
      return true
    } catch (error) {
      console.error('Failed to setup shared session:', error)
      return false
    }
  }

  // For other modes, check if we have at least one working server
  const serverResult = await jupyterStore.getFirstAvailableServer()
  if (!serverResult) {
    console.error('No available Jupyter servers with kernels found')
    return false
  }

  return true
}

const handleExecutePipeline = async () => {
  if (!hasValidPipeline.value || isExecuting.value) return
  
  // Ensure server availability before starting
  const serversAvailable = await ensureServerAvailability()
  if (!serversAvailable) {
    console.error('Cannot execute pipeline: No Jupyter servers available')
    // TODO: Show user-friendly error message or server setup dialog
    return
  }
  
  // Initialize execution state
  isExecuting.value = true
  executedNodes.value = 0
  currentExecutingNode.value = null
  executionStartTime.value = Date.now()
  
  // Reset summary
  executionSummary.total = 0
  executionSummary.executed = 0
  executionSummary.skipped = 0
  executionSummary.errors = 0
  
  try {
    // Categorize nodes
    const allNodes = flowState.nodes
    const nodesWithCode = allNodes.filter(n => n.data?.code && n.data.code.trim().length > 0)
    const emptyNodes = allNodes.filter(n => !n.data?.code || n.data.code.trim().length === 0)
    
    // Update summary
    executionSummary.total = allNodes.length
    
    // Debug logging
    console.log('=== PIPELINE EXECUTION ANALYSIS ===')
    console.log(`Total nodes in pipeline: ${allNodes.length}`)
    console.log(`Nodes with code: ${nodesWithCode.length}`)
    console.log(`Empty nodes: ${emptyNodes.length}`)
    
    console.log('\nNodes with code:')
    nodesWithCode.forEach(n => {
      console.log(`  - ${n.id}: "${n.data?.title || 'Untitled'}" (${n.data?.code?.length || 0} chars)`)
    })
    
    console.log('\nEmpty nodes:')
    emptyNodes.forEach(n => {
      console.log(`  - ${n.id}: "${n.data?.title || 'Untitled'}" (empty)`)
    })
    
    // Execute based on the chosen execution order
    if (pipelineSettings.executionOrder === 'parallel') {
      await executeParallelWithDependencies(nodesWithCode, emptyNodes)
    } else {
      await executeSequential(nodesWithCode, emptyNodes)
    }
    
    const executionTime = Date.now() - (executionStartTime.value || 0)
    console.log('\n=== PIPELINE EXECUTION SUMMARY ===')
    console.log(`Execution mode: ${pipelineSettings.executionOrder}`)
    console.log(`Total nodes in pipeline: ${flowState.nodes.length}`)
    console.log(`Nodes executed: ${executionSummary.executed}`)
    console.log(`Nodes skipped: ${executionSummary.skipped}`)
    console.log(`Errors: ${executionSummary.errors}`)
    console.log(`Total execution time: ${executionTime}ms`)
    console.log(`Success rate: ${executionSummary.executed}/${nodesWithCode.length} executable nodes`)
    
    // Show completion toast
    if (executionSummary.errors === 0) {
      showToast({
        type: 'success',
        title: 'Pipeline Completed',
        message: `All ${executionSummary.executed} nodes executed successfully in ${executionTime}ms`,
        dismissible: true,
        duration: 5000
      })
    } else if (executionSummary.executed > 0) {
      showToast({
        type: 'warning',
        title: 'Pipeline Completed with Errors',
        message: `${executionSummary.executed} successful, ${executionSummary.errors} failed`,
        dismissible: true,
        duration: 6000
      })
    } else {
      showToast({
        type: 'error',
        title: 'Pipeline Failed',
        message: `All nodes failed to execute`,
        dismissible: true,
        duration: 8000
      })
    }
    
  } catch (error) {
    console.error('❌ Pipeline execution failed:', error)
  } finally {
    isExecuting.value = false
    currentExecutingNode.value = null
    saveToAttributes()
  }
}

// Sequential execution (original behavior for sequential and topological modes)
const executeSequential = async (nodesWithCode: any[], emptyNodes: any[]) => {
  const order = getExecutionOrder()
  console.log(`\nExecution order (${pipelineSettings.executionOrder}): ${order.length} nodes`)
  console.log('Order:', order)
  
  let processedNodes = 0
  
  for (const nodeId of order) {
    if (!isExecuting.value) break
    
    const node = flowState.nodes.find(n => n.id === nodeId)
    if (!node) {
      console.warn(`❌ Node ${nodeId} not found in flowState.nodes`)
      continue
    }
    
    processedNodes++
    const hasCode = node.data?.code && node.data.code.trim().length > 0
    
    console.log(`\n[${processedNodes}/${order.length}] Processing node ${nodeId}:`)
    console.log(`  Title: "${node.data?.title || 'Untitled'}"`)
    console.log(`  Has code: ${hasCode}`)
    console.log(`  Code length: ${node.data?.code?.length || 0} chars`)
    
    if (hasCode) {
      currentExecutingNode.value = nodeId
      console.log(`  ✅ EXECUTING: ${node.data.title || nodeId}`)
      // Ensure reactive updates
      Object.assign(node.data, { status: 'running' })
      updateNodeState(nodeId, { isExecuting: true })
      
      try {
        const startTime = Date.now()
        await executeCodeBlock(node)
        // Ensure reactive updates
        Object.assign(node.data, {
          status: 'completed',
          executionTime: Date.now() - startTime
        })
        executedNodes.value++
        executionSummary.executed++
        console.log(`  ✅ COMPLETED: ${node.data.title || nodeId} in ${node.data.executionTime}ms`)
      } catch (error) {
        // Ensure reactive updates
        Object.assign(node.data, { status: 'error' })
        executionSummary.errors++
        
        // Track the error
        addPipelineError({
          nodeId: nodeId,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          type: 'execution'
        })
        
        console.error(`  ❌ ERROR: ${node.data.title || nodeId}:`, error)
        if (pipelineSettings.stopOnError) {
          console.log('  🛑 Pipeline execution stopped due to error (stopOnError is enabled)')
          break
        }
      } finally {
        updateNodeState(nodeId, { isExecuting: false })
      }
    } else {
      executionSummary.skipped++
      console.log(`  ⏭️  SKIPPED: ${node.data.title || nodeId} (no code)`)
      // Set status to indicate it was processed but skipped (ensure reactive updates)
      Object.assign(node.data, { status: 'idle' })
    }
  }
}

// Parallel execution with dependency management
const executeParallelWithDependencies = async (nodesWithCode: any[], emptyNodes: any[]) => {
  console.log('\n🚀 Starting parallel execution with dependency management...')
  
  // Build dependency graph
  const dependencies = new Map<string, Set<string>>() // node -> dependencies
  const dependents = new Map<string, Set<string>>()   // node -> nodes that depend on it
  const nodeStatus = new Map<string, 'waiting' | 'ready' | 'running' | 'completed' | 'error' | 'skipped'>()
  
  // Initialize dependency maps
  flowState.nodes.forEach(node => {
    dependencies.set(node.id, new Set())
    dependents.set(node.id, new Set())
    
    // Determine initial status
    const hasCode = node.data?.code && node.data.code.trim().length > 0
    const initialStatus = hasCode ? 'waiting' : 'skipped'
    nodeStatus.set(node.id, initialStatus)
    
    // Update node data with initial queued status for visual feedback
    if (hasCode) {
      Object.assign(node.data, { status: 'queued' })
    }
  })
  
  // Build dependency relationships from edges
  flowState.edges.forEach(edge => {
    dependencies.get(edge.target)?.add(edge.source)
    dependents.get(edge.source)?.add(edge.target)
  })
  
  console.log('Dependency analysis:')
  dependencies.forEach((deps, nodeId) => {
    const node = flowState.nodes.find(n => n.id === nodeId)
    if (deps.size > 0) {
      console.log(`  ${node?.data?.title || nodeId} depends on: [${Array.from(deps).map(id => {
        const depNode = flowState.nodes.find(n => n.id === id)
        return depNode?.data?.title || id
      }).join(', ')}]`)
    }
  })
  
  // Track running promises
  const runningTasks = new Map<string, Promise<void>>()
  
  // Function to check if a node's dependencies are satisfied
  const areDependenciesSatisfied = (nodeId: string): boolean => {
    const deps = dependencies.get(nodeId) || new Set()
    for (const depId of deps) {
      const depStatus = nodeStatus.get(depId)
      if (depStatus !== 'completed' && depStatus !== 'skipped') {
        return false
      }
    }
    return true
  }
  
  // Function to find nodes ready to execute
  const findReadyNodes = (): string[] => {
    const ready: string[] = []
    nodeStatus.forEach((status, nodeId) => {
      if (status === 'waiting' && areDependenciesSatisfied(nodeId)) {
        ready.push(nodeId)
      }
    })
    return ready
  }
  
  // Function to execute a single node
  const executeNode = async (nodeId: string): Promise<void> => {
    const node = flowState.nodes.find(n => n.id === nodeId)
    if (!node) return
    
    const hasCode = node.data?.code && node.data.code.trim().length > 0
    
    if (!hasCode) {
      console.log(`⏭️  SKIPPING: ${node.data?.title || nodeId} (no code)`)
      nodeStatus.set(nodeId, 'skipped')
      Object.assign(node.data, { status: 'idle' })
      executionSummary.skipped++
      return
    }
    
    console.log(`🔄 EXECUTING: ${node.data?.title || nodeId}`)
    nodeStatus.set(nodeId, 'running')
    Object.assign(node.data, { status: 'running' })
    updateNodeState(nodeId, { isExecuting: true })
    
    try {
      const startTime = Date.now()
      await executeCodeBlock(node)
      
      // Success
      nodeStatus.set(nodeId, 'completed')
      Object.assign(node.data, {
        status: 'completed',
        executionTime: Date.now() - startTime
      })
      executedNodes.value++
      executionSummary.executed++
      console.log(`✅ COMPLETED: ${node.data?.title || nodeId} in ${node.data.executionTime}ms`)
      
    } catch (error) {
      // Error
      nodeStatus.set(nodeId, 'error')
      Object.assign(node.data, { status: 'error' })
      executionSummary.errors++
      
      // Track the error
      addPipelineError({
        nodeId: nodeId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: 'execution'
      })
      
      console.error(`❌ ERROR: ${node.data?.title || nodeId}:`, error)
      
      // If stopOnError is enabled, mark all dependent nodes as skipped
      if (pipelineSettings.stopOnError) {
        const affectedNodes = new Set<string>()
        const markDependentsAsSkipped = (nodeId: string) => {
          const deps = dependents.get(nodeId) || new Set()
          deps.forEach(depId => {
            if (!affectedNodes.has(depId) && nodeStatus.get(depId) === 'waiting') {
              affectedNodes.add(depId)
              nodeStatus.set(depId, 'skipped')
              const depNode = flowState.nodes.find(n => n.id === depId)
              if (depNode) {
                Object.assign(depNode.data, { status: 'idle' })
              }
              executionSummary.skipped++
              markDependentsAsSkipped(depId)
            }
          })
        }
        markDependentsAsSkipped(nodeId)
        
        if (affectedNodes.size > 0) {
          console.log(`🛑 Marked ${affectedNodes.size} dependent nodes as skipped due to error`)
        }
      }
      
    } finally {
      updateNodeState(nodeId, { isExecuting: false })
      runningTasks.delete(nodeId)
    }
  }
  
  // Main execution loop
  while (isExecuting.value) {
    const readyNodes = findReadyNodes()
    
    if (readyNodes.length === 0) {
      // No nodes ready - check if we're done or waiting for running tasks
      if (runningTasks.size === 0) {
        // No running tasks and no ready nodes - we're done
        break
      } else {
        // Wait for at least one running task to complete
        await Promise.race(runningTasks.values())
        continue
      }
    }
    
    // Start execution for all ready nodes
    readyNodes.forEach(nodeId => {
      nodeStatus.set(nodeId, 'ready')
      const task = executeNode(nodeId)
      runningTasks.set(nodeId, task)
    })
    
    // If we have too many concurrent tasks, wait for some to complete
    const maxConcurrency = 5 // Adjust based on system capabilities
    if (runningTasks.size >= maxConcurrency) {
      await Promise.race(runningTasks.values())
    }
  }
  
  // Wait for all remaining tasks to complete
  if (runningTasks.size > 0) {
    console.log(`⏳ Waiting for ${runningTasks.size} remaining tasks to complete...`)
    await Promise.all(runningTasks.values())
  }
  
  console.log('🏁 Parallel execution completed')
}

const handleCancelExecution = () => {
  isExecuting.value = false
  executedNodes.value = 0
  currentExecutingNode.value = null
  
  // Reset summary
  executionSummary.total = 0
  executionSummary.executed = 0
  executionSummary.skipped = 0
  executionSummary.errors = 0
  
  flowState.nodes.forEach(node => {
    if (node.data.status === 'running') {
      // Ensure reactive updates
      Object.assign(node.data, { status: 'idle' })
      updateNodeState(node.id, { isExecuting: false })
    }
  })
  
  console.log('🛑 Pipeline execution cancelled by user')
}

// Navigation handlers
const handleFocusAll = () => {
  focusOnAllNodes()
}

const handleNavigateFirst = () => {
  const nodeId = navigateToFirstNode(flowState.nodes)
  if (nodeId) focusOnNode(nodeId)
}

const handleNavigatePrevious = () => {
  const nodeId = navigateToPreviousNode(flowState.nodes)
  if (nodeId) focusOnNode(nodeId)
}

const handleNavigateNext = () => {
  const nodeId = navigateToNextNode(flowState.nodes)
  if (nodeId) focusOnNode(nodeId)
}

const handleNavigateLast = () => {
  const nodeId = navigateToLastNode(flowState.nodes)
  if (nodeId) focusOnNode(nodeId)
}

const handleSetZoom = (zoom: number) => {
  setZoomLevel(zoom)
}

const handleUndoViewport = () => {
  undoViewport()
}

const handleRedoViewport = () => {
  redoViewport()
}

const handleToggleTracking = () => {
  toggleTracking()
  showViewportHint.value = true
  setTimeout(() => {
    showViewportHint.value = false
  }, 2000)
}

const handleViewportChange = (viewport: any) => {
  onViewportChange(viewport)
  updateNodeVisibility(flowState.nodes, contentRef.value || undefined)
  // Use debounced save for viewport changes to improve performance
  debouncedSave(100)
}

// Utilities
const getExecutionOrder = (): string[] => {
  if (pipelineSettings.executionOrder === 'sequential') {
    return flowState.nodes.map(n => n.id)
  }
  return buildTopologicalOrder()
}

const buildTopologicalOrder = (): string[] => {
  const visited = new Set<string>()
  const order: string[] = []
  
  console.log('\n🔄 Building topological execution order...')
  console.log(`Available nodes: ${flowState.nodes.length}`)
  console.log(`Available edges: ${flowState.edges.length}`)
  
  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    
    // Find all edges that target this node (dependencies)
    const dependencies = flowState.edges.filter(e => e.target === nodeId)
    dependencies.forEach(edge => visit(edge.source))
    
    order.push(nodeId)
  }

  // Start with nodes that have no incoming edges (root nodes)
  const rootNodes = flowState.nodes.filter(node => 
    !flowState.edges.some(edge => edge.target === node.id)
  )
  
  console.log(`Root nodes (no dependencies): ${rootNodes.length}`)
  rootNodes.forEach(node => visit(node.id))
  
  // Handle disconnected nodes (nodes not part of the main graph)
  flowState.nodes.forEach(node => {
    if (!visited.has(node.id)) {
      console.log(`Adding disconnected node: ${node.id}`)
      visit(node.id)
    }
  })
  
  console.log(`Final execution order: [${order.join(' → ')}]`)
  return order
}

const executeCodeBlock = async (node: Node) => {
  const nodeId = node.id
  const code = node.data.code
  
  if (!code?.trim()) {
    throw new Error('No code to execute')
  }

  // Determine execution strategy based on pipeline settings
  let sessionId: string
  let serverConfig: any
  let kernelName: string

  if (pipelineSettings.kernelMode === 'shared') {
    // Use shared session mode
    if (!codeExecutionStore.sharedSessionMode) {
      // Enable shared session mode
      await codeExecutionStore.toggleSharedSessionMode(notaId.value)
    }
    
    // Ensure shared session exists
    sessionId = await codeExecutionStore.ensureSharedSession()
    const session = codeExecutionStore.kernelSessions.get(sessionId)
    
    if (!session) {
      throw new Error('Failed to create shared session')
    }
    
    serverConfig = session.serverConfig
    kernelName = session.kernelName || pipelineSettings.sharedKernelName || ''
    
    console.log(`Shared mode setup for node ${nodeId}:`, {
      sessionId,
      kernelName,
      sessionKernelName: session.kernelName,
      pipelineSharedKernelName: pipelineSettings.sharedKernelName,
      serverConfig: serverConfig ? `${serverConfig.ip}:${serverConfig.port}` : 'undefined'
    })
    
    // Validate kernel name
    if (!kernelName || kernelName.trim() === '') {
      throw new Error(`Invalid kernel name "${kernelName}" for shared mode execution`)
    }
  } else if (pipelineSettings.kernelMode === 'isolated') {
    // Create individual session for this node
    sessionId = `pipeline-${nodeId}-${Date.now()}`
    
    // Check if node has specific kernel configuration
    if (node.data.kernelName && node.data.serverID) {
      // Use node's specific kernel configuration
      kernelName = node.data.kernelName
      // Find the server config
      const nodeServer = jupyterStore.jupyterServers.find(s => 
        `${s.ip}:${s.port}` === node.data.serverID
      )
      if (nodeServer) {
        serverConfig = nodeServer
      } else {
        // Fall back to first available server
        const serverResult = await jupyterStore.getFirstAvailableServer()
        if (!serverResult) {
          throw new Error('No available Jupyter servers with kernels found')
        }
        serverConfig = serverResult.server
        kernelName = serverResult.kernel.name
      }
          } else {
        // Find a suitable server and kernel
        console.log('Finding available server and kernel for isolated mode...')
        const serverResult = await jupyterStore.getFirstAvailableServer()
        console.log('Server result:', serverResult)
        
        if (!serverResult) {
          throw new Error('No available Jupyter servers with kernels found')
        }
        
        if (!serverResult.kernel || !serverResult.kernel.name) {
          throw new Error('Available server does not have a valid kernel')
        }
        
        serverConfig = serverResult.server
        kernelName = serverResult.kernel.name
        
        console.log('Selected kernel for isolated mode:', {
          serverConfig: `${serverConfig.ip}:${serverConfig.port}`,
          kernelName,
          kernelSpec: serverResult.kernel
        })
      }
    
    console.log(`Isolated mode setup for node ${nodeId}:`, {
      sessionId,
      kernelName,
      serverConfig: `${serverConfig.ip}:${serverConfig.port}`
    })
    
    // Validate kernel name
    if (!kernelName || kernelName.trim() === '') {
      throw new Error(`Invalid kernel name "${kernelName}" for isolated mode execution`)
    }
    
    // Create session in the store (kernel will be created automatically during execution)
    codeExecutionStore.kernelSessions.set(sessionId, {
      id: sessionId,
      kernelId: '', // Will be set when kernel is created
      serverConfig,
      kernelName,
      cells: [],
      name: `Pipeline Node ${node.data.title || nodeId}`
    })
  } else {
    // Mixed mode - use node's specific configuration or shared session
    if (node.data.sessionId && codeExecutionStore.kernelSessions.has(node.data.sessionId)) {
      sessionId = node.data.sessionId
      const session = codeExecutionStore.kernelSessions.get(sessionId)!
      serverConfig = session.serverConfig
      kernelName = session.kernelName
    } else {
      // Fall back to shared session
      sessionId = await codeExecutionStore.ensureSharedSession()
      const session = codeExecutionStore.kernelSessions.get(sessionId)!
      serverConfig = session.serverConfig
      kernelName = session.kernelName
    }
    
    console.log(`Mixed mode setup for node ${nodeId}:`, {
      sessionId,
      kernelName,
      hasNodeSession: node.data.sessionId && codeExecutionStore.kernelSessions.has(node.data.sessionId),
      serverConfig: serverConfig ? `${serverConfig.ip}:${serverConfig.port}` : 'undefined'
    })
    
    // Validate kernel name
    if (!kernelName || kernelName.trim() === '') {
      throw new Error(`Invalid kernel name "${kernelName}" for mixed mode execution`)
    }
  }

  // Create a cell for execution
  const cellId = `pipeline-${nodeId}-${Date.now()}`
  
  console.log(`Adding cell for execution:`, {
    cellId,
    sessionId,
    kernelName,
    hasServerConfig: !!serverConfig,
    codeLength: code.length
  })
  
  // Validate before adding cell
  if (!kernelName || kernelName.trim() === '') {
    throw new Error(`Cannot create cell: Invalid kernel name "${kernelName}"`)
  }
  
  // Add cell to the execution store
  codeExecutionStore.addCell({
    id: cellId,
    code: code,
    output: '',
    sessionId: sessionId,
    kernelName: kernelName,
    serverConfig: serverConfig,
    // Add a flag to indicate this is a pipeline cell that should not use shared session mode
    isPipelineCell: true
  })
  
  try {
    // Execute the cell (this will handle kernel creation automatically)
    await codeExecutionStore.executeCell(cellId)
    
    // Get the result
    const cell = codeExecutionStore.getCellById(cellId)
    
    if (cell?.hasError) {
      const errorMessage = typeof cell.error === 'string' ? cell.error : 'Execution failed'
      throw new Error(errorMessage)
    }
    
    // Update node data with results (ensure reactivity)
    Object.assign(node.data, {
      output: cell?.output || null,
      sessionId: sessionId,
      kernelName: kernelName,
      serverConfig: serverConfig
    })
    
    return cell?.output
  } finally {
    // Clean up temporary cell if in isolated mode
    if (pipelineSettings.kernelMode === 'isolated') {
      codeExecutionStore.removeCellFromSession(cellId, sessionId)
    }
  }
}

const getNodeColor = (node: Node) => {
  const state = nodeStates.get(node.id)
  if (state?.isSelected) return 'hsl(var(--primary))'
  if (state?.isExecuting || node.data?.status === 'running') return 'hsl(var(--warning))'
  if (node.data?.status === 'error') return 'hsl(var(--destructive))'
  if (node.data?.status === 'completed') return 'hsl(var(--success))'
  if (node.data?.status === 'queued') return 'hsl(var(--primary) / 0.6)'
  return 'hsl(var(--muted))'
}

const saveToAttributes = () => {
  props.updateAttributes({
    title: title.value,
    nodes: flowState.nodes,
    edges: flowState.edges,
    viewport: flowInstance.value?.getViewport(),
    isEditMode: isEditMode.value,
    hasMadeConnection: hasMadeConnection.value,
    ...pipelineSettings
  })
}

// Keyboard handling
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'n':
        event.preventDefault()
        if (isEditMode.value) handleAddNode()
        break
      case 'l':
        event.preventDefault()
        if (isEditMode.value) handleAutoLayout()
        break
      case 'Enter':
        event.preventDefault()
        if (!isExecuting.value && hasValidPipeline.value) handleExecutePipeline()
        break
      case 'd':
        event.preventDefault()
        if (selectedNode.value) {
          handleDuplicateNode(selectedNode.value.id)
        }
        break
      case 'f':
        event.preventDefault()
        handleFocusAll()
        break
      case 'h':
        event.preventDefault()
        showNavigationPanel.value = !showNavigationPanel.value
        break
      case 'z':
        event.preventDefault()
        if (event.shiftKey) {
          handleRedoViewport()
        } else {
          handleUndoViewport()
        }
        break
      case '1':
        event.preventDefault()
        handleSetZoom(1)
        break
      case '2':
        event.preventDefault()
        handleSetZoom(0.5)
        break
      case '3':
        event.preventDefault()
        handleSetZoom(2)
        break
    }
  } else {
    switch (event.key) {
      case 'Tab':
        event.preventDefault()
        if (event.shiftKey) {
          handleNavigatePrevious()
        } else {
          handleNavigateNext()
        }
        break
      case 'Home':
        event.preventDefault()
        handleNavigateFirst()
        break
      case 'End':
        event.preventDefault()
        handleNavigateLast()
        break
      case 'f':
        event.preventDefault()
        handleToggleFullscreen()
        break
      case 'v':
        event.preventDefault()
        handleToggleTracking()
        break
      case 'n':
        event.preventDefault()
        showNavigationPanel.value = !showNavigationPanel.value
        break
    }
  }
}

// Watchers
watch([() => flowState.nodes, () => flowState.edges], () => {
  if (isEditMode.value && pipelineSettings.autoSave) {
    saveToAttributes()
  }
  updateNodeVisibility(flowState.nodes, contentRef.value || undefined)
}, { deep: true })

watch(() => flowState.edges.length, (newLength, oldLength) => {
  if (newLength > 0 && !hasMadeConnection.value) {
    hasMadeConnection.value = true
    saveToAttributes()
  }
  
  // Log connection tracking info when edges change
  if (newLength > oldLength) {
    console.log('New connection made! Current connection tracking:')
    flowState.nodes.forEach(node => {
      const info = getNodeConnectionInfo(node.id)
      if (info.outputs.length > 0 || info.inputs.length > 0) {
        console.log(`Node ${node.data?.title || node.id}:`, {
          inputs: info.inputs.length,
          outputs: info.outputs.length,
          hasMultipleOutputs: info.hasMultipleOutputs,
          hasMultipleInputs: info.hasMultipleInputs,
          outputTargets: getNodeOutputTargets(node.id),
          inputSources: getNodeInputSources(node.id)
        })
      }
    })
  }
})

// Only open code editor modal when explicitly clicking on a node (not during execution)
watch(() => selectedNode.value, (node) => {
  if (node && !isExecuting.value) {
    showCodeEditor.value = true
  }
})

// Lifecycle
onMounted(async () => {
  // Ensure Jupyter servers are loaded
  jupyterStore.loadServers()
  
  // Focus the container for keyboard events
  nextTick(() => {
    contentRef.value?.focus()
  })
  
  // Initialize shared session if in shared mode
  if (pipelineSettings.kernelMode === 'shared') {
    try {
      if (!codeExecutionStore.sharedSessionMode) {
        await codeExecutionStore.toggleSharedSessionMode(notaId.value)
      }
    } catch (error) {
      console.warn('Failed to initialize shared session mode:', error)
    }
  }
  
  console.log('Pipeline initialized:', {
    nodeCount: flowState.nodes.length,
    kernelMode: pipelineSettings.kernelMode,
    availableServers: jupyterStore.jupyterServers.length,
    availableKernels: availableKernels.value.length
  })
})

onUnmounted(() => {
  // Clean up any remaining state
  clearAllSelections()
  
  // Clear any pending save timeouts
  if (saveTimeoutId.value) {
    clearTimeout(saveTimeoutId.value)
  }
})

// Update pipeline settings
const updatePipelineSettings = (newSettings: any) => {
  Object.assign(pipelineSettings, newSettings)
}
</script>

<style scoped>
.pipeline-container {
  border: 2px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
  min-height: 400px;
  margin: 16px 0;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  position: relative;
}

.pipeline-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.pipeline-container.pipeline-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  margin: 0;
  border-radius: 0;
  border: none;
}

.pipeline-focused {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

.pipeline-content {
  flex-grow: 1;
  width: 100%;
  position: relative;
  background: hsl(var(--background));
  min-height: 400px;
  outline: none;
  transition: all 0.3s ease;
}

.pipeline-content.pipeline-executing {
  background: linear-gradient(135deg, 
    hsl(var(--background)) 0%, 
    hsl(var(--primary) / 0.02) 100%
  );
}

.pipeline-content.pipeline-executing::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, 
    hsl(var(--primary)) 0%, 
    hsl(var(--primary) / 0.5) 50%, 
    hsl(var(--primary)) 100%
  );
  background-size: 200% 100%;
  animation: progress-shimmer 2s linear infinite;
  z-index: 5;
}

@keyframes progress-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.pipeline-content .vue-flow {
  width: 100%;
  height: 100%;
}

.vue-flow-readonly .vue-flow__node {
  cursor: default !important;
}

/* Animation for connection line */
.animated-dash {
  animation: dash 1s linear infinite;
  stroke-dasharray: 5;
  stroke-linecap: round;
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}

/* Quick navigation overlay */
.quick-nav-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 15;
}

.quick-nav-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px hsl(var(--primary) / 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.quick-nav-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px hsl(var(--primary) / 0.4);
}

.quick-nav-hint {
  font-size: 10px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--card));
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid hsl(var(--border));
  opacity: 0;
  transition: opacity 0.2s;
}

.quick-nav-overlay:hover .quick-nav-hint {
  opacity: 1;
}

/* Viewport hint */
.viewport-hint {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid hsl(var(--border));
  box-shadow: 0 4px 12px hsl(var(--foreground) / 0.1);
  z-index: 25;
  animation: fade-in-out 2s ease-in-out;
}

@keyframes fade-in-out {
  0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}

/* Instructional overlay */
.instructional-overlay {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  z-index: 10;
  border: 1px solid hsl(var(--border));
  box-shadow: 0 4px 12px hsl(var(--foreground) / 0.1);
}

.connecting-overlay {
  background: hsl(var(--primary) / 0.9);
  color: hsl(var(--primary-foreground));
  border-color: hsl(var(--primary));
  animation: pulse-overlay 2s infinite;
}

.cancel-connection-btn {
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  margin-left: 8px;
  transition: all 0.2s;
}

.cancel-connection-btn:hover {
  background: hsl(var(--destructive) / 0.8);
}

@keyframes pulse-overlay {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Floating add button */
.floating-add-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px hsl(var(--primary) / 0.3);
  transition: all 0.2s;
  z-index: 10;
}

.floating-add-btn:hover {
  box-shadow: 0 6px 16px hsl(var(--primary) / 0.4);
}
</style>