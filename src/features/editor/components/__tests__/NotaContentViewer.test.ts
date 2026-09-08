import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'

import NotaContentViewer from '../NotaContentViewer.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('NotaContentViewer raw ProseMirror node views', () => {
  it('mounts the configured citation, bibliography, and table Vue views', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/nota/:id/references', name: 'references', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
    await router.isReady()
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{
            type: 'citation',
            attrs: {
              citationKey: 'source-1',
              citationNumber: 1,
              citationStyle: 'numeric',
              citationFormat: 'short',
              citationStatus: 'found',
            },
          }],
        },
        { type: 'bibliography', attrs: { title: 'References' } },
        {
          type: 'notaTable',
          attrs: {
            tableData: {
              id: 'table-1',
              name: 'Viewer table',
              columns: [{ id: 'name', title: 'Name', type: 'text' }],
              rows: [{ id: 'row-1', cells: { name: 'Rendered cell' } }],
            },
          },
        },
      ],
    })
    const wrapper = mount(NotaContentViewer, {
      attachTo: document.body,
      props: {
        content,
        readonly: true,
        isPublished: true,
        citations: [{
          id: 'citation-1',
          key: 'source-1',
          title: 'Raw ProseMirror',
          authors: ['Ada Lovelace'],
          year: '1843',
          createdAt: new Date('2024-01-01T00:00:00Z'),
        }],
      },
      global: { plugins: [createPinia(), router] },
    })
    await nextTick()
    await nextTick()

    expect(wrapper.find('.citation-reference').text()).toBe('[1]')
    expect(wrapper.find('.bibliography-wrapper h2').text()).toBe('References')
    expect(wrapper.text()).toContain('Viewer table')
    expect(wrapper.text()).toContain('Rendered cell')
    expect(wrapper.emitted('content-rendered')).toHaveLength(1)

    wrapper.unmount()
  })

  it.each([
    ['legacy JSON string', JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Legacy rendered' }] }] })],
    ['Supabase canonical object', { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Supabase rendered' }] }] }],
  ])('mounts %s published content without double parsing', async (_provider, content) => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(NotaContentViewer, {
      attachTo: document.body,
      props: { content, readonly: true, isPublished: true },
      global: { plugins: [createPinia(), router] },
    })
    await nextTick()
    await nextTick()
    expect(wrapper.text()).toContain(_provider.startsWith('legacy') ? 'Legacy rendered' : 'Supabase rendered')
    expect(wrapper.emitted('content-rendered')).toHaveLength(1)
    wrapper.unmount()
  })
})
