<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { JupyterService } from '@/services/jupyterService'
import { useNotaStore } from '@/stores/nota'
import { useRoute } from 'vue-router'
import { useCodeExecution } from '@/composables/useCodeExecution'
import type { NotaConfig } from '@/types/jupyter'
import { DocumentDuplicateIcon, CheckIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  code: string
  language: string
  notaId: string
}>()

const emit = defineEmits(['update:code'])

const store = useNotaStore()
const route = useRoute()
const jupyterService = new JupyterService()
const selectedServer = ref('')
const selectedKernel = ref('')

const codeValue = ref(props.code)

// Use the codeValue ref for code execution
const { output, isExecuting, hasError, execute, copyOutput, isCopied } = useCodeExecution(codeValue)

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

// Load initial configuration
const loadConfig = async () => {
  await store.loadNotas()
  await store.loadPages() // Also load pages to get parent relationships
}

// Initialize
onMounted(async () => {
  await loadConfig()
})

// Reset kernel selection when server changes
watch(selectedServer, () => {
  selectedKernel.value = ''
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

const executeCode = async () => {
  if (!selectedServer.value || !selectedKernel.value) {
    output.value = 'Please select a server and kernel to execute code'
    return
  }

  const server = availableServers.value.find(s => s.ip === selectedServer.value)
  if (!server) {
    output.value = 'Selected server not found'
    return
  }

  // Use the kernel name instead of the whole object
  await execute(server, selectedKernel.value)
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
      <button 
        @click="executeCode" 
        :disabled="isExecuting || !selectedServer || !selectedKernel"
        class="execute-button"
      >
        {{ isExecuting ? 'Executing...' : 'Run' }}
      </button>
    </div>
    <div class="code-content">
      <textarea
        class="code-editor"
        :value="codeValue"
        @input="updateCode"
        spellcheck="false"
        :placeholder="'Enter your ' + language + ' code here...'"
      ></textarea>
    </div>
    <div class="output-container" v-if="output">
      <div class="output-header">
        <span>Output</span>
        <button 
          class="copy-button" 
          @click="copyOutput"
          :title="isCopied ? 'Copied!' : 'Copy output'"
        >
          <DocumentDuplicateIcon 
            v-if="!isCopied" 
            class="icon"
          />
          <CheckIcon 
            v-else 
            class="icon"
          />
          {{ isCopied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
      <div 
        class="output" 
        :class="{ 'has-error': hasError }"
      >
        <pre>{{ output }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-block-execution {
  border: 1px solid var(--color-border);
  border-radius: 4px;
  margin: 1rem 0;
  overflow: hidden;
}

.code-header {
  padding: 0.75rem;
  background: var(--color-background-soft);
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
}

.select-group label {
  font-size: 0.75rem;
  color: var(--color-text-light);
}

.server-select,
.kernel-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  font-size: 0.875rem;
  width: 100%;
}

.server-select:disabled,
.kernel-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.execute-button {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.875rem;
}

.execute-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.code-content {
  position: relative;
  background: var(--color-background);
}

.code-editor {
  width: 100%;
  min-height: 100px;
  padding: 1rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text);
  background: transparent;
  border: none;
  resize: vertical;
  outline: none;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
}

.code-editor::placeholder {
  color: var(--color-text-light);
}

.output-container {
  border-top: 1px solid var(--color-border);
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
}

.copy-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-button:hover {
  background: var(--color-background-mute);
}

.copy-button .icon {
  width: 1rem;
  height: 1rem;
}

.output {
  padding: 1rem;
  background: var(--color-background-soft);
  overflow-x: auto;
}

.output.has-error {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.output pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Fira Code', monospace;
}
</style> 