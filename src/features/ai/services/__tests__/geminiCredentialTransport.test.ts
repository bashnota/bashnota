import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeminiProvider } from '../providers/geminiProvider'

describe('Gemini credential transport', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses x-goog-api-key instead of a URL query credential for streaming', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('[]', { status: 200 }))
    const provider = new GeminiProvider('provider-secret')

    await provider.generateTextStream(
      { prompt: 'hello' },
      { onChunk: vi.fn(), onComplete: vi.fn() },
    )
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).not.toContain('provider-secret')
    expect(String(url)).not.toContain('?key=')
    expect(options?.headers).toMatchObject({ 'x-goog-api-key': 'provider-secret' })
  })

  it('surfaces a credential-free streaming error exactly once', async () => {
    const secret = 'AIzaCredentialMarker012345678901234'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(`request rejected for ?key=${secret}`, { status: 400 }),
    )
    const onError = vi.fn()
    const provider = new GeminiProvider(secret)

    await expect(
      provider.generateTextStream(
        { prompt: 'hello' },
        { onChunk: vi.fn(), onComplete: vi.fn(), onError },
      ),
    ).rejects.toThrow('[REDACTED]')

    expect(onError).toHaveBeenCalledTimes(1)
    const surfacedError = onError.mock.calls[0][0] as Error
    expect(surfacedError).toBeInstanceOf(Error)
    expect(surfacedError.message).toContain('[REDACTED]')
    expect(surfacedError.message).not.toContain(secret)
    expect(JSON.stringify(surfacedError)).not.toContain(secret)
  })

  it('sanitizes stream-reader failures before invoking the callback', async () => {
    const secret = 'AIzaCredentialMarker012345678901234'
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error(`reader failed with Bearer ${secret}`))
      },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream, { status: 200 }))
    const onError = vi.fn()
    const provider = new GeminiProvider(secret)

    await expect(
      provider.generateTextStream(
        { prompt: 'hello' },
        { onChunk: vi.fn(), onComplete: vi.fn(), onError },
      ),
    ).rejects.toThrow('Bearer [REDACTED]')

    expect(onError).toHaveBeenCalledTimes(1)
    expect((onError.mock.calls[0][0] as Error).message).not.toContain(secret)
  })
})
