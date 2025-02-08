<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { JupyterService } from '@/services/jupyterService'
import { useNotaStore } from '@/stores/nota'
import { useRoute } from 'vue-router'
import { useCodeExecution } from '@/composables/useCodeExecution'
import type { NotaConfig, KernelConfig } from '@/types/jupyter'
import { DocumentDuplicateIcon, CheckIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  code: string
  language: string
  notaId: string
  kernelPreference?: KernelConfig | null
}>()

const emit = defineEmits(['update:code', 'kernel-select'])

const store = useNotaStore()
const route = useRoute()
const jupyterService = new JupyterService()
const selectedServer = ref(props.kernelPreference?.serverId || '')
const selectedKernel = ref(props.kernelPreference?.kernelName || '')

const codeValue = ref(props.code)

// Use the codeValue ref for code execution
const { output, isExecuting, hasError, execute, copyOutput, isCopied } = useCodeExecution(codeValue)

const isCodeCopied = ref(false)

// Get the parent nota ID if we're on a page
const parentNotaId = computed(() => {
  if (route.name === 'page') {
    const page = store.getCurrentPage(props.notaId)
    return page?.parentId
  }
  return props.notaId
})

// Get the nota's configuration
const notaConfig = computed(() => {
  const nota = store.getCurrentNota(parentNotaId.value)
  console.log('Current nota config:', nota?.config, 'Parent ID:', parentNotaId.value)
  if (!nota?.config) {
    return {
      jupyterServers: [],
      kernels: {},
      notebooks: []
    }
  }
  return nota.config
})

// Get available servers
const availableServers = computed(() => {
  console.log('Jupyter servers:', notaConfig.value.jupyterServers) // Debug log
  return notaConfig.value.jupyterServers.map(server => ({
    ...server,
    displayName: `${server.ip}:${server.port}`
  }))
})

// Get available kernels for selected server
const availableKernels = computed(() => {
  if (!selectedServer.value) return []
  const kernels = notaConfig.value.kernels[selectedServer.value] || []
  console.log('Available kernels:', kernels) // Debug log
  return kernels
})

// Get the current server object
const currentServer = computed(() => {
  return availableServers.value.find(s => s.ip === selectedServer.value)
})

// Load initial configuration
const loadConfig = async () => {
  await store.loadNotas()
  await store.loadPages() // Also load pages to get parent relationships
}

// Initialize
onMounted(async () => {
  await loadConfig()
  if (props.kernelPreference) {
    selectedServer.value = props.kernelPreference.serverId
    // Kernel will be selected in the server watch handler if available
  }
})

// Reset kernel selection when server changes
watch(selectedServer, (newServer) => {
  selectedKernel.value = ''
  if (newServer && props.kernelPreference?.kernelName) {
    // Try to select the same kernel on the new server if available
    const kernel = availableKernels.value.find(
      k => k.name === props.kernelPreference?.kernelName
    )
    if (kernel) {
      selectedKernel.value = kernel.name
      emit('kernel-select', kernel.name, newServer)
    }
  }
})

// Watch for route changes to reload configuration
watch(
  () => route.params.id,
  async () => {
    await loadConfig()
  }
)

// Watch for external code changes
watch(() => props.code, (newCode) => {
  if (newCode !== codeValue.value) {
    codeValue.value = newCode
  }
})

// Update kernel selection handler
const handleKernelSelect = (kernel: string) => {
  selectedKernel.value = kernel
  if (selectedServer.value) {
    emit('kernel-select', kernel, selectedServer.value)
  }
}

// Use selected kernel for execution
const executeCode = async () => {
  if (!selectedKernel.value) {
    // Show kernel selection if not already selected
    output.value = 'Please select a kernel first'
    return
  }

  if (!currentServer.value) {
    output.value = 'Please select a server first'
    return
  }
  
  isExecuting.value = true
  try {
    await execute(currentServer.value, selectedKernel.value)
  } catch (error) {
    console.error('Execution error:', error)
    output.value = error instanceof Error ? error.message : 'Execution failed'
  } finally {
    isExecuting.value = false
  }
}

const formatExecutionResult = (result: any) => {
  if (!result.content) return 'No output'

  const output = []
  
  // Handle stdout/stderr
  if (result.content.stdout) output.push(result.content.stdout)
  if (result.content.stderr) output.push(result.content.stderr)
  
  // Handle execution result
  if (result.content.data) {
    if (result.content.data['text/plain']) {
      output.push(result.content.data['text/plain'])
    }
    if (result.content.data['text/html']) {
      output.push(result.content.data['text/html'])
    }
  }

  return output.join('\n')
}

const updateCode = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement
  codeValue.value = textarea.value
  emit('update:code', textarea.value)
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(codeValue.value)
    isCodeCopied.value = true
    setTimeout(() => {
      isCodeCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy code:', err)
  }
}
</script>

<template>
  <div class="code-block-execution">
    <div class="code-header">
      <div class="kernel-selection">
        <div class="select-group">
          <label>Server</label>
          <select v-model="selectedServer" class="server-select">
            <option value="">Select Server</option>
            <option 
              v-for="server in availableServers" 
              :key="server.ip" 
              :value="server.ip"
            >
              {{ server.displayName }}
            </option>
          </select>
        </div>
        <div class="select-group">
          <label>Kernel</label>
          <select 
            v-model="selectedKernel" 
            class="kernel-select"
            :disabled="!selectedServer"
          >
            <option value="">Select Kernel</option>
            <option 
              v-for="kernel in availableKernels" 
              :key="kernel.name" 
              :value="kernel.name"
            >
              {{ kernel.display_name }}
            </option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button 
          class="execute-button"
          :disabled="isExecuting || !selectedKernel"
          @click="executeCode"
        >
          {{ isExecuting ? 'Executing...' : 'Run' }}
        </button>
        <button 
          v-if="output"
          class="copy-button" 
          @click="copyOutput"
          :title="isCopied ? 'Copied!' : 'Copy output'"
        >
          <DocumentDuplicateIcon v-if="!isCopied" class="icon" />
          <CheckIcon v-else class="icon" />
        </button>
      </div>
    </div>

    <div class="code-section">
      <div class="code-header-actions">
        <button 
          class="copy-button" 
          @click="copyCode"
          :title="isCodeCopied ? 'Code copied!' : 'Copy code'"
        >
          <DocumentDuplicateIcon v-if="!isCodeCopied" class="icon" />
          <CheckIcon v-else class="icon" />
        </button>
      </div>
      <textarea
        v-model="codeValue"
        class="code-input"
        :class="{ 'is-executing': isExecuting }"
        @input="updateCode"
        spellcheck="false"
      ></textarea>
    </div>

    <div v-if="output" class="output-section">
      <div class="output-header">
        <span class="output-label">Output</span>
        <button 
          class="copy-button" 
          @click="copyOutput"
          :title="isCopied ? 'Output copied!' : 'Copy output'"
        >
          <DocumentDuplicateIcon v-if="!isCopied" class="icon" />
          <CheckIcon v-else class="icon" />
        </button>
      </div>
      <div class="output" :class="{ 'has-error': hasError }">
        <pre>{{ output }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-block-execution {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin: 1rem 0;
  overflow: hidden;
  background: var(--color-background-soft);
  box-shadow: var(--shadow-sm);
}

.code-header {
  padding: 0.75rem 1rem;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.kernel-selection {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.select-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  max-width: 200px;
}

.select-group label {
  font-size: 0.75rem;
  color: var(--color-text-light);
  font-weight: 500;
}

.server-select,
.kernel-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  font-size: 0.875rem;
  color: var(--color-text);
  width: 100%;
  transition: all 0.2s;
}

.server-select:hover,
.kernel-select:hover {
  border-color: var(--color-border-dark);
}

.server-select:focus,
.kernel-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-mute);
}

.server-select:disabled,
.kernel-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-background-mute);
}

.actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.execute-button {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.execute-button:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.execute-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.copy-button {
  padding: 0.5rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.copy-button:hover {
  background: var(--color-background-mute);
  color: var(--color-text);
}

.copy-button .icon {
  width: 1.25rem;
  height: 1.25rem;
}

.code-input {
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  padding-right: 3rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-background);
  border: none;
  border-bottom: 1px solid var(--color-border);
  resize: vertical;
  tab-size: 2;
}

.code-input:focus {
  outline: none;
}

.code-input.is-executing {
  opacity: 0.7;
  cursor: wait;
}

.output {
  background: var(--color-background);
  padding: 1rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  overflow-x: auto;
  border-top: 1px solid var(--color-border);
}

.output.has-error {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.output pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Dark mode adjustments */
:deep(.dark) {
  .code-block-execution {
    background: var(--color-background-soft);
  }

  .code-input,
  .output {
    background: var(--color-background);
  }

  .server-select,
  .kernel-select {
    background: var(--color-background);
    color: var(--color-text);
  }
}

.code-section {
  position: relative;
  border-bottom: 1px solid var(--color-border);
}

.code-header-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.2s;
}

.code-section:hover .code-header-actions {
  opacity: 1;
}

.output-section {
  background: var(--color-background);
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.output-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.copy-button {
  padding: 0.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.copy-button:hover {
  background: var(--color-background-mute);
  color: var(--color-text);
  border-color: var(--color-border-dark);
}

.copy-button .icon {
  width: 1.25rem;
  height: 1.25rem;
}
</style> 