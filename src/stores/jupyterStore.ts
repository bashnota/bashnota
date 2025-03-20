import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { JupyterServer, KernelSpec } from '@/types/jupyter'
import { toast } from '@/lib/utils'

export const useJupyterStore = defineStore('jupyter', () => {
  const jupyterServers = ref<JupyterServer[]>([])
  const kernels = ref<Record<string, KernelSpec[]>>({})

  // Load servers from localStorage
  const loadServers = () => {
    const savedServers = localStorage.getItem('jupyter-servers')
    if (savedServers) {
      try {
        jupyterServers.value = JSON.parse(savedServers)
      } catch (error) {
        console.error('Failed to parse saved Jupyter servers', error)
      }
    }

    const savedKernels = localStorage.getItem('jupyter-kernels')
    if (savedKernels) {
      try {
        kernels.value = JSON.parse(savedKernels)
      } catch (error) {
        console.error('Failed to parse saved Jupyter kernels', error)
      }
    }
  }

  // Save servers to localStorage
  const saveServers = () => {
    localStorage.setItem('jupyter-servers', JSON.stringify(jupyterServers.value))
    localStorage.setItem('jupyter-kernels', JSON.stringify(kernels.value))
  }

  // Add a new server
  const addServer = (server: JupyterServer) => {
    // Check if server with same IP and port already exists
    const serverExists = jupyterServers.value.some(
      (s) => s.ip.toLowerCase() === server.ip.toLowerCase() && s.port === server.port,
    )

    if (serverExists) {
      toast('A server with this IP and port already exists')
      return false
    }

    jupyterServers.value.push(server)
    saveServers()
    toast('Server added successfully')
    return true
  }

  // Remove a server
  const removeServer = (serverToRemove: JupyterServer) => {
    jupyterServers.value = jupyterServers.value.filter(
      (s) => !(s.ip === serverToRemove.ip && s.port === serverToRemove.port),
    )
    
    // Remove kernels for this server
    const serverKey = `${serverToRemove.ip}:${serverToRemove.port}`
    if (kernels.value[serverKey]) {
      delete kernels.value[serverKey]
    }
    
    saveServers()
    toast('Server removed successfully')
  }

  // Update kernels for a server
  const updateKernels = (server: JupyterServer, serverKernels: KernelSpec[]) => {
    const serverKey = `${server.ip}:${server.port}`
    kernels.value[serverKey] = serverKernels
    saveServers()
  }

  // Initialize store
  loadServers()

  return {
    jupyterServers,
    kernels,
    addServer,
    removeServer,
    updateKernels,
    loadServers,
    saveServers
  }
}) 