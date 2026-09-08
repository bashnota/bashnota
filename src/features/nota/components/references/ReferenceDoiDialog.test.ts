import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReferenceDoiDialog from './ReferenceDoiDialog.vue'

const doubles = vi.hoisted(() => ({ addCitation: vi.fn() }))

vi.mock('@/features/editor/stores/citationStore', () => ({
  useCitationStore: () => ({ addCitation: doubles.addCitation }),
}))

const passthrough = { template: '<div><slot /></div>' }
const buttonStub = {
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
}
const inputStub = defineComponent({
  inheritAttrs: false,
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})

function mountDialog() {
  return mount(ReferenceDoiDialog, {
    props: { open: true, notaId: 'nota-1', existingCitations: [] },
    attachTo: document.body,
    global: {
      stubs: {
        Dialog: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
        DialogContent: passthrough,
        DialogHeader: passthrough,
        DialogTitle: { template: '<h2><slot /></h2>' },
        DialogDescription: { template: '<p><slot /></p>' },
        DialogFooter: passthrough,
        Input: inputStub,
        Label: { template: '<label><slot /></label>' },
        Button: buttonStub,
        Alert: passthrough,
        AlertDescription: passthrough,
        AlertCircle: true,
        CheckCircle2: true,
        Loader2: true,
      },
    },
  })
}

describe('ReferenceDoiDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('focuses the DOI field and reports invalid DOI and network failures', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    const input = wrapper.get('#reference-doi')
    expect(document.activeElement).toBe(input.element)

    await input.setValue('not-a-doi')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('Enter a valid DOI')

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unavailable')))
    await input.setValue('10.1000/example')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Network unavailable')
    wrapper.unmount()
  })

  it('previews complete Crossref data and saves the exact citation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          message: {
            DOI: '10.1000/example',
            URL: 'https://doi.org/10.1000/example',
            title: ['A durable reference'],
            author: [{ given: 'Ada', family: 'Lovelace' }],
            published: { 'date-parts': [[1843]] },
            'container-title': ['Analytical Engine Notes'],
          },
        }),
      }),
    )
    const saved = {
      id: 'citation-1',
      key: 'lovelace1843',
      title: 'A durable reference',
      authors: ['Ada Lovelace'],
      year: '1843',
      doi: '10.1000/example',
      createdAt: new Date(),
    }
    doubles.addCitation.mockResolvedValue(saved)
    const wrapper = mountDialog()

    await wrapper.get('#reference-doi').setValue('https://doi.org/10.1000/example')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('A durable reference')

    const add = wrapper.findAll('button').find((button) => button.text() === 'Add reference')!
    await add.trigger('click')
    await flushPromises()

    expect(doubles.addCitation).toHaveBeenCalledWith(
      'nota-1',
      expect.objectContaining({
        key: 'lovelace1843',
        title: 'A durable reference',
        authors: ['Ada Lovelace'],
        year: '1843',
        doi: '10.1000/example',
      }),
    )
    expect(wrapper.emitted('saved')).toEqual([[saved]])
    expect(wrapper.emitted('update:open')).toContainEqual([false])
    wrapper.unmount()
  })
})
