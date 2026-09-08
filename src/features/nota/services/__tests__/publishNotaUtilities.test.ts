import { beforeEach, describe, expect, it, vi } from 'vitest'

const upload = vi.hoisted(() => vi.fn())
vi.mock('@/services/cloud/supabaseImageStorage', () => ({ uploadPublishedImageAsset: upload }))

import { processNotaContent } from '@/features/nota/services/publishNotaUtilities'

describe('publication content preparation', () => {
  beforeEach(() => {
    upload.mockReset().mockResolvedValue({ path: 'owner/image.png', publicUrl: 'https://images.test/image.png' })
  })

  it('uploads repeated data once, records cleanup ownership, and converts published links', async () => {
    const dataUrl = 'data:image/png;base64,aGVsbG8='
    const uploadedImagePaths: string[] = []
    const result = await processNotaContent({
      type: 'doc',
      content: [
        { type: 'imageBlock', attrs: { src: dataUrl } },
        { type: 'subfigure', attrs: { subfigures: [{ src: dataUrl }] } },
        { type: 'pageLink', attrs: { href: '/nota/child' } },
      ],
    }, { publishedSubPages: ['child'], uploadedImagePaths })

    expect(upload).toHaveBeenCalledOnce()
    expect(uploadedImagePaths).toEqual(['owner/image.png'])
    expect(result).toMatchObject({ content: [
      { attrs: { src: 'https://images.test/image.png' } },
      { attrs: { subfigures: [{ src: 'https://images.test/image.png' }] } },
      { attrs: { href: '/p/child' } },
    ] })
  })

  it('rejects an upload failure instead of publishing a retained data URL', async () => {
    upload.mockRejectedValueOnce(new Error('injected upload failure'))
    await expect(processNotaContent({
      type: 'doc', content: [{ type: 'imageBlock', attrs: { src: 'data:image/png;base64,aGVsbG8=' } }],
    })).rejects.toThrow('injected upload failure')
  })
})
