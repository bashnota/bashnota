import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSameOriginDeferredAssetRequest } from './deferredAssetPolicy'

describe('deferred PWA asset runtime policy', () => {
  afterEach(() => vi.unstubAllGlobals())

  function installOrigin(origin = 'https://bashnota.example') {
    vi.stubGlobal('self', { location: { origin } })
  }

  it('matches a same-origin deferred editor asset', () => {
    installOrigin()
    expect(isSameOriginDeferredAssetRequest({
      url: new URL('https://bashnota.example/bashnota/assets/editor-abc.js'),
    })).toBe(true)
  })

  it('matches same-origin lazy styles for offline reuse after first use', () => {
    installOrigin()
    expect(isSameOriginDeferredAssetRequest({
      url: new URL('https://bashnota.example/bashnota/assets/index-lazy.css'),
    })).toBe(true)
  })

  it('never matches the same asset path on a cross-origin host', () => {
    installOrigin()
    expect(isSameOriginDeferredAssetRequest({
      url: new URL('https://cdn.example/assets/editor-hostile.js'),
    })).toBe(false)
  })
})
