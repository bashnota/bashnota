import { ref, computed } from 'vue'
import type { KernelSpec } from '@/features/jupyter/types/jupyter'

interface ToolbarOptions {
  isReadOnly?: boolean
  onServerSelect: (serverId: string) => void
  onKernelSelect: (kernelName: string) => void
  onSessionSelect: (sessionId: string) => void
}

export function useCodeBlockToolbar(options: ToolbarOptions) {
  // Visibility states
  const isServerOpen = ref(false)
  const isKernelOpen = ref(false)
  const isSessionOpen = ref(false)
  const isCodeVisible = ref(true)
  const isOutputVisible = ref(true)

  // Selection states
  const selectedServer = ref<string>('none')
  const selectedKernel = ref<string>('none')
  const selectedSession = ref<string>('')

  // Loading states
  const isSettingUp = ref(false)

  const handleServerSelect = (serverId: string) => {
    selectedServer.value = serverId
    options.onServerSelect(serverId)
    isServerOpen.value = false
  }

  const handleKernelSelect = (kernelName: string) => {
    selectedKernel.value = kernelName
    options.onKernelSelect(kernelName)
    isKernelOpen.value = false
  }

  const handleSessionSelect = (sessionId: string) => {
    selectedSession.value = sessionId
    options.onSessionSelect(sessionId)
    isSessionOpen.value = false
  }

  const toggleCodeVisibility = () => {
    isCodeVisible.value = !isCodeVisible.value
  }

  const toggleOutputVisibility = () => {
    isOutputVisible.value = !isOutputVisible.value
  }

  return {
    // States
    isServerOpen,
    isKernelOpen,
    isSessionOpen,
    isCodeVisible,
    isOutputVisible,
    selectedServer,
    selectedKernel,
    selectedSession,
    isSettingUp,

    // Methods
    handleServerSelect,
    handleKernelSelect,
    handleSessionSelect,
    toggleCodeVisibility,
    toggleOutputVisibility,
  }
} 







