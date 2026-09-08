import { expect, test, type Locator, type Page } from './fixtures/consoleGuard'

const phones = [
  { name: '320x568', width: 320, height: 568 },
  { name: '390x700', width: 390, height: 700 },
] as const

async function expectContained(locator: Locator, viewport: { width: number; height: number }) {
  const bounds = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }
  })
  expect(bounds.left).toBeGreaterThanOrEqual(0)
  expect(bounds.right).toBeLessThanOrEqual(viewport.width)
  expect(bounds.top).toBeGreaterThanOrEqual(0)
  expect(bounds.bottom).toBeLessThanOrEqual(viewport.height)
  expect(bounds.scrollWidth).toBe(bounds.clientWidth)
}

async function enableNewsletter(page: Page) {
  await page.evaluate(async () => {
    const authModulePath = '/bashnota/src/features/auth/stores/auth.ts'
    const { useAuthStore } = await import(/* @vite-ignore */ authModulePath) as typeof import(
      '@/features/auth/stores/auth'
    )
    const auth = useAuthStore()
    auth.user = {
      uid: 'responsive-test-user',
      email: 'responsive@example.com',
      displayName: 'Responsive Tester',
      photoURL: '',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      userTag: 'responsive_tester',
    }
  })
  await page.getByRole('button', { name: 'Workspace menu' }).click()
  await expect(page.getByRole('menuitem', { name: 'Newsletter' })).toBeVisible()
}

async function openSearch(page: Page) {
  await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
  await page.getByTitle('Search all notas (Ctrl/⌘ + F)').click()
}

for (const phone of phones) {
  test(`keeps Home and Search overlays usable at ${phone.name}`, async ({ page }) => {
    await page.setViewportSize(phone)
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'BashNota', exact: true })).toBeVisible()

    await enableNewsletter(page)
    await page.getByRole('menuitem', { name: 'Newsletter' }).click()
    const newsletter = page.getByRole('dialog', { name: 'Escape Technofeudalism' })
    const newsletterContent = newsletter.getByTestId('newsletter-content')
    const newsletterCta = newsletter.getByRole('button', { name: 'Join the Resistance' })
    const newsletterClose = newsletter.getByRole('button', { name: 'Close' })
    await expect(newsletter).toBeVisible()
    await expectContained(newsletter, phone)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(phone.width)
    await expect(newsletterContent).toBeVisible()
    await expect(newsletterCta).toBeVisible()
    await newsletterCta.focus()
    await expect(newsletterCta).toBeFocused()

    const [ctaBox, closeBox] = await Promise.all([
      newsletterCta.boundingBox(),
      newsletterClose.boundingBox(),
    ])
    expect(ctaBox!.height).toBeGreaterThanOrEqual(44)
    expect(closeBox!.width).toBeGreaterThanOrEqual(44)
    expect(closeBox!.height).toBeGreaterThanOrEqual(44)
    const newsletterScroll = await newsletterContent.evaluate((element) => ({
      overflowY: getComputedStyle(element).overflowY,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }))
    expect(newsletterScroll.overflowY).toBe('auto')
    expect(newsletterScroll.clientHeight).toBeGreaterThan(0)
    expect(newsletterScroll.scrollHeight).toBeGreaterThanOrEqual(newsletterScroll.clientHeight)

    await page.keyboard.press('Escape')
    await expect(newsletter).toBeHidden()

    await page.getByRole('button', { name: /create a nota/i }).click()
    await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
    await openSearch(page)

    const search = page.getByRole('dialog', { name: 'Search notas' })
    const filters = search.getByTestId('search-filters')
    const cards = search.getByTestId('search-result-cards')
    const searchClose = search.getByRole('button', { name: 'Close' })
    await expect(search).toBeVisible()
    await expectContained(search, phone)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(phone.width)
    await expect(filters).toBeVisible()
    await expect(cards).toBeVisible()

    const resultsOverflow = await search
      .getByTestId('search-results')
      .evaluate((element) => getComputedStyle(element).overflowY)
    expect(resultsOverflow).toBe('auto')

    const card = cards.locator('article').first()
    const deleteAction = card.getByRole('button', { name: 'Delete' })
    await expect(card).toBeVisible()
    await expect(deleteAction).toBeVisible()
    for (const label of ['Preview', 'Favorite', 'Open', 'Delete']) {
      const action = card.getByRole('button', { name: label, exact: true })
      const box = await action.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.x + box!.width).toBeLessThanOrEqual(phone.width)
    }
    const searchCloseBox = await searchClose.boundingBox()
    expect(searchCloseBox!.width).toBeGreaterThanOrEqual(44)
    expect(searchCloseBox!.height).toBeGreaterThanOrEqual(44)

    const favorites = filters.getByRole('button', { name: /Favorites/ })
    await favorites.click()
    await expect(cards.getByText('No notas found')).toBeVisible()
    await favorites.click()
    await expect(card).toBeVisible()

    if (phone.width === 320) {
      await deleteAction.click()
      const confirmation = page.getByRole('alertdialog', { name: 'Delete nota?' })
      await expect(confirmation).toContainText('Untitled Nota')
      await confirmation.getByRole('button', { name: 'Cancel' }).click()
      await expect(confirmation).toBeHidden()
      await expect(card).toBeVisible()

      await deleteAction.click()
      await confirmation.getByRole('button', { name: 'Delete nota' }).click()
      await expect(confirmation).toBeHidden()
      await expect(cards.getByText('No notas found')).toBeVisible()
    }

    await page.keyboard.press('Escape')
    await expect(search).toBeHidden()
  })
}

test('keeps primary actions reachable with 150% text', async ({ page }) => {
  const viewport = { width: 390, height: 700 }
  await page.setViewportSize(viewport)
  await page.goto('./')
  await page.addStyleTag({ content: 'html { font-size: 150% !important; }' })

  await enableNewsletter(page)
  await page.getByRole('menuitem', { name: 'Newsletter' }).click()
  const newsletter = page.getByRole('dialog', { name: 'Escape Technofeudalism' })
  await expectContained(newsletter, viewport)
  await expect(newsletter.getByRole('button', { name: 'Join the Resistance' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: /create a nota/i }).click()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
  await openSearch(page)
  const search = page.getByRole('dialog', { name: 'Search notas' })
  await expectContained(search, viewport)
  await expect(
    search.getByTestId('search-result-cards').getByRole('button', { name: 'Delete' }).first(),
  ).toBeVisible()
})
