import { expect, test } from './fixtures/consoleGuard'

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const
const intendedCreateToast = 'Nota "Untitled Nota" created successfully'
const formerDuplicateCreateToast = 'Nota created successfully'

for (const viewport of viewports) {
  test(`keeps a single create notification inside the ${viewport.name} viewport`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('./')

    await page.evaluate(() => {
      const recordedElements = new WeakSet<Element>()
      const toastEvents: string[] = []
      const recordNewToasts = () => {
        for (const element of document.querySelectorAll('[data-sonner-toast]')) {
          const text = element.textContent?.trim()
          if (!text || recordedElements.has(element)) continue
          recordedElements.add(element)
          toastEvents.push(text)
        }
      }
      const observer = new MutationObserver(recordNewToasts)
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      Object.assign(window, { __toastEvents: toastEvents, __toastObserver: observer })
      recordNewToasts()
    })

    await page.getByRole('button', { name: /create a nota/i }).click()

    const toast = page
      .locator('[data-sonner-toast][data-mounted="true"]')
      .filter({ hasText: intendedCreateToast })
    await expect(toast).toHaveCount(1)
    await expect.poll(
      async () => toast.evaluate((element) => element.getBoundingClientRect().bottom),
    ).toBeLessThanOrEqual(viewport.height)

    const layout = await toast.evaluate((element) => {
      const toaster = element.closest<HTMLElement>('[data-sonner-toaster]')
      if (!toaster) throw new Error('Toast is missing its viewport container')

      const toastRect = element.getBoundingClientRect()
      const toasterStyle = getComputedStyle(toaster)
      return {
        toast: {
          left: toastRect.left,
          right: toastRect.right,
          top: toastRect.top,
          bottom: toastRect.bottom,
        },
        toasterPosition: toasterStyle.position,
        xPosition: toaster.dataset.xPosition,
        yPosition: toaster.dataset.yPosition,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }
    })

    expect(layout.toasterPosition).toBe('fixed')
    expect(layout.xPosition).toBe('right')
    expect(layout.yPosition).toBe('bottom')
    expect(layout.toast.left).toBeGreaterThanOrEqual(0)
    expect(layout.toast.right).toBeLessThanOrEqual(layout.viewportWidth)
    expect(layout.toast.top).toBeGreaterThanOrEqual(0)
    expect(layout.toast.bottom).toBeLessThanOrEqual(layout.viewportHeight)
    expect(layout.toast.top).toBeGreaterThan(layout.viewportHeight / 2)
    expect(layout.documentWidth).toBe(layout.viewportWidth)

    await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
    const createToastEvents = await page.evaluate(
      ([intended, formerDuplicate]) => {
        const events = (window as typeof window & { __toastEvents?: string[] }).__toastEvents ?? []
        return events.filter(message => message === intended || message === formerDuplicate)
      },
      [intendedCreateToast, formerDuplicateCreateToast] as const,
    )
    expect(createToastEvents).toEqual([intendedCreateToast])
  })
}
