import { expect, test } from '@playwright/test'

test('connects, refreshes, reports failure, and removes a local Jupyter server accessibly', async ({
  page,
}) => {
  await page.goto('./settings/jupyter')
  await page.getByRole('button', { name: 'Add Server' }).click()

  await page.getByLabel('Server host').fill('127.0.0.1')
  await page.getByLabel('Port').fill('8888')
  await page.locator('form').getByRole('button', { name: 'Add Server', exact: true }).click()

  const serverCard = page.getByTestId('jupyter-server-card').filter({ hasText: '127.0.0.1:8888' })
  await expect(serverCard.getByRole('status')).toHaveText('Online')

  const refresh = serverCard.getByRole('button', { name: 'Refresh kernels for 127.0.0.1:8888' })
  const remove = serverCard.getByRole('button', { name: 'Remove Jupyter server 127.0.0.1:8888' })
  const details = serverCard.getByRole('button', {
    name: 'Show details for Jupyter server 127.0.0.1:8888',
  })

  await refresh.click()
  await expect(serverCard.getByText('1 kernels available')).toBeVisible()
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Refreshed 127.0.0.1:8888' }),
  ).toBeVisible()

  await refresh.focus()
  await page.keyboard.press('Tab')
  await expect(remove).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(details).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(
    serverCard.getByRole('button', { name: 'Hide details for Jupyter server 127.0.0.1:8888' }),
  ).toHaveAttribute('aria-expanded', 'true')
  await expect(serverCard.getByText('Python 3')).toBeVisible()

  await page.route('http://127.0.0.1:8888/api/kernelspecs', (route) =>
    route.abort('connectionfailed'),
  )
  await refresh.click()
  await expect(serverCard.getByRole('status')).toHaveText('Offline')
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Could not refresh 127.0.0.1:8888' }),
  ).toBeVisible()

  await remove.click()
  const dialog = page.getByRole('alertdialog', { name: 'Remove this Jupyter server?' })
  await expect(dialog).toContainText('127.0.0.1:8888')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(serverCard).toBeVisible()

  await remove.click()
  await dialog.getByRole('button', { name: 'Remove server', exact: true }).click()
  await expect(page.getByText('No Jupyter Servers Configured')).toBeVisible()
})
