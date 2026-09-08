import { computed, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { Nota } from '@/features/nota/types/nota'
import { useNotaSelection } from '../useNotaSelection'

function nota(id: string): Nota {
  return {
    id,
    title: `Nota ${id}`,
    parentId: null,
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}

describe('useNotaSelection', () => {
  it('keeps row, page, indeterminate, and exact ID state synchronized', async () => {
    const pages = ref([[nota('a'), nota('b')], [nota('c'), nota('d')]])
    const pageIndex = ref(0)
    const currentPage = computed(() => pages.value[pageIndex.value])
    const selection = useNotaSelection()
    const pageSelection = selection.createSelectionForPage(currentPage)

    selection.handleSelectNota('a', true)
    expect(selection.selectionCount.value).toBe(1)
    expect(pageSelection.isAllSelected.value).toBe(false)
    expect(pageSelection.isIndeterminate.value).toBe(true)
    expect(selection.getSelectedIds()).toEqual(['a'])

    pageSelection.handleSelectAll(true)
    expect(pageSelection.isAllSelected.value).toBe(true)
    expect(pageSelection.isIndeterminate.value).toBe(false)
    expect(selection.getSelectedIds()).toEqual(['a', 'b'])

    pageIndex.value = 1
    await nextTick()
    expect(pageSelection.isAllSelected.value).toBe(false)
    expect(pageSelection.isIndeterminate.value).toBe(false)

    pageSelection.handleSelectAll(true)
    expect(selection.getSelectedIds()).toEqual(['a', 'b', 'c', 'd'])
    pageSelection.handleSelectAll(false)
    expect(selection.getSelectedIds()).toEqual(['a', 'b'])

    selection.clearSelection()
    expect(selection.hasSelection.value).toBe(false)
    expect(selection.getSelectedIds()).toEqual([])
  })
})
