import { expect, test } from './fixtures/consoleGuard'

test.use({
  consolePolicy: { allow: [
    {
      level: 'error',
      pattern: /Failed to save nota version:.*injected browser history append failure/s,
      reason: 'This journey injects an IndexedDB abort to verify truthful save failure.',
    },
    {
      level: 'error',
      pattern: /Error saving version:.*injected browser history append failure/s,
      reason: 'The editor and shell both propagate the intentionally injected save failure.',
    },
  ] },
})

const persistenceTimeoutMs = 35_000

async function persistedBodyContains(page: import('@playwright/test').Page, text: string) {
  return page.evaluate(async (expected) => {
    const request = indexedDB.open('notaDB')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const transaction = database.transaction('textBlocks', 'readonly')
      const rows = transaction.objectStore('textBlocks').getAll()
      return await new Promise<boolean>((resolve, reject) => {
        rows.onsuccess = () => resolve(JSON.stringify(rows.result).includes(expected))
        rows.onerror = () => reject(rows.error)
      })
    } finally {
      database.close()
    }
  }, text)
}

async function persistedVersions(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const notaId = location.pathname.split('/').pop()!
    const request = indexedDB.open('notaDB')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const transaction = database.transaction('notas', 'readonly')
      const row = transaction.objectStore('notas').get(notaId)
      return await new Promise<Array<{ id: string; canonicalContent?: unknown }>>((resolve, reject) => {
        row.onsuccess = () => resolve(row.result?.versions ?? [])
        row.onerror = () => reject(row.error)
      })
    } finally {
      database.close()
    }
  })
}

async function openFileAction(page: import('@playwright/test').Page, name: string) {
  await page.getByText('File', { exact: true }).click()
  await page.getByRole('menuitem', { name }).click()
}

test('saves a durable version that reloads, restores, and deletes', async ({ page }) => {
  test.setTimeout(100_000)
  await page.goto('./')
  await page.getByRole('button', { name: /create a nota/i }).click()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
  const editor = page.locator('.ProseMirror')
  await expect(editor).toBeVisible({ timeout: persistenceTimeoutMs })
  // This journey verifies version durability, not per-keystroke queue load.
  // Use one input transaction so slow CI workers do not spend the assertion
  // budget persisting dozens of synthetic zero-delay intermediate snapshots.
  await editor.fill('Body captured by version history')
  await expect(editor).toContainText('Body captured by version history')
  await expect.poll(
    () => persistedBodyContains(page, 'Body captured by version history'),
    { timeout: persistenceTimeoutMs },
  ).toBe(true)

  await openFileAction(page, 'Save The Version')
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Version saved successfully' })).toHaveCount(1)
  await expect.poll(() => persistedVersions(page), { timeout: persistenceTimeoutMs }).toHaveLength(1)
  expect((await persistedVersions(page))[0].canonicalContent).toBeTruthy()

  await editor.fill('Newer body after snapshot')
  await expect(editor).toContainText('Newer body after snapshot')
  await expect.poll(
    () => persistedBodyContains(page, 'Newer body after snapshot'),
    { timeout: persistenceTimeoutMs },
  ).toBe(true)
  await page.reload()
  await expect(editor).toContainText('Newer body after snapshot', { timeout: persistenceTimeoutMs })

  await openFileAction(page, 'Version History')
  const history = page.getByRole('dialog', { name: 'Version History' })
  await expect(history).toBeVisible()
  await expect(history.getByRole('button', { name: 'Restore' })).toHaveCount(1)
  await history.getByRole('button', { name: 'Restore' }).click()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
  await expect(editor).toContainText('Body captured by version history')

  await page.reload()
  await expect(editor).toContainText('Body captured by version history', { timeout: persistenceTimeoutMs })
  await openFileAction(page, 'Version History')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('dialog', { name: 'Version History' })
    .getByRole('button', { name: /^Delete Version / })
    .click()
  await expect(page.getByRole('dialog', { name: 'Version History' })).toContainText('No saved versions yet')
  await expect.poll(() => persistedVersions(page), { timeout: persistenceTimeoutMs }).toHaveLength(0)

  await page.getByRole('dialog', { name: 'Version History' }).getByRole('button', { name: 'Close' }).click()
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put
    let failed = false
    IDBObjectStore.prototype.put = function(value: unknown, key?: IDBValidKey) {
      const versions = (value as { versions?: unknown[] } | null)?.versions
      if (!failed && this.name === 'notas' && Array.isArray(versions) && versions.length > 0) {
        failed = true
        throw new DOMException('injected browser history append failure', 'AbortError')
      }
      return key === undefined
        ? originalPut.call(this, value)
        : originalPut.call(this, value, key)
    }
  })

  await openFileAction(page, 'Save The Version')
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Failed to save version' })).toHaveCount(1)
  await expect.poll(() => persistedVersions(page), { timeout: persistenceTimeoutMs }).toHaveLength(0)
  await page.reload()
  await expect(editor).toContainText('Body captured by version history', { timeout: persistenceTimeoutMs })
  await openFileAction(page, 'Version History')
  await expect(page.getByRole('dialog', { name: 'Version History' })).toContainText('No saved versions yet')
})
