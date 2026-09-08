import { describe, expect, it } from 'vitest'
import { pageLinkNodeDefinition } from '../PageLinkExtension'

describe('pageLinkNodeDefinition', () => {
  it('does not render executable URLs from untrusted published content', () => {
    const rendered = pageLinkNodeDefinition.toDOM?.({
      attrs: { href: 'javascript:alert(1)', title: 'Unsafe' },
    } as never) as [string, Record<string, unknown>]

    expect(rendered[1]).not.toHaveProperty('href')
  })

  it('retains safe relative nota links', () => {
    const rendered = pageLinkNodeDefinition.toDOM?.({
      attrs: { href: '/nota/safe-id', title: 'Safe' },
    } as never) as [string, Record<string, unknown>]

    expect(rendered[1].href).toBe('/nota/safe-id')
  })
})
