<template>
  <div class="terminal-header">
    <!-- Mode toggle buttons -->
    <div class="terminal-mode-toggles" role="toolbar" aria-label="Terminal display modes">
      <button 
        class="mode-toggle-btn" 
        :class="{ active: props.displayMode === 'bottom' }"
        @click.stop="emit('set-display-mode', 'bottom')"
        title="Bottom Mode"
        :aria-pressed="props.displayMode === 'bottom'"
      >
        <ArrowDown class="w-4 h-4" />
        <span class="sr-only">Bottom Mode</span>
      </button>
      <button 
        class="mode-toggle-btn" 
        :class="{ active: props.displayMode === 'side' }"
        @click.stop="emit('set-display-mode', 'side')"
        title="Side Mode"
        :aria-pressed="props.displayMode === 'side'"
      >
        <PanelRight class="w-4 h-4" />
        <span class="sr-only">Side Mode</span>
      </button>
      <button 
        class="mode-toggle-btn" 
        :class="{ active: props.displayMode === 'right-nav' }"
        @click.stop="emit('set-display-mode', 'right-nav')"
        title="Right Nav Mode"
        :aria-pressed="props.displayMode === 'right-nav'"
      >
        <Sidebar class="w-4 h-4" />
        <span class="sr-only">Right Nav Mode</span>
      </button>
    </div>
    
    <div class="terminal-header-left">
      <div class="terminal-title-section">
        <Bot class="h-4 w-4 mr-2 text-primary" />
        <span class="terminal-title hide-when-narrow">Vibe</span>
        <span v-if="props.status" class="terminal-status-indicator" :class="statusClass">
          <span class="status-dot" :class="statusClass"></span>
          <span class="status-text">{{ statusLabel }}</span>
        </span>
      </div>
      
      <div v-if="!props.isCollapsed && props.hasActiveTasks" class="terminal-stats">
        <Badge 
          :variant="props.hasFailedTasks ? 'destructive' : (props.hasAllCompleted ? 'secondary' : 'secondary')" 
          :class="['task-badge', { 'completed-badge': props.hasAllCompleted }]"
        >
          {{ props.completedTaskCount }}/{{ props.totalTaskCount }} Tasks
        </Badge>
        
        <div v-if="props.tasksInQueue > 0" class="queue-indicator">
          <Badge variant="secondary" class="queue-badge">
            {{ props.tasksInQueue }} in queue
          </Badge>
        </div>
      </div>
    </div>
    
    <div class="terminal-header-actions">
      <!-- Action buttons - only show when not collapsed -->
      <div v-if="!props.isCollapsed && props.hasActiveBoard" class="action-buttons">
        <Tooltip content="Stop execution">
          <Button 
            @click.stop="emit('stop-execution')" 
            variant="ghost" 
            size="icon"
            class="h-6 w-6 action-button"
            :disabled="!props.hasInProgressTasks"
            aria-label="Stop execution"
          >
            <Square class="h-3.5 w-3.5 text-destructive" />
          </Button>
        </Tooltip>
        
        <Tooltip content="Restart agent">
          <Button 
            @click.stop="emit('restart-agent')" 
            variant="ghost" 
            size="icon"
            class="h-6 w-6 action-button"
            aria-label="Restart agent"
          >
            <RotateCw class="h-3.5 w-3.5 text-blue-500" />
          </Button>
        </Tooltip>
        
        <Tooltip content="Clear terminal">
          <Button 
            @click.stop="emit('clear-terminal')" 
            variant="ghost" 
            size="icon"
            class="h-6 w-6 action-button"
            aria-label="Clear terminal"
          >
            <Eraser class="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </Tooltip>
        
        <Tooltip content="Delete agent">
          <Button 
            @click.stop="emit('delete-agent')" 
            variant="ghost" 
            size="icon"
            class="h-6 w-6 action-button"
            aria-label="Delete agent"
          >
            <Trash class="h-3.5 w-3.5 text-destructive" />
          </Button>
        </Tooltip>
      </div>
      
      <!-- Close button -->
      <Tooltip content="Close terminal">
        <Button 
          @click.stop="emit('close')" 
          variant="ghost" 
          size="icon"
          class="h-6 w-6 action-button close-button"
          aria-label="Close terminal"
        >
          <X class="h-3.5 w-3.5 text-destructive" />
        </Button>
      </Tooltip>
      
      <!-- Toggle fullscreen button -->
      <Tooltip :content="props.isFullscreen ? 'Exit fullscreen' : 'Fullscreen mode'">
        <Button 
          @click.stop="emit('toggle-fullscreen')" 
          variant="ghost" 
          size="icon"
          class="h-6 w-6 action-button"
          aria-label="Toggle fullscreen"
        >
          <Maximize2 v-if="!props.isFullscreen" class="h-3.5 w-3.5 text-blue-500" />
          <Minimize2 v-else class="h-3.5 w-3.5 text-blue-500" />
        </Button>
      </Tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { Square, RotateCw, Trash, Maximize2, Minimize2, ChevronDown, Eraser, ArrowDown, PanelRight, Sidebar, X, Bot } from 'lucide-vue-next'

// Props with proper TypeScript typings
const props = defineProps({
  isCollapsed: {
    type: Boolean,
    required: true
  },
  isExpanded: {
    type: Boolean,
    required: true
  },
  isFullscreen: {
    type: Boolean,
    required: true
  },
  hasActiveTasks: {
    type: Boolean,
    required: true
  },
  hasFailedTasks: {
    type: Boolean,
    required: true
  },
  hasAllCompleted: {
    type: Boolean,
    required: true
  },
  completedTaskCount: {
    type: Number,
    required: true
  },
  totalTaskCount: {
    type: Number,
    required: true
  },
  hasActiveBoard: {
    type: Boolean,
    required: true
  },
  hasInProgressTasks: {
    type: Boolean,
    required: true
  },
  tasksInQueue: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: 'idle'
  },
  stdout: {
    type: String,
    default: ''
  },
  stderr: {
    type: String,
    default: ''
  },
  currentTask: {
    type: Object,
    default: null
  },
  displayMode: {
    type: String,
    default: 'right-nav'
  }
})

// Define emits with specific event names for better type safety
const emit = defineEmits<{
  'toggle-expand': []
  'toggle-fullscreen': []
  'stop-execution': []
  'restart-agent': []
  'delete-agent': []
  'clear-terminal': []
  'close': []
  'set-display-mode': [mode: string]
}>()

// Compute status class based on status
const statusClass = computed(() => {
  switch (props.status) {
    case 'running':
      return 'status-running'
    case 'error':
      return 'status-error'
    case 'idle':
      return 'status-idle'
    default:
      return 'status-idle'
  }
})

// Compute status label based on status
const statusLabel = computed(() => {
  switch (props.status) {
    case 'running':
      return 'Running'
    case 'error':
      return 'Error'
    case 'idle':
      return props.hasAllCompleted ? 'Completed' : 'Ready'
    default:
      return 'Ready'
  }
})
</script>

<style scoped>
.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid hsl(var(--border));
  background-color: hsl(var(--background));
  z-index: 55; /* Higher z-index to stay on top */
  height: 40px;
  transition: background-color 0.2s ease;
  position: relative;
}

.terminal-header:hover {
  background-color: hsl(var(--muted) / 0.5);
}

.terminal-mode-toggles {
  position: absolute;
  top: 8px;
  left: 15px;
  z-index: 62;
  display: flex;
  gap: 8px;
}

/* Mode toggle button styling */
.mode-toggle-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background-color: transparent;
  border: 1px solid hsl(var(--border));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  color: hsl(var(--muted-foreground));
}

.mode-toggle-btn:hover {
  background-color: hsl(var(--accent) / 0.1);
  color: hsl(var(--accent));
}

.mode-toggle-btn.active {
  background-color: hsl(var(--accent) / 0.2);
  border-color: hsl(var(--accent));
  color: hsl(var(--accent));
}

.terminal-header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
  flex: 1;
  min-width: 0; /* Prevent flex items from overflowing */
  margin-left: 120px; /* Make room for mode toggle buttons */
}

.terminal-title-section {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  min-width: 120px; /* Ensure minimum width for icon and status indicator */
  overflow: hidden;
  text-overflow: ellipsis;
}

.terminal-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.terminal-stats {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-left: 1.5rem;
}

.terminal-header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0; /* Prevent shrinking of action buttons */
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-right: 0.5rem;
  border-right: 1px solid hsl(var(--border) / 0.5);
  padding-right: 0.5rem;
}

.action-button {
  opacity: 0.7;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.action-button:hover {
  opacity: 1;
  transform: scale(1.05);
}

.action-button:active {
  transform: scale(0.95);
}

.task-badge {
  font-size: 0.7rem;
  padding: 0 0.4rem;
  height: 1.25rem;
}

.completed-badge {
  background-color: hsl(142.1 76.2% 36.3% / 0.2);
  color: hsl(142.1 76.2% 36.3%);
  border-color: hsl(142.1 76.2% 36.3% / 0.3);
}

.queue-badge {
  font-size: 0.65rem;
  padding: 0 0.3rem;
  height: 1.2rem;
  opacity: 0.8;
}

.terminal-status-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  margin-left: 0.5rem;
  padding: 0.05rem 0.4rem;
  border-radius: 9999px;
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* Status colors and animations */
.status-running {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.status-running .status-dot {
  background-color: hsl(var(--primary));
  animation: pulse 1.5s infinite;
}

.status-error {
  background-color: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

.status-error .status-dot {
  background-color: hsl(var(--destructive));
}

.status-idle {
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.status-idle .status-dot {
  background-color: hsl(var(--muted-foreground));
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.hide-when-narrow {
  display: inline-block;
}

@media (max-width: 520px) {
  .hide-when-narrow {
    display: none;
  }
}

.action-button.close-button {
  color: hsl(var(--destructive));
  border-color: hsl(var(--border));
}

.action-button.close-button:hover {
  background-color: hsla(var(--destructive), 0.1);
  color: hsl(var(--destructive));
  box-shadow: 0 0 0 1px hsla(var(--destructive), 0.3);
}
</style> 