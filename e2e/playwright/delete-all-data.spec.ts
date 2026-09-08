import { expect, test } from './fixtures/consoleGuard'

test('clears every IndexedDB table and remains empty after reload', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /create a nota/i }).click()
  await page.locator('.nota-title-input').fill('Delete all regression nota')
  await page.locator('.nota-title-input').press('Tab')

  await expect.poll(async () => page.evaluate(async () => {
    const request = indexedDB.open('notaDB')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const transaction = database.transaction('notas', 'readonly')
      const count = transaction.objectStore('notas').count()
      return await new Promise<number>((resolve, reject) => {
        count.onsuccess = () => resolve(count.result)
        count.onerror = () => reject(count.error)
      })
    } finally {
      database.close()
    }
  })).toBeGreaterThan(0)

  await page.goto('./settings/data-management')
  await page.getByRole('button', { name: 'Delete All Data', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByText('IndexedDB databases', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Browser settings and caches', { exact: true })).toBeVisible()
  const destructive = dialog.getByRole('button', { name: 'Permanently Delete All Data' })
  await expect(destructive).toBeDisabled()
  await dialog.getByLabel(/Type DELETE ALL DATA/).fill('DELETE ALL DATA')
  await expect(destructive).toBeEnabled()
  await destructive.click()
  await expect(dialog.getByText('Every authority was cleared and verified.')).toBeVisible()
  await expect(dialog.getByText(/Cleared — IndexedDB databases/)).toBeVisible()
  await expect(dialog.getByText(/Cleared — Browser settings and caches/)).toBeVisible()

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    dialog.getByRole('button', { name: 'Reload BashNota' }).click(),
  ])
  await expect(page.locator('#app')).not.toBeEmpty()
  const counts = await page.evaluate(async () => {
    const request = indexedDB.open('notaDB')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await Promise.all(Array.from(database.objectStoreNames).map((name) => new Promise<number>((resolve, reject) => {
        const count = database.transaction(name, 'readonly').objectStore(name).count()
        count.onsuccess = () => resolve(count.result)
        count.onerror = () => reject(count.error)
      })))
    } finally {
      database.close()
    }
  })
  expect(counts.every((count) => count === 0)).toBe(true)
})
