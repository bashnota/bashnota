<template>
  <div class="empty-state">
    <div class="empty-state-content">
      <div class="empty-state-icon">
        <WorkflowIcon class="w-16 h-16" />
      </div>
      <h3 class="empty-state-title">Create Your First Pipeline</h3>
      <p class="empty-state-description">
        Build visual workflows by connecting code blocks. Variables and data flow between connected blocks.
      </p>
      <div class="empty-state-actions">
        <button @click="$emit('add-node')" class="empty-state-btn primary">
          <PlusIcon class="w-4 h-4" />
          Add Code Block
        </button>
        <button @click="$emit('show-templates')" class="empty-state-btn secondary">
          <TemplateIcon class="w-4 h-4" />
          Use Template
        </button>
      </div>
      <div class="empty-state-tips">
        <div class="tip">
          <KeyboardIcon class="w-4 h-4" />
          <span>Press <kbd>Ctrl+N</kbd> to add blocks quickly</span>
        </div>
        <div class="tip">
          <MousePointerIcon class="w-4 h-4" />
          <span>Drag from output handles to create connections</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  WorkflowIcon,
  PlusIcon,
  FileText as TemplateIcon,
  KeyboardIcon,
  MousePointerIcon
} from 'lucide-vue-next'

defineEmits(['add-node', 'show-templates'])
</script>

<style scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}

.empty-state-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
}

.empty-state-icon {
  margin-bottom: 1rem;
  color: hsl(var(--muted-foreground));
}

.empty-state-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 0.5rem;
}

.empty-state-description {
  color: hsl(var(--muted-foreground));
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.empty-state-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.empty-state-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

.empty-state-btn.primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: none;
}

.empty-state-btn.secondary {
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  border: 1px solid hsl(var(--border));
}

.empty-state-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.empty-state-tips {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.tip {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.tip kbd {
  background: hsl(var(--muted));
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  border: 1px solid hsl(var(--border));
}
</style> 