import { expect, test } from './fixtures/consoleGuard'

const seededNotas = Array.from({ length: 12 }, (_, index) => {
  const number = index + 1
  const id = `selection-${String(number).padStart(2, '0')}`
  const timestamp = `2026-01-${String(number).padStart(2, '0')}T00:00:00.000Z`
  return {
    id,
    title: `Selection Nota ${String(number).padStart(2, '0')}`,
    parentId: null,
    tags: number % 2 === 0 ? ['even'] : ['odd'],
    favorite: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    blockStructure: { notaId: id, blockOrder: [], version: 1, lastModified: timestamp },
  }
})

async function seedSelectionNotas(page: import('@playwright/test').Page) {
  await page.evaluate(async notas => {
    const request = indexedDB.open('notaDB')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const transaction = database.transaction('notas', 'readwrite')
      const store = transaction.objectStore('notas')
      store.clear()
      for (const nota of notas) store.put(nota)
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      })
    } finally {
      database.close()
    }
  }, seededNotas)
}

test('keeps nota selection synchronized across rows, pages, filters, and batch actions', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('button', { name: /create a nota/i })).toBeVisible()
  await seedSelectionNotas(page)
  await page.reload()

  const selectAll = page.getByRole('checkbox', { name: 'Select all notas on this page' })
  const firstPageNota = page.getByRole('checkbox', { name: 'Select Selection Nota 12' })
  const clearSelection = page.getByRole('button', { name: 'Clear Selection' })

  await expect(firstPageNota).toBeVisible()
  await firstPageNota.click()
  await expect(firstPageNota).toBeChecked()
  await expect(selectAll).toHaveAttribute('aria-checked', 'mixed')
  await expect(clearSelection).toBeVisible()
  await expect(page.getByText('1 selected', { exact: true }).first()).toBeVisible()

  await selectAll.click()
  await expect(selectAll).toBeChecked()
  await expect(page.getByText('10 selected', { exact: true }).first()).toBeVisible()

  await clearSelection.click()
  await expect(clearSelection).toBeHidden()
  await expect(selectAll).not.toBeChecked()
  await expect(firstPageNota).not.toBeChecked()

  await page.getByRole('button', { name: 'Next' }).click()
  const secondPageNota = page.getByRole('checkbox', { name: 'Select Selection Nota 02' })
  await expect(secondPageNota).toBeVisible()
  await secondPageNota.click()
  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(page.getByText('1 selected', { exact: true }).first()).toBeVisible()
  await firstPageNota.click()
  await expect(selectAll).toHaveAttribute('aria-checked', 'mixed')
  await expect(page.getByText('2 selected', { exact: true }).first()).toBeVisible()
  await clearSelection.click()

  await page.getByPlaceholder('Search notas...').fill('Selection Nota 02')
  await expect(secondPageNota).toBeVisible()
  await expect(page.getByRole('row')).toHaveCount(2)
  await selectAll.click()
  await expect(page.getByText('1 selected', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Add to Favorites' }).click()
  await expect(clearSelection).toBeHidden()

  await expect.poll(async () => page.evaluate(async () => {
    const request = indexedDB.open('notaDB')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const transaction = database.transaction('notas', 'readonly')
      const all = transaction.objectStore('notas').getAll()
      const rows = await new Promise<Array<{ id: string; favorite?: boolean }>>((resolve, reject) => {
        all.onsuccess = () => resolve(all.result)
        all.onerror = () => reject(all.error)
      })
      return rows.filter(nota => nota.favorite).map(nota => nota.id).sort()
    } finally {
      database.close()
    }
  })).toEqual(['selection-02'])
})
