import { expect, test } from './fixtures/consoleGuard'

test.use({
  consolePolicy: { allow: [
    {
      level: 'error',
      pattern: /Failed to load resource:.*503 \(Service Unavailable\)/,
      reason: 'This journey intentionally forces the Supabase sign-out request to return 503.',
    },
  ] },
})

const user = {
  id: 'auth-browser-user',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'reader@example.test',
  email_confirmed_at: '2026-09-02T00:00:00.000Z',
  created_at: '2026-09-01T00:00:00.000Z',
  last_sign_in_at: '2026-09-02T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { display_name: 'Browser Reader' },
}

function token(payload: Record<string, unknown>) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.fixture-signature`
}

test('keeps Profile in place with a retryable error when sign-out fails', async ({ page }) => {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  const accessToken = token({
    aud: 'authenticated',
    exp: expiresAt,
    iat: Math.floor(Date.now() / 1000),
    role: 'authenticated',
    sub: user.id,
  })
  await page.addInitScript(({ accessToken, expiresAt, user }) => {
    localStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: accessToken,
      refresh_token: 'browser-refresh-token',
      expires_at: expiresAt,
      expires_in: 3600,
      token_type: 'bearer',
      user,
    }))
  }, { accessToken, expiresAt, user })

  await page.route('**/rest/v1/public_profiles*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      user_id: user.id,
      user_tag: 'browser_reader',
      photo_url: '',
      updated_at: '2026-09-02T00:00:00.000Z',
    }),
  }))
  await page.route('**/auth/v1/logout*', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'injected sign-out outage' }),
  }))
  await page.route('**/auth/v1/user*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(user),
  }))

  await page.goto('./profile')
  await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible()
  await page.getByRole('button', { name: 'Logout' }).click()

  await expect(page).toHaveURL(/\/bashnota\/profile$/)
  await expect(page.getByRole('alert')).toContainText(/sign out failed|injected sign-out outage/i)
  await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Logout' })).toBeEnabled()
})

test('describes and restores only the saved-email preference', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rememberedEmail', 'saved@example.test'))
  await page.goto('./login')

  await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue('saved@example.test')
  await expect(page.getByText('Save email on this device', { exact: true })).toBeVisible()
  await expect(page.getByText('Remember me', { exact: true })).toHaveCount(0)
  await expect(page.locator('#save-email')).toHaveAttribute('data-state', 'checked')
})
