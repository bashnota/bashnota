import { expect, test } from './fixtures/consoleGuard'

test.use({
  consolePolicy: { allow: [
    {
      level: 'error',
      pattern: /Failed to load resource:.*503 \(Service Unavailable\)/,
      reason: 'This journey intentionally forces the publications RPC to return 503.',
    },
    {
      level: 'error',
      pattern: /Failed to fetch published notas by user:.*publication service unavailable/s,
      reason: 'The store reports the intentionally injected publication outage.',
    },
    {
      level: 'error',
      pattern: /Error loading published notas:.*publication service unavailable/s,
      reason: 'The profile reports the intentionally injected publication outage.',
    },
  ] },
})

const profile = {
  user_id: 'profile-owner',
  user_tag: 'zero_owner',
  display_name: 'Zero Publication Owner',
  photo_url: '',
  updated_at: '2026-09-02T00:00:00.000Z',
}

test('keeps public identity, empty portfolios, and publication outages distinct', async ({ page }) => {
  let publicationRequests = 0

  await page.route('**/rest/v1/public_profiles*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profile) })
  })
  await page.route('**/rest/v1/rpc/query_publications', async route => {
    publicationRequests += 1
    if (publicationRequests === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'PGRST503', message: 'publication service unavailable' }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.goto('./u/profile-owner')

  await expect(page.getByRole('heading', { name: 'Zero Publication Owner' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Failed to load published notas' })).toBeVisible()
  await expect(page.getByText("This user hasn't published any notas yet.")).toHaveCount(0)

  await page.getByRole('button', { name: 'Retry' }).click()

  await expect(page.getByRole('heading', { name: 'Zero Publication Owner' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No Published Notas' })).toBeVisible()
  await expect(page.getByText("This user hasn't published any notas yet.")).toBeVisible()
  expect(publicationRequests).toBe(2)
})
