import router from '@/router'
import { toast } from '@/services/toast'

export const JUPYTER_SETUP_TOAST_ID = 'jupyter-setup-required'

/** Owns the single setup prompt shown only after explicit execution intent. */
export function showJupyterExecutionGuidance(): string | number {
  return toast({
    id: JUPYTER_SETUP_TOAST_ID,
    title: 'Jupyter setup required',
    description: 'Add a Jupyter server before running code.',
    action: {
      label: 'Open settings',
      onClick: () => void router.push({ name: 'settings-detail', params: { section: 'jupyter' } }),
    },
  })
}
