import { fileURLToPath } from 'node:url'
import { expect, test } from './fixtures/consoleGuard'

const importedNota = fileURLToPath(new URL('../fixtures/imported-nota.nota', import.meta.url))

test('organizes the desktop library as a workspace and previews a nota in place', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('./')

  await page.getByRole('button', { name: 'Workspace menu' }).click()
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('menuitem', { name: 'Import Nota file' }).click()
  const chooser = await chooserPromise
  await chooser.setFiles(importedNota)
  await expect(page).toHaveURL(/\/bashnota\/nota\/e2e-imported-nota$/)
  await page.goto('./')

  const workspace = page.getByRole('complementary')
  const libraryHeading = page.getByRole('heading', { name: 'Nota library' })
  const library = page.getByRole('region', { name: 'Nota library' })
  await expect(workspace).toBeVisible()
  await expect(libraryHeading).toBeVisible()
  await expect(library).toBeVisible()
  await expect(workspace.getByRole('button')).toHaveCount(2)
  await expect(workspace.getByRole('button', { name: 'Create a nota' })).toBeVisible()
  await expect(workspace.getByRole('button', { name: 'Workspace menu' })).toBeVisible()
  await expect(library.getByRole('textbox', { name: 'Search notas' })).toBeVisible()
  await expect(library.getByRole('button', { name: 'Updated' })).toBeVisible()
  await expect(library.getByRole('combobox')).toBeHidden()
  await expect(library.getByRole('button', { name: /create nota/i })).toHaveCount(0)

  await library.getByRole('button', { name: 'Filters' }).click()
  await expect(library.getByRole('combobox')).toBeVisible()
  await expect(library.getByRole('combobox')).toContainText('All notas')
  await library.getByRole('button', { name: 'Filters' }).click()
  await expect(library.getByRole('combobox')).toBeHidden()

  const layout = await page.evaluate(() => {
    const aside = document.querySelector('aside')?.getBoundingClientRect()
    const heading = [...document.querySelectorAll('h2')]
      .find((element) => element.textContent?.includes('Nota library'))
      ?.getBoundingClientRect()
    return {
      asideWidth: aside?.width ?? 0,
      asideRight: aside?.right ?? 0,
      libraryLeft: heading?.left ?? 0,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }
  })

  expect(layout.asideWidth).toBeGreaterThanOrEqual(220)
  expect(layout.asideWidth).toBeLessThanOrEqual(260)
  expect(layout.libraryLeft).toBeGreaterThan(layout.asideRight)
  expect(layout.documentWidth).toBe(layout.viewportWidth)

  const row = page.getByRole('row', { name: /Imported deterministic nota/ })
  await expect(row).toBeVisible()
  await expect(row.getByRole('button')).toHaveCount(1)
  await row.getByRole('button', { name: 'Actions for Imported deterministic nota' }).click()
  await page.getByRole('menuitem', { name: 'Preview' }).click()

  const preview = page.getByRole('dialog', { name: 'Imported deterministic nota' })
  await expect(preview).toBeVisible()
  await expect(preview).toContainText('Imported fixture content')
  await expect(preview.getByRole('button', { name: 'Open in editor' })).toBeVisible()
  await expect(page).toHaveURL(/\/bashnota\/$/)

  await preview.getByRole('button', { name: 'Close panel' }).click()
  await page.setViewportSize({ width: 1024, height: 768 })

  const compactLayout = await page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('.workspace-grid')
    const aside = document.querySelector<HTMLElement>('aside')
    const library = [...document.querySelectorAll<HTMLElement>('h2')]
      .find((element) => element.textContent?.includes('Nota library'))
    return {
      columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
      asideRight: aside?.getBoundingClientRect().right ?? 0,
      libraryLeft: library?.getBoundingClientRect().left ?? 0,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }
  })

  expect(compactLayout.columns).toBe(2)
  expect(compactLayout.libraryLeft).toBeGreaterThan(compactLayout.asideRight)
  expect(compactLayout.documentWidth).toBe(compactLayout.viewportWidth)
})
