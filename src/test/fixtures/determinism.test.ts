import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FIXED_TEST_TIME,
  installDeterministicFetch,
  installDeterministicRuntime,
  streamingResponse,
} from './determinism'

describe('deterministic test infrastructure', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('pins the clock and resets namespaced ID sequences per fixture', () => {
    const runtime = installDeterministicRuntime()

    expect(new Date().toISOString()).toBe(FIXED_TEST_TIME)
    expect(runtime.nextId('nota')).toBe('nota-0000')
    expect(runtime.nextId('block')).toBe('block-0001')
  })

  it('streams queued HTTP responses and rejects unplanned traffic', async () => {
    const fetch = installDeterministicFetch([
      streamingResponse(['first', '|second']),
      new Error('controlled network failure'),
    ])

    const response = await globalThis.fetch('https://fixture.invalid/stream')
    await expect(response.text()).resolves.toBe('first|second')
    await expect(globalThis.fetch('https://fixture.invalid/failure')).rejects.toThrow(
      'controlled network failure',
    )
    await expect(globalThis.fetch('https://fixture.invalid/unplanned')).rejects.toThrow(
      'Unexpected HTTP request #3',
    )
    expect(fetch.requests.map(request => request.url)).toEqual([
      'https://fixture.invalid/stream',
      'https://fixture.invalid/failure',
      'https://fixture.invalid/unplanned',
    ])
    expect(fetch.remaining()).toBe(0)
  })
})
