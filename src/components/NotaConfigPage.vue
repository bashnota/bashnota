<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { JupyterService } from '@/services/jupyterService'
import LoadingSpinner from './LoadingSpinner.vue'
import type { JupyterServer } from '@/types/jupyter'
import { 
  ServerIcon, 
  CpuChipIcon, 
  Cog6ToothIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  notaId: string
}>()

const store = useNotaStore()
const jupyterService = new JupyterService()

// Form states
const serverForm = ref({
  ip: 'localhost',
  port: '8888',
  token: ''
})

const isTestingConnection = ref(false)
const isRefreshingKernels = ref(false)
const testResults = ref<Record<string, { success: boolean; message: string }>>({})

// Active tab state
const activeTab = ref('servers') // 'servers', 'kernels', or 'settings'

// Load config from store
const config = computed(() => {
  const nota = store.getCurrentNota(props.notaId)
  return nota?.config || {
    jupyterServers: [],
    notebooks: [],
    kernels: {}
  }
})

// Test server connection
const testConnection = async (server: JupyterServer) => {
  isTestingConnection.value = true
  try {
    const result = await jupyterService.testConnection(server)
    testResults.value[server.ip] = result
    if (result.success) {
      // Load available kernels
      await refreshKernels(server)
    }
  } catch (error) {
    testResults.value[server.ip] = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  } finally {
    isTestingConnection.value = false
  }
}

// Refresh kernels for a server
const refreshKernels = async (server: JupyterServer) => {
  isRefreshingKernels.value = true
  try {
    const kernels = await jupyterService.getAvailableKernels(server)
    await store.updateNotaConfig(props.notaId, {
      ...config.value,
      kernels: {
        ...config.value.kernels,
        [server.ip]: kernels
      }
    })
  } catch (error) {
    console.error('Failed to refresh kernels:', error)
  } finally {
    isRefreshingKernels.value = false
  }
}

// Add new server
const addServer = async () => {
  const server = {
    ip: serverForm.value.ip,
    port: serverForm.value.port,
    token: serverForm.value.token
  }

  // Test connection before adding
  await testConnection(server)
  
  if (testResults.value[server.ip]?.success) {
    await store.updateNotaConfig(props.notaId, {
      ...config.value,
      jupyterServers: [...config.value.jupyterServers, server]
    })
    
    // Reset form
    serverForm.value = {
      ip: 'localhost',
      port: '8888',
      token: ''
    }
  }
}

// Remove server
const removeServer = async (server: JupyterServer) => {
  if (confirm('Are you sure you want to remove this server?')) {
    const updatedServers = config.value.jupyterServers.filter(
      s => s.ip !== server.ip
    )
    await store.updateNotaConfig(props.notaId, {
      ...config.value,
      jupyterServers: updatedServers,
      kernels: Object.fromEntries(
        Object.entries(config.value.kernels).filter(([ip]) => ip !== server.ip)
      )
    })
  }
}

// Start a new kernel
const startKernel = async (server: JupyterServer, kernelName: string) => {
  try {
    const result = await jupyterService.createKernel(server, kernelName)
    if (result?.success) {
      await refreshKernels(server)
    }
  } catch (error) {
    console.error('Failed to start kernel:', error)
  }
}

// Stop a kernel
const stopKernel = async (server: JupyterServer, kernelId: string) => {
  try {
    await jupyterService.deleteKernel(server, kernelId)
    await refreshKernels(server)
  } catch (error) {
    console.error('Failed to stop kernel:', error)
  }
}
</script>

<template>
  <div class="config-page">
    <div class="config-header">
      <h2>Nota Configuration</h2>
      <div class="tabs">
        <button 
          v-for="tab in ['servers', 'kernels', 'settings']" 
          :key="tab"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          <ServerIcon v-if="tab === 'servers'" class="icon" />
          <CpuChipIcon v-if="tab === 'kernels'" class="icon" />
          <Cog6ToothIcon v-if="tab === 'settings'" class="icon" />
          {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
        </button>
      </div>
    </div>

    <!-- Servers Tab -->
    <div v-if="activeTab === 'servers'" class="tab-content">
      <div class="server-list">
        <h3>Connected Servers</h3>
        <div v-if="config.jupyterServers.length === 0" class="empty-state">
          No servers configured yet
        </div>
        <div 
          v-else 
          v-for="server in config.jupyterServers" 
          :key="server.ip"
          class="server-card"
        >
          <div class="server-info">
            <div class="server-name">{{ server.ip }}:{{ server.port }}</div>
            <div 
              class="server-status"
              :class="{ 
                'success': testResults[server.ip]?.success,
                'error': testResults[server.ip]?.success === false
              }"
            >
              {{ testResults[server.ip]?.message || 'Not tested' }}
            </div>
          </div>
          <div class="server-actions">
            <button 
              class="test-button"
              @click="testConnection(server)"
              :disabled="isTestingConnection"
            >
              <LoadingSpinner v-if="isTestingConnection" />
              <span v-else>Test Connection</span>
            </button>
            <button 
              class="remove-button"
              @click="removeServer(server)"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <div class="add-server-form">
        <h3>Add New Server</h3>
        <form @submit.prevent="addServer">
          <div class="form-group">
            <label>Server IP</label>
            <input v-model="serverForm.ip" placeholder="localhost" required />
          </div>
          <div class="form-group">
            <label>Port</label>
            <input v-model="serverForm.port" placeholder="8888" required />
          </div>
          <div class="form-group">
            <label>Token</label>
            <input 
              v-model="serverForm.token" 
              type="password" 
              placeholder="Jupyter token"
              required 
            />
          </div>
          <button type="submit" class="primary-button">Add Server</button>
        </form>
      </div>
    </div>

    <!-- Kernels Tab -->
    <div v-if="activeTab === 'kernels'" class="tab-content">
      <div class="section">
        <h3>Available Kernels</h3>
        <div v-if="config.jupyterServers.length === 0" class="empty-state">
          <p>No servers configured. Add a server to view available kernels.</p>
        </div>
        <div v-else v-for="server in config.jupyterServers" :key="server.ip" class="server-kernels">
          <div class="server-header">
            <h4>{{ server.ip }}:{{ server.port }}</h4>
            <button 
              class="refresh-button"
              @click="refreshKernels(server)"
              :disabled="isRefreshingKernels"
            >
              <ArrowPathIcon 
                class="icon" 
                :class="{ 'spinning': isRefreshingKernels }" 
              />
              Refresh Kernels
            </button>
          </div>
          
          <div v-if="!config.kernels[server.ip]?.length" class="empty-state">
            <p>No kernels found. Make sure Jupyter kernels are installed on the server.</p>
          </div>
          
          <div v-else class="kernels-grid">
            <div v-for="kernel in config.kernels[server.ip]" 
                 :key="kernel.name"
                 class="kernel-card">
              <div class="kernel-header">
                <span class="kernel-name">{{ kernel.display_name }}</span>
                <span class="kernel-language">{{ kernel.language }}</span>
              </div>
              <div class="kernel-info">
                <code>{{ kernel.name }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Tab -->
    <div v-if="activeTab === 'settings'" class="tab-content">
      <h3>General Settings</h3>
      <!-- Add general settings here -->
    </div>
  </div>
</template>

<style scoped>
.config-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.config-header {
  margin-bottom: 2rem;
}

.tabs {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.tabs button {
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-light);
  border-radius: 4px;
}

.tabs button.active {
  background: var(--color-primary);
  color: white;
}

.server-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.server-info {
  margin-bottom: 1rem;
}

.server-name {
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.server-status {
  font-size: 0.875rem;
}

.server-status.success {
  color: #10b981;
}

.server-status.error {
  color: #ef4444;
}

.server-actions {
  display: flex;
  gap: 0.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-light);
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
}

.primary-button {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.test-button {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.remove-button {
  background: var(--color-danger-soft);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.kernel-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.kernel-name {
  font-weight: 500;
}

.kernel-language {
  background: var(--color-background-mute);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-light);
  background: var(--color-background-soft);
  border-radius: 8px;
}

.kernel-form {
  background: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.kernels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.server-kernels {
  margin-bottom: 2rem;
}

.server-kernels h4 {
  margin-bottom: 1rem;
  color: var(--color-text-light);
}

.kernel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.kernel-actions {
  display: flex;
  justify-content: flex-end;
}

select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
}

.section {
  margin-bottom: 2rem;
}

.section h3 {
  margin-bottom: 1rem;
  color: var(--color-heading);
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
}

.server-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-button:hover {
  background: var(--color-background-mute);
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.kernel-info {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-light);
}

.kernel-info code {
  background: var(--color-background-mute);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
</style> 