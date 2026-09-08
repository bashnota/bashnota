import { describe, expect, it } from 'vitest'
import providerSettingsSource from '../components/ProviderSettings.vue?raw'
import legacyProviderSettingsSource from '../AIProvidersSettings.vue?raw'
import providerCardSource from '../components/AIProviderCard.vue?raw'
import jupyterDialogSource from '@/features/editor/components/jupyter/AddServerDialog.vue?raw'
import helpContentSource from '@/features/help/data/helpContent.ts?raw'

describe('credential and execution disclosures', () => {
  it('describes AI provider keys as memory-only everywhere they can be entered', () => {
    for (const source of [
      providerSettingsSource,
      legacyProviderSettingsSource,
      providerCardSource,
    ]) {
      expect(source).toContain('memory for this browser tab only')
      expect(source).not.toContain('stored locally and encrypted')
    }
  })

  it('makes the Jupyter credential and execution boundary visible and documented', () => {
    expect(jupyterDialogSource).toContain('Remote servers require HTTPS')
    expect(jupyterDialogSource).toContain('token never enters a URL')
    expect(helpContentSource).toContain('same-origin HTTPS proxy')
    expect(helpContentSource).toContain('all authority granted to that Jupyter process')
    expect(helpContentSource).toContain('Only run notebook code')
  })
})
