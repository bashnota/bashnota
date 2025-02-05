<script setup lang="ts">
import { ref } from 'vue'
import { JupyterService } from '@/services/jupyter'

const props = defineProps<{
  code: string
  language: string
}>()

const output = ref('')
const isExecuting = ref(false)
const jupyterService = new JupyterService()

const executeCode = async () => {
  isExecuting.value = true
  try {
    const result = await jupyterService.executeCode(props.code, props.language)
    output.value = result.output
  } catch (error) {
    output.value = `Error: ${error.message}`
  } finally {
    isExecuting.value = false
  }
}
</script>

<template>
  <div class="code-block-execution">
    <pre><code>{{ code }}</code></pre>
    <div class="actions">
      <button 
        @click="executeCode" 
        :disabled="isExecuting"
        class="execute-button"
      >
        {{ isExecuting ? 'Executing...' : 'Run' }}
      </button>
    </div>
    <div v-if="output" class="output">
      <pre>{{ output }}</pre>
    </div>
  </div>
</template>

<style scoped>
.code-block-execution {
  border: 1px solid var(--color-border);
  border-radius: 4px;
  margin: 1rem 0;
}

.actions {
  padding: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.execute-button {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.execute-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.output {
  padding: 1rem;
  background: #f8f9fa;
  border-top: 1px solid var(--color-border);
}
</style> 