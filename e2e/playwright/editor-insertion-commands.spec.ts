import { expect, test } from './fixtures/consoleGuard'

async function createNota(page: import('@playwright/test').Page) {
  await page.goto('./')
  await page.getByRole('button', { name: /create a nota/i }).click()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
  const editor = page.locator('.ProseMirror')
  await expect(editor).toBeVisible()
  return editor
}

test('executes the exact slash command with mouse and keyboard in blank and non-empty notas', async ({ page }) => {
  const blankEditor = await createNota(page)
  await blankEditor.click()
  await page.keyboard.type('/bullet')

  const bulletOption = page.getByRole('option', { name: /Bullet List/ })
  await expect(bulletOption).toBeVisible()
  await bulletOption.click()
  await expect(bulletOption).toBeHidden()
  await expect(blankEditor.locator('ul > li')).toBeVisible()

  const nonEmptyEditor = await createNota(page)
  await nonEmptyEditor.click()
  await page.keyboard.type('Existing paragraph')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/')

  const selected = page.locator('[data-command-selected="true"]')
  await expect(selected).toContainText('Text')
  await page.keyboard.press('ArrowDown')
  await expect(selected).toContainText('Heading 1')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: /Heading 1/ })).toBeHidden()
  await expect(nonEmptyEditor.locator('h1')).toBeVisible()
  await expect(nonEmptyEditor).toContainText('Existing paragraph')

  await nonEmptyEditor.click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/code')
  const codeOption = page.getByRole('option').filter({
    has: page.getByText('Code Block', { exact: true }),
  })
  await expect(codeOption).toBeVisible()
  await codeOption.click()
  await expect(codeOption).toBeHidden()
  await expect(page.locator('[data-node-view-wrapper]').filter({ has: page.locator('.cm-editor') })).toBeVisible()
})
