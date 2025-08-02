<template>
  <div class="code-editor-modal">
    <div class="code-editor-content">
      <div class="code-editor-header">
        <h3>Edit Code Block</h3>
        <div class="header-actions">
          <button @click="$emit('run-node')" class="run-btn" :disabled="isExecuting">
            <PlayIcon class="w-4 h-4" />
            Run
          </button>
          <button @click="$emit('close')" class="close-btn">×</button>
        </div>
      </div>
      <div class="code-editor-body">
        <div class="code-editor-form">
          <div class="form-row">
            <input
              :value="nodeData.title"
              @input="$emit('update:node-data', { ...nodeData, title: ($event.target as HTMLInputElement).value })"
              placeholder="Block Title"
              class="code-title-input"
            />
            <select 
              :value="nodeData.language"
              @change="$emit('update:node-data', { ...nodeData, language: ($event.target as HTMLSelectElement).value })"
              class="code-language-select"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="r">R</option>
              <option value="sql">SQL</option>
              <option value="bash">Bash</option>
            </select>
          </div>
          
          <div class="kernel-settings">
            <div class="kernel-mode-toggle">
              <label class="toggle-label">
                <input 
                  type="checkbox" 
                  :checked="nodeData.useSharedKernel"
                  @change="$emit('update:node-data', { ...nodeData, useSharedKernel: ($event.target as HTMLInputElement).checked })"
                  class="toggle-input"
                />
                <span class="toggle-text">Use Shared Kernel</span>
              </label>
            </div>
            
            <div v-if="!nodeData.useSharedKernel" class="kernel-selection">
              <select 
                :value="nodeData.kernelName"
                @change="$emit('update:node-data', { ...nodeData, kernelName: ($event.target as HTMLSelectElement).value })"
                class="kernel-select"
              >
                <option value="">Select Kernel</option>
                <option v-for="kernel in availableKernels" :key="kernel.name" :value="kernel.name">
                  {{ kernel.display_name || kernel.name }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="code-editor-container">
            <CodeBlockWithExecution
              :id="nodeId"
              :code="nodeData.code"
              :language="nodeData.language"
              :session-id="nodeData.sessionId || null"
              :nota-id="notaId"
              :is-read-only="false"
              :is-executing="isExecuting"
              :is-published="false"
              @update:code="(code: string) => $emit('update:node-data', { ...nodeData, code })"
              @kernel-select="(kernelName: string, serverID: string) => $emit('update:node-data', { ...nodeData, kernelName, serverID })"
              @update:output="(output: string) => $emit('update:node-data', { ...nodeData, output })"
              @update:session-id="(sessionId: string) => $emit('update:node-data', { ...nodeData, sessionId })"
            />
          </div>
        </div>
      </div>
      <div class="code-editor-footer">
        <div>
          <button @click="$emit('reset-all-outputs')" class="reset-outputs-btn">Reset All Outputs</button>
        </div>
        <div>
          <button @click="$emit('save')" class="save-btn">Save Changes</button>
          <button @click="$emit('delete')" class="delete-btn">Delete Block</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlayIcon } from 'lucide-vue-next'
import CodeBlockWithExecution from '../../executable-code-block/CodeBlockWithExecution.vue'

defineProps<{
  nodeId: string,
  nodeData: any,
  notaId: string,
  isExecuting: boolean,
  availableKernels: any[]
}>()

defineEmits(['close', 'save', 'delete', 'run-node', 'update:node-data', 'reset-all-outputs'])
</script>

<style scoped>
/* Using a general modal class to share styles */
.code-editor-modal {
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

.code-editor-content {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px hsl(var(--foreground) / 0.1);
}

.code-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
  flex-shrink: 0;
}

.code-editor-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.run-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.run-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.run-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.code-editor-body {
  padding: 20px;
  overflow-y: auto;
  flex-grow: 1;
}

.code-editor-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.code-title-input,
.code-language-select,
.kernel-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  font-size: 14px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  transition: all 0.2s;
}

.code-title-input:focus,
.code-language-select:focus,
.kernel-select:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
}

.kernel-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: hsl(var(--muted));
  border-radius: 6px;
  border: 1px solid hsl(var(--border));
}

.kernel-mode-toggle {
  display: flex;
  align-items: center;
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

.kernel-selection {
  margin-top: 8px;
}

.code-editor-container {
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  overflow: hidden;
  background: hsl(var(--background));
}

.code-editor-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
  flex-shrink: 0;
}

.code-editor-footer > div {
  display: flex;
  gap: 12px;
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

.delete-btn {
  background: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.delete-btn:hover {
  opacity: 0.9;
}

.reset-outputs-btn {
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  border: 1px solid hsl(var(--border));
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.reset-outputs-btn:hover {
  background: hsl(var(--secondary) / 0.8);
  border-color: hsl(var(--border) / 0.8);
}

</style> 