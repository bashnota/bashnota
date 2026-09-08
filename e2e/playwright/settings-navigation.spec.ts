import { expect, test } from './fixtures/consoleGuard'

test('keeps settings navigation out of the mobile content flow', async ({ page }) => {
  test.setTimeout(70_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./settings/unified-editor')

  const main = page.getByRole('main')
  const menu = page.getByRole('button', { name: 'Open settings navigation' })
  await expect(menu).toBeVisible({ timeout: 45_000 })
  await expect(main.getByRole('heading', { name: 'Editor defaults', level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Settings sections' })).toBeHidden()

  const headerBox = await menu.locator('xpath=..').boundingBox()
  const titleBox = await main.getByRole('heading', { name: 'Editor defaults', level: 1 }).boundingBox()
  expect(headerBox).not.toBeNull()
  expect(titleBox).not.toBeNull()
  expect(headerBox!.height).toBeLessThanOrEqual(64)
  expect(titleBox!.y).toBeLessThan(150)

  await menu.click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(dialog).toBeVisible()
  const close = dialog.getByRole('button', { name: 'Close panel' })
  const closeBox = await close.boundingBox()
  expect(closeBox?.width).toBeGreaterThanOrEqual(44)
  expect(closeBox?.height).toBeGreaterThanOrEqual(44)

  const filter = dialog.getByRole('textbox', { name: 'Filter settings navigation' })
  await filter.fill('backup')
  await expect(dialog.getByRole('button', { name: 'Data management' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Editor defaults/ })).toBeHidden()

  await dialog.getByRole('button', { name: 'Data management' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/settings\/data-management$/)
  await expect(main.getByRole('heading', { name: 'Data management', level: 1 })).toBeVisible()
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 390)
})

test('uses a persistent rail and bounded reading column on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('./settings/unified-editor')

  const navigation = page.getByRole('navigation', { name: 'Settings sections' })
  await expect(navigation).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open settings navigation' })).toBeHidden()

  const [navigationBox, headingBox] = await Promise.all([
    navigation.boundingBox(),
    page.getByRole('main').getByRole('heading', { name: 'Editor defaults', level: 1 }).boundingBox(),
  ])
  expect(navigationBox).not.toBeNull()
  expect(headingBox).not.toBeNull()
  expect(navigationBox!.x + navigationBox!.width).toBeLessThanOrEqual(headingBox!.x)

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  const command = page.getByRole('dialog')
  await expect(command.getByPlaceholder('Search settings by name or purpose')).toBeVisible()
  await command.getByPlaceholder('Search settings by name or purpose').fill('Jupyter')
  await command.getByText('Jupyter servers', { exact: true }).click()
  await expect(page).toHaveURL(/\/settings\/jupyter$/)
})
