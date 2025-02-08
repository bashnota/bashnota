<script setup lang="ts">
import { ref } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { JupyterService } from '@/services/jupyterService'
import type { JupyterServer } from '@/types/jupyter'

const props = defineProps<{
  notaId: string
}>()

const store = useNotaStore()
const jupyterService = new JupyterService()

interface KernelInfo {
  name: string
  display_name: string
  language: string
  spec: any
}

const notaConfig = ref({
  jupyterServers: [] as JupyterServer[],
  notebooks: [] as Array<{ notebook: string; server: string }>,
  kernels: {} as Record<string, KernelInfo[]>,
})

const serverInput = ref('')
const error = ref('')
const message = ref('')
const activeTab = ref('servers') // 'servers', 'kernels', or 'notebooks'

// Load existing configuration or initialize a new one
const loadConfig = () => {
  const nota = store.getCurrentNota(props.notaId)
  if (nota) {
    notaConfig.value = nota.config || {
      jupyterServers: [],
      notebooks: [],
      kernels: {},
    }
  }
}

const addJupyterServer = async (server: JupyterServer) => {
  try {
    // Test connection and get available kernels
    const result = await jupyterService.testConnection(server)
    if (result.success) {
      // Get available kernels with full information
      const kernels = await jupyterService.getAvailableKernels(server)

      // Add server to config
      notaConfig.value.jupyterServers.push(server)

      // Store full kernel information for this server
      notaConfig.value.kernels[server.ip] = kernels

      message.value = `Server added successfully. Available kernels: ${kernels
        .map((k) => k.display_name)
        .join(', ')}`

      // Save the updated configuration
      await store.updateNotaConfig(props.notaId, notaConfig.value)
    } else {
      error.value = result.message
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to add server'
  }
}

const handleServerSubmit = async (event: Event) => {
  event.preventDefault()
  error.value = ''
  message.value = ''

  // Parse server input
  try {
    const [ip, port, token] = serverInput.value.split(',').map((s) => s.trim())
    if (!ip || !port || !token) {
      throw new Error('Please provide IP, port, and token (comma-separated)')
    }

    await addJupyterServer({ ip, port, token })
    serverInput.value = '' // Clear input on success
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Invalid server configuration'
  }
}

const addNotebook = (notebook: string, server: string) => {
  notaConfig.value.notebooks.push({ notebook, server })
}

const addKernel = (kernel: string, server: string) => {
  notaConfig.value.kernels[server] = [kernel]
}

// Save configuration changes
const saveConfig = async () => {
  try {
    await store.updateNotaConfig(props.notaId, notaConfig.value)
    message.value = 'Configuration saved successfully'
  } catch (e) {
    error.value = 'Failed to save configuration'
  }
}

const removeServer = async (server: JupyterServer) => {
  try {
    const index = notaConfig.value.jupyterServers.findIndex((s) => s.ip === server.ip)
    if (index !== -1) {
      notaConfig.value.jupyterServers.splice(index, 1)
      delete notaConfig.value.kernels[server.ip]
      await store.updateNotaConfig(props.notaId, notaConfig.value)
      message.value = 'Server removed successfully'
    }
  } catch (e) {
    error.value = 'Failed to remove server'
  }
}

const removeKernel = async (server: JupyterServer, kernelName: string) => {
  try {
    const kernels = notaConfig.value.kernels[server.ip]
    if (kernels) {
      notaConfig.value.kernels[server.ip] = kernels.filter((k) => k.name !== kernelName)
      await store.updateNotaConfig(props.notaId, notaConfig.value)
      message.value = 'Kernel removed successfully'
    }
  } catch (e) {
    error.value = 'Failed to remove kernel'
  }
}

const switchTab = (tab: string) => {
  activeTab.value = tab
}

loadConfig()
</script>

<template>
  <div class="config-wrapper">
    <div class="nota-config">
      <header class="config-header">
        <div class="header-content">
          <h2>
            <i class="fas fa-cog"></i>
            Configuration
          </h2>
          <p class="subtitle">Manage your Jupyter environment settings</p>
        </div>
      </header>

      <div class="tabs">
        <button
          class="tab-button"
          :class="{ active: activeTab === 'servers' }"
          @click="switchTab('servers')"
        >
          <i class="fas fa-server"></i>
          Servers
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'kernels' }"
          @click="switchTab('kernels')"
        >
          <i class="fas fa-microchip"></i>
          Kernels
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'notebooks' }"
          @click="switchTab('notebooks')"
        >
          <i class="fas fa-book"></i>
          Notebooks
        </button>
      </div>

      <!-- Messages -->
      <div v-if="error" class="message error-message">
        <i class="fas fa-exclamation-circle"></i>
        {{ error }}
      </div>
      <div v-if="message" class="message success-message">
        <i class="fas fa-check-circle"></i>
        {{ message }}
      </div>

      <!-- Servers Tab -->
      <div v-if="activeTab === 'servers'" class="tab-content">
        <div class="config-section">
          <div class="section-header">
            <h3>Add Jupyter Server</h3>
            <div class="server-form">
              <div class="input-group">
                <input
                  v-model="serverInput"
                  type="text"
                  placeholder="IP, port, token (e.g., localhost, 8888, your_token)"
                  @keyup.enter="handleServerSubmit"
                />
                <button class="primary-button" @click="handleServerSubmit">
                  <i class="fas fa-plus"></i>
                  Add Server
                </button>
              </div>
              <p class="help-text">Format: IP, port, token (comma-separated)</p>
            </div>
          </div>
        </div>

        <div class="config-section">
          <div class="section-header">
            <h3>Configured Servers</h3>
          </div>
          <div class="server-grid">
            <div v-for="server in notaConfig.jupyterServers" :key="server.ip" class="server-card">
              <div class="server-card-header">
                <div class="server-info">
                  <i class="fas fa-server"></i>
                  <strong>{{ server.ip }}:{{ server.port }}</strong>
                </div>
                <button
                  class="icon-button danger"
                  @click="removeServer(server)"
                  title="Remove server"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <div v-if="!notaConfig.jupyterServers.length" class="empty-state">
              <i class="fas fa-server"></i>
              <p>No servers configured yet</p>
              <p class="help-text">Add a Jupyter server to get started</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Kernels Tab -->
      <div v-if="activeTab === 'kernels'" class="tab-content">
        <div class="config-section">
          <div class="section-header">
            <h3>Available Kernels</h3>
            <p class="subtitle">Manage kernels for each server</p>
          </div>
          <div class="server-grid">
            <div v-for="server in notaConfig.jupyterServers" :key="server.ip" class="server-card">
              <div class="server-card-header">
                <div class="server-info">
                  <i class="fas fa-server"></i>
                  <strong>{{ server.ip }}:{{ server.port }}</strong>
                </div>
              </div>
              <div class="server-card-content">
                <div class="kernel-section">
                  <div class="kernel-list" v-if="notaConfig.kernels[server.ip]?.length">
                    <div
                      v-for="kernel in notaConfig.kernels[server.ip]"
                      :key="kernel.name"
                      class="kernel-item"
                    >
                      <div class="kernel-info">
                        <span class="kernel-name">{{ kernel.display_name }}</span>
                        <span class="kernel-language">{{ kernel.language }}</span>
                      </div>
                      <button
                        class="icon-button danger"
                        @click="removeKernel(server, kernel.name)"
                        title="Remove kernel"
                      >
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                  <div v-else class="no-kernels">No kernels found</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notebooks Tab -->
      <div v-if="activeTab === 'notebooks'" class="tab-content">
        <div class="config-section">
          <div class="section-header">
            <h3>Notebook Management</h3>
            <p class="subtitle">Coming soon...</p>
          </div>
          <div class="empty-state">
            <i class="fas fa-book"></i>
            <p>Notebook management features are under development</p>
          </div>
        </div>
      </div>

      <div class="config-actions">
        <button class="primary-button" @click="saveConfig">
          <i class="fas fa-save"></i>
          Save Configuration
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-wrapper {
  height: 100%;
  overflow-y: auto;
  padding: 2rem;
}

.nota-config {
  max-width: 1200px;
  margin: 0 auto;
  min-height: min-content;
}

.config-header {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--color-background-soft);
  border-radius: 8px;
}

.header-content {
  text-align: center;
}

.header-content h2 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  color: var(--color-heading);
}

.header-content i {
  color: var(--color-primary);
}

.subtitle {
  color: var(--color-text-light);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.config-section {
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.server-form {
  max-width: 600px;
}

.input-group {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.input-group input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--color-background);
}

.help-text {
  font-size: 0.75rem;
  color: var(--color-text-light);
}

.message {
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-message {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.success-message {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.server-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.server-card-header {
  padding: 1rem;
  background: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.server-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.server-card-content {
  padding: 1rem;
}

.kernel-section h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.kernel-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.kernel-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--color-background-soft);
  border-radius: 4px;
  font-size: 0.875rem;
}

.kernel-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.kernel-name {
  font-weight: 500;
}

.kernel-language {
  font-size: 0.75rem;
  color: var(--color-text-light);
  background: var(--color-background-mute);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-light);
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.primary-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}

.primary-button:hover {
  opacity: 0.9;
}

.icon-button {
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  color: var(--color-text);
}

.icon-button:hover {
  background: var(--color-background-soft);
}

.icon-button.danger:hover {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  margin: 2rem 0;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background: var(--color-background-mute);
}

.tab-button.active {
  background: var(--color-primary);
  color: white;
}

.tab-content {
  min-height: 400px;
}
</style>
