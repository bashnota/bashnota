import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it } from 'vitest'
import {
  type BrowserHarnessAggregateError,
  browserTreeShutdownConfirmed,
  removeTemporaryDirectory,
  runBrowserAndCollectStdout,
  stopChildProcess,
  stopWindowsProcessTree,
  throwIfBrowserHarnessFailed,
} from '../../../e2e/browserHarnessCleanup'

const fixtures: string[] = []

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { force: true, recursive: true })
})

describe('throwIfBrowserHarnessFailed', () => {
  it('keeps the security assertion first when cleanup also fails', () => {
    const assertion = new Error('security assertion failed')
    const cleanup = new Error('cleanup failed')

    try {
      throwIfBrowserHarnessFailed(assertion, [cleanup])
      expect.unreachable('Expected the combined failure to be thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).name).toBe('AggregateError')
      expect((error as BrowserHarnessAggregateError).errors).toEqual([assertion, cleanup])
    }
  })
})

describe('stopChildProcess', () => {
  it('waits for delayed exit after escalating to SIGKILL', async () => {
    const child = new EventEmitter() as EventEmitter & {
      exitCode: number | null
      signalCode: NodeJS.Signals | null
      kill: (signal?: NodeJS.Signals) => boolean
    }
    child.exitCode = null
    child.signalCode = null
    const signals: Array<NodeJS.Signals | undefined> = []
    let exited = false
    child.kill = signal => {
      signals.push(signal)
      if (signal === 'SIGKILL') {
        setTimeout(() => {
          exited = true
          child.signalCode = 'SIGKILL'
          child.emit('exit', null, 'SIGKILL')
        }, 3)
      }
      return true
    }

    await stopChildProcess(child as never, 5)

    expect(signals).toEqual(['SIGTERM', 'SIGKILL'])
    expect(exited).toBe(true)
  })

  it('rejects without authorizing cleanup when a killed child never exits', async () => {
    const child = new EventEmitter() as EventEmitter & {
      exitCode: number | null
      signalCode: NodeJS.Signals | null
      kill: () => boolean
    }
    child.exitCode = null
    child.signalCode = null
    child.kill = () => true

    await expect(stopChildProcess(child as never, 5)).rejects.toThrow(/did not exit after SIGKILL/)
  })
})

describe('runBrowserAndCollectStdout', () => {
  it('can stop a long-lived browser from an external readiness signal', async () => {
    let signalReady: (() => void) | undefined
    const completionSignal = new Promise<void>(resolve => { signalReady = resolve })
    setTimeout(() => signalReady?.(), 50)

    const result = await runBrowserAndCollectStdout(
      process.execPath,
      ['-e', 'setInterval(() => undefined, 1_000)'],
      { completionSignal, timeoutMs: 5_000 },
    )

    expect(result).toEqual({ cleanupFailures: [], stdout: '' })
  })

  it('cleans up the owned child before propagating a rejected readiness signal', async () => {
    const directory = fixtureDirectory()
    const leakedWrite = join(directory, 'rejected-signal-child-survived')
    const signalFailure = new Error('route readiness callback failed')
    const completionSignal = new Promise<void>((_resolve, reject) => {
      setTimeout(() => reject(signalFailure), 50)
    })

    await expect(runBrowserAndCollectStdout(
      process.execPath,
      ['-e', `setTimeout(() => require('node:fs').writeFileSync(process.argv[1], 'leaked'), 500); setInterval(() => undefined, 1_000)`, leakedWrite],
      { completionSignal, timeoutMs: 5_000 },
    )).rejects.toBe(signalFailure)

    await new Promise(resolve => setTimeout(resolve, 600))
    expect(existsSync(leakedWrite)).toBe(false)
  })

  it('keeps a rejected readiness signal first when process-tree cleanup also fails', async () => {
    const signalFailure = new Error('route readiness callback failed')
    const treeFailure = new Error('taskkill failed')
    const completionSignal = new Promise<void>((_resolve, reject) => {
      setTimeout(() => reject(signalFailure), 50)
    })

    try {
      await runBrowserAndCollectStdout(
        process.execPath,
        ['-e', 'setInterval(() => undefined, 1_000)'],
        {
          completionSignal,
          platform: 'win32',
          stopWindowsTree: async pid => {
            process.kill(pid, 'SIGKILL')
            throw treeFailure
          },
          timeoutMs: 5_000,
        },
      )
      expect.unreachable('Expected readiness and shutdown failures')
    } catch (error) {
      const aggregate = error as BrowserHarnessAggregateError
      expect(aggregate.name).toBe('BrowserProcessTreeShutdownError')
      expect(aggregate.message).toBe(signalFailure.message)
      expect(aggregate.errors).toEqual([signalFailure, treeFailure])
    }
  })

  it('allows a scaled cold-start interval before receiving complete browser output', async () => {
    const result = await runBrowserAndCollectStdout(
      process.execPath,
      ['-e', "setTimeout(() => { process.stdout.write('browser-finished'); setInterval(() => undefined, 1_000) }, 2_500)"],
      {
        isOutputComplete: browserOutput => browserOutput === 'browser-finished',
        timeoutMs: 10_000,
      },
    )

    expect(result).toEqual({ cleanupFailures: [], stdout: 'browser-finished' })
  })

  it('fences a descendant that retains stdout after the direct child exits', async () => {
    const directory = fixtureDirectory()
    const leakedWrite = join(directory, 'descendant-survived')
    const descendant = `
      const { writeFileSync } = require('node:fs')
      setTimeout(() => process.stdout.write('browser-finished'), 150)
      setTimeout(() => writeFileSync(process.argv[1], 'leaked'), 1_000)
    `
    const launcher = `
      require('node:child_process').spawn(
        process.execPath,
        ['-e', ${JSON.stringify(descendant)}, process.argv[1]],
        { stdio: ['ignore', 'inherit', 'inherit'] },
      )
    `

    const result = await runBrowserAndCollectStdout(
      process.execPath,
      ['-e', launcher, leakedWrite],
      {
        isOutputComplete: browserOutput => browserOutput === 'browser-finished',
        timeoutMs: 5_000,
      },
    )

    expect(result).toEqual({ cleanupFailures: [], stdout: 'browser-finished' })
    await new Promise(resolve => setTimeout(resolve, 1_100))
    expect(existsSync(leakedWrite)).toBe(false)
  })

  it('uses the bounded Windows tree-termination seam before returning', async () => {
    let terminatedPid: number | undefined
    const result = await runBrowserAndCollectStdout(
      process.execPath,
      ['-e', "process.stdout.write('browser-finished'); setInterval(() => undefined, 1_000)"],
      {
        isOutputComplete: browserOutput => browserOutput === 'browser-finished',
        platform: 'win32',
        stopWindowsTree: async pid => {
          terminatedPid = pid
          process.kill(pid, 'SIGKILL')
        },
        timeoutMs: 5_000,
      },
    )

    expect(terminatedPid).toBeTypeOf('number')
    expect(result).toEqual({ cleanupFailures: [], stdout: 'browser-finished' })
  })

  it('keeps timeout and stderr first when Windows tree shutdown also fails', async () => {
    const treeFailure = new Error('taskkill failed')

    try {
      await runBrowserAndCollectStdout(
        process.execPath,
        ['-e', "process.stderr.write('browser-stalled'); setInterval(() => undefined, 1_000)"],
        {
          platform: 'win32',
          stopWindowsTree: async pid => {
            process.kill(pid, 'SIGKILL')
            throw treeFailure
          },
          timeoutMs: 2_000,
        },
      )
      expect.unreachable('Expected timeout and shutdown failures')
    } catch (error) {
      const aggregate = error as BrowserHarnessAggregateError
      expect(aggregate.name).toBe('BrowserProcessTreeShutdownError')
      expect(aggregate.message).toMatch(/Browser process timed out after 2000ms before completing:\nbrowser-stalled/)
      expect((aggregate.errors[0] as Error).message).toMatch(/Browser process timed out after 2000ms/)
      expect(aggregate.errors[1]).toBe(treeFailure)

      const retainedProfile = new Error('Retained browser profile after unconfirmed process-tree shutdown')
      try {
        throwIfBrowserHarnessFailed(aggregate, [retainedProfile])
        expect.unreachable('Expected flattened timeout and cleanup failures')
      } catch (outerError) {
        const outer = outerError as BrowserHarnessAggregateError
        expect(outer.message).toMatch(/Browser process timed out after 2000ms before completing:\nbrowser-stalled/)
        expect(outer.errors).toEqual([aggregate.errors[0], treeFailure, retainedProfile])
      }
    }
  })

  it('keeps a malicious assertion first when completed output also has a shutdown failure', async () => {
    const treeFailure = new Error('taskkill failed')
    const result = await runBrowserAndCollectStdout(
      process.execPath,
      ['-e', "process.stdout.write('EXPORT_ATTACK_EXECUTED'); setInterval(() => undefined, 1_000)"],
      {
        isOutputComplete: browserOutput => browserOutput === 'EXPORT_ATTACK_EXECUTED',
        platform: 'win32',
        stopWindowsTree: async pid => {
          process.kill(pid, 'SIGKILL')
          throw treeFailure
        },
        timeoutMs: 5_000,
      },
    )
    const assertion = result.stdout.includes('EXPORT_ATTACK_EXECUTED')
      ? new Error('A stored export payload executed in Chrome')
      : undefined

    expect(browserTreeShutdownConfirmed(result.cleanupFailures)).toBe(false)
    try {
      throwIfBrowserHarnessFailed(assertion, result.cleanupFailures)
      expect.unreachable('Expected assertion and shutdown failures')
    } catch (error) {
      const aggregate = error as BrowserHarnessAggregateError
      expect(aggregate.message).toBe('A stored export payload executed in Chrome')
      expect(aggregate.errors).toEqual([assertion, treeFailure])
    }
  })

  it('reports a bounded timeout instead of returning partial browser output', async () => {
    await expect(runBrowserAndCollectStdout(
      process.execPath,
      ['-e', "process.stdout.write('partial'); process.stderr.write('browser-stalled'); setInterval(() => undefined, 1_000)"],
      { timeoutMs: 2_000 },
    )).rejects.toThrow(/Browser process timed out after 2000ms before completing:\nbrowser-stalled/)
  })
})

describe('stopWindowsProcessTree', () => {
  it('rejects at its deadline when taskkill never closes', async () => {
    const taskkill = new EventEmitter() as EventEmitter & {
      exitCode: number | null
      signalCode: NodeJS.Signals | null
      kill: (signal?: NodeJS.Signals) => boolean
    }
    taskkill.exitCode = null
    taskkill.signalCode = null
    const signals: Array<NodeJS.Signals | undefined> = []
    taskkill.kill = signal => {
      signals.push(signal)
      return true
    }

    await expect(stopWindowsProcessTree(1234, 10, () => taskkill as never)).rejects.toThrow(
      'taskkill did not close within 10ms',
    )
    expect(signals).toEqual(['SIGKILL'])
  })
})

function fixtureDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'bashnota-cleanup-test-'))
  fixtures.push(directory)
  writeFileSync(join(directory, 'still-being-written'), 'fixture')
  return directory
}

describe('removeTemporaryDirectory', () => {
  it('retries a transient non-empty browser profile and eventually removes it', () => {
    const directory = fixtureDirectory()
    let attempts = 0
    const waits: number[] = []

    removeTemporaryDirectory(directory, {
      removeDirectory(path, options) {
        attempts += 1
        if (attempts < 3) throw Object.assign(new Error('profile is still changing'), { code: 'ENOTEMPTY' })
        rmSync(path, options)
      },
      retryDelayMs: 10,
      wait: delay => waits.push(delay),
    })

    expect(attempts).toBe(3)
    expect(waits).toEqual([10, 20])
    expect(existsSync(directory)).toBe(false)
  })

  it('reports a terminal cleanup error without retrying it', () => {
    const directory = fixtureDirectory()
    let attempts = 0

    expect(() => removeTemporaryDirectory(directory, {
      removeDirectory() {
        attempts += 1
        throw Object.assign(new Error('invalid cleanup target'), { code: 'EINVAL' })
      },
      wait: () => undefined,
    })).toThrow(/after 1 attempt/)

    expect(attempts).toBe(1)
    expect(existsSync(directory)).toBe(true)
  })

  it('bounds repeated transient failures and reports the retained directory', () => {
    const directory = fixtureDirectory()
    let attempts = 0

    expect(() => removeTemporaryDirectory(directory, {
      maxAttempts: 3,
      removeDirectory() {
        attempts += 1
        throw Object.assign(new Error('profile is still changing'), { code: 'ENOTEMPTY' })
      },
      wait: () => undefined,
    })).toThrow(directory)

    expect(attempts).toBe(3)
    expect(existsSync(directory)).toBe(true)
  })
})
