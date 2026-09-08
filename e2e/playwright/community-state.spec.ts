import { expect, test } from './fixtures/consoleGuard'

const notaId = 'community-state-fixture'
const user = {
  id: 'community-browser-user',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'community@example.test',
  email_confirmed_at: '2026-09-02T00:00:00.000Z',
  created_at: '2026-09-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { display_name: 'Community Reader' },
}

function token(payload: Record<string, unknown>) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.fixture-signature`
}

test('restores the viewer vote and shows authoritative thread totals after reload', async ({ page }) => {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  const accessToken = token({
    aud: 'authenticated', exp: expiresAt, iat: Math.floor(Date.now() / 1000),
    role: 'authenticated', sub: user.id,
  })
  await page.addInitScript(({ accessToken, expiresAt, user }) => {
    localStorage.setItem('sb-127-auth-token', JSON.stringify({
      access_token: accessToken,
      refresh_token: 'community-refresh-token',
      expires_at: expiresAt,
      expires_in: 3600,
      token_type: 'bearer',
      user,
    }))
  }, { accessToken, expiresAt, user })

  let voteReads = 0
  await page.route('**/auth/v1/user*', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(user),
  }))
  await page.route('**/rest/v1/public_profiles*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user_id: 'author', user_tag: 'author', display_name: 'Author', photo_url: '', updated_at: '2026-09-02T00:00:00.000Z' }),
  }))
  await page.route('**/rest/v1/rpc/query_publications', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{
      id: notaId,
      title: 'Community state fixture',
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Published body' }] }] },
      author_name: 'Author',
      author_tag: 'author',
      is_sub_page: false,
      parent_id: null,
      tags: [],
      published_nota_citations: [],
      published_sub_pages: [],
      published_at: '2026-09-02T00:00:00.000Z',
      updated_at: '2026-09-02T00:00:00.000Z',
      view_count: 4,
      unique_viewers: 3,
      like_count: 7,
      dislike_count: 1,
      clone_count: 2,
      comment_count: 25,
      last_viewed_at: null,
    }]),
  }))
  await page.route('**/rest/v1/rpc/record_nota_view', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify([{ view_count: 5, unique_viewers: 4 }]),
  }))
  await page.route('**/rest/v1/rpc/get_nota_vote', route => {
    voteReads += 1
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify('like') })
  })
  await page.route('**/rest/v1/rpc/count_comments', route => route.fulfill({
    status: 200, contentType: 'application/json', body: '25',
  }))
  await page.route('**/rest/v1/rpc/query_comments', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(Array.from({ length: 20 }, (_, index) => ({
      id: `comment-${index}`,
      nota_id: notaId,
      author_name: 'Reader',
      author_tag: 'reader',
      content: `Comment ${index}`,
      parent_id: null,
      like_count: 0,
      dislike_count: 0,
      reply_count: 0,
      created_at: new Date(Date.UTC(2026, 8, 2, 0, 0, 20 - index)).toISOString(),
      updated_at: '2026-09-02T00:00:00.000Z',
      is_owner: false,
      can_delete: false,
      user_vote: null,
    }))),
  }))

  await page.goto(`./p/${notaId}`)
  await expect(page.getByRole('heading', { name: 'Community state fixture' })).toBeVisible()
  await expect(page.getByText('Remove Upvote', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Comments\s*\(25\)/ })).toBeVisible()
  await expect(page.locator('.comment-item')).toHaveCount(20)

  await page.reload()
  await expect(page.getByText('Remove Upvote', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Comments\s*\(25\)/ })).toBeVisible()
  expect(voteReads).toBeGreaterThanOrEqual(2)
})
