<template>
  <div class="terminal-header" @click="handleHeaderClick">
    <div class="flex items-center">
      <ServerCog class="h-4 w-4 mr-2" />
      <span class="terminal-title">Vibe Terminal</span>
    </div>
    <div class="flex items-center gap-2">
      <span v-if="!props.isCollapsed && props.hasActiveTasks" class="terminal-status">
        <Badge 
          :variant="props.hasFailedTasks ? 'destructive' : (props.hasAllCompleted ? 'secondary' : 'secondary')" 
          class="text-xs"
        >
          {{ props.completedTaskCount }}/{{ props.totalTaskCount }}
        </Badge>
      </span>
      
      <!-- Action buttons - only show when not collapsed -->
      <div v-if="!props.isCollapsed && props.hasActiveBoard" class="flex items-center gap-1 mr-2">
        <Tooltip content="Stop execution">
          <Button 
            @click.stop="emit('stop-execution')" 
            variant="ghost" 
            size="icon"
            class="h-6 w-6"
            :disabled="!props.hasInProgressTasks"
          >
            <Square class="h-3.5 w-3.5 text-red-500" />
          </Button>
        </Tooltip>
        
        <Tooltip content="Restart agent">
          <Button 
            @click.stop="emit('restart-agent')" 
            variant="ghost" 
            size="icon"
            class="h-6 w-6"
          >
            <RotateCw class="h-3.5 w-3.5 text-blue-500" />
          </Button>
        </Tooltip>
        
        <Tooltip content="Delete agent">
          <Button 
            @click.stop="emit('delete-agent')" 
            variant="ghost" 
            size="icon"
            class="h-6 w-6"
          >
            <Trash class="h-3.5 w-3.5 text-red-500" />
          </Button>
        </Tooltip>
      </div>
      
      <!-- Toggle fullscreen button - always visible -->
      <Tooltip :content="props.isFullscreen ? 'Exit fullscreen' : 'Fullscreen mode'">
        <Button 
          @click.stop="emit('toggle-fullscreen')" 
          variant="ghost" 
          size="icon"
          class="h-6 w-6"
        >
          <Maximize2 v-if="!props.isFullscreen" class="h-3.5 w-3.5 text-blue-500" />
          <Minimize2 v-else class="h-3.5 w-3.5 text-blue-500" />
        </Button>
      </Tooltip>
      
      <!-- Toggle expand button - show when not fullscreen -->
      <Tooltip :content="props.isExpanded ? 'Collapse terminal' : 'Expand terminal'">
        <ChevronDown 
          v-if="!props.isFullscreen"
          class="h-4 w-4 expand-icon" 
          :class="{ 'rotate-180': !props.isExpanded }" 
          @click.stop="emit('toggle-expand')"
          aria-label="Toggle terminal expansion"
        />
      </Tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { ServerCog, Square, RotateCw, Trash, Maximize2, Minimize2, ChevronDown } from 'lucide-vue-next'

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
  }
})

// Define emits with specific event names for better type safety
const emit = defineEmits<{
  'toggle-expand': []
  'toggle-fullscreen': []
  'stop-execution': []
  'restart-agent': []
  'delete-agent': []
}>()

// Add toggle state to prevent double-toggling
const isToggling = ref(false)

// Better header click handling
function handleHeaderClick(event: MouseEvent) {
  // Prevent event if we clicked a button or tooltip
  if (event.target instanceof HTMLElement) {
    const target = event.target as HTMLElement;
    
    // Don't toggle on buttons, icons, or tooltips
    if (
      target.closest('button') || 
      target.closest('[role="tooltip"]') ||
      target.tagName === 'svg' ||
      target.tagName === 'path'
    ) {
      return; // Don't toggle when clicking controls
    }
    
    // Only toggle if we clicked directly on the header area or title
    if (
      target.classList.contains('terminal-header') || 
      target.classList.contains('terminal-title') ||
      target.tagName === 'SPAN' ||
      target.classList.contains('flex')
    ) {
      // Add debounce to prevent double-toggling
      if (!isToggling.value) {
        isToggling.value = true;
        
        // Toggle fullscreen when clicking header
        emit('toggle-fullscreen');
        
        // Reset toggle flag after delay
        setTimeout(() => {
          isToggling.value = false;
          
          // Additional check to make sure terminals are visible if not collapsed
          if (!props.isCollapsed) {
            const terminalContent = document.querySelector('.terminal-content');
            if (terminalContent) {
              terminalContent.classList.add('force-visible');
              
              // Also ensure tables have proper z-index
              const tables = document.querySelectorAll('table, .vibe-database-view, .database-table');
              tables.forEach(table => {
                (table as HTMLElement).style.zIndex = '35';
                (table as HTMLElement).style.position = 'relative';
                (table as HTMLElement).style.opacity = '1';
              });
            }
          }
        }, 300);
      }
    }
  }
}
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
}

.terminal-title {
  font-size: 0.875rem;
  font-weight: 500;
}

.terminal-status {
  font-size: 0.75rem;
}
</style> 