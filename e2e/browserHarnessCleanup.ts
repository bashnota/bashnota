import { spawn, type ChildProcess } from 'node:child_process'
import { rmSync } from 'node:fs'

const RETRYABLE_CLEANUP_CODES = new Set(['EBUSY', 'EMFILE', 'ENFILE', 'ENOTEMPTY', 'EPERM'])
const MAX_BROWSER_STDERR_LENGTH = 16_384

type RemoveDirectory = typeof rmSync

interface CleanupOptions {
  maxAttempts?: number
  removeDirectory?: RemoveDirectory
  retryDelayMs?: number
  wait?: (delayMs: number) => void
}

interface BrowserProcessOptions {
  completionSignal?: Promise<void>
  isOutputComplete?: (stdout: string) => boolean
  platform?: NodeJS.Platform
  stopWindowsTree?: (pid: number, timeoutMs: number) => Promise<void>
  timeoutMs?: number
}

export interface BrowserProcessResult {
  cleanupFailures: unknown[]
  stdout: string
}

function blockingWait(delayMs: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs)
}

export function removeTemporaryDirectory(
  directory: string,
  {
    maxAttempts = 6,
    removeDirectory = rmSync,
    retryDelayMs = 50,
    wait = blockingWait,
  }: CleanupOptions = {},
): void {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError('maxAttempts must be a positive integer')
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      removeDirectory(directory, { force: true, recursive: true })
      return
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : ''
      if (!RETRYABLE_CLEANUP_CODES.has(code) || attempt === maxAttempts) {
        const cleanupError = new Error(
          `Failed to remove browser test directory after ${attempt} attempt(s): ${directory}`,
        ) as Error & { cause?: unknown }
        cleanupError.cause = error
        throw cleanupError
      }
      wait(retryDelayMs * attempt)
    }
  }
}

export async function stopChildProcess(child: ChildProcess, timeoutMs = 2_000): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return

  await new Promise<void>((resolve, reject) => {
    let killTimeout: ReturnType<typeof setTimeout> | undefined
    const termTimeout = setTimeout(() => {
      child.kill('SIGKILL')
      killTimeout = setTimeout(() => {
        reject(new Error(`Child process did not exit after SIGKILL within ${timeoutMs}ms`))
      }, timeoutMs)
    }, timeoutMs)

    child.once('exit', () => {
      clearTimeout(termTimeout)
      if (killTimeout) clearTimeout(killTimeout)
      resolve()
    })
    child.once('error', error => {
      clearTimeout(termTimeout)
      if (killTimeout) clearTimeout(killTimeout)
      reject(error)
    })
    child.kill('SIGTERM')
  })
}

function processGroupExists(pid: number): boolean {
  try {
    process.kill(-pid, 0)
    return true
  } catch (error) {
    // This probe only runs after a signal reached the owned group. EPERM means
    // the former group is no longer signalable; do not target a recycled PGID.
    if (error instanceof Error && 'code' in error && (error.code === 'ESRCH' || error.code === 'EPERM')) return false
    throw error
  }
}

function signalProcessGroup(pid: number, signal: NodeJS.Signals): boolean {
  try {
    process.kill(-pid, signal)
    return true
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false
    throw error
  }
}

async function waitForProcessGroupExit(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (processGroupExists(pid) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 25))
  }
  return !processGroupExists(pid)
}

async function stopProcessGroup(pid: number, timeoutMs: number): Promise<void> {
  if (process.platform === 'win32') return

  if (!signalProcessGroup(pid, 'SIGTERM')) return
  if (await waitForProcessGroupExit(pid, timeoutMs)) return

  if (!signalProcessGroup(pid, 'SIGKILL')) return
  if (await waitForProcessGroupExit(pid, timeoutMs)) return
  throw new Error(`Browser process group ${pid} did not exit after SIGKILL`)
}

export async function stopWindowsProcessTree(
  pid: number,
  timeoutMs: number,
  spawnProcess: typeof spawn = spawn,
): Promise<void> {
  const taskkill = spawnProcess('taskkill', ['/PID', String(pid), '/T', '/F'], {
    stdio: 'ignore',
    windowsHide: true,
  })
  const result = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    taskkill.once('close', (code, signal) => resolve({ code, signal }))
    taskkill.once('error', reject)
  })
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    const { code, signal } = await Promise.race([
      result,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`taskkill did not close within ${timeoutMs}ms for browser process tree ${pid}`)),
          timeoutMs,
        )
      }),
    ])
    if (code !== 0) {
      throw new Error(`taskkill failed for browser process tree ${pid} with code ${code ?? 'null'} and signal ${signal ?? 'none'}`)
    }
  } finally {
    if (timeout) clearTimeout(timeout)
    if (taskkill.exitCode === null && taskkill.signalCode === null) taskkill.kill('SIGKILL')
  }
}

async function waitForClose(closed: Promise<void>, timeoutMs: number): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      closed,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`Browser stdio did not close within ${timeoutMs}ms after tree shutdown`)), timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function runBrowserAndCollectStdout(
  executable: string,
  args: string[],
  {
    completionSignal,
    isOutputComplete,
    platform = process.platform,
    stopWindowsTree = stopWindowsProcessTree,
    timeoutMs = 8_000,
  }: BrowserProcessOptions = {},
): Promise<BrowserProcessResult> {
  const detached = platform !== 'win32'
  const child = spawn(executable, args, {
    detached,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  let markOutputComplete: (() => void) | undefined
  const outputComplete = isOutputComplete
    ? new Promise<void>(resolve => {
        markOutputComplete = resolve
      })
    : undefined
  child.stdout?.setEncoding('utf8')
  child.stdout?.on('data', chunk => {
    stdout += chunk
    if (isOutputComplete?.(stdout)) markOutputComplete?.()
  })
  child.stderr?.setEncoding('utf8')
  child.stderr?.on('data', chunk => {
    stderr = `${stderr}${chunk}`.slice(-MAX_BROWSER_STDERR_LENGTH)
  })

  const closed = new Promise<void>((resolve, reject) => {
    child.once('close', () => resolve())
    child.once('error', reject)
  })
  let deadline: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<'timeout'>(resolve => {
    deadline = setTimeout(() => resolve('timeout'), timeoutMs)
  })
  let signalFailure: unknown
  let completion: 'closed' | 'output' | 'signal' | 'signal-error' | 'timeout'
  try {
    completion = await Promise.race([
      closed.then(() => 'closed' as const),
      ...(outputComplete ? [outputComplete.then(() => 'output' as const)] : []),
      ...(completionSignal ? [completionSignal.then(
        () => 'signal' as const,
        error => {
          signalFailure = error
          return 'signal-error' as const
        },
      )] : []),
      timedOut,
    ])
  } finally {
    if (deadline) clearTimeout(deadline)
  }

  const cleanupFailures: unknown[] = []
  if (completion !== 'closed') {
    try {
      if (child.pid) {
        if (platform === 'win32') await stopWindowsTree(child.pid, 2_000)
        else await stopProcessGroup(child.pid, 1_000)
      } else {
        await stopChildProcess(child, 1_000)
      }
    } catch (error) {
      cleanupFailures.push(error)
    }

    try {
      await waitForClose(closed, 2_000)
    } catch (error) {
      cleanupFailures.push(error)
    }
  }

  if (completion === 'timeout') {
    const diagnostic = stderr.trim()
    const timeoutError = new Error(
      `Browser process timed out after ${timeoutMs}ms before completing${diagnostic ? `:\n${diagnostic}` : ''}`,
    )
    if (cleanupFailures.length > 0) {
      const error = aggregateError([timeoutError, ...cleanupFailures], timeoutError.message)
      error.name = 'BrowserProcessTreeShutdownError'
      throw error
    }
    throw timeoutError
  }
  if (completion === 'signal-error') {
    const failure = signalFailure instanceof Error
      ? signalFailure
      : new Error(`Browser completion signal rejected: ${String(signalFailure)}`)
    if (cleanupFailures.length > 0) {
      const error = aggregateError([failure, ...cleanupFailures], failure.message)
      error.name = 'BrowserProcessTreeShutdownError'
      throw error
    }
    throw failure
  }
  if (completion === 'closed' && ((isOutputComplete && !isOutputComplete(stdout)) || completionSignal)) {
    const diagnostic = stderr.trim()
    throw new Error(
      `Browser process closed before producing complete output${diagnostic ? `:\n${diagnostic}` : ''}`,
    )
  }
  return { cleanupFailures, stdout }
}

export function browserTreeShutdownConfirmed(cleanupFailures: unknown[]): boolean {
  return cleanupFailures.length === 0
}

export interface BrowserHarnessAggregateError extends Error {
  errors: unknown[]
}

function aggregateError(errors: unknown[], message: string): BrowserHarnessAggregateError {
  const error = new Error(message) as BrowserHarnessAggregateError
  error.name = 'AggregateError'
  error.errors = errors
  return error
}

export function throwIfBrowserHarnessFailed(testFailure: unknown, cleanupFailures: unknown[]): void {
  if (testFailure !== undefined) {
    if (cleanupFailures.length > 0) {
      const primaryFailures = testFailure instanceof Error
        && 'errors' in testFailure
        && Array.isArray(testFailure.errors)
        ? testFailure.errors
        : [testFailure]
      const message = testFailure instanceof Error
        ? testFailure.message
        : 'Export security assertions and browser cleanup failed'
      throw aggregateError([...primaryFailures, ...cleanupFailures], message)
    }
    throw testFailure
  }
  if (cleanupFailures.length > 0) {
    throw aggregateError(cleanupFailures, 'Export security browser cleanup failed')
  }
}
