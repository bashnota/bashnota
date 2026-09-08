import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { PUBLISHED_IMAGE_BUCKET, uploadPublishedImage } from '../supabaseImageStorage'

describe.skipIf(!process.env.SUPABASE_URL)('published image adapter against local Storage', () => {
  it('uploads through an authenticated publishable-key client', async () => {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 12)
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const signedUp = await client.auth.signUp({ email: `adapter-${suffix}@example.test`, password: `Adapter-${suffix}!` })
    expect(signedUp.error).toBeNull()

    const publicUrl = await uploadPublishedImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', client)
    expect(publicUrl).toContain(`/storage/v1/object/public/${PUBLISHED_IMAGE_BUCKET}/${signedUp.data.user?.id}/`)
  })
})
