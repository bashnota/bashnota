<template>
  <div class="node-wrapper">
    <!-- Input Handle - Outside the node -->
    <div 
      v-if="isEditMode"
      class="external-handle external-handle-input" 
      :class="{ 
        'handle-potential-target': isPotentialTarget,
        'handle-available-target': nodeState?.isPotentialTarget
      }"
      @click.stop="handleInputClick"
      @mousedown.stop
      @pointerdown.stop
    >
      <Handle 
        type="target" 
        :position="Position.Top" 
        :id="`${id}-input`" 
        class="pipeline-handle pipeline-handle-input" 
        :class="handleClasses.input"
        :connectable="false"
        tabindex="0"
        @keydown="handleInputKeydown"
      >
        <div class="handle-core">
          <div class="handle-icon">
            <ArrowDownIcon class="w-4 h-4" />
          </div>
        </div>
        <div class="handle-tooltip">
          <span v-if="nodeState?.isPotentialTarget">Click to complete connection</span>
          <span v-else>Input (accepts multiple connections)</span>
        </div>
      </Handle>
    </div>

    <!-- Main Node Content -->
    <div 
      class="pipeline-code-node" 
      :class="nodeClasses"
    >
      <!-- Quick Actions -->
      <div v-if="isEditMode" class="node-quick-actions">
        <button @click.stop="$emit('duplicate', id)" class="quick-action-btn" title="Duplicate (Ctrl+D)">
          <CopyIcon class="w-4 h-4" />
        </button>
        <button @click.stop="$emit('delete', id)" class="quick-action-btn delete" title="Delete (Del)">
          <TrashIcon class="w-4 h-4" />
        </button>
      </div>

      <!-- Node Header -->
      <div class="code-node-header" title="Click to edit code">
        <div class="code-node-title-section">
          <div class="code-node-title-row">
            <span class="code-node-title">{{ data.title || 'Code Block' }}</span>
            <div v-if="data.status === 'running'" class="execution-indicator">
              <LoaderIcon class="w-4 h-4 animate-spin" />
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
        <div class="code-preview-container">
          <pre class="code-preview">{{ codePreview }}</pre>
          <div v-if="!data.code" class="empty-code-hint">
            <span>Click to add code</span>
          </div>
        </div>
        <div class="code-node-footer">
          <div class="code-node-language">
            <span class="language-badge">{{ data.language || 'python' }}</span>
          </div>
          <div v-if="data.executionTime" class="code-node-stats">
            <ClockIcon class="w-3 h-3" />
            <span class="execution-time">{{ executionTime }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Output Handle - Outside the node -->
    <div 
      v-if="isEditMode"
      class="external-handle external-handle-output"
      :class="{ 
        'handle-connecting-source': nodeState?.isConnectingSource
      }"
      @click.stop="handleOutputClick"
      @mousedown.stop
      @pointerdown.stop
    >
      <Handle 
        type="source" 
        :position="Position.Bottom" 
        :id="`${id}-output`" 
        class="pipeline-handle pipeline-handle-output" 
        :class="handleClasses.output"
        :connectable="false"
        tabindex="0"
        @keydown="handleOutputKeydown"
      >
        <div class="handle-core">
          <div class="handle-icon">
            <ArrowUpIcon class="w-4 h-4" />
          </div>
        </div>
        <div class="handle-tooltip">
          <span v-if="nodeState?.isConnectingSource">Click targets to connect (multiple allowed)</span>
          <span v-else class="drag-cta">Click to connect to other blocks</span>
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

// Keyboard navigation for handles
const handleInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleInputClick()
  }
}

const handleOutputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleOutputClick()
  }
}
</script>

<style scoped>
/* Node Wrapper - Contains everything */
.node-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}

/* External Handles - Positioned outside the node */
.external-handle {
  position: absolute;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: all;
  /* Ensure handles always receive pointer events */
  isolation: isolate;
}

.external-handle-input {
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 32px;
}

.external-handle-output {
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 32px;
}

/* Main Node */
.pipeline-code-node {
  background: hsl(var(--card));
  border: 2px solid hsl(var(--border));
  border-radius: 12px;
  min-width: 280px;
  max-width: 320px;
  box-shadow: 
    0 4px 6px -1px hsl(var(--foreground) / 0.1),
    0 2px 4px -1px hsl(var(--foreground) / 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(8px);
  /* Prevent node from interfering with handles */
  margin: 20px 0;
}

.pipeline-code-node:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 10px 25px -3px hsl(var(--foreground) / 0.1),
    0 4px 6px -2px hsl(var(--foreground) / 0.05);
  border-color: hsl(var(--primary) / 0.3);
}

.pipeline-code-node.node-selected {
  border-color: hsl(var(--primary));
  box-shadow: 
    0 0 0 3px hsl(var(--primary) / 0.2),
    0 10px 25px -3px hsl(var(--foreground) / 0.1);
  z-index: 10;
}

.pipeline-code-node.node-executing {
  animation: pulse-border 2s infinite;
  border-color: hsl(var(--primary));
}

.pipeline-code-node.node-completed {
  border-color: hsl(var(--success));
  background: linear-gradient(135deg, hsl(var(--card)), hsl(var(--success) / 0.05));
}

.pipeline-code-node.node-error {
  border-color: hsl(var(--destructive));
  background: linear-gradient(135deg, hsl(var(--card)), hsl(var(--destructive) / 0.05));
}

.pipeline-code-node.node-focused {
  animation: focus-highlight 0.6s ease-out;
  z-index: 15;
}

@keyframes focus-highlight {
  0% { 
    transform: scale(1) translateY(0);
    box-shadow: 0 0 0 0 hsl(var(--primary) / 0.8);
  }
  50% { 
    transform: scale(1.05) translateY(-4px);
    box-shadow: 0 0 0 12px hsl(var(--primary) / 0.2);
  }
  100% { 
    transform: scale(1) translateY(-2px);
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2);
  }
}

@keyframes pulse-border {
  0%, 100% {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2);
  }
  50% {
    border-color: hsl(var(--primary) / 0.7);
    box-shadow: 0 0 0 6px hsl(var(--primary) / 0.1);
  }
}

/* Quick Actions */
.node-quick-actions {
  position: absolute;
  top: 8px;
  right: 8px;
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
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  border: 1px solid hsl(var(--border));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px hsl(var(--foreground) / 0.1);
}

.quick-action-btn:hover {
  background: hsl(var(--accent));
  transform: scale(1.1);
  box-shadow: 0 4px 8px hsl(var(--foreground) / 0.15);
}

.quick-action-btn.delete:hover {
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
  border-color: hsl(var(--destructive));
}

/* Node Header */
.code-node-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background: linear-gradient(135deg, hsl(var(--muted) / 0.8), hsl(var(--muted) / 0.4));
  border-bottom: 1px solid hsl(var(--border));
  backdrop-filter: blur(4px);
}

.code-node-title-section {
  flex: 1;
  min-width: 0;
}

.code-node-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.code-node-title {
  font-size: 15px;
  font-weight: 600;
  color: hsl(var(--foreground));
  line-height: 1.3;
  word-break: break-word;
}

.execution-indicator {
  color: hsl(var(--primary-foreground));
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: hsl(var(--primary));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.code-node-kernel-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.kernel-name {
  font-weight: 500;
  color: hsl(var(--foreground) / 0.8);
}

.kernel-mode {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kernel-mode.shared {
  background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
  border: 1px solid hsl(var(--primary) / 0.3);
}

.kernel-mode.isolated {
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  border: 1px solid hsl(var(--border));
}

/* Node Status */
.code-node-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 8px;
  background: hsl(var(--background) / 0.8);
  border: 1px solid hsl(var(--border));
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.status-text {
  text-transform: capitalize;
  min-width: 0;
}

.status-idle .status-dot {
  background: hsl(var(--muted-foreground));
}

.status-running .status-dot {
  background: hsl(var(--primary));
  animation: pulse-dot 1.5s infinite;
}

.status-completed .status-dot {
  background: hsl(var(--success));
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

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

/* Node Content */
.code-node-content {
  padding: 16px;
  position: relative;
}

.code-preview-container {
  position: relative;
  margin-bottom: 12px;
}

.code-preview {
  font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.4;
  color: hsl(var(--foreground));
  background: hsl(var(--muted) / 0.5);
  padding: 12px;
  border-radius: 8px;
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre;
  border: 1px solid hsl(var(--border));
  backdrop-filter: blur(2px);
  min-height: 60px;
  display: flex;
  align-items: center;
}

.empty-code-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: hsl(var(--muted-foreground));
  font-style: italic;
  font-size: 12px;
  pointer-events: none;
}

.code-node-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.language-badge {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid hsl(var(--primary) / 0.3);
}

.code-node-stats {
  display: flex;
  align-items: center;
  gap: 4px;
  color: hsl(var(--muted-foreground));
  font-size: 11px;
}

.execution-time {
  font-weight: 500;
}

/* Enhanced Handles */
.pipeline-handle {
  width: 32px;
  height: 32px;
  border: 3px solid hsl(var(--primary));
  background: hsl(var(--background));
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  box-shadow: 
    0 4px 12px hsl(var(--foreground) / 0.15),
    0 0 0 2px hsl(var(--background));
  pointer-events: all;
  position: relative;
}

.pipeline-handle:hover {
  transform: scale(1.3);
  box-shadow: 
    0 8px 25px hsl(var(--primary) / 0.3),
    0 0 0 4px hsl(var(--primary) / 0.2),
    0 0 0 6px hsl(var(--background));
  border-width: 4px;
}

.handle-core {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle, hsl(var(--primary) / 0.1), transparent 70%);
  transition: all 0.3s;
}

.pipeline-handle:hover .handle-core {
  background: radial-gradient(circle, hsl(var(--primary) / 0.2), transparent 70%);
}

.pipeline-handle-input {
  border-color: hsl(var(--success));
}

.pipeline-handle-input:hover {
  box-shadow: 
    0 8px 25px hsl(var(--success) / 0.3),
    0 0 0 4px hsl(var(--success) / 0.2),
    0 0 0 6px hsl(var(--background));
  border-color: hsl(var(--success));
}

.pipeline-handle-input .handle-core {
  background: radial-gradient(circle, hsl(var(--success) / 0.1), transparent 70%);
}

.pipeline-handle-input:hover .handle-core {
  background: radial-gradient(circle, hsl(var(--success) / 0.2), transparent 70%);
}

/* Connection States */
.handle-potential-target .pipeline-handle-input,
.handle-available-target .pipeline-handle-input {
  animation: pulse-glow-success 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
  border-color: hsl(var(--success)) !important;
  transform: scale(1.2);
}

.handle-connecting-source .pipeline-handle-output {
  animation: pulse-glow-primary 1.2s infinite cubic-bezier(0.4, 0, 0.2, 1);
  border-color: hsl(var(--primary)) !important;
  transform: scale(1.2);
  box-shadow: 
    0 8px 25px hsl(var(--primary) / 0.4),
    0 0 0 6px hsl(var(--primary) / 0.3),
    0 0 0 8px hsl(var(--background));
}

@keyframes pulse-glow-success {
  0%, 100% {
    box-shadow: 
      0 4px 12px hsl(var(--success) / 0.3),
      0 0 0 0 hsl(var(--success) / 0.8),
      0 0 0 2px hsl(var(--background));
  }
  50% {
    box-shadow: 
      0 8px 25px hsl(var(--success) / 0.5),
      0 0 0 12px hsl(var(--success) / 0),
      0 0 0 2px hsl(var(--background));
  }
}

@keyframes pulse-glow-primary {
  0%, 100% {
    box-shadow: 
      0 4px 12px hsl(var(--primary) / 0.3),
      0 0 0 0 hsl(var(--primary) / 0.8),
      0 0 0 2px hsl(var(--background));
  }
  50% {
    box-shadow: 
      0 8px 25px hsl(var(--primary) / 0.5),
      0 0 0 12px hsl(var(--primary) / 0),
      0 0 0 2px hsl(var(--background));
  }
}

/* Handle Tooltips */
.handle-tooltip {
  position: absolute;
  background: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  z-index: 200;
  border: 1px solid hsl(var(--border));
  box-shadow: 0 8px 16px hsl(var(--foreground) / 0.15);
  transform-origin: center;
  font-weight: 500;
}

.external-handle-input .handle-tooltip {
  top: -50px;
  left: 50%;
  transform: translateX(-50%) translateY(8px) scale(0.9);
}

.external-handle-output .handle-tooltip {
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%) translateY(-8px) scale(0.9);
}

.pipeline-handle:hover .handle-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.drag-cta {
  color: hsl(var(--primary));
  font-weight: 600;
}

/* Enhanced visibility and interactions */
.external-handle:hover {
  transform: translateX(-50%) scale(1.05);
}

/* Hide handles in readonly mode */
.vue-flow-readonly .external-handle {
  display: none;
}

/* Handle icon improvements */
.handle-icon {
  transition: all 0.2s;
  color: hsl(var(--primary));
  display: flex;
  align-items: center;
  justify-content: center;
}

.pipeline-handle-input .handle-icon {
  color: hsl(var(--success));
}

.pipeline-handle:hover .handle-icon {
  transform: scale(1.1);
}

/* Active handle state */
.handle-active {
  opacity: 1;
  border-width: 3px;
}

/* Improved accessibility */
.pipeline-handle:focus {
  outline: 3px solid hsl(var(--primary) / 0.5);
  outline-offset: 2px;
}

/* Remove old container styles that are no longer needed */
.handle-container,
.handle-container-input,
.handle-container-output {
  /* These are replaced by external-handle classes */
  display: none;
}
</style> 