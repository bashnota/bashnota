<template>
  <div class="kernel-settings-modal">
    <div class="kernel-settings-content">
      <div class="kernel-settings-header">
        <h3>Pipeline Settings</h3>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      <div class="kernel-settings-body">
        <div class="setting-group">
          <label class="setting-label">Default Execution Mode</label>
          <select 
            :value="settings.kernelMode"
            @change="$emit('update:settings', { ...settings, kernelMode: ($event.target as HTMLSelectElement).value })"
            class="setting-select"
          >
            <option value="shared">Shared Kernel (All blocks use same kernel)</option>
            <option value="isolated">Isolated Kernels (Each block has its own kernel)</option>
            <option value="mixed">Mixed Mode (Allow per-block configuration)</option>
          </select>
        </div>
        
        <div class="setting-group" v-if="settings.kernelMode === 'shared'">
          <label class="setting-label">Shared Kernel</label>
          <select 
            :value="settings.sharedKernelName"
            @change="$emit('update:settings', { ...settings, sharedKernelName: ($event.target as HTMLSelectElement).value })"
            class="setting-select"
          >
            <option value="">Select Kernel</option>
            <option v-for="kernel in availableKernels" :key="kernel.name" :value="kernel.name">
              {{ kernel.display_name || kernel.name }}
            </option>
          </select>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">Execution Order</label>
          <select 
            :value="settings.executionOrder"
            @change="$emit('update:settings', { ...settings, executionOrder: ($event.target as HTMLSelectElement).value })"
            class="setting-select"
          >
            <option value="topological">Topological (Follow dependencies)</option>
            <option value="sequential">Sequential (Top to bottom)</option>
            <option value="parallel">Parallel (Where possible)</option>
          </select>
        </div>
        
        <div class="setting-group">
          <label class="toggle-label">
            <input 
              type="checkbox" 
              :checked="settings.stopOnError"
              @change="$emit('update:settings', { ...settings, stopOnError: ($event.target as HTMLInputElement).checked })"
              class="toggle-input"
            />
            <span class="toggle-text">Stop execution on error</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label class="toggle-label">
            <input 
              type="checkbox" 
              :checked="settings.autoSave"
              @change="$emit('update:settings', { ...settings, autoSave: ($event.target as HTMLInputElement).checked })"
              class="toggle-input"
            />
            <span class="toggle-text">Auto-save changes</span>
          </label>
        </div>
      </div>
      <div class="kernel-settings-footer">
        <button @click="$emit('apply')" class="save-btn">Apply Settings</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  settings: any,
  availableKernels: any[]
}>()

defineEmits(['close', 'apply', 'update:settings'])
</script>

<style scoped>
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

.kernel-settings-content {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px hsl(var(--foreground) / 0.1);
}

.kernel-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
}

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

.kernel-settings-body {
  padding: 20px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

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

.setting-select:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
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
</style> 