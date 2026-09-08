import { expect, test, type Page } from './fixtures/consoleGuard'

const createNamedNota = async (page: Page, title: string) => {
  await page.getByRole('button', { name: 'New Nota', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Create New Nota' })
  await dialog.getByRole('textbox', { name: 'Title *' }).fill(title)
  await dialog.getByRole('button', { name: 'Create Nota', exact: true }).click()
  await expect(page.locator('.nota-title-input')).toHaveText(title)
}

test('keeps desktop editor navigation and document management compact', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('./')
  await page.getByRole('button', { name: /create a nota/i }).click()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)

  // Settings is one destination; its category tree belongs on the settings page.
  const settingsLink = page.getByRole('link', { name: /Settings/ })
  await expect(settingsLink).toHaveCount(1)
  await expect(page.getByText('AI Providers', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Advanced Settings', { exact: true })).toHaveCount(0)

  // Export remains in the editor and File menu, without a duplicate shell CTA.
  await expect(page.getByRole('button', { name: 'Export HTML' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeVisible()

  await createNamedNota(page, 'Research plan')
  await createNamedNota(page, 'API notes')
  await createNamedNota(page, 'Release checklist')

  const tablist = page.getByRole('tablist', { name: 'Open notas' })
  await expect(tablist.getByRole('tab')).toHaveCount(4)

  await page.getByRole('button', { name: 'Open notas menu' }).click()
  const openNotasMenu = page.getByRole('menu', { name: 'Open notas menu' })
  await expect(openNotasMenu.getByRole('menuitem', { name: 'Research plan' })).toBeVisible()
  await openNotasMenu.getByRole('menuitem', { name: 'API notes' }).click()
  await expect(page.locator('.nota-title-input')).toHaveText('API notes')

  await page.getByRole('button', { name: 'Open notas menu' }).click()
  await page.getByRole('menuitem', { name: 'Close other notas' }).click()
  await expect(tablist.getByRole('tab')).toHaveCount(1)
  await expect(tablist.getByRole('tab')).toContainText('API notes')

  await page.getByRole('button', { name: 'Pane options' }).click()
  const paneMenu = page.getByRole('menu', { name: 'Pane options' })
  await expect(paneMenu.getByRole('menuitem', { name: 'Split right' })).toBeVisible()
  await expect(paneMenu.getByRole('menuitem', { name: 'Split down' })).toBeVisible()
  await expect(paneMenu.getByRole('menuitem', { name: 'Close pane' })).toBeDisabled()
  await paneMenu.getByRole('menuitem', { name: 'Split right' }).click()
  await expect(page.getByRole('tablist', { name: 'Open notas' })).toHaveCount(2)
  await expect(page.getByText('Drop a tab here to split the view')).toBeVisible()

  await page.setViewportSize({ width: 1024, height: 768 })
  await expect.poll(() => page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }))).toEqual({ viewport: 1024, document: 1024 })

  await page.keyboard.press('Control+,')
  await expect(page).toHaveURL(/\/bashnota\/settings\/unified-editor$/)
})
