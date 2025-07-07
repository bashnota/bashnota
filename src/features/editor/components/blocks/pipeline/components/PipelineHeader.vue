<template>
  <div class="pipeline-header">
    <div class="pipeline-title">
      <input
        :value="title"
        @input="$emit('update:title', ($event.target as HTMLInputElement).value)"
        @blur="$emit('title-blur')"
        @keydown.enter="$emit('title-blur')"
        class="pipeline-title-input"
        placeholder="Pipeline Title"
      />
    </div>
    <div class="pipeline-controls">
      <div class="control-group">
        <button
          @click="$emit('toggle-edit')"
          :class="{ active: isEditMode }"
          class="pipeline-btn"
          :title="isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'"
        >
          <EditIcon v-if="!isEditMode" />
          <CheckIcon v-else />
        </button>
        <button
          @click="$emit('add-node')"
          :disabled="!isEditMode"
          class="pipeline-btn"
          title="Add Code Block (Ctrl+N)"
        >
          <PlusIcon />
        </button>
        <button
          @click="$emit('show-templates')"
          :disabled="!isEditMode"
          class="pipeline-btn"
          title="Add from Template"
        >
          <TemplateIcon />
        </button>
      </div>
      
      <div class="control-group">
        <button
          @click="$emit('auto-layout')"
          :disabled="!isEditMode || nodeCount === 0"
          class="pipeline-btn"
          title="Auto Layout (Ctrl+L)"
        >
          <LayoutIcon />
        </button>
        <button
          @click="$emit('toggle-fullscreen')"
          class="pipeline-btn"
          :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
        >
          <MinimizeIcon v-if="isFullscreen" />
          <MaximizeIcon v-else />
        </button>
        <button
          @click="$emit('show-settings')"
          class="pipeline-btn"
          title="Pipeline Settings"
        >
          <SettingsIcon />
        </button>
      </div>
      
      <div class="control-group">
        <button
          @click="$emit('execute')"
          :disabled="isExecuting || !hasValidPipeline"
          class="pipeline-btn pipeline-btn-execute"
          :title="isExecuting ? 'Executing...' : 'Execute Pipeline (Ctrl+Enter)'"
        >
          <PlayIcon v-if="!isExecuting" />
          <LoaderIcon v-else class="animate-spin" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  Edit as EditIcon, 
  Check as CheckIcon, 
  Plus as PlusIcon, 
  Play as PlayIcon, 
  Loader as LoaderIcon,
  Settings as SettingsIcon,
  FileText as TemplateIcon,
  LayoutGrid as LayoutIcon,
  Maximize as MaximizeIcon,
  Minimize as MinimizeIcon,
} from 'lucide-vue-next'

defineProps<{
  title: string
  isEditMode: boolean
  isExecuting: boolean
  hasValidPipeline: boolean
  nodeCount: number
  isFullscreen: boolean
}>()

defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'title-blur'): void
  (e: 'toggle-edit'): void
  (e: 'add-node'): void
  (e: 'show-templates'): void
  (e: 'auto-layout'): void
  (e: 'show-settings'): void
  (e: 'execute'): void
  (e: 'toggle-fullscreen'): void
}>()
</script>

<style scoped>
.pipeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
  border-radius: 6px 6px 0 0;
  flex-shrink: 0;
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
  gap: 12px;
  align-items: center;
}

.control-group {
  display: flex;
  gap: 4px;
  align-items: center;
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
</style> 