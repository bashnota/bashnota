import { describe, expect, it } from 'vitest'
import {
  drainPersistedEdits,
  enqueuePersistedEdit,
  shouldCaptureEditorUpdate,
  type PersistedEditOperation,
} from '../editPersistenceQueue'

function edit(index: number): PersistedEditOperation<{ value: number }> {
  return {
    id: `edit-${index}`,
    type: 'update',
    position: index,
    content: { value: index },
    timestamp: index,
    applied: false,
  }
}

describe('enqueuePersistedEdit', () => {
  it('retains the triggering edit when the bounded queue is saturated', () => {
    let queue: PersistedEditOperation<{ value: number }>[] = []
    for (let index = 0; index < 60; index += 1) {
      queue = enqueuePersistedEdit(queue, edit(index), 50)
    }

    expect(queue.at(-1)?.content).toEqual({ value: 59 })
    expect(queue.length).toBeLessThanOrEqual(50)
  })
})

describe('shouldCaptureEditorUpdate', () => {
  it('captures focused document changes while persistence is in flight', () => {
    expect(shouldCaptureEditorUpdate({
      docChanged: true,
      isFocused: true,
      isApplyingPersistedContent: false,
    })).toBe(true)
  })

  it('suppresses persisted-content application and non-document updates', () => {
    expect(shouldCaptureEditorUpdate({
      docChanged: true,
      isFocused: true,
      isApplyingPersistedContent: true,
    })).toBe(false)
    expect(shouldCaptureEditorUpdate({
      docChanged: false,
      isFocused: true,
      isApplyingPersistedContent: false,
    })).toBe(false)
  })
})

describe('drainPersistedEdits', () => {
  it('persists a burst beyond the cap and reloads the newest document', async () => {
    let queue: PersistedEditOperation<{ value: number }>[] = []
    let storedDocument: { value: number } | undefined

    for (let index = 0; index < 75; index += 1) {
      queue = enqueuePersistedEdit(queue, edit(index), 50)
    }

    await drainPersistedEdits({
      readQueue: () => queue,
      writeQueue: nextQueue => { queue = nextQueue },
      persist: async operation => { storedDocument = operation.content },
    })

    const reloadedDocument = structuredClone(storedDocument)
    expect(reloadedDocument).toEqual({ value: 74 })
    expect(queue).toEqual([])
  })

  it('removes each successfully applied entry', async () => {
    let queue = [edit(0), edit(1), edit(2)]
    const queueSizes: number[] = []

    await drainPersistedEdits({
      readQueue: () => queue,
      writeQueue: nextQueue => {
        queue = nextQueue
        queueSizes.push(queue.length)
      },
      persist: async () => undefined,
    })

    expect(queueSizes).toEqual([3, 2, 1, 0])
    expect(queue).toEqual([])
  })

  it('drains the triggering edit added at capacity while a write is in flight', async () => {
    let queue = Array.from({ length: 50 }, (_, index) => edit(index))
    const persisted: number[] = []

    await drainPersistedEdits({
      readQueue: () => queue,
      writeQueue: nextQueue => { queue = nextQueue },
      persist: async operation => {
        persisted.push(operation.content!.value)
        if (operation.id === 'edit-0') {
          queue = enqueuePersistedEdit(queue, edit(50), 50)
        }
      },
    })

    expect(persisted).toEqual([0, 50])
    expect(queue).toEqual([])
  })

  it('keeps a failed entry observable and retries it on the next drain', async () => {
    let queue = [edit(0), edit(1)]
    const attempts: number[] = []
    let shouldFail = true
    const options = {
      readQueue: () => queue,
      writeQueue: (nextQueue: PersistedEditOperation<{ value: number }>[]) => { queue = nextQueue },
      persist: async (operation: PersistedEditOperation<{ value: number }>) => {
        attempts.push(operation.content!.value)
        if (shouldFail) throw new Error('storage unavailable')
      },
    }

    await expect(drainPersistedEdits(options)).rejects.toThrow('storage unavailable')
    expect(queue.map(operation => operation.id)).toEqual(['edit-0', 'edit-1'])
    expect(queue[0].applied).toBe(false)

    shouldFail = false
    await drainPersistedEdits(options)

    expect(attempts).toEqual([0, 0, 1])
    expect(queue).toEqual([])
  })
})
