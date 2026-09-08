import { nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { Nota } from '@/features/nota/types/nota'
import { useNotaList } from '../useNotaList'

function nota(index: number): Nota {
  return {
    id: `nota-${index}`,
    title: index === 10 ? 'Filtered target' : `Nota ${index}`,
    parentId: null,
    tags: [],
    createdAt: new Date(`2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`),
    updatedAt: new Date(`2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`),
  }
}

describe('useNotaList selection', () => {
  it('tracks the live page and clears hidden selection when filtering', async () => {
    const notas = ref(Array.from({ length: 11 }, (_, index) => nota(index)))
    const list = useNotaList({ notas: () => notas.value, itemsPerPage: 10 })

    list.handleSelectAll(true)
    expect(list.selectionCount.value).toBe(10)
    expect(list.isAllSelected.value).toBe(true)

    list.nextPage()
    expect(list.currentPage.value).toBe(2)
    expect(list.isAllSelected.value).toBe(false)
    list.handleSelectAll(true)
    expect(new Set(list.getSelectedIds())).toEqual(new Set(notas.value.map(item => item.id)))

    list.updateSearch('Filtered target')
    await nextTick()
    expect(list.currentPage.value).toBe(1)
    expect(list.selectionCount.value).toBe(0)
    expect(list.paginatedItems.value.map(item => item.id)).toEqual(['nota-10'])

    list.handleSelectAll(true)
    expect(list.getSelectedIds()).toEqual(['nota-10'])
  })
})
