import { isNavigationFailure, NavigationFailureType, useRouter } from 'vue-router'
import { useLayoutStore } from '@/stores/layoutStore'
import { useNotaStore } from '@/features/nota/stores/nota'
import { logger } from '@/services/logger'

const pendingNotaNavigation = new Map<string, string>()

export const pendingNotaNavigationPane = (notaId: string) => pendingNotaNavigation.get(notaId)

export function useNotaNavigation() {
  const router = useRouter()
  const layoutStore = useLayoutStore()
  const notaStore = useNotaStore()

  const openNota = async (notaId: string, paneId?: string) => {
    const nota = notaStore.getItem(notaId) ?? await notaStore.loadNota(notaId)
    if (!nota) throw new Error('The linked nota no longer exists.')

    const targetPane = paneId
      ? layoutStore.getPane(paneId)
      : layoutStore.activePaneObj ?? layoutStore.panes[0]
    if (!targetPane) throw new Error('No editor pane is available.')

    const previous = {
      activePane: layoutStore.activePane,
      notaId: targetPane.notaId,
      tabHistory: [...(targetPane.tabHistory ?? [])],
    }
    pendingNotaNavigation.set(notaId, targetPane.id)
    layoutStore.setActivePane(targetPane.id)

    try {
      const failure = await router.push({ name: 'nota', params: { id: notaId } })
      if (failure && !isNavigationFailure(failure, NavigationFailureType.duplicated)) throw failure
      if (targetPane.notaId !== notaId) layoutStore.openNotaInPane(notaId, targetPane.id)
    } catch (error) {
      logger.error('Failed to synchronize nota navigation:', error)
      targetPane.notaId = previous.notaId
      targetPane.tabHistory = previous.tabHistory
      if (previous.activePane) layoutStore.setActivePane(previous.activePane)
      throw error
    } finally {
      pendingNotaNavigation.delete(notaId)
    }
  }

  return { openNota }
}
