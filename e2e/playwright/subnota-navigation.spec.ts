import { expect, test } from './fixtures/consoleGuard'

test('creates, persists, and navigates a linked sub-nota in the intended pane', async ({ page }) => {
  test.setTimeout(75_000)
  await page.goto('./')
  await page.getByRole('button', { name: /create a nota/i }).click()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)

  const parentUrl = page.url()
  const editor = page.locator('.ProseMirror')
  await expect(editor).toBeVisible()
  await editor.click()
  await editor.type('/')
  await page.getByRole('option', { name: /New Sub Nota/ }).click()

  const dialog = page.getByRole('dialog', { name: 'Create Sub Nota' })
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Browser Child Nota')
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(
    '"Browser Child Nota" created successfully under "Untitled Nota"',
    { exact: true },
  )).toHaveCount(1)

  const editorLink = page.getByRole('link', { name: 'Open sub-nota Browser Child Nota' })
  const treeLink = page.getByRole('link', { name: 'Browser Child Nota', exact: true })
  await expect(editorLink).toBeVisible()
  await expect(treeLink).toBeVisible()
  await expect(treeLink).toHaveAttribute('href', /\/bashnota\/nota\/[^/]+$/)

  await editorLink.click()
  await expect(page).not.toHaveURL(parentUrl)
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
  const childUrl = page.url()
  await expect(page.getByRole('tab', { name: 'Browser Child Nota' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.nota-title-input')).toHaveText('Browser Child Nota')
  await expect(page.getByRole('navigation', { name: 'Nota navigation' })).toContainText('Untitled Nota')
  await expect(page.getByRole('navigation', { name: 'Nota navigation' })).toContainText('Browser Child Nota')

  await page.locator('.ProseMirror').fill('Durable child body')
  await expect.poll(async () => page.evaluate(async () => {
    const request = indexedDB.open('notaDB')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const transaction = database.transaction('textBlocks', 'readonly')
      const rowsRequest = transaction.objectStore('textBlocks').getAll()
      const rows = await new Promise<unknown[]>((resolve, reject) => {
        rowsRequest.onsuccess = () => resolve(rowsRequest.result)
        rowsRequest.onerror = () => reject(rowsRequest.error)
      })
      return JSON.stringify(rows).includes('Durable child body')
    } finally {
      database.close()
    }
  }), { timeout: 35_000 }).toBe(true)

  await page.reload()
  await expect(page).toHaveURL(childUrl)
  await expect(page.locator('.ProseMirror')).toContainText('Durable child body')

  await page
    .getByRole('navigation', { name: 'Nota navigation' })
    .getByRole('button', { name: 'Untitled Nota' })
    .click()
  await expect(page).toHaveURL(parentUrl)
  await expect(page.getByRole('link', { name: 'Open sub-nota Browser Child Nota' })).toBeVisible()

  const expandParent = page.getByRole('button', { name: /^(Expand|Collapse) Untitled Nota$/ })
  if ((await expandParent.getAttribute('aria-expanded')) !== 'true') await expandParent.click()
  await treeLink.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(childUrl)
  await expect(page.locator('.ProseMirror')).toContainText('Durable child body')

  await page
    .getByRole('navigation', { name: 'Nota navigation' })
    .getByRole('button', { name: 'Untitled Nota' })
    .click()
  await page.getByRole('button', { name: 'Pane options' }).click()
  await page.getByRole('menuitem', { name: 'Split right' }).click()
  const panes = page.locator('[data-pane-id]')
  await expect(panes).toHaveCount(2)
  await panes.nth(0).getByRole('link', { name: 'Open sub-nota Browser Child Nota' }).click()
  await expect(page).toHaveURL(childUrl)
  await expect(panes.nth(0).locator('.ProseMirror')).toContainText('Durable child body')
  await expect(panes.nth(1)).toContainText('Drop a tab here to split the view')
  await expect(panes.nth(0)).toHaveClass(/border-primary/)
})
