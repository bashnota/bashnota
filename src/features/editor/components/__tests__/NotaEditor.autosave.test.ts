import { nextTick, ref } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const editorHarness = vi.hoisted(() => ({
  options: undefined as Record<string, any> | undefined,
  editors: [] as Array<Record<string, any>>,
}))

const persistenceHarness = vi.hoisted(() => ({
  persistedContent: undefined as Record<string, any> | undefined,
  releaseFirstWrite: undefined as (() => void) | undefined,
  writes: [] as Array<Record<string, any>>,
  deferFirstWrite: true,
  failuresRemaining: 0,
  deferInitialize: false,
  releaseInitialize: undefined as (() => void) | undefined,
}))

const loggerHarness = vi.hoisted(() => ({ errors: [] as string[] }))
const toastHarness = vi.hoisted(() => ({ errors: [] as string[] }))

const copyDocument = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

vi.mock('@/features/editor/pm', async () => {
  const { ref } = await import('vue')

  return {
    EditorContent: { template: '<div data-testid="editor-content" />' },
    useEditor: (options: Record<string, any>) => {
      let content = { type: 'doc', content: [] } as Record<string, any>
      const editor = {
        isFocused: true,
        getJSON: vi.fn(() => content),
        getText: vi.fn(() => ''),
        setOptions: vi.fn(),
        commands: {
          setContent: vi.fn((nextContent: Record<string, any>) => {
            content = copyDocument(nextContent)
            return true
          }),
        },
        view: { dom: document.createElement('div') },
        chain: vi.fn(() => ({ focus: vi.fn().mockReturnThis() })),
      }

      editorHarness.options = options
      editorHarness.editors.push(editor)
      return ref(editor)
    },
  }
})

vi.mock('@/features/editor/components/extensions', () => ({ getEditorExtensions: () => [] }))
vi.mock('@/features/nota/stores/nota', () => ({
  useNotaStore: () => ({
    getCurrentNota: () => ({ id: 'nota-autosave', title: 'Autosave regression' }),
    getItem: vi.fn(),
    loadNota: vi.fn(),
    getNotaContentAsTiptap: vi.fn(),
    saveNotaVersion: vi.fn(),
    createItem: vi.fn(),
    updateNotaTitle: vi.fn(),
  }),
}))
vi.mock('@/features/jupyter/stores/jupyterStore', () => ({
  useJupyterStore: () => ({ jupyterServers: [] }),
}))
vi.mock('@/features/editor/stores/codeExecutionStore', () => ({
  useCodeExecutionStore: () => ({
    addCell: vi.fn(),
    cleanup: vi.fn(),
    loadSavedSessions: vi.fn(),
    saveSessions: vi.fn(),
    toggleSharedSessionMode: vi.fn(),
  }),
}))
vi.mock('@/features/editor/stores/citationStore', () => ({
  useCitationStore: () => ({ getCitationsByNotaId: () => [] }),
}))
vi.mock('@/features/editor/composables/useEquationCounter', () => ({
  EQUATION_COUNTER_KEY: Symbol('equation-counter'),
  useEquationCounter: () => ({
    equationCounter: ref(0),
    resetEquationCounter: vi.fn(),
    updateEquationNumbers: vi.fn(),
  }),
}))
vi.mock('@/features/nota/composables/useBlockEditor', () => ({
  useBlockEditor: () => ({
    syncContentToBlocks: async (content: Record<string, any>) => {
      persistenceHarness.writes.push(copyDocument(content))
      if (persistenceHarness.failuresRemaining > 0) {
        persistenceHarness.failuresRemaining -= 1
        throw new Error('temporary storage failure')
      }
      if (persistenceHarness.deferFirstWrite && persistenceHarness.writes.length === 1) {
        await new Promise<void>(resolve => { persistenceHarness.releaseFirstWrite = resolve })
      }
      persistenceHarness.persistedContent = copyDocument(content)
    },
    syncContentForVersion: vi.fn(),
    initializeBlocks: vi.fn(async () => {
      if (persistenceHarness.deferInitialize) {
        await new Promise<void>(resolve => { persistenceHarness.releaseInitialize = resolve })
      }
    }),
    getTiptapContent: ref(persistenceHarness.persistedContent),
    blockStats: ref({}),
    isInitialized: ref(true),
  }),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/services/toast', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn((message: string) => toastHarness.errors.push(message)),
    message: vi.fn(),
  }),
}))
vi.mock('@/services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn((...args: unknown[]) => loggerHarness.errors.push(args.map(String).join(' '))) },
}))
vi.mock('@/features/editor/services/exportService', () => ({ exportNotaToHtml: vi.fn() }))

import NotaEditor from '../NotaEditor.vue'

function documentSnapshot(index: number) {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: `edit-${index}` }] }],
  }
}

function emitDocumentUpdate(editor: Record<string, any>, index: number) {
  const snapshot = documentSnapshot(index)
  editor.getJSON.mockReturnValue(snapshot)
  editorHarness.options?.onUpdate({
    editor,
    transaction: {
      docChanged: true,
      steps: [{ from: index, to: index, slice: { content: { size: 1 } } }],
    },
  })
}

async function waitForPersistedContent(expected: Record<string, any>) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await flushPromises()
    if (JSON.stringify(persistenceHarness.persistedContent) === JSON.stringify(expected)) return
  }
  throw new Error('The final editor snapshot was not persisted')
}

function mountEditor() {
  return shallowMount(NotaEditor, {
    props: { notaId: 'nota-autosave' },
    global: {
      stubs: {
        Button: true,
        ScrollArea: { template: '<div><slot /></div>' },
      },
    },
  })
}

describe('NotaEditor autosave integration', () => {
  beforeEach(() => {
    editorHarness.options = undefined
    editorHarness.editors.length = 0
    persistenceHarness.persistedContent = undefined
    persistenceHarness.releaseFirstWrite = undefined
    persistenceHarness.writes.length = 0
    persistenceHarness.deferFirstWrite = true
    persistenceHarness.failuresRemaining = 0
    persistenceHarness.deferInitialize = false
    persistenceHarness.releaseInitialize = undefined
    loggerHarness.errors.length = 0
    toastHarness.errors.length = 0
    vi.useRealTimers()
  })

  it('does not overwrite a title typed while block initialization is pending', async () => {
    persistenceHarness.deferInitialize = true
    const wrapper = mountEditor()
    await nextTick()
    await nextTick()

    const title = wrapper.get('[aria-label="Nota title"]')
    expect(title.text()).toBe('Autosave regression')
    title.element.textContent = 'User title while loading'
    await title.trigger('input')

    persistenceHarness.releaseInitialize?.()
    await flushPromises()

    expect(title.text()).toBe('User title while loading')
    wrapper.unmount()
  })

  it('persists and reloads the final document after more than 50 rapid edits', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    const editor = editorHarness.editors[0]
    emitDocumentUpdate(editor, 0)
    for (let attempt = 0; attempt < 10 && persistenceHarness.writes.length === 0; attempt += 1) {
      await nextTick()
      await flushPromises()
    }
    expect(persistenceHarness.writes).toHaveLength(1)

    for (let index = 1; index < 75; index += 1) emitDocumentUpdate(editor, index)

    const finalDocument = documentSnapshot(74)
    persistenceHarness.releaseFirstWrite?.()
    await waitForPersistedContent(finalDocument)

    expect(persistenceHarness.writes.at(-1)).toEqual(finalDocument)
    wrapper.unmount()

    const reloaded = mountEditor()
    await flushPromises()

    expect(editorHarness.editors[1].commands.setContent).toHaveBeenCalledWith(finalDocument)
    expect(editorHarness.editors[1].getJSON()).toEqual(finalDocument)
    reloaded.unmount()
  })

  it('automatically retries a transient failure and reloads the recovered document', async () => {
    vi.useFakeTimers()
    persistenceHarness.deferFirstWrite = false
    persistenceHarness.failuresRemaining = 1
    const wrapper = mountEditor()
    await flushPromises()

    const editor = editorHarness.editors[0]
    const finalDocument = documentSnapshot(1)
    emitDocumentUpdate(editor, 1)
    await nextTick()
    await flushPromises()

    expect(persistenceHarness.writes).toEqual([finalDocument])
    expect(persistenceHarness.persistedContent).toBeUndefined()

    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()

    expect(persistenceHarness.writes).toEqual([finalDocument, finalDocument])
    expect(persistenceHarness.persistedContent).toEqual(finalDocument)
    expect(toastHarness.errors).toEqual([])
    wrapper.unmount()

    const reloaded = mountEditor()
    await flushPromises()
    expect(editorHarness.editors[1].commands.setContent).toHaveBeenCalledWith(finalDocument)
    expect(editorHarness.editors[1].getJSON()).toEqual(finalDocument)
    reloaded.unmount()
  })

  it('finishes an unmounted editor drain before a reopened editor can persist newer content', async () => {
    const firstEditor = mountEditor()
    await flushPromises()
    const firstInstance = editorHarness.editors[0]
    const firstDocument = documentSnapshot(10)
    const queuedFinalDocument = documentSnapshot(11)
    const reopenedDocument = documentSnapshot(12)

    emitDocumentUpdate(firstInstance, 10)
    for (let attempt = 0; attempt < 10 && persistenceHarness.writes.length === 0; attempt += 1) {
      await nextTick()
      await flushPromises()
    }
    expect(persistenceHarness.writes).toEqual([firstDocument])

    emitDocumentUpdate(firstInstance, 11)
    firstEditor.unmount()

    const reopenedEditor = mountEditor()
    await flushPromises()
    emitDocumentUpdate(editorHarness.editors[1], 12)
    await nextTick()
    await flushPromises()

    // The reopened editor is queued behind the old instance's entire drain.
    expect(persistenceHarness.writes).toEqual([firstDocument])

    persistenceHarness.releaseFirstWrite?.()
    await waitForPersistedContent(reopenedDocument)

    expect(persistenceHarness.writes).toEqual([
      firstDocument,
      queuedFinalDocument,
      reopenedDocument,
    ])
    reopenedEditor.unmount()

    const reloaded = mountEditor()
    await flushPromises()
    expect(editorHarness.editors[2].commands.setContent).toHaveBeenCalledWith(reopenedDocument)
    expect(editorHarness.editors[2].getJSON()).toEqual(reopenedDocument)
    reloaded.unmount()
  })

  it('stops scheduled retries on unmount', async () => {
    vi.useFakeTimers()
    persistenceHarness.deferFirstWrite = false
    persistenceHarness.failuresRemaining = 10
    const wrapper = mountEditor()
    await flushPromises()

    emitDocumentUpdate(editorHarness.editors[0], 2)
    await nextTick()
    await flushPromises()
    expect(persistenceHarness.writes).toHaveLength(1)

    wrapper.unmount()
    await vi.runAllTimersAsync()
    expect(persistenceHarness.writes).toHaveLength(1)
  })

  it('shows one actionable error after bounded retries are exhausted', async () => {
    vi.useFakeTimers()
    persistenceHarness.deferFirstWrite = false
    persistenceHarness.failuresRemaining = 10
    const wrapper = mountEditor()
    await flushPromises()

    emitDocumentUpdate(editorHarness.editors[0], 3)
    await nextTick()
    await flushPromises()
    for (const delay of [250, 1000, 3000]) {
      await vi.advanceTimersByTimeAsync(delay)
      await flushPromises()
    }

    expect(persistenceHarness.writes).toHaveLength(4)
    expect(toastHarness.errors).toEqual([
      'Autosave could not recover. Your unsaved edits remain in this tab; check storage access and edit again to retry.',
    ])
    wrapper.unmount()
  })
})
