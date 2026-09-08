import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useCommandList, type CommandItem } from './useCommandList'

function item(title: string): CommandItem {
  return { title, category: 'Test', icon: null, command: vi.fn() }
}

describe('useCommandList', () => {
  it('executes the visibly selected item without an index jump', async () => {
    const first = item('First')
    const second = item('Second')
    const items = ref([first, second])
    const onCommand = vi.fn()
    const list = useCommandList({ items, onCommand })

    expect(list.selectedIndex.value).toBe(0)
    expect(list.handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(true)
    expect(onCommand).toHaveBeenLastCalledWith(first)

    list.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(list.selectedIndex.value).toBe(1)
    list.handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(onCommand).toHaveBeenLastCalledWith(second)

    const filtered = item('Filtered')
    items.value = [filtered]
    await nextTick()
    expect(list.selectedIndex.value).toBe(0)
    list.handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(onCommand).toHaveBeenLastCalledWith(filtered)
  })

  it('keeps pointer highlight and pointer execution on the exact same item', () => {
    const first = item('First')
    const second = item('Second')
    const onCommand = vi.fn()
    const list = useCommandList({ items: ref([first, second]), onCommand })

    list.handleMouseEnter(second)
    expect(list.selectedIndex.value).toBe(1)
    list.executeItem(second)
    expect(onCommand).toHaveBeenCalledOnce()
    expect(onCommand).toHaveBeenCalledWith(second)
  })
})
