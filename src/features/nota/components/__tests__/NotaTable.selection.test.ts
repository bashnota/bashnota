import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Nota } from '@/features/nota/types/nota'
import NotaTable from '../NotaTable.vue'

const notas: Nota[] = [
  {
    id: 'nota-a',
    title: 'Alpha nota',
    parentId: null,
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
]

describe('NotaTable selection controls', () => {
  it('emits canonical model-value changes for a row and select-all', async () => {
    const wrapper = mount(NotaTable, {
      props: {
        notas,
        isAllSelected: false,
        isIndeterminate: false,
        formatDate: () => 'Jan 1, 2026',
        isNotaSelected: () => false,
      },
    })

    await wrapper.get('[aria-label="Select Alpha nota"]').trigger('click')
    expect(wrapper.emitted('select-nota')).toEqual([['nota-a', true]])

    await wrapper.get('[aria-label="Select all notas on this page"]').trigger('click')
    expect(wrapper.emitted('select-all')).toEqual([[true]])
  })

  it('keeps desktop row actions behind one labeled menu trigger', () => {
    const wrapper = mount(NotaTable, {
      props: {
        notas,
        formatDate: () => 'Jan 1, 2026',
        isNotaSelected: () => false,
      },
    })

    expect(wrapper.findAll('[aria-label^="Actions for "]')).toHaveLength(1)
    expect(wrapper.get('[aria-label="Actions for Alpha nota"]').attributes('aria-label')).toBe(
      'Actions for Alpha nota',
    )
    expect(wrapper.findAll('[title="Preview"]')).toHaveLength(0)
    expect(wrapper.findAll('[title="Delete"]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Delete nota')
  })
})
