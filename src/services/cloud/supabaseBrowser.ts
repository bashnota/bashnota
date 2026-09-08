import type { SupabaseClient } from '@supabase/supabase-js'

export interface SupabaseBrowserConfiguration {
  url: string
  anonKey: string
}

let browserClient: SupabaseClient | undefined

/**
 * Creates the browser client lazily so the SDK remains out of the entry chunk
 * until a Supabase-backed feature is actually enabled. Only the public URL and
 * anonymous/publishable browser key may be supplied here: server-role keys are
 * deliberately neither read nor accepted by this module.
 */
export async function getSupabaseBrowserClient(
  configuration: Partial<SupabaseBrowserConfiguration> = {},
): Promise<SupabaseClient> {
  if (browserClient) return browserClient

  const url = configuration.url
    ?? import.meta.env.VITE_SUPABASE_URL
    ?? (import.meta.env.DEV ? 'http://127.0.0.1:54321' : undefined)
  const anonKey = configuration.anonKey
    ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase browser configuration requires VITE_SUPABASE_URL and a publishable/anon key')
  }

  const { createClient } = await import('@supabase/supabase-js')
  browserClient = createClient(url, anonKey, {
    // OAuth and recovery codes are exchanged by dedicated routes. Keeping URL
    // detection explicit avoids a race between client initialization and the
    // callback handler while retaining SDK-managed session persistence.
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
  return browserClient
}

/** Test-only escape hatch; it does not exist on the provider-neutral CloudApi. */
export function resetSupabaseBrowserClientForTests(): void {
  browserClient = undefined
}
