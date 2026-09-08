import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_FORMAT, BACKUP_VERSION, BLOCK_TABLES } from '@/features/nota/services/backupArchiveService'

const mocks = vi.hoisted(() => ({
  exportAllNotas: vi.fn(),
  importAllNotas: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  prepareDataDeletion: vi.fn(),
  deleteAllData: vi.fn(),
  resetStore: vi.fn(),
}))

vi.mock('@/features/nota/stores/nota', () => ({
  useNotaStore: () => ({
    exportAllNotas: mocks.exportAllNotas,
    importAllNotas: mocks.importAllNotas,
    $reset: mocks.resetStore,
  }),
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: mocks.success,
    error: mocks.error,
  },
}))

vi.mock('@/services/dataDeletionService', () => ({
  prepareDataDeletion: mocks.prepareDataDeletion,
  deleteAllData: mocks.deleteAllData,
}))

import DataManagementSettings from '../DataManagementSettings.vue'

const timestamp = '2026-08-19T12:00:00.000Z'
const archive = {
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  exportedAt: timestamp,
  notas: [{ id: 'nota-1', title: 'Recovered', parentId: null, createdAt: timestamp, updatedAt: timestamp }],
  blockStructures: [],
  blocks: Object.fromEntries(Object.keys(BLOCK_TABLES).map((tableName) => [tableName, []])),
}

function mountSettings() {
  return mount(DataManagementSettings, {
    global: {
      stubs: {
        Card: { template: '<section><slot /></section>' },
        CardHeader: { template: '<header><slot /></header>' },
        CardTitle: { template: '<h2><slot /></h2>' },
        CardContent: { template: '<div><slot /></div>' },
        CardDescription: { template: '<p><slot /></p>' },
        Button: { template: '<button v-bind="$attrs"><slot /></button>' },
        Label: { template: '<label v-bind="$attrs"><slot /></label>' },
        Input: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        Database: true,
        Download: true,
        Upload: true,
        Trash2: true,
        AlertTriangle: true,
        AlertDialog: { template: '<div><slot /></div>' },
        AlertDialogContent: { template: '<div role="alertdialog"><slot /></div>' },
        AlertDialogHeader: { template: '<header><slot /></header>' },
        AlertDialogTitle: { template: '<h2><slot /></h2>' },
        AlertDialogDescription: { template: '<p><slot /></p>' },
        AlertDialogFooter: { template: '<footer><slot /></footer>' },
        AlertDialogCancel: { template: '<button v-bind="$attrs"><slot /></button>' },
      },
    },
  })
}

describe('DataManagementSettings backup controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.exportAllNotas.mockResolvedValue(archive)
    mocks.importAllNotas.mockResolvedValue({ notaCount: 1 })
    mocks.prepareDataDeletion.mockResolvedValue({
      activeBackend: 'filesystem',
      filesystem: { directoryName: 'Research', fileNames: ['alpha.nota', 'beta.nota'] },
      authorities: [
        { id: 'filesystem', label: 'Filesystem directory', detail: '2 BashNota files in “Research”' },
        { id: 'indexeddb', label: 'IndexedDB databases', detail: '26 tables' },
        { id: 'browser-storage', label: 'Browser settings and caches', detail: 'Settings and caches' },
      ],
    })
    mocks.deleteAllData.mockResolvedValue({
      complete: true,
      results: [
        { id: 'filesystem', label: 'Filesystem directory', status: 'cleared', detail: 'Deleted 2 files.' },
        { id: 'indexeddb', label: 'IndexedDB databases', status: 'cleared', detail: 'Cleared 26 tables.' },
        { id: 'browser-storage', label: 'Browser settings and caches', status: 'cleared', detail: 'Cleared caches.' },
      ],
    })
  })

  it('passes the exact emitted backup format to the store and reports success only after restore', async () => {
    const wrapper = mountSettings()
    const input = wrapper.get('input[type="file"]')
    const file = { name: 'bashnota_backup.json', text: vi.fn().mockResolvedValue(JSON.stringify(archive)) }
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
    await input.trigger('change')

    const importButton = wrapper.findAll('button').find((button) => button.text().includes('Import Data'))!
    await importButton.trigger('click')
    await flushPromises()

    expect(mocks.importAllNotas).toHaveBeenCalledOnce()
    expect(mocks.importAllNotas).toHaveBeenCalledWith(archive)
    expect(mocks.success).toHaveBeenCalledWith('Import successful', {
      description: 'Restored 1 notas and their canonical blocks.',
    })
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it('shows an actionable initialization error without claiming export success', async () => {
    mocks.exportAllNotas.mockRejectedValue(new Error(
      'Backup is unavailable while filesystem storage is initializing. Wait a moment and try again.',
    ))
    const wrapper = mountSettings()

    await wrapper.findAll('button').find((button) => button.text().includes('Export All Data'))!.trigger('click')
    await flushPromises()

    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith('Export failed', {
      description: 'Backup is unavailable while filesystem storage is initializing. Wait a moment and try again.',
    })
  })

  it('shows an actionable initialization error without claiming import success', async () => {
    mocks.importAllNotas.mockRejectedValue(new Error(
      'Backup is unavailable while filesystem storage is initializing. Wait a moment and try again.',
    ))
    const wrapper = mountSettings()
    const input = wrapper.get('input[type="file"]')
    const file = { name: 'backup.json', text: vi.fn().mockResolvedValue(JSON.stringify(archive)) }
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
    await input.trigger('change')

    await wrapper.findAll('button').find((button) => button.text().includes('Import Data'))!.trigger('click')
    await flushPromises()

    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith('Import failed', {
      description: 'Backup is unavailable while filesystem storage is initializing. Wait a moment and try again.',
    })
  })

  it('shows the store validation or rollback error without claiming success', async () => {
    mocks.importAllNotas.mockRejectedValue(new Error('Restore requires an empty database. Export or clear the current data first.'))
    const wrapper = mountSettings()
    const input = wrapper.get('input[type="file"]')
    const file = { name: 'backup.json', text: vi.fn().mockResolvedValue(JSON.stringify(archive)) }
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
    await input.trigger('change')

    await wrapper.findAll('button').find((button) => button.text().includes('Import Data'))!.trigger('click')
    await flushPromises()

    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith('Import failed', {
      description: 'Restore requires an empty database. Export or clear the current data first.',
    })
  })

  it('names exact filesystem scope and requires typed and explicit directory authority', async () => {
    const wrapper = mountSettings()
    await wrapper.findAll('button').find((button) => button.text().includes('Delete All Data'))!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('alpha.nota')
    expect(wrapper.text()).toContain('beta.nota')
    expect(wrapper.text()).toContain('“Research”')
    const destructive = wrapper.findAll('button').find((button) => button.text().includes('Permanently Delete'))!
    expect(destructive.attributes('disabled')).toBeDefined()

    await wrapper.get('#delete-all-confirmation').setValue('DELETE ALL DATA')
    expect(destructive.attributes('disabled')).toBeDefined()
    await wrapper.get('#authorize-filesystem-delete').setValue(true)
    await wrapper.vm.$nextTick()
    const enabledDestructive = wrapper.findAll('button').find((button) => button.text().includes('Permanently Delete'))!
    expect(enabledDestructive.attributes('disabled')).toBeUndefined()
    await enabledDestructive.trigger('click')
    await flushPromises()
    expect(mocks.deleteAllData).toHaveBeenCalledOnce()
    expect(mocks.success).toHaveBeenCalledWith('All configured data cleared', expect.any(Object))
  })

  it('reports a partial failure per authority and never claims success', async () => {
    mocks.deleteAllData.mockResolvedValue({
      complete: false,
      results: [
        { id: 'filesystem', label: 'Filesystem directory', status: 'failed', detail: 'Permission denied' },
        { id: 'indexeddb', label: 'IndexedDB databases', status: 'cleared', detail: 'Cleared 26 tables.' },
        { id: 'browser-storage', label: 'Browser settings and caches', status: 'cleared', detail: 'Cleared caches.' },
      ],
    })
    const wrapper = mountSettings()
    await wrapper.findAll('button').find((button) => button.text().includes('Delete All Data'))!.trigger('click')
    await flushPromises()
    await wrapper.get('#delete-all-confirmation').setValue('DELETE ALL DATA')
    await wrapper.get('#authorize-filesystem-delete').setValue(true)
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button').find((button) => button.text().includes('Permanently Delete'))!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Permission denied')
    expect(wrapper.text()).toContain('Deletion was only partially completed')
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith('Some data could not be cleared', expect.objectContaining({
      description: expect.stringContaining('Filesystem directory: Permission denied'),
    }))
  })
})
