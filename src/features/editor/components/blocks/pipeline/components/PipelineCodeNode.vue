<template>
  <div 
    class="pipeline-code-node" 
    :class="nodeClasses"
  >
    <!-- Quick Actions -->
    <div v-if="isEditMode" class="node-quick-actions">
      <button @click.stop="$emit('duplicate', id)" class="quick-action-btn" title="Duplicate">
        <CopyIcon class="w-3 h-3" />
      </button>
      <button @click.stop="$emit('delete', id)" class="quick-action-btn delete" title="Delete">
        <TrashIcon class="w-3 h-3" />
      </button>
    </div>

    <!-- Node Header -->
    <div class="code-node-header" title="Click to edit code">
      <div class="code-node-title-section">
        <div class="code-node-title-row">
          <span class="code-node-title">{{ data.title || 'Code Block' }}</span>
          <div v-if="data.status === 'running'" class="execution-indicator">
            <LoaderIcon class="w-3 h-3 animate-spin" />
          </div>
        </div>
        <div v-if="data.kernelName" class="code-node-kernel-info">
          <CpuIcon class="w-3 h-3" />
          <span class="kernel-name">{{ data.kernelName }}</span>
          <span class="kernel-mode" :class="data.useSharedKernel ? 'shared' : 'isolated'">
            {{ data.useSharedKernel ? 'Shared' : 'Isolated' }}
          </span>
        </div>
      </div>
      <div class="code-node-status" :class="statusClasses">
        <div class="status-dot"></div>
        <span class="status-text">{{ data.status }}</span>
      </div>
    </div>
    
    <!-- Node Content -->
    <div class="code-node-content">
      <pre class="code-preview">{{ codePreview }}</pre>
      <div class="code-node-footer">
        <div class="code-node-language">{{ data.language || 'python' }}</div>
        <div v-if="data.output" class="code-node-stats">
          <ClockIcon class="w-3 h-3" />
          <span class="execution-time">{{ executionTime }}</span>
        </div>
      </div>
    </div>

    <!-- Input Handle -->
    <div 
      class="handle-container handle-container-input" 
      :class="{ 
        'handle-potential-target': isPotentialTarget,
        'handle-available-target': nodeState?.isPotentialTarget
      }"
      @click.stop="handleInputClick"
      @mousedown.stop
    >
      <Handle 
        type="target" 
        :position="Position.Top" 
        :id="`${id}-input`" 
        class="pipeline-handle pipeline-handle-input" 
        :class="handleClasses.input"
        :connectable="false"
      >
        <div class="handle-core">
          <div class="handle-icon">
            <ArrowDownIcon class="w-3 h-3" />
          </div>
        </div>
        <div v-if="isEditMode" class="handle-tooltip">
          <span v-if="nodeState?.isPotentialTarget">Click to complete connection</span>
          <span v-else>Input connection point</span>
        </div>
      </Handle>
    </div>

    <!-- Output Handle -->
    <div 
      class="handle-container handle-container-output"
      :class="{ 
        'handle-connecting-source': nodeState?.isConnectingSource
      }"
      @click.stop="handleOutputClick"
      @mousedown.stop
    >
      <Handle 
        type="source" 
        :position="Position.Bottom" 
        :id="`${id}-output`" 
        class="pipeline-handle pipeline-handle-output" 
        :class="handleClasses.output"
        :connectable="false"
      >
        <div class="handle-core">
          <div class="handle-icon">
            <ArrowUpIcon class="w-3 h-3" />
          </div>
        </div>
        <div v-if="isEditMode" class="handle-tooltip">
          <span v-if="nodeState?.isConnectingSource">Click target to connect</span>
          <span v-else class="drag-cta">Click to start connection</span>
        </div>
      </Handle>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { 
  Copy as CopyIcon,
  Trash as TrashIcon,
  Loader as LoaderIcon,
  Cpu as CpuIcon,
  Clock as ClockIcon,
  ArrowDown as ArrowDownIcon,
  ArrowUp as ArrowUpIcon,
} from 'lucide-vue-next'

interface NodeData {
  title: string
  code: string
  language: string
  status: 'idle' | 'running' | 'completed' | 'error'
  useSharedKernel?: boolean
  kernelName?: string
  output?: any
  executionTime?: number
}

interface NodeState {
  isHovered?: boolean
  isDragging?: boolean
  isSelected?: boolean
  isExecuting?: boolean
  isConnectingSource?: boolean
  isPotentialTarget?: boolean
}

interface Props {
  id: string
  data: NodeData
  isEditMode: boolean
  nodeState?: NodeState
  isPotentialTarget?: boolean
  isFocused?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  nodeState: () => ({}),
  isPotentialTarget: false,
  isFocused: false
})

const emit = defineEmits<{
  duplicate: [id: string]
  delete: [id: string]
  handleClick: [nodeId: string, handleId: string, handleType: 'source' | 'target']
}>()

// Computed properties
const nodeClasses = computed(() => ({
  'node-selected': props.nodeState?.isSelected,
  'node-executing': props.data.status === 'running',
  'node-error': props.data.status === 'error',
  'node-completed': props.data.status === 'completed',
  'node-hovered': props.nodeState?.isHovered,
  'node-dragging': props.nodeState?.isDragging,
  'node-focused': props.isFocused
}))

const statusClasses = computed(() => ({
  'status-idle': props.data.status === 'idle',
  'status-running': props.data.status === 'running',
  'status-completed': props.data.status === 'completed',
  'status-error': props.data.status === 'error'
}))

const handleClasses = computed(() => ({
  input: {
    'handle-connecting': false, // Will be set by parent
    'handle-active': props.isEditMode
  },
  output: {
    'handle-connecting': false, // Will be set by parent
    'handle-pulse': props.isEditMode,
    'handle-active': props.isEditMode
  }
}))

const codePreview = computed(() => {
  if (!props.data.code) return '# Add your code here'
  
  const lines = props.data.code.split('\n')
  const preview = lines.slice(0, 3).join('\n')
  return lines.length > 3 ? `${preview}\n...` : preview
})

const executionTime = computed(() => {
  return props.data.executionTime ? `${props.data.executionTime}ms` : 'N/A'
})

// Handle click methods
const handleInputClick = () => {
  if (props.isEditMode) {
    emit('handleClick', props.id, `${props.id}-input`, 'target')
  }
}

const handleOutputClick = () => {
  if (props.isEditMode) {
    emit('handleClick', props.id, `${props.id}-output`, 'source')
  }
}
</script>

<style scoped>
.pipeline-code-node {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  min-width: 250px;
  max-width: 300px;
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.1);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  will-change: transform, box-shadow;
  /* Ensure handles don't interfere with node interactions */
  isolation: isolate;
}

.pipeline-code-node.node-hovered {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px hsl(var(--foreground) / 0.15);
}

.pipeline-code-node.node-dragging {
  cursor: grabbing;
  opacity: 0.8;
  transform: scale(1.02);
  box-shadow: 0 8px 16px hsl(var(--foreground) / 0.2);
}

.pipeline-code-node.node-selected {
  box-shadow: 0 0 0 2px hsl(var(--primary)), 0 4px 12px hsl(var(--foreground) / 0.15) !important;
  z-index: 1;
}

.pipeline-code-node.node-executing {
  animation: pulse-border 2s infinite;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.5), 0 4px 12px hsl(var(--foreground) / 0.15);
}

.pipeline-code-node.node-completed {
  border-color: hsl(var(--success)) !important;
  box-shadow: 0 0 0 2px hsl(var(--success) / 0.5), 0 4px 12px hsl(var(--foreground) / 0.15);
}

.pipeline-code-node.node-error {
  border-color: hsl(var(--destructive)) !important;
  box-shadow: 0 0 0 2px hsl(var(--destructive) / 0.5), 0 4px 12px hsl(var(--foreground) / 0.15);
}

.pipeline-code-node.node-focused {
  animation: focus-highlight 0.5s ease-out;
  z-index: 10;
}

@keyframes focus-highlight {
  0% { 
    box-shadow: 0 0 0 0 hsl(var(--primary) / 0.8);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 0 8px hsl(var(--primary) / 0.2);
    transform: scale(1.02);
  }
  100% { 
    box-shadow: 0 0 0 2px hsl(var(--primary));
    transform: scale(1);
  }
}

@keyframes pulse-border {
  0% {
    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.8), 0 4px 12px hsl(var(--foreground) / 0.15);
  }
  50% {
    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.4), 0 4px 12px hsl(var(--foreground) / 0.15);
  }
  100% {
    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.8), 0 4px 12px hsl(var(--foreground) / 0.15);
  }
}

/* Node Quick Actions */
.node-quick-actions {
  position: absolute;
  top: -8px;
  right: -8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}

.pipeline-code-node:hover .node-quick-actions {
  opacity: 1;
}

.quick-action-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px hsl(var(--foreground) / 0.1);
  transition: all 0.2s;
}

.quick-action-btn:hover {
  transform: scale(1.1);
}

.quick-action-btn.delete {
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
}

/* Node Header */
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

.code-node-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.code-node-title {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
  display: block;
  margin-bottom: 4px;
}

.execution-indicator {
  color: hsl(var(--primary-foreground));
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: hsl(var(--primary));
  display: flex;
  align-items: center;
  justify-content: center;
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

/* Node Status */
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

.status-running .status-dot,
.status-completed .status-dot {
  background: hsl(var(--primary));
}

.status-running .status-dot {
  animation: pulse 2s infinite;
}

.status-error .status-dot {
  background: hsl(var(--destructive));
}

.status-running .status-text,
.status-completed .status-text {
  color: hsl(var(--primary));
}

.status-error .status-text {
  color: hsl(var(--destructive));
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Node Content */
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
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre;
  border: 1px solid hsl(var(--border));
}

.code-node-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.code-node-language,
.execution-time {
  font-size: 10px;
  color: hsl(var(--muted-foreground));
}

.code-node-stats {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Handle Containers */
.handle-container {
  position: absolute;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.handle-container:hover {
  transform: scale(1.05);
}

.handle-container-input {
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 28px;
}

.handle-container-output {
  bottom: -14px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 28px;
}

/* Handles */
.pipeline-handle {
  width: 24px;
  height: 24px;
  border: 3px solid hsl(var(--primary));
  background: hsl(var(--background));
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
  cursor: grab;
  border-radius: 50%;
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.2);
}

.pipeline-handle:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 16px hsl(var(--primary) / 0.4), 0 0 0 4px hsl(var(--primary) / 0.2);
  border-width: 4px;
}

.handle-core {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: hsl(var(--primary) / 0.1);
  transition: all 0.2s;
}

.pipeline-handle:hover .handle-core {
  background: hsl(var(--primary) / 0.2);
}

.pipeline-handle-input {
  border-color: hsl(var(--success));
}

.pipeline-handle-input:hover {
  box-shadow: 0 4px 16px hsl(var(--success) / 0.4), 0 0 0 4px hsl(var(--success) / 0.2);
  border-color: hsl(var(--success));
}

.pipeline-handle-input .handle-core {
  background: hsl(var(--success) / 0.1);
}

.pipeline-handle-input:hover .handle-core {
  background: hsl(var(--success) / 0.2);
}

.pipeline-handle-output {
  border-color: hsl(var(--primary));
}

.handle-connecting {
  transform: scale(1.4) !important;
  box-shadow: 0 4px 20px hsl(var(--primary) / 0.6), 0 0 0 6px hsl(var(--primary) / 0.3) !important;
  border-width: 4px !important;
}

.handle-potential-target .pipeline-handle-input,
.handle-available-target .pipeline-handle-input {
  animation: pulse-glow 1.2s infinite cubic-bezier(0.4, 0, 0.2, 1);
  border-color: hsl(var(--success)) !important;
}

.handle-connecting-source .pipeline-handle-output {
  animation: connecting-source 1s infinite cubic-bezier(0.4, 0, 0.2, 1);
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 4px 20px hsl(var(--primary) / 0.6), 0 0 0 6px hsl(var(--primary) / 0.3) !important;
  transform: scale(1.2);
}

@keyframes connecting-source {
  0%, 100% {
    border-width: 3px;
    opacity: 1;
  }
  50% {
    border-width: 5px;
    opacity: 0.8;
  }
}

.handle-pulse {
  animation: pulse-handle 2s infinite;
}

@keyframes pulse-glow {
  0% {
    box-shadow: 0 2px 8px hsl(var(--success) / 0.4), 0 0 0 0 hsl(var(--success) / 0.8);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 6px 20px hsl(var(--success) / 0.6), 0 0 0 12px hsl(var(--success) / 0);
    transform: scale(1.3);
  }
  100% {
    box-shadow: 0 2px 8px hsl(var(--success) / 0.4), 0 0 0 0 hsl(var(--success) / 0);
    transform: scale(1);
  }
}

@keyframes pulse-handle {
  0% {
    box-shadow: 0 2px 8px hsl(var(--primary) / 0.2), 0 0 0 0 hsl(var(--primary) / 0.4);
  }
  70% {
    box-shadow: 0 4px 16px hsl(var(--primary) / 0.4), 0 0 0 10px hsl(var(--primary) / 0);
  }
  100% {
    box-shadow: 0 2px 8px hsl(var(--primary) / 0.2), 0 0 0 0 hsl(var(--primary) / 0);
  }
}

.handle-tooltip {
  position: absolute;
  background: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 30;
  border: 1px solid hsl(var(--border));
  box-shadow: 0 4px 12px hsl(var(--foreground) / 0.15);
  transform-origin: center;
}

.pipeline-handle-input .handle-tooltip {
  top: -45px;
  left: 50%;
  transform: translateX(-50%) translateY(10px) scale(0.9);
}

.pipeline-handle-output .handle-tooltip {
  bottom: -45px;
  left: 50%;
  transform: translateX(-50%) translateY(-10px) scale(0.9);
}

.pipeline-handle:hover .handle-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.drag-cta {
  color: hsl(var(--primary));
  font-weight: 600;
}

/* Enhanced visibility in edit mode */
.pipeline-code-node:hover .pipeline-handle {
  opacity: 1;
  transform: scale(1.05);
}

/* Hide handles in readonly mode */
.vue-flow-readonly .pipeline-handle {
  opacity: 0.3;
  pointer-events: none;
}

/* Active handle state for edit mode */
.handle-active {
  opacity: 1;
  border-width: 3px;
}

/* Enhance handle visibility on node hover */
.pipeline-code-node:hover .handle-active {
  transform: scale(1.1);
  opacity: 1;
}

/* Connection line styling improvements */
.pipeline-handle.connecting {
  animation: connecting-pulse 0.8s infinite ease-in-out;
}

@keyframes connecting-pulse {
  0%, 100% {
    transform: scale(1.2);
    opacity: 1;
  }
  50% {
    transform: scale(1.4);
    opacity: 0.8;
  }
}

/* Improved drag cursor feedback */
.pipeline-handle:active {
  cursor: grabbing;
  transform: scale(1.3);
  box-shadow: 0 6px 24px hsl(var(--primary) / 0.5), 0 0 0 8px hsl(var(--primary) / 0.2);
}

/* Handle icon improvements */
.handle-icon {
  transition: all 0.2s;
  color: hsl(var(--primary));
}

.pipeline-handle-input .handle-icon {
  color: hsl(var(--success));
}

.pipeline-handle:hover .handle-icon {
  transform: scale(1.1);
}
</style> 