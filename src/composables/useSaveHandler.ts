import { ref } from 'vue'
import { useUIStore } from '@/stores/uiStore'
import { useTabsStore } from '@/stores/tabsStore'

/**
 * Composable for handling save operations and state
 * Integrates with the UI store and Tabs store
 */
export function useSaveHandler(notaId: string) {
  const uiStore = useUIStore()
  const tabsStore = useTabsStore()
  
  /**
   * Handle saving state changes
   * Updates both UI store and tab's dirty state
   */
  const handleSaving = (saving: boolean) => {
    uiStore.setSaving(saving)
    
    // Update the tab's dirty state
    tabsStore.updateTab(notaId, { isDirty: saving })
  }
  
  return {
    isSaving: uiStore.isSaving,
    showSaved: uiStore.showSaved,
    handleSaving
  }
}