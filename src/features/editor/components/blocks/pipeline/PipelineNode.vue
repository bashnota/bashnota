<template>
  <NodeViewWrapper 
    ref="pipelineContainer"
    class="pipeline-container" 
    :class="{ 
      'pipeline-focused': selected,
      'fullscreen': isFullscreen,
      'grabbing': isGrabbing
    }"
  >
    <PipelineHeader
      v-model:title="localTitle"
      :is-edit-mode="localIsEditMode"
      :is-executing="isExecuting"
      :has-valid-pipeline="hasValidPipeline"
      :node-count="localNodes.length"
      :is-fullscreen="isFullscreen"
      @title-blur="updateTitle"
      @toggle-edit="toggleEditMode"
      @add-node="addCodeBlockNode"
      @show-templates="showTemplateSelector = true"
      @auto-layout="autoLayout"
      @show-settings="showKernelSettings = true"
      @execute="executePipeline"
      @toggle-fullscreen="toggleFullscreen"
    />
    
    <div class="pipeline-content" @keydown="handleKeydown" tabindex="0">
      <PipelineEmptyState 
        v-if="localNodes.length === 0"
        @add-node="addCodeBlockNode"
        @show-templates="showTemplateSelector = true"
      />

      <VueFlow
        v-else
        v-model:nodes="localNodes"
        v-model:edges="localEdges"
        :class="{ 'vue-flow-readonly': !localIsEditMode }"
        @connect="onConnect"
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        @node-drag-start="onNodeDragStart"
        @node-drag="onNodeDrag"
        @node-drag-stop="onNodeDragStop"
        @connect-start="onConnectStart"
        @connect-end="onConnectEnd"
        @pane-ready="onPaneReady"
        :connection-mode="ConnectionMode.Loose"
        :snap-to-grid="true"
        :snap-grid="[20, 20]"
        fit-view-on-init
        :min-zoom="0.1"
        :max-zoom="4"
        :delete-key-code="['Delete', 'Backspace']"
        :is-valid-connection="isValidConnection"
        :default-edge-options="defaultEdgeOptions"
        @vue-flow-error="handleFlowError"
      >
        <Background 
          pattern-color="hsl(var(--muted-foreground) / 0.3)" 
          :gap="20" 
          variant="dots"
        />
        <MiniMap 
          :zoom-step="0.25"
          :pan-step="10"
          position="bottom-right"
        />
        <Controls 
          position="bottom-left"
          :show-zoom="true"
          :show-fit-view="true"
          :show-interactive="true"
        />
        
        <div v-if="localIsEditMode && localNodes.length > 1 && !hasMadeConnection" class="instructional-overlay">
          <MousePointerClickIcon class="w-4 h-4" />
          <span>Drag a connection from an output handle to an input handle.</span>
        </div>
        
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
        
        <template #node-codeblock="{ data, id, selected }">
          <div 
            class="pipeline-code-node" 
            :class="{ 
              'node-selected': selected,
              'node-executing': data.status === 'running',
              'node-error': data.status === 'error',
              'node-completed': data.status === 'completed'
            }"
          >
            <div v-if="localIsEditMode" class="node-quick-actions">
              <button @click.stop="duplicateNode(id)" class="quick-action-btn" title="Duplicate"><CopyIcon class="w-3 h-3" /></button>
              <button @click.stop="deleteNode(id)" class="quick-action-btn delete" title="Delete"><TrashIcon class="w-3 h-3" /></button>
            </div>

            <div class="code-node-header">
              <div class="code-node-title-section">
                <div class="code-node-title-row">
                  <span class="code-node-title">{{ data.title || 'Code Block' }}</span>
                  <div class="execution-indicator" v-if="data.status === 'running'"><LoaderIcon class="w-3 h-3 animate-spin" /></div>
                </div>
                <div class="code-node-kernel-info" v-if="data.kernelName">
                  <CpuIcon class="w-3 h-3" />
                  <span class="kernel-name">{{ data.kernelName }}</span>
                  <span class="kernel-mode" :class="data.useSharedKernel ? 'shared' : 'isolated'">
                    {{ data.useSharedKernel ? 'Shared' : 'Isolated' }}
                  </span>
                </div>
              </div>
              <div class="code-node-status" :class="getNodeStatusClass(data.status)">
                <div class="status-dot"></div>
                <span class="status-text">{{ data.status }}</span>
              </div>
            </div>
            
            <div class="code-node-content">
              <pre class="code-preview">{{ getCodePreview(data.code) }}</pre>
              <div class="code-node-footer">
                <div class="code-node-language">{{ data.language || 'python' }}</div>
                <div class="code-node-stats" v-if="data.output">
                  <ClockIcon class="w-3 h-3" />
                  <span class="execution-time">{{ getExecutionTime(data) }}</span>
                </div>
              </div>
            </div>
            <div :class="{'handle-potential-target' : potentialTargetNodeIds.includes(id)}">
              <Handle type="target" :position="Position.Top" :id="`${id}-input`" class="pipeline-handle pipeline-handle-input" :class="{ 'handle-connecting': isConnecting && connectingFrom !== id }">
                <div class="handle-icon"><ArrowDownIcon class="w-3 h-3" /></div>
                <div class="handle-tooltip" v-if="localIsEditMode">
                  <span>Input</span>
                </div>
              </Handle>
            </div>
            <Handle type="source" :position="Position.Bottom" :id="`${id}-output`" class="pipeline-handle pipeline-handle-output" :class="{ 'handle-connecting': isConnecting, 'handle-pulse': localIsEditMode && !isConnecting }">
              <div class="handle-icon"><ArrowUpIcon class="w-3 h-3" /></div>
              <div class="handle-tooltip" v-if="localIsEditMode">
                <span class="drag-cta">Drag to connect</span>
              </div>
            </Handle>
          </div>
        </template>
      </VueFlow>
      
      <div v-if="localIsEditMode && localNodes.length > 0" class="floating-add-btn" @click="addCodeBlockNode">
        <PlusIcon class="w-5 h-5" />
      </div>
    </div>
    
    <PipelineTemplateSelector
      v-if="showTemplateSelector"
      :templates="codeTemplates"
      @close="showTemplateSelector = false"
      @select="addTemplateNode"
    />
    
    <PipelineCodeEditorModal
      v-if="selectedNode && showCodeEditor"
      :node-id="selectedNode.id"
      v-model:node-data="selectedNode.data"
      :nota-id="notaId"
      :is-executing="selectedNode.data.status === 'running'"
      :available-kernels="availableKernels"
      @close="closeCodeEditor"
      @save="saveCodeBlock"
      @delete="deleteCodeBlock"
      @run-node="handleNodeExecute"
    />
    
    <PipelineSettingsModal
      v-if="showKernelSettings"
      :settings="pipelineSettings"
      :available-kernels="availableKernels"
      @update:settings="updatePipelineSettings"
      @close="showKernelSettings = false"
      @apply="applyKernelSettings"
    />
    
    <div v-if="isExecuting" class="execution-overlay">
      <div class="execution-progress">
        <div class="progress-header">
          <LoaderIcon class="w-5 h-5 animate-spin" />
          <span>Executing Pipeline...</span>
        </div>
        <div class="progress-details">
          <div class="progress-bar"><div class="progress-fill" :style="{ width: `${executionProgress}%` }"></div></div>
          <span class="progress-text">{{ executedNodes }}/{{ totalNodes }} blocks completed</span>
        </div>
        <button @click="cancelExecution" class="cancel-btn">Cancel</button>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { VueFlow, Handle, Position, ConnectionMode, MarkerType, type Connection } from '@vue-flow/core'
import { nanoid } from 'nanoid'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import type { Node, Edge } from '@vue-flow/core'
import { 
  Plus as PlusIcon,
  Loader as LoaderIcon,
  Cpu as CpuIcon,
  Copy as CopyIcon,
  Trash as TrashIcon,
  Clock as ClockIcon,
  MousePointerClick as MousePointerClickIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  Database as DatabaseIcon,
  BarChart as BarChartIcon,
  Brain as BrainIcon,
  PieChart as PieChartIcon,
} from 'lucide-vue-next'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { useJupyterServers } from '@/features/jupyter/composables/useJupyterServers'
import { useRouter } from 'vue-router'
import { useFullscreen } from '@/composables/useFullscreen'

// Import child components
import PipelineHeader from './components/PipelineHeader.vue'
import PipelineEmptyState from './components/PipelineEmptyState.vue'
import PipelineTemplateSelector from './components/PipelineTemplateSelector.vue'
import PipelineCodeEditorModal from './components/PipelineCodeEditorModal.vue'
import PipelineSettingsModal from './components/PipelineSettingsModal.vue'

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

// Composables
const codeExecutionStore = useCodeExecutionStore()
const { servers } = useJupyterServers()
const router = useRouter()
const vueFlowInstance = ref<any | null>(null)

// Fullscreen
const pipelineContainer = ref<HTMLElement | null>(null)
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(pipelineContainer)

// Get current nota ID
const notaId = computed(() => router.currentRoute.value.params.id as string)

// Local state
const localTitle = ref(props.node.attrs.title)
const localNodes = ref<Node[]>(props.node.attrs.nodes || [])
const localEdges = ref<Edge[]>(props.node.attrs.edges || [])
const localIsEditMode = ref(props.node.attrs.isEditMode === undefined ? true : props.node.attrs.isEditMode)
const isExecuting = ref(false)
const selectedNode = ref<Node | null>(null)

// Modal visibility
const showCodeEditor = ref(false)
const showKernelSettings = ref(false)
const showTemplateSelector = ref(false)

// Kernels and data
const availableKernels = ref<any[]>([])
const hasMadeConnection = ref(props.node.attrs.hasMadeConnection || false)

// Pipeline settings
const pipelineSettings = reactive({
  kernelMode: props.node.attrs.kernelMode || 'mixed',
  sharedKernelName: props.node.attrs.sharedKernelName || '',
  executionOrder: props.node.attrs.executionOrder || 'topological',
  stopOnError: props.node.attrs.stopOnError ?? true,
  autoSave: props.node.attrs.autoSave ?? false,
})

const updatePipelineSettings = (newSettings: any) => {
  Object.assign(pipelineSettings, newSettings)
}

// Connection and drag state
const isConnecting = ref(false)
const connectingFrom = ref<string | null>(null)
const connectingFromHandle = ref<string | null>(null)
const isDragging = ref(false)
const isGrabbing = computed(() => isDragging.value || isConnecting.value)
const potentialTargetNodeIds = ref<string[]>([])

// Execution tracking
const executedNodes = ref(0)
const totalNodes = computed(() => localNodes.value.filter(n => n.data.code).length)
const executionProgress = computed(() => 
  totalNodes.value > 0 ? (executedNodes.value / totalNodes.value) * 100 : 0
)

const hasValidPipeline = computed(() => {
  return localNodes.value.length > 0 && localNodes.value.some(node => node.data.code)
})

const codeTemplates = ref([
  { id: 'data-load', title: 'Data Loading', description: 'Load data from CSV, JSON, or database', icon: DatabaseIcon, code: 'import pandas as pd\n\ndf = pd.read_csv("data.csv")\nprint(df.head())', language: 'python' },
  { id: 'data-analysis', title: 'Data Analysis', description: 'Basic data exploration and statistics', icon: BarChartIcon, code: 'import pandas as pd\nimport matplotlib.pyplot as plt\n\nprint(df.describe())\ndf.plot()\nplt.show()', language: 'python' },
  { id: 'ml-model', title: 'ML Model', description: 'Train a machine learning model', icon: BrainIcon, code: 'from sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LinearRegression\n\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)\nmodel = LinearRegression()\nmodel.fit(X_train, y_train)', language: 'python' },
  { id: 'visualization', title: 'Visualization', description: 'Create charts and plots', icon: PieChartIcon, code: 'import matplotlib.pyplot as plt\nimport seaborn as sns\n\nplt.figure(figsize=(10, 6))\nsns.scatterplot(data=df, x="x", y="y")\nplt.title("My Chart")\nplt.show()', language: 'python' }
])

// Methods
const updateTitle = () => {
  props.updateAttributes({ title: localTitle.value })
}

const toggleEditMode = () => {
  localIsEditMode.value = !localIsEditMode.value
  props.updateAttributes({ isEditMode: localIsEditMode.value })
  if (!localIsEditMode.value && pipelineSettings.autoSave) {
    saveChanges()
  }
}

const saveChanges = () => {
  props.updateAttributes({
    nodes: localNodes.value,
    edges: localEdges.value,
    ...pipelineSettings,
    hasMadeConnection: hasMadeConnection.value,
    isEditMode: localIsEditMode.value
  })
}

const addCodeBlockNode = () => {
  if (!localIsEditMode.value) {
    return
  }
  const newNode: Node = {
    id: nanoid(),
    type: 'codeblock',
    position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
    data: {
      title: `Code Block ${localNodes.value.length + 1}`,
      code: '',
      language: 'python',
      status: 'idle',
      useSharedKernel: pipelineSettings.kernelMode === 'shared',
      kernelName: pipelineSettings.kernelMode === 'shared' ? pipelineSettings.sharedKernelName : '',
      serverID: '', sessionId: '', output: null,
    },
  }
  addNodeAndAutoConnect(newNode)
}

const onConnect = (connection: Connection) => {
  if (!localIsEditMode.value) return
  const newEdge: Edge = {
    id: nanoid(),
    source: connection.source!, target: connection.target!,
    sourceHandle: connection.sourceHandle, targetHandle: connection.targetHandle,
    type: 'smoothstep',
    markerEnd: MarkerType.ArrowClosed,
    style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
    animated: true
  }
  localEdges.value = [...localEdges.value, newEdge]
  if (!hasMadeConnection.value) {
    hasMadeConnection.value = true
    props.updateAttributes({ hasMadeConnection: true })
  }
}

const onNodeClick = (e: any) => {
  if (localIsEditMode.value && e.node.type === 'codeblock') {
    selectedNode.value = e.node
    showCodeEditor.value = true
  }
}

const onEdgeClick = (e: any) => {
  if (localIsEditMode.value) {
    localEdges.value = localEdges.value.filter(edge => edge.id !== e.edge.id)
  }
}

const closeCodeEditor = () => {
  showCodeEditor.value = false
  selectedNode.value = null
}

const saveCodeBlock = () => {
  if (selectedNode.value) {
    const nodeIndex = localNodes.value.findIndex(n => n.id === selectedNode.value!.id)
    if (nodeIndex !== -1) {
      localNodes.value[nodeIndex] = { ...selectedNode.value }
    }
  }
  closeCodeEditor()
}

const deleteCodeBlock = () => {
  if (selectedNode.value) {
    deleteNode(selectedNode.value.id)
  }
  closeCodeEditor()
}

const handleNodeExecute = () => {
  if (selectedNode.value) {
    executeCodeBlock(selectedNode.value)
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey) {
    switch (e.key) {
      case 'n': e.preventDefault(); if (localIsEditMode.value) addCodeBlockNode(); break;
      case 'l': e.preventDefault(); if (localIsEditMode.value) autoLayout(); break;
      case 'Enter': e.preventDefault(); if (!isExecuting.value && hasValidPipeline.value) executePipeline(); break;
    }
  }
}

const getCodePreview = (code: string) => {
  if (!code) return '# Add your code here'
  const lines = code.split('\n')
  const preview = lines.slice(0, 3).join('\n')
  return lines.length > 3 ? `${preview}\n...` : preview
}

const getExecutionTime = (data: any) => data.executionTime ? `${data.executionTime}ms` : 'N/A'

const duplicateNode = (nodeId: string) => {
  const node = localNodes.value.find(n => n.id === nodeId)
  if (!node) return
  const newNode: Node = {
    ...node, id: nanoid(),
    position: { x: node.position.x + 50, y: node.position.y + 50 },
    data: { ...node.data, title: `${node.data.title} (Copy)`, status: 'idle', output: null }
  }
  localNodes.value = [...localNodes.value, newNode]
  setTimeout(() => vueFlowInstance.value?.fitView({ padding: 0.2, duration: 300 }), 100)
}

const deleteNode = (nodeId: string) => {
  localNodes.value = localNodes.value.filter(n => n.id !== nodeId)
  localEdges.value = localEdges.value.filter(e => e.source !== nodeId && e.target !== nodeId)
  if (selectedNode.value?.id === nodeId) closeCodeEditor()
  setTimeout(() => vueFlowInstance.value?.fitView({ padding: 0.2 }), 100)
}

const autoLayout = () => {
  if (localNodes.value.length === 0) return
  const cols = Math.ceil(Math.sqrt(localNodes.value.length))
  localNodes.value.forEach((node, index) => {
    node.position = { x: (index % cols) * 300 + 100, y: Math.floor(index / cols) * 300 + 100 }
  })
  setTimeout(() => vueFlowInstance.value?.fitView({ padding: 0.2 }), 100)
}

const addTemplateNode = (template: any) => {
  const newNode: Node = {
    id: nanoid(), type: 'codeblock',
    position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
    data: {
      title: template.title, code: template.code, language: template.language, status: 'idle',
      useSharedKernel: pipelineSettings.kernelMode === 'shared',
      kernelName: pipelineSettings.kernelMode === 'shared' ? pipelineSettings.sharedKernelName : '',
      serverID: '', sessionId: '', output: null,
    },
  }
  addNodeAndAutoConnect(newNode)
  showTemplateSelector.value = false
}

const onConnectStart = (e: any) => { 
  isConnecting.value = true; 
  connectingFrom.value = e.nodeId; 
  connectingFromHandle.value = e.handleId
  
  if (e.handleId?.endsWith('-output')) {
    potentialTargetNodeIds.value = localNodes.value
      .map(n => n.id)
      .filter(nodeId => isValidConnection({
        source: e.nodeId,
        sourceHandle: e.handleId,
        target: nodeId,
        targetHandle: `${nodeId}-input`
      }))
  }
}
const onConnectEnd = () => { 
  isConnecting.value = false; 
  connectingFrom.value = null; 
  connectingFromHandle.value = null
  potentialTargetNodeIds.value = []
}

const isValidConnection = (connection: Connection): boolean => {
  if (connection.source === connection.target) {
    return false
  }
  
  const sourceIsOutput = connection.sourceHandle?.endsWith('-output');
  if (!sourceIsOutput) {
    return false;
  }
  
  const targetHasConnection = localEdges.value.some(
    (edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle
  );

  return !targetHasConnection;
}

const onNodeDragStart = () => { isDragging.value = true }
const onNodeDrag = () => {}
const onNodeDragStop = () => { isDragging.value = false; if (pipelineSettings.autoSave) saveChanges() }
const cancelExecution = () => { isExecuting.value = false; executedNodes.value = 0; localNodes.value.forEach(node => { if (node.data.status === 'running') node.data.status = 'idle' }) }
const getNodeStatusClass = (status: string) => ({ 'status-idle': status === 'idle', 'status-running': status === 'running', 'status-completed': status === 'completed', 'status-error': status === 'error' })

const applyKernelSettings = () => {
  if (pipelineSettings.kernelMode === 'shared') {
    localNodes.value.forEach(node => {
      node.data.useSharedKernel = true
      node.data.kernelName = pipelineSettings.sharedKernelName
    })
  }
  saveChanges()
  showKernelSettings.value = false
}

const executePipeline = async () => {
  if (!hasValidPipeline.value || isExecuting.value) return
  isExecuting.value = true
  executedNodes.value = 0
  try {
    const order = pipelineSettings.executionOrder === 'sequential' ? localNodes.value.map(n => n.id) : buildTopologicalOrder()
    for (const nodeId of order) {
      if (!isExecuting.value) break
      const node = localNodes.value.find(n => n.id === nodeId)
      if (node?.data.code) {
        node.data.status = 'running'
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
        }
      }
    }
  } finally {
    isExecuting.value = false
  }
}

const buildTopologicalOrder = (): string[] => {
  const visited = new Set<string>()
  const order: string[] = []
  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    localEdges.value.filter(e => e.target === nodeId).forEach(edge => visit(edge.source))
    order.push(nodeId)
  }
  localNodes.value.filter(node => !localEdges.value.some(edge => edge.target === node.id)).forEach(node => visit(node.id))
  return order
}

const executeCodeBlock = async (node: Node) => {
  const tempCellId = `pipeline-${node.id}-${Date.now()}`
  codeExecutionStore.addCell({
    id: tempCellId, code: node.data.code, output: '',
    kernelName: node.data.kernelName || '', sessionId: node.data.sessionId || '',
  })
  try {
    await codeExecutionStore.executeCell(tempCellId)
    const cell = codeExecutionStore.getCellById(tempCellId)
    if (cell?.hasError) throw new Error(typeof cell.error === 'string' ? cell.error : 'Execution failed')
    node.data.output = cell?.output || null
    return cell?.output
  } finally {
    // Consider cleaning up the cell
  }
}

const loadAvailableKernels = async () => {
  availableKernels.value = [
    { name: 'python3', display_name: 'Python 3' }, { name: 'ir', display_name: 'R' }, { name: 'javascript', display_name: 'JavaScript' },
  ]
}

const handleFlowError = (error: any) => console.error("Vue Flow Error:", error)

watch([localNodes, localEdges], () => { if (localIsEditMode.value && pipelineSettings.autoSave) saveChanges() }, { deep: true })

const addNodeAndAutoConnect = (newNode: Node) => {
  const selected = vueFlowInstance.value?.getSelectedNodes.value || []
  const lastSelectedNode = selected.length > 0 ? selected[selected.length - 1] : null

  const canAutoConnect = lastSelectedNode && !localEdges.value.some(e => e.source === lastSelectedNode.id)

  if (canAutoConnect && lastSelectedNode) {
    newNode.position = { x: lastSelectedNode.position.x, y: lastSelectedNode.position.y + 170 }
  }

  localNodes.value = [...localNodes.value, newNode]

  if (canAutoConnect && lastSelectedNode) {
    const newEdge: Edge = {
      id: nanoid(),
      source: lastSelectedNode.id,
      target: newNode.id,
      type: 'smoothstep',
      animated: true,
      markerEnd: MarkerType.ArrowClosed,
      style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
    }
    localEdges.value = [...localEdges.value, newEdge]
  }

  setTimeout(() => vueFlowInstance.value?.fitView({ padding: 0.2, duration: 300 }), 100)
}

const onPaneReady = (instance: any) => {
  vueFlowInstance.value = instance
}

// Default styling for all new edges
const defaultEdgeOptions = { type: 'smoothstep', animated: true, markerEnd: MarkerType.ArrowClosed, style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' } }

onMounted(() => {
  loadAvailableKernels()
  if (localNodes.value.length === 0 && !localIsEditMode.value) {
    localIsEditMode.value = true
    props.updateAttributes({ isEditMode: true })
  }
})

watch(localNodes, (newNodes, oldNodes) => {
  console.log('localNodes have changed:');
  console.log('New length:', newNodes.length);
  console.log('Old length:', oldNodes.length);
  console.log('New nodes:', JSON.parse(JSON.stringify(newNodes)));
}, { deep: true });
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
}

.pipeline-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
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
  min-height: 0;
}

.pipeline-content:focus {
  outline: none;
}

.pipeline-content .vue-flow {
  width: 100%;
  height: 100%;
}

.vue-flow-readonly .vue-flow__node {
  cursor: default !important;
}

.pipeline-code-node {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  min-width: 250px;
  max-width: 300px;
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.1);
  transition: all 0.2s ease;
  cursor: pointer;
}

.pipeline-code-node:hover {
  box-shadow: 0 4px 12px hsl(var(--foreground) / 0.15);
  transform: translateY(-2px);
}

.code-node-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  background: hsl(var(--muted));
  border-bottom: 1px solid hsl(var(--border));
  border-radius: 5px 5px 0 0;
}

.code-node-title-section { flex: 1; }
.code-node-title-row { display: flex; align-items: center; gap: 4px; }
.code-node-title { font-size: 14px; font-weight: 600; color: hsl(var(--foreground)); display: block; margin-bottom: 4px; }
.execution-indicator { color: hsl(var(--primary-foreground)); width: 16px; height: 16px; border-radius: 50%; background: hsl(var(--primary)); display: flex; align-items: center; justify-content: center; }
.code-node-kernel-info { display: flex; align-items: center; gap: 4px; font-size: 11px; color: hsl(var(--muted-foreground)); }
.kernel-name { font-weight: 500; }
.kernel-mode { padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 500; }
.kernel-mode.shared { background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); }
.kernel-mode.isolated { background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); }

.code-node-status { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: hsl(var(--muted-foreground)); }
.status-text { text-transform: capitalize; }
.status-idle .status-dot { background: hsl(var(--muted-foreground)); }
.status-running .status-dot, .status-completed .status-dot { background: hsl(var(--primary)); }
.status-running .status-dot { animation: pulse 2s infinite; }
.status-error .status-dot { background: hsl(var(--destructive)); }
.status-running .status-text, .status-completed .status-text { color: hsl(var(--primary)); }
.status-error .status-text { color: hsl(var(--destructive)); }

.code-node-content { padding: 12px; position: relative; }
.code-preview { font-family: 'Monaco', 'Consolas', monospace; font-size: 12px; color: hsl(var(--foreground)); background: hsl(var(--muted)); padding: 8px; border-radius: 4px; margin: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: pre; border: 1px solid hsl(var(--border)); }
.code-node-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.code-node-language, .execution-time { font-size: 10px; color: hsl(var(--muted-foreground)); }
.code-node-stats { display: flex; align-items: center; gap: 4px; }

.pipeline-handle { width: 16px; height: 16px; border: 2px solid hsl(var(--foreground)); background: hsl(var(--background)); transition: all 0.2s ease; z-index: 10; display: flex; align-items: center; justify-content: center; }
.pipeline-handle-input { background: hsl(var(--primary)); border-color: hsl(var(--primary)); }
.pipeline-handle-output { background: hsl(var(--primary)); border-color: hsl(var(--primary)); }
.pipeline-handle:hover, .handle-connecting { transform: scale(1.2); box-shadow: 0 0 0 4px hsl(var(--primary) / 0.2); }
.pipeline-handle.valid { background: hsl(var(--success)); border-color: hsl(var(--success)); }
.pipeline-handle.invalid { background: hsl(var(--destructive)); border-color: hsl(var(--destructive)); }
.handle-tooltip { position: absolute; top: -32px; left: 50%; transform: translateX(-50%); background: hsl(var(--popover)); color: hsl(var(--popover-foreground)); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; white-space: nowrap; opacity: 0; transition: all 0.2s; pointer-events: none; border: 1px solid hsl(var(--border)); box-shadow: 0 2px 8px hsl(var(--foreground) / 0.1); }
.pipeline-handle:hover .handle-tooltip { opacity: 1; top: -35px; }
.handle-icon { color: hsl(var(--background)); display: flex; align-items: center; justify-content: center; }
.handle-pulse { animation: pulse-handle 2s infinite; }

.drag-cta {
  animation: color-pulse 2s infinite;
}

@keyframes color-pulse {
  0%, 100% { color: hsl(var(--primary)); }
  50% { color: hsl(var(--popover-foreground)); }
}

.handle-potential-target .pipeline-handle-input {
  animation: pulse-glow 1.5s infinite;
}

.animated-dash { animation: dash 1s linear infinite; }
@keyframes dash { to { stroke-dashoffset: -10; } }

.node-selected { box-shadow: 0 0 0 2px hsl(var(--primary)) !important; }
.node-executing { animation: pulse-border 2s infinite; }
.node-error { border-color: hsl(var(--destructive)) !important; }
.node-completed { border-color: hsl(var(--success)) !important; }

.node-quick-actions { position: absolute; top: -8px; right: -8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; z-index: 10; }
.pipeline-code-node:hover .node-quick-actions { opacity: 1; }
.quick-action-btn { width: 20px; height: 20px; border-radius: 50%; border: none; background: hsl(var(--background)); color: hsl(var(--foreground)); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 4px hsl(var(--foreground) / 0.1); transition: all 0.2s; }
.quick-action-btn:hover { transform: scale(1.1); }
.quick-action-btn.delete { background: hsl(var(--destructive)); color: hsl(var(--destructive-foreground)); }

.floating-add-btn { position: absolute; bottom: 20px; right: 20px; width: 48px; height: 48px; border-radius: 50%; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px hsl(var(--primary) / 0.3); transition: all 0.2s; z-index: 10; }
.floating-add-btn:hover { transform: scale(1.1); box-shadow: 0 6px 16px hsl(var(--primary) / 0.4); }

.instructional-overlay { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); background: hsl(var(--popover)); color: hsl(var(--popover-foreground)); padding: 8px 12px; border-radius: 6px; display: flex; align-items: center; gap: 8px; font-size: 13px; z-index: 10; border: 1px solid hsl(var(--border)); box-shadow: 0 4px 12px hsl(var(--foreground) / 0.1); }

.execution-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: hsl(var(--background) / 0.9); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 100; }
.execution-progress { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 8px; padding: 24px; text-align: center; min-width: 300px; box-shadow: 0 8px 16px hsl(var(--foreground) / 0.1); }
.progress-header { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px; font-weight: 600; color: hsl(var(--foreground)); }
.progress-details { margin-bottom: 16px; }
.progress-bar { width: 100%; height: 8px; background: hsl(var(--muted)); border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.progress-fill { height: 100%; background: hsl(var(--primary)); transition: width 0.3s ease; }
.progress-text { font-size: 12px; color: hsl(var(--muted-foreground)); }
.cancel-btn { background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); border: 1px solid hsl(var(--border)); padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
.cancel-btn:hover { background: hsl(var(--muted)); }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes pulse-border { 0%, 100% { border-color: hsl(var(--primary)); } 50% { border-color: hsl(var(--primary) / 0.5); } }
@keyframes pulse-handle { 0% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); } 70% { box-shadow: 0 0 0 8px hsl(var(--primary) / 0); } 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0); } }

@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 0 0 hsl(var(--success) / 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px hsl(var(--success) / 0);
  }
  100% {
    box-shadow: 0 0 0 0 hsl(var(--success) / 0);
  }
}

.pipeline-container.grabbing {
  cursor: grabbing;
}
</style> 