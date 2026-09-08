import { expect, it, vi } from 'vitest'
import {
  installDeterministicFetch,
  streamingResponse,
} from '@/test/fixtures/determinism'
import type { AIProvider } from '../types'

export interface StreamingProviderContract {
  create(): AIProvider
  successChunks: string[]
  expectedText: string
  errorBody: string
}

export function streamingProviderContract(contract: StreamingProviderContract): void {
  it('assembles deterministically split streaming responses and completes once', async () => {
    const fetch = installDeterministicFetch([streamingResponse(contract.successChunks)])
    const onChunk = vi.fn()
    const onComplete = vi.fn()
    const onError = vi.fn()

    await contract
      .create()
      .generateTextStream(
        { prompt: 'deterministic prompt', temperature: 0, topP: 0, maxTokens: 16 },
        { onChunk, onComplete, onError },
      )

    expect(onChunk.mock.calls.flat()).toEqual(contract.expectedText.split('|'))
    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        text: contract.expectedText.split('|').join(''),
      }),
    )
    expect(onError).not.toHaveBeenCalled()
    expect(fetch.requests).toHaveLength(1)
    expect(fetch.remaining()).toBe(0)
  })

  it('rejects deterministic HTTP failures and reports the error once', async () => {
    const fetch = installDeterministicFetch([
      new Response(contract.errorBody, { status: 429, statusText: 'Too Many Requests' }),
    ])
    const onError = vi.fn()

    await expect(
      contract
        .create()
        .generateTextStream(
          { prompt: 'deterministic prompt' },
          { onChunk: vi.fn(), onComplete: vi.fn(), onError },
        ),
    ).rejects.toThrow(/429/)

    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(fetch.remaining()).toBe(0)
  })

  it('rejects a stream-reader failure and reports the error once', async () => {
    const failedStream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error('deterministic reader failure'))
      },
    })
    const fetch = installDeterministicFetch([new Response(failedStream, { status: 200 })])
    const onError = vi.fn()

    await expect(
      contract
        .create()
        .generateTextStream(
          { prompt: 'deterministic prompt' },
          { onChunk: vi.fn(), onComplete: vi.fn(), onError },
        ),
    ).rejects.toThrow('deterministic reader failure')

    expect(onError).toHaveBeenCalledOnce()
    expect(fetch.remaining()).toBe(0)
  })
}
