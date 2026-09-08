import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
// This is the checked-in local development publishable key from `supabase start`.
// It is deliberately not an admin/service credential and cannot bypass RLS.
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

const storageValues = new Map()
const storage = {
  getItem: key => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, value),
  removeItem: key => storageValues.delete(key),
}

const clientOptions = {
  auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, storage, flowType: 'pkce' },
}
const first = createClient(url, publishableKey, clientOptions)
const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
const email = `auth-${suffix}@example.test`
const initialPassword = `Start-${suffix}!`
const nextPassword = `Next-${suffix}!`

const signup = await first.auth.signUp({
  email,
  password: initialPassword,
  options: { data: { display_name: 'Local Auth Integration' } },
})
assert.ifError(signup.error)
assert.ok(signup.data.session, 'local email signup must establish a session')
assert.ok(signup.data.user)

const provision = await first.rpc('provision_user_profile', {
  p_user_tag: `auth_${suffix}`,
  p_display_name: 'Local Auth Integration',
  p_photo_url: 'https://example.test/avatar.png',
})
assert.ifError(provision.error)
assert.equal(provision.data?.user_id, signup.data.user.id,
  'a native Supabase account must provision its profile without a provider rollout gate')
assert.equal(provision.data?.display_name, 'Local Auth Integration')

const anonymous = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const publicProjection = await anonymous.from('public_profiles')
  .select('user_id,user_tag,display_name,photo_url')
  .eq('user_id', signup.data.user.id)
  .single()
assert.ifError(publicProjection.error)
assert.deepEqual(publicProjection.data, {
  user_id: signup.data.user.id,
  user_tag: `auth_${suffix}`,
  display_name: 'Local Auth Integration',
  photo_url: 'https://example.test/avatar.png',
}, 'anonymous readers must receive the allowlisted public identity without private profile fields')

// A second client sharing the SDK storage restores the user session without
// any application-managed token copy.
const restored = createClient(url, publishableKey, clientOptions)
const restoredSession = await restored.auth.getSession()
assert.ifError(restoredSession.error)
assert.equal(restoredSession.data.session?.user.id, signup.data.user.id)

const refreshed = await restored.auth.refreshSession({ refresh_token: signup.data.session.refresh_token })
assert.ifError(refreshed.error)
assert.equal(refreshed.data.session?.user.id, signup.data.user.id)
assert.ok(refreshed.data.session?.expires_at > Math.floor(Date.now() / 1000), 'refreshed session must have a future expiry')

const failingLogout = createClient(url, publishableKey, {
  ...clientOptions,
  global: {
    fetch: async (input, init) => {
      const requestUrl = typeof input === 'string' ? input : input.url
      if (requestUrl.includes('/auth/v1/logout')) {
        return new Response(JSON.stringify({ message: 'injected sign-out outage' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        })
      }
      return globalThis.fetch(input, init)
    },
  },
})
const sessionBeforeFailedLogout = await failingLogout.auth.getSession()
assert.equal(sessionBeforeFailedLogout.data.session?.user.id, signup.data.user.id)
const failedLogout = await failingLogout.auth.signOut()
assert.ok(failedLogout.error, 'a forced sign-out outage must be reported')
assert.equal((await failingLogout.auth.getSession()).data.session, null,
  'the SDK clears local state on remote failure, proving compensation is required')
const compensated = await failingLogout.auth.setSession({
  access_token: sessionBeforeFailedLogout.data.session.access_token,
  refresh_token: sessionBeforeFailedLogout.data.session.refresh_token,
})
assert.ifError(compensated.error)
assert.equal((await failingLogout.auth.getSession()).data.session?.user.id, signup.data.user.id,
  'the captured session can be restored so the application can offer a truthful retry')

const mailpitUrl = process.env.SUPABASE_MAILPIT_URL ?? 'http://127.0.0.1:54324'
await fetch(`${mailpitUrl}/api/v1/messages`, { method: 'DELETE' })

assert.ifError((await restored.auth.signOut()).error)
assert.equal((await restored.auth.getSession()).data.session, null)

const reset = await restored.auth.resetPasswordForEmail(email, {
  redirectTo: 'http://127.0.0.1:5173/auth/reset-password',
})
assert.ifError(reset.error)

let recoveryMessage
for (let attempt = 0; attempt < 20 && !recoveryMessage; attempt += 1) {
  const mailbox = await (await fetch(`${mailpitUrl}/api/v1/messages`)).json()
  recoveryMessage = mailbox.messages?.find(message =>
    JSON.stringify(message.To ?? message.to ?? '').includes(email),
  )
  if (!recoveryMessage) await new Promise(resolve => setTimeout(resolve, 250))
}
assert.ok(recoveryMessage, 'Mailpit must receive the recovery message')
const recoveryBody = await (await fetch(`${mailpitUrl}/api/v1/message/${recoveryMessage.ID}`)).json()
const recoveryLink = recoveryBody.Text?.match(/https?:\/\/[^\s)]+\/auth\/v1\/verify[^\s)]*/)?.[0]
assert.ok(recoveryLink, 'recovery email must contain the GoTrue verification link')
const verified = await fetch(recoveryLink, { redirect: 'manual' })
const recoveryLocation = verified.headers.get('location')
assert.ok(recoveryLocation, 'recovery verification must redirect to the configured application callback')
const recoveryCode = new URL(recoveryLocation).searchParams.get('code')
assert.ok(recoveryCode, 'PKCE recovery redirect must carry a one-time authorization code')
const exchanged = await restored.auth.exchangeCodeForSession(recoveryCode)
assert.ifError(exchanged.error)
assert.equal(exchanged.data.session?.user.id, signup.data.user.id)

const update = await restored.auth.updateUser({ password: nextPassword })
assert.ifError(update.error)
assert.ifError((await restored.auth.signOut()).error)
assert.equal((await restored.auth.getSession()).data.session, null)

const oldPassword = await restored.auth.signInWithPassword({ email, password: initialPassword })
assert.ok(oldPassword.error, 'the previous password must stop authenticating')
const login = await restored.auth.signInWithPassword({ email, password: nextPassword })
assert.ifError(login.error)
assert.equal(login.data.user.id, signup.data.user.id)

// The local stack intentionally has no Google client secret or mock OAuth
// issuer. Assert that exact harness boundary instead of pretending a callback
// completed; adapter callback exchange and redirect validation run in Vitest.
const oauthHarness = await restored.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: 'http://127.0.0.1:5173/auth/callback', skipBrowserRedirect: true },
})
assert.ifError(oauthHarness.error)
assert.ok(oauthHarness.data.url, 'the SDK must construct the Google OAuth authorization URL')
const oauthStart = await fetch(oauthHarness.data.url, { redirect: 'manual' })
const oauthFailure = `${oauthStart.headers.get('location') ?? ''} ${await oauthStart.text()}`
assert.match(oauthFailure, /provider.*not.enabled|unsupported.provider|oauth_provider_not_supported/i,
  'the local harness must explicitly prove Google is blocked before an external provider fixture')

console.log('Local Supabase browser-auth integration passed (Google callback blocked by the explicit no-provider harness).')
