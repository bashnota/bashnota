import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from './fixtures/consoleGuard'
import JSZip from 'jszip'

const importedNota = fileURLToPath(new URL('../fixtures/imported-nota.nota', import.meta.url))

test('creates, edits, autosaves, reopens, exports, and imports a nota', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('./')
  await page.getByRole('button', { name: /create a nota/i }).click()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)

  const title = page.getByRole('textbox', { name: 'Nota title' })
  const editor = page.locator('.ProseMirror')
  await expect(title).toBeVisible()
  await expect(title).toHaveText('Untitled Nota')
  await expect(editor).toBeVisible()

  await title.fill('Critical workflow nota')
  await title.press('Tab')
  await editor.click()
  await editor.fill('Autosaved browser content')
  // The editor records user-originated document changes only while focused;
  // an explicit blur also flushes any queued snapshot under a saturated CI
  // worker instead of relying solely on the debounce timer.
  await editor.press('Tab')
  await expect(title).toHaveText('Critical workflow nota')

  // The production editor intentionally debounces body and metadata persistence
  // independently. Reload only after both durable stores contain the edit.
  await expect.poll(async () => page.evaluate(async () => {
    const request = indexedDB.open('notaDB')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const transaction = database.transaction(['notas', 'textBlocks'], 'readonly')
      const notaRows = transaction.objectStore('notas').getAll()
      const blockRows = transaction.objectStore('textBlocks').getAll()
      const readAll = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const [notas, blocks] = await Promise.all([readAll(notaRows), readAll(blockRows)])
      return notas.some((nota) => nota.title === 'Critical workflow nota')
        && JSON.stringify(blocks).includes('Autosaved browser content')
    } finally {
      database.close()
    }
  }), { timeout: 35_000 }).toBe(true)

  await page.reload()
  await expect(title).toHaveText('Critical workflow nota', { timeout: 20_000 })
  await expect(editor).toContainText('Autosaved browser content', { timeout: 20_000 })

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('critical_workflow_nota_export.zip')
  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()
  const zip = await JSZip.loadAsync(await readFile(downloadPath!))
  expect(await zip.file('index.html')!.async('text')).toContain('Autosaved browser content')

  await page.goto('./')
  await page.getByRole('button', { name: 'Workspace menu' }).click()
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('menuitem', { name: 'Import Nota file' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles(importedNota)

  await expect(page).toHaveURL(/\/bashnota\/nota\/e2e-imported-nota$/)
  await expect(page.getByRole('textbox', { name: 'Nota title' })).toHaveText('Imported deterministic nota')
  await expect(page.locator('.ProseMirror')).toContainText('Imported fixture content')
})
