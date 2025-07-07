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
      @title-blur="handleTitleUpdate"
      @toggle-edit="toggleEditMode"
      @add-node="handleAddNode"
      @show-templates="showTemplateSelector = true"
      @auto-layout="handleAutoLayout"
      @show-settings="showKernelSettings = true"
      @execute="handleExecutePipeline"
      @toggle-fullscreen="handleToggleFullscreen"
    />
    
    <div 
      class="pipeline-content" 
      @keydown="handleKeydown" 
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
        </template>
      </VueFlow>
      
      <!-- Navigation Panel -->
      <PipelineNavigationPanel
        v-if="showNavigationPanel"
        :nodes="flowState.nodes"
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
    />
    
    <PipelineSettingsModal
      v-if="showKernelSettings"
      :settings="pipelineSettings"
      :available-kernels="availableKernels"
      @update:settings="updatePipelineSettings"
      @close="showKernelSettings = false"
      @apply="handleApplyKernelSettings"
    />
    
    <!-- Execution Overlay -->
    <div v-if="isExecuting" class="execution-overlay">
      <div class="execution-progress">
        <div class="progress-header">
          <LoaderIcon class="w-5 h-5 animate-spin" />
          <span>Executing Pipeline...</span>
        </div>
        <div class="progress-details">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${executionProgress}%` }"></div>
        </div>
          <span class="progress-text">{{ executedNodes }}/{{ totalExecutableNodes }} blocks completed</span>
        </div>
        <button @click="handleCancelExecution" class="cancel-btn">Cancel</button>
      </div>
      </div>
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
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import { 
  Plus as PlusIcon,
  Loader as LoaderIcon,
  MousePointerClick as MousePointerClickIcon,
  Navigation as NavigationIcon,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
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

interface PipelineNodeProps {
  node: {
    attrs: {
      id: string
      nodes: any[]
      edges: any[]
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
  updateAttributes: (attrs: any) => void
  selected: boolean
}

const props = defineProps<PipelineNodeProps>()

// External dependencies
const router = useRouter()
const codeExecutionStore = useCodeExecutionStore()
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

// Modal states
const showCodeEditor = ref(false)
const showKernelSettings = ref(false)
const showTemplateSelector = ref(false)
const showNavigationPanel = ref(false)

// Pipeline settings
const pipelineSettings = reactive({
  kernelMode: props.node.attrs.kernelMode || 'mixed',
  sharedKernelName: props.node.attrs.sharedKernelName || '',
  executionOrder: props.node.attrs.executionOrder || 'topological',
  stopOnError: props.node.attrs.stopOnError ?? true,
  autoSave: props.node.attrs.autoSave ?? false,
})

const availableKernels = ref<any[]>([
  { name: 'python3', display_name: 'Python 3' },
  { name: 'ir', display_name: 'R' },
  { name: 'javascript', display_name: 'JavaScript' },
])

// Initialize composables
const initialViewport = props.node.attrs.viewport

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
  nodes: props.node.attrs.nodes || [],
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
  flowState.nodes.filter(n => n.data?.code).length
)

const executionProgress = computed(() => 
  totalExecutableNodes.value > 0 ? (executedNodes.value / totalExecutableNodes.value) * 100 : 0
)

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

const handleRunNode = () => {
  if (selectedNode.value) {
    executeCodeBlock(selectedNode.value)
  }
}

const handleApplyKernelSettings = () => {
  if (pipelineSettings.kernelMode === 'shared') {
    flowState.nodes.forEach(node => {
      node.data.useSharedKernel = true
      node.data.kernelName = pipelineSettings.sharedKernelName
    })
  }
  saveToAttributes()
  showKernelSettings.value = false
}

const handleExecutePipeline = async () => {
  if (!hasValidPipeline.value || isExecuting.value) return
  
  isExecuting.value = true
  executedNodes.value = 0
  
  try {
    const order = getExecutionOrder()
    for (const nodeId of order) {
      if (!isExecuting.value) break
      
      const node = flowState.nodes.find(n => n.id === nodeId)
      if (node?.data?.code) {
        node.data.status = 'running'
        updateNodeState(nodeId, { isExecuting: true })
        
        try {
          const startTime = Date.now()
          await executeCodeBlock(node)
          node.data.status = 'completed'
          node.data.executionTime = Date.now() - startTime
          executedNodes.value++
        } catch (error) {
          node.data.status = 'error'
          console.error(`Error executing node ${nodeId}:`, error)
          if (pipelineSettings.stopOnError) break
        } finally {
          updateNodeState(nodeId, { isExecuting: false })
        }
      }
    }
  } finally {
    isExecuting.value = false
  }
}

const handleCancelExecution = () => {
  isExecuting.value = false
  executedNodes.value = 0
  
  flowState.nodes.forEach(node => {
    if (node.data.status === 'running') {
      node.data.status = 'idle'
      updateNodeState(node.id, { isExecuting: false })
    }
  })
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
  saveToAttributes()
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
  
  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    
    flowState.edges
      .filter(e => e.target === nodeId)
      .forEach(edge => visit(edge.source))
    
    order.push(nodeId)
  }

  flowState.nodes
    .filter(node => !flowState.edges.some(edge => edge.target === node.id))
    .forEach(node => visit(node.id))

  return order
}

const executeCodeBlock = async (node: Node) => {
  const tempCellId = `pipeline-${node.id}-${Date.now()}`
  
  codeExecutionStore.addCell({
    id: tempCellId,
    code: node.data.code,
    output: '',
    kernelName: node.data.kernelName || '',
    sessionId: node.data.sessionId || '',
  })
  
  try {
    await codeExecutionStore.executeCell(tempCellId)
    const cell = codeExecutionStore.getCellById(tempCellId)
    
    if (cell?.hasError) {
      throw new Error(typeof cell.error === 'string' ? cell.error : 'Execution failed')
    }
    
    node.data.output = cell?.output || null
    return cell?.output
  } finally {
    // Clean up temporary cell
    codeExecutionStore.removeCellFromSession(tempCellId, '')
  }
}

const getNodeColor = (node: Node) => {
  const state = nodeStates.get(node.id)
  if (state?.isSelected) return 'hsl(var(--primary))'
  if (state?.isExecuting) return 'hsl(var(--warning))'
  if (node.data?.status === 'error') return 'hsl(var(--destructive))'
  if (node.data?.status === 'completed') return 'hsl(var(--success))'
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

watch(() => selectedNode.value, (node) => {
  if (node) {
    showCodeEditor.value = true
  }
})

// Lifecycle
onMounted(() => {
  // Focus the container for keyboard events
  nextTick(() => {
    contentRef.value?.focus()
  })
})

onUnmounted(() => {
  // Clean up any remaining state
  clearAllSelections()
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

/* Execution overlay */
.execution-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: hsl(var(--background) / 0.9);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.execution-progress {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  min-width: 300px;
  box-shadow: 0 8px 16px hsl(var(--foreground) / 0.1);
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.progress-details {
  margin-bottom: 16px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: hsl(var(--muted));
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: hsl(var(--primary));
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.cancel-btn {
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  border: 1px solid hsl(var(--border));
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: hsl(var(--muted));
}
</style> 