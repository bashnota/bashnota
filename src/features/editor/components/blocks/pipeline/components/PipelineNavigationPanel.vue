<template>
  <div class="navigation-panel">
    <div class="navigation-header">
      <NavigationIcon class="w-4 h-4" />
      <span>Pipeline Navigator</span>
      <button @click="$emit('close')" class="close-nav-btn">×</button>
    </div>
    
    <div class="navigation-content">
      <!-- Viewport Info -->
      <div class="viewport-info">
        <div class="info-row">
          <CompassIcon class="w-3 h-3" />
          <span>Nodes: {{ nodes.length }} ({{ visibleNodesCount }} visible)</span>
        </div>
        <div class="info-row">
          <EyeIcon class="w-3 h-3" />
          <span>Zoom: {{ viewportInfo.zoom }}%</span>
        </div>
      </div>
      
      <!-- Navigation Controls -->
      <div class="navigation-controls">
        <button @click="$emit('focus-all')" class="nav-btn" title="Focus All (Ctrl+F)">
          <TargetIcon class="w-3 h-3" />
        </button>
        <button @click="$emit('navigate-first')" class="nav-btn" title="First Node (Home)">
          <HomeIcon class="w-3 h-3" />
        </button>
        <button @click="$emit('navigate-previous')" class="nav-btn" title="Previous (Shift+Tab)">
          <ChevronLeftIcon class="w-3 h-3" />
        </button>
        <button @click="$emit('navigate-next')" class="nav-btn" title="Next (Tab)">
          <ChevronRightIcon class="w-3 h-3" />
        </button>
        <button @click="$emit('navigate-last')" class="nav-btn" title="Last Node (End)">
          <ChevronRightIcon class="w-3 h-3" />
        </button>
      </div>
      
      <!-- Zoom Controls -->
      <div class="zoom-controls">
        <button @click="$emit('set-zoom', 0.5)" class="zoom-btn" title="50% (Ctrl+2)">50%</button>
        <button @click="$emit('set-zoom', 1)" class="zoom-btn" title="100% (Ctrl+1)">100%</button>
        <button @click="$emit('set-zoom', 2)" class="zoom-btn" title="200% (Ctrl+3)">200%</button>
      </div>
      
      <!-- Viewport History -->
      <div v-if="historyInfo.canUndo || historyInfo.canRedo" class="viewport-history">
        <div class="history-label">Viewport History</div>
        <div class="history-controls">
          <button 
            @click="$emit('undo-viewport')" 
            :disabled="!historyInfo.canUndo" 
            class="history-btn" 
            title="Undo View (Ctrl+Z)"
          >
            ←
          </button>
          <button 
            @click="$emit('redo-viewport')" 
            :disabled="!historyInfo.canRedo" 
            class="history-btn" 
            title="Redo View (Ctrl+Shift+Z)"
          >
            →
          </button>
        </div>
      </div>
      
      <!-- Tracking Toggle -->
      <div class="tracking-toggle">
        <label class="toggle-label" @click="$emit('toggle-tracking')">
          <input type="checkbox" :checked="isTrackingEnabled" readonly>
          <span class="toggle-text">Track viewport</span>
          <EyeIcon v-if="isTrackingEnabled" class="w-3 h-3" />
          <EyeOffIcon v-else class="w-3 h-3" />
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  Navigation as NavigationIcon,
  Compass as CompassIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Target as TargetIcon,
  Home as HomeIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from 'lucide-vue-next'

interface Node {
  id: string
  position: { x: number; y: number }
  data: any
}

interface ViewportInfo {
  zoom: number
  nodes: number
  visible: number
}

interface HistoryInfo {
  canUndo: boolean
  canRedo: boolean
}

interface Props {
  nodes: Node[]
  viewportInfo: ViewportInfo
  historyInfo: HistoryInfo
  visibleNodesCount: number
  isTrackingEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isTrackingEnabled: true
})

defineEmits<{
  close: []
  'focus-all': []
  'navigate-first': []
  'navigate-previous': []
  'navigate-next': []
  'navigate-last': []
  'set-zoom': [zoom: number]
  'undo-viewport': []
  'redo-viewport': []
  'toggle-tracking': []
}>()
</script>

<style scoped>
.navigation-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: 0 8px 24px hsl(var(--foreground) / 0.15);
  z-index: 20;
  min-width: 280px;
  backdrop-filter: blur(8px);
}

.navigation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--muted) / 0.5);
  border-radius: 7px 7px 0 0;
  font-weight: 600;
  font-size: 14px;
}

.close-nav-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 18px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-nav-btn:hover {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}

.navigation-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.viewport-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.navigation-controls {
  display: flex;
  gap: 4px;
  justify-content: space-between;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: hsl(var(--foreground));
}

.nav-btn:hover {
  background: hsl(var(--muted));
  border-color: hsl(var(--primary));
}

.zoom-controls {
  display: flex;
  gap: 4px;
  justify-content: space-between;
}

.zoom-btn {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 11px;
  color: hsl(var(--foreground));
}

.zoom-btn:hover {
  background: hsl(var(--muted));
  border-color: hsl(var(--primary));
}

.viewport-history {
  border-top: 1px solid hsl(var(--border));
  padding-top: 12px;
}

.history-label {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 8px;
}

.history-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.history-btn {
  width: 32px;
  height: 32px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: hsl(var(--foreground));
}

.history-btn:hover:not(:disabled) {
  background: hsl(var(--muted));
  border-color: hsl(var(--primary));
}

.history-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tracking-toggle {
  border-top: 1px solid hsl(var(--border));
  padding-top: 12px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12px;
  color: hsl(var(--foreground));
}

.toggle-label input[type="checkbox"] {
  margin: 0;
  pointer-events: none;
}

.toggle-text {
  flex: 1;
}

/* Responsive Design */
@media (max-width: 768px) {
  .navigation-panel {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: unset;
  }
  
  .navigation-controls {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .nav-btn {
    flex: 1;
    min-width: 44px;
  }
}
</style> 