import { expect, test } from './fixtures/consoleGuard'

test('shows one actionable Jupyter prompt only after execution intent', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => {
    const seen = new WeakSet<Element>()
    const events: string[] = []
    const record = () => {
      document.querySelectorAll('[data-sonner-toast]').forEach((element) => {
        const text = element.textContent?.trim()
        if (!text || seen.has(element)) return
        seen.add(element)
        events.push(text)
      })
    }
    const observer = new MutationObserver(record)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    Object.assign(window, { __jupyterToastEvents: events, __jupyterToastObserver: observer })
  })

  await page.getByRole('button', { name: /create a nota/i }).click()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
  await expect(page.locator('.ProseMirror')).toBeVisible()

  await page.getByRole('button', { name: 'Pane options' }).click()
  await page.getByRole('menuitem', { name: 'Split right' }).click()
  await expect(page.locator('[data-pane-id]')).toHaveCount(2)
  await page.locator('[data-pane-id]').nth(1).getByRole('button', { name: 'Pane options' }).click()
  await page.getByRole('menuitem', { name: 'Close pane' }).click()
  await expect(page.locator('[data-pane-id]')).toHaveCount(1)

  const jupyterEvents = () => page.evaluate(() => (
    (window as typeof window & { __jupyterToastEvents?: string[] }).__jupyterToastEvents ?? []
  ).filter((message) => message.includes('Jupyter setup required')))
  expect(await jupyterEvents()).toEqual([])

  await page.getByRole('menuitem', { name: 'Insert' }).click()
  await page.getByRole('menuitem', { name: 'Code Block' }).click()

  const codeBlock = page.locator('[data-node-view-wrapper]').filter({ has: page.locator('.cm-editor') })
  await expect(codeBlock).toBeVisible()
  const codeEditor = codeBlock.locator('.cm-content')
  await codeEditor.click()
  await page.keyboard.type('print("hello")')

  await codeBlock.hover()
  const run = codeBlock.getByRole('button', { name: 'Run code' })
  await expect(run).toBeEnabled()
  await run.click()

  const setupToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Jupyter setup required' })
  await expect(setupToast).toHaveCount(1)
  await expect(setupToast.getByRole('button', { name: 'Open settings' })).toBeVisible()

  await run.click()
  await expect.poll(jupyterEvents).toHaveLength(1)

  await setupToast.getByRole('button', { name: 'Open settings' }).click()
  await expect(page).toHaveURL(/\/settings\/jupyter$/)
})
