import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SettingsNavigation from '../SettingsNavigation.vue'

describe('SettingsNavigation', () => {
  function mountNavigation(selectedSetting = 'unified-editor') {
    return mount(SettingsNavigation, {
      props: { selectedSetting, shortcutLabel: 'Ctrl K' },
      global: {
        stubs: {
          Search: true,
          X: true,
          Command: true,
        },
      },
    })
  }

  it('renders only canonical working destinations and identifies the current page', () => {
    const wrapper = mountNavigation('data-management')

    expect(wrapper.text()).toContain('Data management')
    expect(wrapper.text()).toContain('Jupyter servers')
    expect(wrapper.text()).not.toContain('Legacy')
    expect(wrapper.find('button[aria-current="page"]').text()).toContain('Data management')
  })

  it('filters by purpose and clears an empty result', async () => {
    const wrapper = mountNavigation()
    const filter = wrapper.get('input[aria-label="Filter settings navigation"]')

    await filter.setValue('backup')
    expect(wrapper.text()).toContain('Data management')
    expect(wrapper.text()).not.toContain('Editor defaults')

    await filter.setValue('does-not-exist')
    expect(wrapper.text()).toContain('No settings match “does-not-exist”')
    await wrapper.findAll('button').find(button => button.text() === 'Clear the filter')!.trigger('click')
    expect(wrapper.text()).toContain('Editor defaults')
  })

  it('emits exact navigation and command-palette actions', async () => {
    const wrapper = mountNavigation()

    await wrapper.findAll('button').find(button => button.text().includes('Theme and interface'))!.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['unified-appearance']])

    await wrapper.findAll('button').find(button => button.text().includes('Search every setting'))!.trigger('click')
    expect(wrapper.emitted('openCommand')).toHaveLength(1)
  })
})
