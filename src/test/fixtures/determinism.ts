import { vi, type Mock } from 'vitest'

export const FIXED_TEST_TIME = '2026-01-02T03:04:05.000Z'

export interface DeterministicRuntime {
  nextId(namespace?: string): string
}

/** Pins Date and supplies repeatable IDs for tests that persist generated data. */
export function installDeterministicRuntime(
  now = FIXED_TEST_TIME,
): DeterministicRuntime {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  let sequence = 0

  return {
    nextId(namespace = 'fixture') {
      const suffix = String(sequence++).padStart(4, '0')
      return `${namespace}-${suffix}`
    },
  }
}

export interface DeterministicFetch extends Mock<typeof fetch> {
  readonly requests: Request[]
  remaining(): number
}

/**
 * Installs a finite HTTP response queue. An unplanned request fails loudly,
 * which keeps provider and transport tests independent of production traffic.
 */
export function installDeterministicFetch(
  outcomes: Array<Response | Error>,
): DeterministicFetch {
  const queue = [...outcomes]
  const requests: Request[] = []
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    requests.push(new Request(input, init))
    const outcome = queue.shift()
    if (!outcome) throw new Error(`Unexpected HTTP request #${requests.length}`)
    if (outcome instanceof Error) throw outcome
    return outcome
  }) as DeterministicFetch

  Object.defineProperties(fetchMock, {
    requests: { value: requests },
    remaining: { value: () => queue.length },
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function streamingResponse(
  chunks: string[],
  init: ResponseInit = { status: 200 },
): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(body, init)
}
