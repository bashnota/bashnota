import { expect, test } from './fixtures/consoleGuard'

test('imports every notebook cell before reporting success', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Workspace menu' }).click()
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('menuitem', { name: 'Import Jupyter notebook' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles({
    name: 'browser-notebook.ipynb',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      metadata: { title: 'Browser notebook import' },
      cells: [
        { cell_type: 'markdown', source: ['# Imported heading'] },
        { cell_type: 'raw', source: ['Imported raw cell'] },
      ],
    })),
  })

  // The success notification is intentionally short-lived. Observe it as the
  // import completes instead of after several unrelated editor assertions.
  await expect(page.getByText('Notebook "Browser notebook import" imported successfully')).toBeVisible()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
  await expect(page.getByRole('textbox', { name: 'Nota title' })).toHaveText('Browser notebook import')
  await expect(page.locator('.ProseMirror')).toContainText('Imported heading')
  await expect(page.locator('.ProseMirror')).toContainText('Imported raw cell')

  const persisted = await page.evaluate(async () => {
    const notaId = location.pathname.split('/').at(-1)!
    const request = indexedDB.open('notaDB')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const transaction = database.transaction(
        ['notas', 'blockStructures', 'headingBlocks', 'textBlocks'],
        'readonly',
      )
      const count = (store: string, index?: string) => new Promise<number>((resolve, reject) => {
        const source = index
          ? transaction.objectStore(store).index(index)
          : transaction.objectStore(store)
        const result = source.count(notaId)
        result.onsuccess = () => resolve(result.result)
        result.onerror = () => reject(result.error)
      })
      const [notas, structures, headings, text] = await Promise.all([
        count('notas'),
        count('blockStructures', 'notaId'),
        count('headingBlocks', 'notaId'),
        count('textBlocks', 'notaId'),
      ])
      return { notas, structures, headings, text }
    } finally {
      database.close()
    }
  })
  expect(persisted).toEqual({ notas: 1, structures: 1, headings: 1, text: 1 })
})
