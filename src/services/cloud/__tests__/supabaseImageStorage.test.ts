import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { cleanupOrphanedPublishedImages, deletePublishedImages, uploadPublishedImage } from '../supabaseImageStorage'

function client(options: { user?: { id: string } | null; authError?: Error | null } = {}) {
  const invoke = vi.fn().mockImplementation(async (_name, options) => options.body.action === 'upload'
    ? { data: { path: 'user-id/object.png', publicUrl: 'https://project.test/storage/v1/object/public/published-images/user-id/object.png' }, error: null }
    : { data: { removed: options.body.paths ?? [] }, error: null })
  return {
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: options.user === undefined ? { id: 'user-id' } : options.user }, error: options.authError ?? null }) },
      functions: { invoke },
    } as unknown as SupabaseClient,
    invoke,
  }
}

describe('published image storage', () => {
  it('uploads allowlisted data URLs to the authenticated user folder', async () => {
    const doubles = client()
    const url = await uploadPublishedImage('data:image/png;base64,aGVsbG8=', doubles.client)

    expect(doubles.invoke).toHaveBeenCalledWith('published-images', {
      body: { action: 'upload', base64: 'aGVsbG8=', contentType: 'image/png' },
    })
    expect(url).toContain('/published-images/user-id/object.png')
  })

  it('rejects unapproved image types before uploading', async () => {
    const doubles = client()
    await expect(uploadPublishedImage('data:image/svg+xml;base64,PHN2Zy8+', doubles.client))
      .rejects.toMatchObject({ code: 'invalid' })
    expect(doubles.invoke).not.toHaveBeenCalled()
  })

  it('requires an authenticated Supabase user', async () => {
    const doubles = client({ user: null })
    await expect(uploadPublishedImage('data:image/png;base64,aGVsbG8=', doubles.client))
      .rejects.toMatchObject({ code: 'unauthenticated' })
    expect(doubles.invoke).not.toHaveBeenCalled()
  })

  it('deduplicates cleanup paths and refuses paths outside the authenticated user folder', async () => {
    const doubles = client()
    await deletePublishedImages(['user-id/a.png', 'user-id/a.png', 'user-id/b.png'], doubles.client)
    expect(doubles.invoke).toHaveBeenCalledWith('published-images', {
      body: { action: 'delete', paths: ['user-id/a.png', 'user-id/b.png'] },
    })
    await expect(deletePublishedImages(['other-user/a.png'], doubles.client))
      .rejects.toMatchObject({ code: 'forbidden' })
  })

  it('requests bounded server-side orphan cleanup without listing storage in the browser', async () => {
    const doubles = client()
    await cleanupOrphanedPublishedImages(doubles.client)
    expect(doubles.invoke).toHaveBeenCalledWith('published-images', { body: { action: 'cleanup' } })
  })
})
