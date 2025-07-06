<template>
  <NodeViewWrapper class="pipeline-container" :class="{ 'pipeline-focused': selected }">
    <div class="pipeline-header">
      <div class="pipeline-title">
        <input
          v-model="localTitle"
          @blur="updateTitle"
          @keydown.enter="updateTitle"
          class="pipeline-title-input"
          placeholder="Pipeline Title"
        />
      </div>
      <div class="pipeline-controls">
        <button
          @click="toggleEditMode"
          :class="{ active: isEditMode }"
          class="pipeline-btn"
          title="Toggle Edit Mode"
        >
          <EditIcon v-if="!isEditMode" />
          <CheckIcon v-else />
        </button>
        <button
          @click="addCodeBlockNode"
          :disabled="!isEditMode"
          class="pipeline-btn"
          title="Add Code Block"
        >
          <PlusIcon />
        </button>
        <button
          @click="executePipeline"
          :disabled="isExecuting || !hasValidPipeline"
          class="pipeline-btn pipeline-btn-execute"
          title="Execute Pipeline"
        >
          <PlayIcon v-if="!isExecuting" />
          <LoaderIcon v-else class="animate-spin" />
        </button>
        <button
          @click="showKernelSettings = true"
          class="pipeline-btn"
          title="Kernel Settings"
        >
          <SettingsIcon />
        </button>
      </div>
    </div>
    
    <div class="pipeline-content">
      <VueFlow
        v-model:nodes="localNodes"
        v-model:edges="localEdges"
        :class="{ 'vue-flow-readonly': !isEditMode }"
        @nodes-change="onNodesChange"
        @edges-change="onEdgesChange"
        @connect="onConnect"
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        :connection-mode="ConnectionMode.Loose"
        :snap-to-grid="true"
        :snap-grid="[15, 15]"
        fit-view-on-init
        :min-zoom="0.1"
        :max-zoom="2"
      >
        <Background pattern-color="hsl(var(--muted-foreground))" :gap="16" />
        <MiniMap />
        <Controls />
        
        <!-- Custom Code Block Node -->
        <template #node-codeblock="{ data, id }">
          <div class="pipeline-code-node">
            <div class="code-node-header">
              <div class="code-node-title-section">
                <span class="code-node-title">{{ data.title || 'Code Block' }}</span>
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
              <pre class="code-preview">{{ data.code || '# Add your code here' }}</pre>
              <div class="code-node-language">{{ data.language || 'python' }}</div>
            </div>
            <Handle
              type="target"
              :position="Position.Top"
              :id="`${id}-input`"
              class="pipeline-handle pipeline-handle-input"
            />
            <Handle
              type="source"
              :position="Position.Bottom"
              :id="`${id}-output`"
              class="pipeline-handle pipeline-handle-output"
            />
          </div>
        </template>
      </VueFlow>
    </div>
    
    <!-- Code Block Editor Modal -->
    <div v-if="selectedNode && showCodeEditor" class="code-editor-modal">
      <div class="code-editor-content">
        <div class="code-editor-header">
          <h3>Edit Code Block</h3>
          <button @click="closeCodeEditor" class="close-btn">×</button>
        </div>
        <div class="code-editor-body">
          <div class="code-editor-form">
            <div class="form-row">
              <input
                v-model="selectedNode.data.title"
                placeholder="Block Title"
                class="code-title-input"
              />
              <select v-model="selectedNode.data.language" class="code-language-select">
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="r">R</option>
                <option value="sql">SQL</option>
                <option value="bash">Bash</option>
              </select>
            </div>
            
            <div class="kernel-settings">
              <div class="kernel-mode-toggle">
                <label class="toggle-label">
                  <input 
                    type="checkbox" 
                    v-model="selectedNode.data.useSharedKernel"
                    class="toggle-input"
                  />
                  <span class="toggle-text">Use Shared Kernel</span>
                </label>
              </div>
              
              <div v-if="!selectedNode.data.useSharedKernel" class="kernel-selection">
                <select v-model="selectedNode.data.kernelName" class="kernel-select">
                  <option value="">Select Kernel</option>
                  <option v-for="kernel in availableKernels" :key="kernel.name" :value="kernel.name">
                    {{ kernel.display_name || kernel.name }}
                  </option>
                </select>
              </div>
            </div>
            
            <div class="code-editor-container">
              <CodeBlockWithExecution
                :id="selectedNode.id"
                :code="selectedNode.data.code"
                :language="selectedNode.data.language"
                :result="selectedNode.data.output"
                :serverID="selectedNode.data.serverID"
                :kernel-name="selectedNode.data.kernelName"
                :session-id="selectedNode.data.sessionId"
                :nota-id="notaId"
                :is-read-only="false"
                :is-executing="selectedNode.data.status === 'running'"
                :is-published="false"
                :running-status="selectedNode.data.status"
                @update:code="updateNodeCode"
                @kernel-select="onNodeKernelSelect"
                @update:output="updateNodeOutput"
                @update:session-id="onNodeSessionSelect"
                @execute="handleNodeExecute"
              />
            </div>
          </div>
        </div>
        <div class="code-editor-footer">
          <button @click="saveCodeBlock" class="save-btn">Save</button>
          <button @click="deleteCodeBlock" class="delete-btn">Delete</button>
        </div>
      </div>
    </div>
    
    <!-- Kernel Settings Modal -->
    <div v-if="showKernelSettings" class="kernel-settings-modal">
      <div class="kernel-settings-content">
        <div class="kernel-settings-header">
          <h3>Pipeline Kernel Settings</h3>
          <button @click="showKernelSettings = false" class="close-btn">×</button>
        </div>
        <div class="kernel-settings-body">
          <div class="setting-group">
            <label class="setting-label">Default Execution Mode</label>
            <select v-model="pipelineKernelMode" class="setting-select">
              <option value="shared">Shared Kernel (All blocks use same kernel)</option>
              <option value="isolated">Isolated Kernels (Each block has its own kernel)</option>
              <option value="mixed">Mixed Mode (Allow per-block configuration)</option>
            </select>
          </div>
          
          <div class="setting-group" v-if="pipelineKernelMode === 'shared'">
            <label class="setting-label">Shared Kernel</label>
            <select v-model="sharedKernelName" class="setting-select">
              <option value="">Select Kernel</option>
              <option v-for="kernel in availableKernels" :key="kernel.name" :value="kernel.name">
                {{ kernel.display_name || kernel.name }}
              </option>
            </select>
          </div>
          
          <div class="setting-group">
            <label class="setting-label">Execution Order</label>
            <select v-model="executionOrder" class="setting-select">
              <option value="topological">Topological (Follow dependencies)</option>
              <option value="sequential">Sequential (Top to bottom)</option>
              <option value="parallel">Parallel (Where possible)</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label class="toggle-label">
              <input 
                type="checkbox" 
                v-model="stopOnError"
                class="toggle-input"
              />
              <span class="toggle-text">Stop execution on error</span>
            </label>
          </div>
        </div>
        <div class="kernel-settings-footer">
          <button @click="applyKernelSettings" class="save-btn">Apply Settings</button>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { VueFlow, Handle, Position, ConnectionMode } from '@vue-flow/core'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import type { Node, Edge, Connection } from '@vue-flow/core'
import { 
  Edit as EditIcon, 
  Check as CheckIcon, 
  Plus as PlusIcon, 
  Play as PlayIcon, 
  Loader as LoaderIcon,
  Settings as SettingsIcon,
  Cpu as CpuIcon
} from 'lucide-vue-next'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { useJupyterServers } from '@/features/jupyter/composables/useJupyterServers'
import { useRouter } from 'vue-router'
import CodeBlockWithExecution from '../executable-code-block/CodeBlockWithExecution.vue'

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
    }
  }
  updateAttributes: (attrs: any) => void
  selected: boolean
}

const props = defineProps<PipelineNodeProps>()
const codeExecutionStore = useCodeExecutionStore()
const { servers } = useJupyterServers()
const router = useRouter()

// Get current nota ID
const notaId = computed(() => router.currentRoute.value.params.id as string)

// Local state
const localTitle = ref(props.node.attrs.title)
const localNodes = ref<Node[]>(props.node.attrs.nodes || [])
const localEdges = ref<Edge[]>(props.node.attrs.edges || [])
const isEditMode = ref(false)
const isExecuting = ref(false)
const selectedNode = ref<Node | null>(null)
const showCodeEditor = ref(false)
const showKernelSettings = ref(false)
const availableKernels = ref<any[]>([])

// Pipeline kernel settings
const pipelineKernelMode = ref(props.node.attrs.kernelMode || 'mixed')
const sharedKernelName = ref(props.node.attrs.sharedKernelName || '')
const executionOrder = ref(props.node.attrs.executionOrder || 'topological')
const stopOnError = ref(props.node.attrs.stopOnError ?? true)

// Computed properties
const hasValidPipeline = computed(() => {
  return localNodes.value.length > 0 && localNodes.value.some(node => node.data.code)
})

// Methods
const updateTitle = () => {
  props.updateAttributes({ title: localTitle.value })
}

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
  if (!isEditMode.value) {
    saveChanges()
  }
}

const saveChanges = () => {
  props.updateAttributes({
    nodes: localNodes.value,
    edges: localEdges.value,
    kernelMode: pipelineKernelMode.value,
    sharedKernelName: sharedKernelName.value,
    executionOrder: executionOrder.value,
    stopOnError: stopOnError.value,
  })
}

const addCodeBlockNode = () => {
  if (!isEditMode.value) return
  
  const newNode: Node = {
    id: `node-${Date.now()}`,
    type: 'codeblock',
    position: { x: Math.random() * 300, y: Math.random() * 300 },
    data: {
      title: `Code Block ${localNodes.value.length + 1}`,
      code: '',
      language: 'python',
      status: 'idle',
      useSharedKernel: pipelineKernelMode.value === 'shared',
      kernelName: pipelineKernelMode.value === 'shared' ? sharedKernelName.value : '',
      serverID: '',
      sessionId: '',
      output: null,
    },
  }
  
  localNodes.value.push(newNode)
}

const onNodesChange = (changes: any[]) => {
  if (isEditMode.value) {
    changes.forEach(change => {
      if (change.type === 'remove') {
        localNodes.value = localNodes.value.filter(node => node.id !== change.id)
      }
    })
  }
}

const onEdgesChange = (changes: any[]) => {
  if (isEditMode.value) {
    changes.forEach(change => {
      if (change.type === 'remove') {
        localEdges.value = localEdges.value.filter(edge => edge.id !== change.id)
      }
    })
  }
}

const onConnect = (connection: Connection) => {
  if (!isEditMode.value) return
  
  const newEdge: Edge = {
    id: `edge-${Date.now()}`,
    source: connection.source!,
    target: connection.target!,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
  }
  
  localEdges.value.push(newEdge)
}

const onNodeClick = (nodeMouseEvent: any) => {
  if (isEditMode.value && nodeMouseEvent.node.type === 'codeblock') {
    selectedNode.value = nodeMouseEvent.node
    showCodeEditor.value = true
  }
}

const onEdgeClick = (edgeMouseEvent: any) => {
  if (isEditMode.value) {
    // Handle edge click - could show edge properties
  }
}

const closeCodeEditor = () => {
  showCodeEditor.value = false
  selectedNode.value = null
}

const saveCodeBlock = () => {
  if (selectedNode.value) {
    // Update the node in localNodes
    const nodeIndex = localNodes.value.findIndex(n => n.id === selectedNode.value!.id)
    if (nodeIndex !== -1) {
      localNodes.value[nodeIndex] = { ...selectedNode.value }
    }
  }
  closeCodeEditor()
}

const deleteCodeBlock = () => {
  if (selectedNode.value) {
    // Remove node and connected edges
    localNodes.value = localNodes.value.filter(n => n.id !== selectedNode.value!.id)
    localEdges.value = localEdges.value.filter(e => 
      e.source !== selectedNode.value!.id && e.target !== selectedNode.value!.id
    )
  }
  closeCodeEditor()
}

const updateNodeCode = (code: string) => {
  if (selectedNode.value) {
    selectedNode.value.data.code = code
  }
}

const updateNodeOutput = (output: any) => {
  if (selectedNode.value) {
    selectedNode.value.data.output = output
  }
}

const onNodeKernelSelect = (kernelName: string, serverID: string) => {
  if (selectedNode.value) {
    selectedNode.value.data.kernelName = kernelName
    selectedNode.value.data.serverID = serverID
  }
}

const onNodeSessionSelect = (sessionId: string) => {
  if (selectedNode.value) {
    selectedNode.value.data.sessionId = sessionId
  }
}

const handleNodeExecute = () => {
  if (selectedNode.value) {
    selectedNode.value.data.status = 'running'
    executeCodeBlock(selectedNode.value)
  }
}

const getNodeStatusClass = (status: string) => {
  return {
    'status-idle': status === 'idle',
    'status-running': status === 'running',
    'status-completed': status === 'completed',
    'status-error': status === 'error',
  }
}

const applyKernelSettings = () => {
  // Apply kernel settings to all nodes if in shared mode
  if (pipelineKernelMode.value === 'shared') {
    localNodes.value.forEach(node => {
      node.data.useSharedKernel = true
      node.data.kernelName = sharedKernelName.value
    })
  }
  
  saveChanges()
  showKernelSettings.value = false
}

const executePipeline = async () => {
  if (!hasValidPipeline.value || isExecuting.value) return
  
  isExecuting.value = true
  
      try {
      // Build execution graph based on selected order
      let nodeOrder: string[]
      
      switch (executionOrder.value) {
        case 'topological':
          nodeOrder = buildTopologicalOrder()
          break
        case 'sequential':
          nodeOrder = localNodes.value.map(n => n.id)
          break
        case 'parallel':
          nodeOrder = await executeInParallel()
          return
        default:
          nodeOrder = buildTopologicalOrder()
      }
      
      // Execute nodes in order
      for (const nodeId of nodeOrder) {
      const node = localNodes.value.find(n => n.id === nodeId)
      if (node && node.data.code) {
        // Update node status
        node.data.status = 'running'
        
        try {
          // Execute the code block
          await executeCodeBlock(node)
          node.data.status = 'completed'
        } catch (error) {
          node.data.status = 'error'
          console.error(`Error executing node ${nodeId}:`, error)
          if (stopOnError.value) {
            break // Stop execution on error
          }
        }
      }
    }
  } finally {
    isExecuting.value = false
  }
}

const buildTopologicalOrder = (): string[] => {
  // Simple topological sort to determine execution order
  const visited = new Set<string>()
  const order: string[] = []
  
  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    
    // Visit dependencies first
    const incomingEdges = localEdges.value.filter(e => e.target === nodeId)
    for (const edge of incomingEdges) {
      visit(edge.source)
    }
    
    order.push(nodeId)
  }
  
  // Start with nodes that have no incoming edges
  const startNodes = localNodes.value.filter(node => 
    !localEdges.value.some(edge => edge.target === node.id)
  )
  
  for (const node of startNodes) {
    visit(node.id)
  }
  
  return order
}

const executeInParallel = async (): Promise<string[]> => {
  // Group nodes by dependency level
  const levels: string[][] = []
  const visited = new Set<string>()
  
  const getLevel = (nodeId: string): number => {
    if (visited.has(nodeId)) return 0
    visited.add(nodeId)
    
    const incomingEdges = localEdges.value.filter(e => e.target === nodeId)
    if (incomingEdges.length === 0) return 0
    
    return Math.max(...incomingEdges.map(e => getLevel(e.source))) + 1
  }
  
  // Calculate levels for all nodes
  localNodes.value.forEach(node => {
    const level = getLevel(node.id)
    if (!levels[level]) levels[level] = []
    levels[level].push(node.id)
  })
  
  // Execute each level in parallel
  for (const level of levels) {
    const promises = level.map(async nodeId => {
      const node = localNodes.value.find(n => n.id === nodeId)
      if (node && node.data.code) {
        node.data.status = 'running'
        try {
          await executeCodeBlock(node)
          node.data.status = 'completed'
        } catch (error) {
          node.data.status = 'error'
          console.error(`Error executing node ${nodeId}:`, error)
        }
      }
    })
    
    await Promise.all(promises)
  }
  
  return levels.flat()
}

const executeCodeBlock = async (node: Node) => {
  // Create a temporary code cell and execute it using the existing system
  const tempCellId = `pipeline-${node.id}-${Date.now()}`
  
  // Register the code cell with the execution store
  codeExecutionStore.addCell({
    id: tempCellId,
    code: node.data.code,
    output: '',
    kernelName: node.data.kernelName || '',
    sessionId: node.data.sessionId || '',
  })
  
  try {
    // Execute the cell using the existing code execution system
    await codeExecutionStore.executeCell(tempCellId)
    
    // Get the execution result
    const cell = codeExecutionStore.getCellById(tempCellId)
    if (cell && cell.hasError) {
      throw new Error(typeof cell.error === 'string' ? cell.error : 'Execution failed')
    }
    
    // Store the output in the node data
    node.data.output = cell?.output || null
    
    return cell?.output
  } finally {
    // Clean up the temporary cell
    // Note: We might want to keep it for debugging purposes
    // codeExecutionStore.removeCell(tempCellId)
  }
}

// Load available kernels
const loadAvailableKernels = async () => {
  // This would normally fetch from the Jupyter server
  // For now, we'll use some default kernels
  availableKernels.value = [
    { name: 'python3', display_name: 'Python 3' },
    { name: 'ir', display_name: 'R' },
    { name: 'javascript', display_name: 'JavaScript' },
  ]
}

// Watch for changes and save
watch([localNodes, localEdges], () => {
  if (!isEditMode.value) return
  saveChanges()
}, { deep: true })

onMounted(() => {
  loadAvailableKernels()
  
  // Initialize with some sample data if empty
  if (localNodes.value.length === 0) {
    localNodes.value = [
      {
        id: 'start',
        type: 'codeblock',
        position: { x: 100, y: 100 },
        data: {
          title: 'Start',
          code: 'print("Pipeline started")',
          language: 'python',
          status: 'idle',
          useSharedKernel: pipelineKernelMode.value === 'shared',
          kernelName: sharedKernelName.value,
          serverID: '',
          sessionId: '',
          output: null,
        },
      },
    ]
  }
})
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
}

.pipeline-focused {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

.pipeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
  border-radius: 6px 6px 0 0;
}

.pipeline-title-input {
  border: none;
  background: transparent;
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
  outline: none;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.pipeline-title-input:focus {
  background: hsl(var(--muted));
}

.pipeline-controls {
  display: flex;
  gap: 8px;
}

.pipeline-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.pipeline-btn:hover:not(:disabled) {
  background: hsl(var(--muted));
  border-color: hsl(var(--muted-foreground));
}

.pipeline-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pipeline-btn.active {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.pipeline-btn-execute {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.pipeline-btn-execute:hover:not(:disabled) {
  opacity: 0.9;
}

.pipeline-content {
  height: 400px;
  width: 100%;
  position: relative;
  background: hsl(var(--background));
}

.pipeline-content .vue-flow {
  width: 100%;
  height: 100%;
}

.vue-flow-readonly {
  pointer-events: none;
}

.vue-flow-readonly .vue-flow__node {
  pointer-events: auto;
}

.pipeline-code-node {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  min-width: 250px;
  max-width: 300px;
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.1);
  transition: all 0.2s ease;
}

.pipeline-code-node:hover {
  box-shadow: 0 4px 12px hsl(var(--foreground) / 0.15);
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

.code-node-title-section {
  flex: 1;
}

.code-node-title {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
  display: block;
  margin-bottom: 4px;
}

.code-node-kernel-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.kernel-name {
  font-weight: 500;
}

.kernel-mode {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
}

.kernel-mode.shared {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.kernel-mode.isolated {
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
}

.code-node-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(var(--muted-foreground));
}

.status-text {
  text-transform: capitalize;
}

.status-idle .status-dot {
  background: hsl(var(--muted-foreground));
}

.status-running .status-dot {
  background: hsl(var(--primary));
  animation: pulse 2s infinite;
}

.status-completed .status-dot {
  background: hsl(var(--primary));
}

.status-error .status-dot {
  background: hsl(var(--destructive));
}

.status-running .status-text {
  color: hsl(var(--primary));
}

.status-completed .status-text {
  color: hsl(var(--primary));
}

.status-error .status-text {
  color: hsl(var(--destructive));
}

.code-node-content {
  padding: 12px;
  position: relative;
}

.code-preview {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
  padding: 8px;
  border-radius: 4px;
  margin: 0 0 8px 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid hsl(var(--border));
}

.code-node-language {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--background));
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid hsl(var(--border));
}

.pipeline-handle {
  width: 12px;
  height: 12px;
  border: 2px solid hsl(var(--foreground));
  background: hsl(var(--background));
  transition: all 0.2s ease;
}

.pipeline-handle-input {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.pipeline-handle-output {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

/* Modal styles */
.code-editor-modal,
.kernel-settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: hsl(var(--background) / 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.code-editor-content,
.kernel-settings-content {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px hsl(var(--foreground) / 0.1);
}

.code-editor-header,
.kernel-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
}

.code-editor-header h3,
.kernel-settings-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}

.code-editor-body,
.kernel-settings-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.code-editor-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.code-title-input,
.code-language-select,
.kernel-select,
.setting-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  font-size: 14px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  transition: all 0.2s;
}

.code-title-input:focus,
.code-language-select:focus,
.kernel-select:focus,
.setting-select:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
}

.kernel-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: hsl(var(--muted));
  border-radius: 6px;
  border: 1px solid hsl(var(--border));
}

.kernel-mode-toggle {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: hsl(var(--foreground));
}

.toggle-input {
  width: 16px;
  height: 16px;
  accent-color: hsl(var(--primary));
}

.toggle-text {
  font-weight: 500;
}

.kernel-selection {
  margin-top: 8px;
}

.code-editor-container {
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  overflow: hidden;
  background: hsl(var(--background));
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.code-editor-footer,
.kernel-settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
}

.save-btn {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.save-btn:hover {
  opacity: 0.9;
}

.delete-btn {
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.delete-btn:hover {
  opacity: 0.9;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .code-editor-content,
  .kernel-settings-content {
    width: 95%;
    max-width: none;
  }
  
  .form-row {
    flex-direction: column;
  }
  
  .pipeline-code-node {
    min-width: 200px;
  }
}
</style> 