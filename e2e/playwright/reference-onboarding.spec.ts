import { expect, test } from './fixtures/consoleGuard'

test('offers complete manual, BibTeX, and DOI reference onboarding flows', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /create a nota/i }).click()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
  await expect(page.locator('.ProseMirror')).toBeVisible()

  await page.getByRole('menuitem', { name: 'View' }).click()
  await page.getByRole('menuitem', { name: 'Sidebars' }).hover()
  await page.getByRole('menuitemcheckbox', { name: 'References' }).click()
  await expect(page.getByRole('heading', { name: 'References', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Add Your First Reference' }).click()
  const methodDialog = page.getByRole('dialog', { name: 'Add a reference' })
  await expect(methodDialog.getByRole('button', { name: /Enter manually/ })).toBeVisible()
  await expect(methodDialog.getByRole('button', { name: /Look up a DOI/ })).toBeVisible()
  await expect(methodDialog.getByRole('button', { name: /Import BibTeX/ })).toBeVisible()

  await methodDialog.getByRole('button', { name: /Enter manually/ }).click()
  const manualDialog = page.getByRole('dialog', { name: 'Add Single Reference' })
  await manualDialog.getByLabel('Citation Key').fill('lovelace1843')
  await manualDialog.getByLabel('Year').fill('1843')
  await manualDialog.getByLabel('Title').fill('Notes on the Analytical Engine')
  await manualDialog.getByLabel('Authors').fill('Ada Lovelace')
  await manualDialog.getByRole('button', { name: 'Add Reference', exact: true }).click()
  await expect(page.getByText('Notes on the Analytical Engine')).toBeVisible()

  await page.getByTitle('Insert citation').click()
  await expect(page.locator('.ProseMirror .citation-reference')).toContainText('[1]')

  await page.getByRole('button', { name: 'Add Reference', exact: true }).click()
  await methodDialog.getByRole('button', { name: /Import BibTeX/ }).click()
  const bibtexDialog = page.getByRole('dialog', { name: 'Add References' })
  await bibtexDialog.getByLabel('BibTeX Entries').fill('this is not BibTeX')
  await bibtexDialog.getByRole('button', { name: 'Parse BibTeX' }).click()
  await expect(bibtexDialog.getByRole('alert')).toContainText(/No valid|Invalid|Failed to parse/)
  await bibtexDialog.getByRole('button', { name: 'Cancel' }).click()

  let doiMode: 'failure' | 'success' = 'failure'
  await page.route('https://api.crossref.org/works/**', async (route) => {
    if (doiMode === 'failure') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: {
          DOI: '10.1000/browser',
          URL: 'https://doi.org/10.1000/browser',
          title: ['Browser-tested reference'],
          author: [{ given: 'Grace', family: 'Hopper' }],
          published: { 'date-parts': [[1952]] },
          'container-title': ['Compiler Notes'],
        },
      }),
    })
  })

  await page.getByRole('button', { name: 'Add Reference', exact: true }).click()
  await methodDialog.getByRole('button', { name: /Look up a DOI/ }).click()
  const doiDialog = page.getByRole('dialog', { name: 'Look up a DOI' })
  const doiInput = doiDialog.getByLabel('DOI')
  await expect(doiInput).toBeFocused()
  await doiInput.fill('invalid')
  await doiDialog.getByRole('button', { name: 'Look up DOI' }).click()
  await expect(doiDialog.getByRole('alert')).toContainText('Enter a valid DOI')

  await doiInput.fill('10.1000/browser')
  await doiDialog.getByRole('button', { name: 'Look up DOI' }).click()
  await expect(doiDialog.getByRole('alert')).toContainText(/incomplete citation details/i)

  doiMode = 'success'
  await doiDialog.getByRole('button', { name: 'Look up DOI' }).click()
  await expect(doiDialog.getByRole('status')).toContainText('Browser-tested reference')
  await doiDialog.getByRole('button', { name: 'Add reference', exact: true }).click()
  await expect(doiDialog).toBeHidden()
  await expect(page.getByTitle('Browser-tested reference')).toBeVisible()
})
