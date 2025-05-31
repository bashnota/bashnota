<script setup lang="ts">
import { ref } from 'vue'
import ThemeAppearanceCard from './ThemeAppearanceCard.vue'
import InterfaceBehaviorCard from './InterfaceBehaviorCard.vue'
import TextEditingCard from './TextEditingCard.vue'
import CodeEditingCard from './CodeEditingCard.vue'
import { toast } from '@/components/ui/toast'

// Component refs for accessing child component methods
const interfaceBehaviorRef = ref()
const textEditingRef = ref()
const codeEditingRef = ref()

// Reset all workspace settings to defaults
const resetAllWorkspaceSettings = () => {
  if (confirm('Are you sure you want to reset all workspace settings to default?')) {
    // Reset interface settings
    const defaultInterfaceSettings = {
      sidebarWidth: [280],
      animationSpeed: [0.5],
      compactMode: false,
      showLineNumbers: true,
    }
    localStorage.setItem('interface-settings', JSON.stringify(defaultInterfaceSettings))
    
    // Reset editor settings
    const defaultEditorSettings = {
      autoSave: true,
      dragHandleWidth: [24],
      fontSize: [16],
      lineHeight: [1.6],
      spellCheck: true,
      tabSize: [2],
      indentWithTabs: false,
      wordWrap: true,
    }
    localStorage.setItem('editor-settings', JSON.stringify(defaultEditorSettings))
    
    // Reload settings in child components
    interfaceBehaviorRef.value?.loadSettings()
    textEditingRef.value?.loadSettings()
    codeEditingRef.value?.loadSettings()
    
    // Dispatch events to notify other parts of the app
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('interface-settings-changed', { 
        detail: defaultInterfaceSettings 
      }))
      window.dispatchEvent(new CustomEvent('editor-settings-changed', { 
        detail: defaultEditorSettings 
      }))
    }
    
    toast({
      title: 'Workspace Settings Reset',
      description: 'All workspace settings have been reset to default values',
      variant: 'default'
    })
  }
}

// Expose reset function for parent component
defineExpose({
  resetAllWorkspaceSettings
})
</script>

<template>
  <div class="space-y-6">
    <!-- Theme and Interface Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ThemeAppearanceCard />
      <InterfaceBehaviorCard ref="interfaceBehaviorRef" />
    </div>

    <!-- Editor Settings Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <TextEditingCard ref="textEditingRef" />
      <CodeEditingCard ref="codeEditingRef" />
    </div>
  </div>
</template> 