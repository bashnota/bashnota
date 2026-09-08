import { beforeEach, describe, expect, it, vi } from 'vitest'

const { push, toast } = vi.hoisted(() => ({
  push: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/router', () => ({ default: { push } }))
vi.mock('@/services/toast', () => ({ toast }))

import {
  JUPYTER_SETUP_TOAST_ID,
  showJupyterExecutionGuidance,
} from './jupyterExecutionGuidance'

describe('Jupyter execution guidance', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses one stable notification with a working settings action', () => {
    showJupyterExecutionGuidance()
    showJupyterExecutionGuidance()

    expect(toast).toHaveBeenCalledTimes(2)
    const firstMessage = toast.mock.calls[0][0]
    const secondMessage = toast.mock.calls[1][0]
    expect(firstMessage.id).toBe(JUPYTER_SETUP_TOAST_ID)
    expect(secondMessage.id).toBe(JUPYTER_SETUP_TOAST_ID)
    expect(firstMessage).toMatchObject({
      title: 'Jupyter setup required',
      description: 'Add a Jupyter server before running code.',
      action: { label: 'Open settings' },
    })

    firstMessage.action.onClick()
    expect(push).toHaveBeenCalledWith({
      name: 'settings-detail',
      params: { section: 'jupyter' },
    })
  })
})
