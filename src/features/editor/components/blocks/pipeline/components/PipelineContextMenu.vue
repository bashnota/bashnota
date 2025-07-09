<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="pipeline-context-menu"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @click.stop
  >
    <div
      v-for="(action, index) in actions"
      :key="action.id"
      class="context-menu-item"
      :class="{ 
        'separator': action.separator,
        'disabled': action.disabled 
      }"
      @click="handleActionClick(action)"
    >
      <component 
        v-if="action.icon" 
        :is="action.icon" 
        class="w-4 h-4" 
      />
      <span class="action-label">{{ action.label }}</span>
      <span v-if="action.shortcut" class="action-shortcut">{{ action.shortcut }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import type { PipelineContextMenuAction } from '@/features/editor/types/pipeline'

interface Props {
  visible: boolean
  position: { x: number; y: number }
  actions: PipelineContextMenuAction[]
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const menuRef = ref<HTMLElement | null>(null)

const handleActionClick = (action: PipelineContextMenuAction) => {
  if (action.disabled) return
  
  action.action()
  emit('close')
}

const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close')
  }
}

const adjustPosition = () => {
  if (!menuRef.value) return
  
  const rect = menuRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Adjust if menu would go off-screen
  let { x, y } = props.position
  
  if (x + rect.width > viewportWidth) {
    x = viewportWidth - rect.width - 10
  }
  
  if (y + rect.height > viewportHeight) {
    y = viewportHeight - rect.height - 10
  }
  
  menuRef.value.style.left = `${Math.max(10, x)}px`
  menuRef.value.style.top = `${Math.max(10, y)}px`
}

onMounted(() => {
  if (props.visible) {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    nextTick(() => {
      adjustPosition()
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.pipeline-context-menu {
  position: fixed;
  z-index: 1000;
  background: hsl(var(--popover));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  box-shadow: 0 4px 12px hsl(var(--foreground) / 0.15);
  padding: 4px;
  min-width: 160px;
  max-width: 250px;
  user-select: none;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: hsl(var(--foreground));
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.context-menu-item:hover:not(.disabled) {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item.separator {
  border-top: 1px solid hsl(var(--border));
  margin-top: 4px;
  padding-top: 8px;
}

.action-label {
  flex: 1;
}

.action-shortcut {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted));
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}
</style> 