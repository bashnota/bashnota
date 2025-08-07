<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Card, CardContent } from '@/components/ui/card'
import { useCodeExecution } from './composables/core/useCodeExecution'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import CodeBlockWithExecution from './CodeBlockWithExecution.vue'
import OutputRenderer from './OutputRenderer.vue'
import KernelConfigurationModal from './components/KernelConfigurationModal.vue'
import type { CodeBlockProps } from './types'

const props = defineProps<CodeBlockProps>()

const {
  notaId,
  blockId,
  kernelPreference,
  initializeSession,
  executeCode,
  onKernelSelect,
  onSessionSelect
} = useCodeExecution(props)

// Add stores for configuration modal
const codeExecutionStore = useCodeExecutionStore()
const jupyterStore = useJupyterStore()

const isExecutable = computed(() => props.node.attrs.executable)
const language = computed(() => props.node.attrs.language)
const output = computed(() => props.node.attrs.output || null)
const sessionId = computed(() => props.node.attrs.sessionId || null)
const code = computed(() => props.node.textContent || '')

// Track if this is being viewed in a published note
const isPublishedView = computed(() => props.editor.isEditable === false && props.editor.options.editable === false)

// Initialize session if saved
onMounted(() => {
  initializeSession()
  // Also ensure jupyter servers are loaded
  jupyterStore.loadServers()
  
  // Load configuration from block attributes
  const nodeAttrs = props.node.attrs
  if (nodeAttrs.serverID && nodeAttrs.kernelName) {
    console.log('Loading saved configuration from block:', nodeAttrs)
    selectedServerRef.value = nodeAttrs.serverID
    selectedKernelRef.value = nodeAttrs.kernelName
    selectedSessionRef.value = nodeAttrs.sessionId || ''
    
    // Find the server config from available servers
    const serverConfig = availableServers.value.find(s => `${s.ip}:${s.port}` === nodeAttrs.serverID)
    if (serverConfig) {
      // Add the cell to the store with saved configuration
      codeExecutionStore.addCell({
        id: blockId.value,
        code: code.value,
        serverConfig: serverConfig,
        kernelName: nodeAttrs.kernelName,
        sessionId: nodeAttrs.sessionId || 'default',
        output: nodeAttrs.output || ''
      })
    }
  }
})

const updateCode = (newCode: string) => {
  const pos = props.getPos()
  if (typeof pos !== 'number') return

  const transaction = props.editor.state.tr
    .deleteRange(pos + 1, pos + props.node.nodeSize - 1)
    .insertText(newCode, pos + 1)

  props.editor.view.dispatch(transaction)
}

const updateOutput = (newOutput: string) => {
  try {
    // Sanitize output to prevent HTML errors
    const sanitizedOutput = sanitizeOutput(newOutput)
    
    console.log(`[ExecutableCodeBlock] Updating output for block ${blockId.value}:`, {
      originalLength: newOutput.length,
      sanitizedLength: sanitizedOutput.length,
      hasHTML: newOutput.includes('<')
    })
    
    // Use nextTick to ensure DOM is stable before updating TipTap attributes
    nextTick(() => {
      try {
        // Update the node attributes to persist to database
        props.updateAttributes({ output: sanitizedOutput })
        
        console.log(`[ExecutableCodeBlock] TipTap attributes updated successfully`)
      } catch (tiptapError) {
        console.error('Error updating TipTap attributes:', tiptapError)
        
        // Emergency fallback - try with escaped text
        try {
          const escapedOutput = escapeHtmlForTipTap(newOutput)
          props.updateAttributes({ output: escapedOutput })
          console.log(`[ExecutableCodeBlock] Fallback update successful with escaped content`)
        } catch (fallbackError) {
          console.error('Even fallback update failed:', fallbackError)
          // Last resort - empty output
          try {
            props.updateAttributes({ output: '' })
          } catch (lastResortError) {
            console.error('Critical: Could not update attributes at all:', lastResortError)
          }
        }
      }
    })
    
    // Update the cell in the code execution store for immediate UI updates
    const cell = codeExecutionStore.getCellById(blockId.value)
    if (cell) {
      cell.output = sanitizedOutput
    }
    
    console.log(`[ExecutableCodeBlock] Store output updated successfully`)
  } catch (error) {
    console.error('Error in updateOutput function:', error)
    
    // Emergency fallback handling
    nextTick(() => {
      try {
        props.updateAttributes({ output: '' })
      } catch (emergencyError) {
        console.error('Critical: Emergency fallback failed:', emergencyError)
      }
    })
  }
}

// Sanitize output to prevent HTML errors and ensure safe persistence
const sanitizeOutput = (output: string): string => {
  try {
    if (!output || typeof output !== 'string') {
      return ''
    }
    
    // Limit output size to prevent database issues
    const maxOutputSize = 1024 * 1024 // 1MB limit
    if (output.length > maxOutputSize) {
      console.warn(`Output too large (${output.length} chars), truncating to ${maxOutputSize}`)
      return output.substring(0, maxOutputSize) + '\n\n[Output truncated due to size limit]'
    }
    
    // Enhanced sanitization for TipTap compatibility
    let sanitized = output
    
    // Remove null bytes that can break TipTap
    sanitized = sanitized.replace(/\0/g, '')
    
    // Validate and fix HTML structure if present
    if (sanitized.includes('<')) {
      sanitized = sanitizeHtmlForTipTap(sanitized)
    }
    
    // Ensure the content doesn't break TipTap's DOM processing
    if (sanitized.length === 0) {
      return ''
    }
    
    return sanitized
  } catch (error) {
    console.error('Error sanitizing output:', error)
    return '[Error: Output could not be processed]'
  }
}

// Additional HTML sanitization specifically for TipTap compatibility
const sanitizeHtmlForTipTap = (htmlContent: string): string => {
  try {
    // Create a temporary element to validate HTML
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = htmlContent
      
      // Check if parsing was successful
      if (tempDiv.children === undefined || tempDiv.children === null) {
        console.warn('HTML parsing failed, converting to text')
        return escapeHtmlForTipTap(htmlContent)
      }
      
      // Validate the structure
      const serialized = tempDiv.innerHTML
      
      // Double-check by trying to parse again
      const testDiv = document.createElement('div')
      testDiv.innerHTML = serialized
      
      if (testDiv.children === undefined || testDiv.children === null) {
        console.warn('Serialized HTML still invalid, converting to text')
        return escapeHtmlForTipTap(htmlContent)
      }
      
      return serialized
    } else {
      // Server-side or no DOM - escape everything
      return escapeHtmlForTipTap(htmlContent)
    }
  } catch (error) {
    console.error('Error in HTML sanitization for TipTap:', error)
    return escapeHtmlForTipTap(htmlContent)
  }
}

// Escape HTML content that's problematic for TipTap
const escapeHtmlForTipTap = (content: string): string => {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>')
}

// Modal state
const isConfigurationModalOpen = ref(false)

// Configuration data from stores
const selectedServerRef = ref('')
const selectedKernelRef = ref('')
const selectedSessionRef = ref('')

const selectedServer = computed(() => selectedServerRef.value)
const selectedKernel = computed(() => selectedKernelRef.value)
const selectedSession = computed(() => selectedSessionRef.value)
const availableServers = computed(() => {
  const servers = jupyterStore.servers || []
  return servers
})
const availableKernels = computed(() => {
  // Get kernels for the currently selected server
  if (!selectedServer.value) {
    console.log('No selected server, returning empty kernels')
    return []
  }
  const serverKey = selectedServer.value
  const kernels = jupyterStore.kernels[serverKey] || []
  console.log(`Kernels for server ${serverKey}:`, kernels)
  console.log('All kernels in store:', jupyterStore.kernels)
  return kernels
})
const availableSessions = computed(() => {
  const sessions = codeExecutionStore.getAllSessions || []
  return sessions.map(session => ({
    id: session.id,
    name: session.name,
    kernel: { name: session.kernelName || '', id: session.kernelId || '' }
  }))
})
const runningKernels = computed(() => [])
const isSharedSessionMode = computed(() => codeExecutionStore.sharedSessionMode)
const isExecuting = computed(() => codeExecutionStore.getCellById(blockId.value)?.isExecuting || false)
const isLoadingKernels = ref(false)
const isSettingUp = computed(() => isLoadingKernels.value)

const handleOpenConfiguration = async () => {
  // Ensure jupyter servers are loaded before opening the modal
  jupyterStore.loadServers()
  
  // If a server is selected, load its kernels
  if (selectedServer.value) {
    const server = availableServers.value.find(s => `${s.ip}:${s.port}` === selectedServer.value)
    if (server) {
      isLoadingKernels.value = true
      try {
        await jupyterStore.getAvailableKernels(server)
      } catch (error) {
        console.error('Failed to load kernels on modal open:', error)
      } finally {
        isLoadingKernels.value = false
      }
    }
  }
  
  isConfigurationModalOpen.value = true
}

// Modal event handlers
const handleServerChange = async (serverId: string) => {
  console.log('Server changed to:', serverId)
  selectedServerRef.value = serverId
  selectedKernelRef.value = '' // Reset kernel when server changes
  selectedSessionRef.value = '' // Reset session when server changes
  
  // Load kernels for the selected server
  const server = availableServers.value.find(s => `${s.ip}:${s.port}` === serverId)
  console.log('Found server object:', server)
  console.log('Available servers:', availableServers.value)
  
  if (server) {
    isLoadingKernels.value = true
    try {
      console.log('Calling getAvailableKernels with server:', server)
      const kernels = await jupyterStore.getAvailableKernels(server)
      console.log('Received kernels:', kernels)
      console.log('Jupyter store kernels after call:', jupyterStore.kernels)
    } catch (error) {
      console.error('Failed to load kernels:', error)
    } finally {
      isLoadingKernels.value = false
    }
  } else {
    console.warn('No server found for serverId:', serverId)
  }
}

const handleKernelChange = async (kernelName: string) => {
  selectedKernelRef.value = kernelName
  selectedSessionRef.value = '' // Reset session when kernel changes
}

const handleSessionChange = async (sessionId: string) => {
  selectedSessionRef.value = sessionId
}

const handleCreateNewSession = async () => {
  const sessionId = codeExecutionStore.createSession(`Session ${Date.now()}`)
  console.log('Created session:', sessionId)
}

const handleClearAllKernels = async () => {
  // TODO: Implement clear all kernels
}

const handleRefreshSessions = async () => {
  // TODO: Implement session refresh
}

const handleRefreshServers = async () => {
  jupyterStore.loadServers()
}

const handleRefreshKernels = async () => {
  if (selectedServer.value) {
    const server = availableServers.value.find(s => `${s.ip}:${s.port}` === selectedServer.value)
    if (server) {
      isLoadingKernels.value = true
      try {
        await jupyterStore.getAvailableKernels(server)
      } catch (error) {
        console.error('Failed to refresh kernels:', error)
      } finally {
        isLoadingKernels.value = false
      }
    }
  }
}

const handleTestServerConnection = async (server: any) => {
  try {
    console.log('Testing connection to server:', server)
    const testResult = await jupyterStore.testServerConnection(server)
    console.log('Test result:', testResult)
    
    if (testResult?.success) {
      alert(`✅ Successfully connected to ${server.ip}:${server.port}`)
    } else {
      alert(`❌ Failed to connect to ${server.ip}:${server.port}\n\nError: ${testResult?.message || 'Connection failed'}`)
    }
  } catch (error) {
    console.error('Error testing server connection:', error)
    alert(`❌ Error testing connection: ${error}`)
  }
}

const handleAddTestServer = async () => {
  const testServer = {
    ip: 'localhost',
    port: '8888',
    token: ''
  }
  
  // First test the connection
  try {
    console.log('Testing connection to test server...')
    const testResult = await jupyterStore.testServerConnection(testServer)
    console.log('Test result:', testResult)
    
    if (testResult?.success) {
      const success = jupyterStore.addServer(testServer)
      if (success) {
        // Auto-select the test server and load its kernels
        const serverId = `${testServer.ip}:${testServer.port}`
        await handleServerChange(serverId)
      }
    } else {
      console.error('Test server connection failed:', testResult?.message)
      alert(`Failed to connect to Jupyter server at localhost:8888. Make sure Jupyter is running.\n\nError: ${testResult?.message || 'Connection failed'}`)
    }
  } catch (error) {
    console.error('Error testing server connection:', error)
    alert(`Failed to test connection to Jupyter server: ${error}`)
  }
}

const handleSelectRunningKernel = async (kernelId: string) => {
  // TODO: Implement running kernel selection
}

const handleToggleSharedSessionMode = async () => {
  await codeExecutionStore.toggleSharedSessionMode(notaId.value)
}

const handleApplyConfiguration = async (config: { server: string; kernel: string; session: string }) => {
  console.log('Applying configuration:', config)
  
  try {
    // Update the refs with the applied configuration
    selectedServerRef.value = config.server
    selectedKernelRef.value = config.kernel
    selectedSessionRef.value = config.session
    
    // Save the configuration to the nota/block
    const [ip, port] = config.server.split(':')
    const serverConfig = availableServers.value.find(s => `${s.ip}:${s.port}` === config.server)
    
    if (serverConfig && config.kernel) {
      // Update the block attributes with server and kernel info
      props.updateAttributes({
        serverID: config.server,
        kernelName: config.kernel,
        sessionId: config.session || null
      })
      
      // Initialize or update the cell in the code execution store
      codeExecutionStore.addCell({
        id: blockId.value,
        code: code.value,
        serverConfig: serverConfig,
        kernelName: config.kernel,
        sessionId: config.session || 'default',
        output: ''
      })
      
      console.log('Configuration applied successfully')
    }
  } catch (error) {
    console.error('Failed to apply configuration:', error)
  }
}


</script>

<template>
  <NodeViewWrapper class="my-6">
    <div v-if="isExecutable" class="border-none shadow-md" :class="{ 'published-card': isPublishedView }">
      <CodeBlockWithExecution
        :id="blockId"
        :code="code"
        :language="language"
        :session-id="sessionId"
        :nota-id="notaId"
        :kernel-preference="kernelPreference"
        :is-read-only="editor.options.editable === false"
        :is-published="isPublishedView"
        :initial-output="output || undefined"
        @update:code="updateCode"
        @kernel-select="onKernelSelect"
        @update:output="updateOutput"
        @update:session-id="onSessionSelect"
        @open-configuration="handleOpenConfiguration"
      />
    </div>

    <Card v-else class="border-none shadow-md" :class="{ 'published-card': isPublishedView }">
      <CardContent class="p-0">
        <OutputRenderer
          :content="code"
          type="text"
          :showControls="true"
          :maxHeight="'400px'"
          :isPublished="isPublishedView"
          :notaId="notaId"
          :blockId="blockId"
        />
      </CardContent>
    </Card>

  </NodeViewWrapper>

  <!-- Modal at this level, outside any problematic containers -->
  <KernelConfigurationModal
    v-if="isExecutable"
    :is-open="isConfigurationModalOpen"
    :is-shared-session-mode="isSharedSessionMode"
    :is-executing="isExecuting"
    :is-setting-up="isSettingUp"
    :selected-server="selectedServer"
    :selected-kernel="selectedKernel"
    :available-servers="availableServers"
    :available-kernels="availableKernels"
    :selected-session="selectedSession"
    :available-sessions="availableSessions"
    :running-kernels="runningKernels"
    @update:is-open="isConfigurationModalOpen = $event"
    @server-change="handleServerChange"
    @kernel-change="handleKernelChange"
    @session-change="handleSessionChange"
    @create-new-session="handleCreateNewSession"
    @clear-all-kernels="handleClearAllKernels"
    @refresh-sessions="handleRefreshSessions"
    @refresh-servers="handleRefreshServers"
    @refresh-kernels="handleRefreshKernels"
    @add-test-server="handleAddTestServer"
    @test-server-connection="handleTestServerConnection"
    @apply-configuration="handleApplyConfiguration"
    @select-running-kernel="handleSelectRunningKernel"
    @toggle-shared-session-mode="handleToggleSharedSessionMode"
  />
</template>

<style scoped>
.my-6 {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

/* Enhanced styles for published mode */
.published-card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}

/* Add styles for scrollable code blocks */
:deep(pre) {
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
}

:deep(pre::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(pre::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(pre::-webkit-scrollbar-thumb) {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 4px;
}

/* Ensure code blocks use proper theme colors */
:deep(.cm-editor) {
  color: var(--foreground);
  background-color: var(--background);
}

:deep(.cm-gutters) {
  background-color: var(--muted) !important;
  border-right-color: var(--border) !important;
}

:deep(.cm-lineNumbers) {
  color: var(--muted-foreground) !important;
}

/* Add smooth transitions to the code block */
:deep(.code-block-wrapper) {
  transition: all 0.3s ease;
}

/* Add a subtle highlight for executing blocks */
:deep(.executing-block) {
  box-shadow: 0 0 0 2px var(--primary-light);
}
</style>









