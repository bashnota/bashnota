import { expect, test, type Page } from './fixtures/consoleGuard'

const viewports = [
  { name: '320px mobile', width: 320, height: 700, stacked: true },
  { name: '390px mobile', width: 390, height: 844, stacked: true },
  { name: '768px tablet', width: 768, height: 900, stacked: false },
  { name: 'desktop', width: 1280, height: 800, stacked: false },
] as const

async function openHelp(page: Page) {
  const helpMenu = page.getByRole('menuitem', { name: 'Help', exact: true })
  await helpMenu.focus()
  await helpMenu.press('Enter')

  const documentation = page.getByRole('menuitem', { name: /Documentation/ })
  await expect(documentation).toBeVisible()
  await documentation.focus()
  await documentation.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'BashNota help' })
  await expect(dialog).toBeVisible()
  await dialog.evaluate((element) =>
    Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  )
  return dialog
}

for (const viewport of viewports) {
  test(`keeps help usable at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('./')
    await page.getByRole('button', { name: /create a nota/i }).click()
    await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)

    const dialog = await openHelp(page)
    const navigation = dialog.getByTestId('help-topic-navigation')
    const mobileTrigger = dialog.getByTestId('help-mobile-topic-trigger')
    const article = dialog.getByTestId('help-article')
    const footer = dialog.getByTestId('help-footer')
    const topClose = dialog.getByRole('button', { name: 'Close' }).last()

    const layout = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }
    })
    expect(layout.left).toBeGreaterThanOrEqual(0)
    expect(layout.right).toBeLessThanOrEqual(viewport.width)
    expect(layout.top).toBeGreaterThanOrEqual(0)
    expect(layout.bottom).toBeLessThanOrEqual(viewport.height)
    expect(layout.scrollWidth).toBe(layout.clientWidth)

    const [closedArticleBox, footerBox, closeBox] = await Promise.all([
      article.boundingBox(),
      footer.boundingBox(),
      topClose.boundingBox(),
    ])
    expect(closedArticleBox).not.toBeNull()
    expect(footerBox).not.toBeNull()
    expect(closeBox?.width).toBeGreaterThanOrEqual(44)
    expect(closeBox?.height).toBeGreaterThanOrEqual(44)
    expect(closedArticleBox!.height).toBeGreaterThan(0)
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(layout.bottom + 1)

    if (viewport.stacked) {
      await expect(mobileTrigger).toBeVisible()
      await expect(mobileTrigger).toHaveAttribute('aria-expanded', 'false')
      await expect(navigation).toBeHidden()
      expect(closedArticleBox!.height).toBeGreaterThan(200)

      await mobileTrigger.click()
      await expect(mobileTrigger).toHaveAttribute('aria-expanded', 'true')
      await expect(navigation).toBeVisible()
      const [navigationBox, openArticleBox] = await Promise.all([
        navigation.boundingBox(),
        article.boundingBox(),
      ])
      expect(navigationBox).not.toBeNull()
      expect(openArticleBox).not.toBeNull()
      expect(navigationBox!.y + navigationBox!.height).toBeLessThanOrEqual(openArticleBox!.y + 1)
      expect(openArticleBox!.height).toBeGreaterThan(0)
    } else {
      await expect(mobileTrigger).toBeHidden()
      await expect(navigation).toBeVisible()
      const [navigationBox, articleBox] = await Promise.all([
        navigation.boundingBox(),
        article.boundingBox(),
      ])
      expect(navigationBox).not.toBeNull()
      expect(articleBox).not.toBeNull()
      expect(navigationBox!.x + navigationBox!.width).toBeLessThanOrEqual(articleBox!.x + 1)
    }

    await navigation.getByRole('button', { name: 'Rich Text Editor Basics' }).click()
    await expect(
      article.getByRole('heading', { name: 'Rich Text Editor Basics', exact: true }),
    ).toBeVisible()
    if (viewport.stacked) {
      await expect(navigation).toBeHidden()
      await expect(mobileTrigger).toContainText('Rich Text Editor Basics')
      expect((await article.boundingBox())!.height).toBeGreaterThanOrEqual(
        closedArticleBox!.height - 1,
      )
    }

    await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
    await expect(dialog).toBeHidden()
  })
}

test('keeps the article and footer usable with enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: /create a nota/i }).click()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
  await page.addStyleTag({ content: 'html { font-size: 150% !important; }' })

  const dialog = await openHelp(page)
  const article = dialog.getByTestId('help-article')
  const footer = dialog.getByTestId('help-footer')
  const mobileTrigger = dialog.getByTestId('help-mobile-topic-trigger')
  await expect(article).toBeVisible()
  await expect(footer).toBeVisible()
  await expect(mobileTrigger).toHaveAttribute('aria-expanded', 'false')

  const [dialogBox, articleBox, footerBox] = await Promise.all([
    dialog.boundingBox(),
    article.boundingBox(),
    footer.boundingBox(),
  ])
  expect(articleBox!.height).toBeGreaterThan(0)
  expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height + 1)
  expect(await dialog.evaluate((element) => element.scrollWidth)).toBe(
    await dialog.evaluate((element) => element.clientWidth),
  )
})
