<template>
  <Teleport to="body">
    <div class="pipeline-toast-container">
      <TransitionGroup name="toast" tag="div">
        <div
          v-for="toast in visibleToasts"
          :key="toast.id"
          class="pipeline-toast"
          :class="[`toast-${toast.type}`, { 'toast-dismissible': toast.dismissible }]"
          @click="toast.dismissible && dismissToast(toast.id)"
        >
          <div class="toast-icon">
            <component :is="getToastIcon(toast.type)" class="w-4 h-4" />
          </div>
          
          <div class="toast-content">
            <div class="toast-title">{{ toast.title }}</div>
            <div v-if="toast.message" class="toast-message">{{ toast.message }}</div>
            <div v-if="toast.nodeId" class="toast-node">Node: {{ getNodeTitle(toast.nodeId) }}</div>
          </div>
          
          <button
            v-if="toast.dismissible"
            class="toast-dismiss"
            @click.stop="dismissToast(toast.id)"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  CheckCircle as SuccessIcon,
  AlertCircle as WarningIcon,
  XCircle as ErrorIcon,
  Info as InfoIcon,
  X
} from 'lucide-vue-next'

export interface PipelineToast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  nodeId?: string
  duration?: number
  dismissible?: boolean
  timestamp: number
}

interface Props {
  toasts: PipelineToast[]
  nodes: Array<{ id: string; data: { title?: string } }>
}

interface Emits {
  (e: 'dismiss', id: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visibleToasts = computed(() => {
  return props.toasts.slice(0, 5) // Limit to 5 visible toasts
})

const getToastIcon = (type: string) => {
  switch (type) {
    case 'success': return SuccessIcon
    case 'error': return ErrorIcon
    case 'warning': return WarningIcon
    default: return InfoIcon
  }
}

const getNodeTitle = (nodeId: string) => {
  const node = props.nodes.find(n => n.id === nodeId)
  return node?.data?.title || nodeId
}

const dismissToast = (id: string) => {
  emit('dismiss', id)
}
</script>

<style scoped>
.pipeline-toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.pipeline-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: 0 4px 12px hsl(var(--foreground) / 0.15);
  max-width: 350px;
  pointer-events: auto;
  transition: all 0.2s ease;
}

.pipeline-toast:hover {
  box-shadow: 0 6px 16px hsl(var(--foreground) / 0.2);
}

.toast-success {
  border-left: 4px solid hsl(var(--success));
}

.toast-error {
  border-left: 4px solid hsl(var(--destructive));
}

.toast-warning {
  border-left: 4px solid hsl(var(--warning));
}

.toast-info {
  border-left: 4px solid hsl(var(--primary));
}

.toast-dismissible {
  cursor: pointer;
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.toast-success .toast-icon {
  color: hsl(var(--success));
}

.toast-error .toast-icon {
  color: hsl(var(--destructive));
}

.toast-warning .toast-icon {
  color: hsl(var(--warning));
}

.toast-info .toast-icon {
  color: hsl(var(--primary));
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 500;
  font-size: 14px;
  color: hsl(var(--foreground));
  margin-bottom: 2px;
}

.toast-message {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  line-height: 1.4;
  word-break: break-word;
}

.toast-node {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted));
  padding: 2px 6px;
  border-radius: 3px;
  margin-top: 4px;
  display: inline-block;
}

.toast-dismiss {
  flex-shrink: 0;
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
  transition: all 0.15s ease;
}

.toast-dismiss:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
}

/* Toast animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style> 