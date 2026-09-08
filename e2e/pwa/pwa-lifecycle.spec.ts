import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const publicNotaId = 'pwa-public-reader'
const publicNota = {
  id: publicNotaId,
  title: 'Offline public reader',
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cached public reader content' }] }],
  },
  author_name: 'PWA Author',
  author_tag: 'pwa-author',
  is_sub_page: false,
  parent_id: null,
  tags: [],
  published_nota_citations: [],
  published_sub_pages: [],
  published_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  view_count: 1,
  unique_viewers: 1,
  like_count: 0,
  dislike_count: 0,
  clone_count: 0,
  comment_count: 0,
  last_viewed_at: null,
}

async function disableHttpCache(context: BrowserContext, page: Page): Promise<void> {
  const session = await context.newCDPSession(page)
  await session.send('Network.enable')
  await session.send('Network.setCacheDisabled', { cacheDisabled: true })
}

async function deferredAssetUrls(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const cache = await caches.open('bashnota-deferred-features')
    return (await cache.keys()).map(key => key.url)
  })
}

async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
}

test('installs, evicts stale caches, and reopens editor and reader content offline', async ({ browser, context, page, request }) => {
  test.setTimeout(120_000)
  await page.goto('./')

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBe('/bashnota/manifest.webmanifest')
  const manifestResponse = await request.get(manifestHref!)
  expect(manifestResponse.ok()).toBe(true)
  const manifest = await manifestResponse.json() as {
    display?: string
    scope?: string
    start_url?: string
    icons?: Array<{ src: string }>
  }
  expect(manifest).toMatchObject({
    display: 'standalone',
    scope: '/bashnota/',
    start_url: '/bashnota/',
  })
  expect(manifest.icons).not.toHaveLength(0)
  for (const icon of manifest.icons ?? []) {
    const iconResponse = await request.get(new URL(icon.src, manifestResponse.url()).toString())
    expect(iconResponse.ok()).toBe(true)
    expect(iconResponse.headers()['content-type']).toContain('image/')
  }

  await waitForServiceWorkerControl(page)
  await disableHttpCache(context, page)

  const staleScriptUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register('/bashnota/sw.js?stale-fixture=1', {
      scope: '/bashnota/',
    })
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('stale worker did not activate')), 10_000)
      const finish = () => {
        window.clearTimeout(timeout)
        resolve()
      }
      const worker = registration.installing ?? registration.waiting ?? registration.active
      if (worker?.state === 'activated') finish()
      else worker?.addEventListener('statechange', () => worker.state === 'activated' && finish())
    })
    return registration.active?.scriptURL ?? ''
  })
  expect(staleScriptUrl).toContain('stale-fixture=1')

  const obsoleteCache = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/bashnota/')
    if (!registration) throw new Error('PWA registration is missing before the cache-eviction fixture')
    const name = `workbox-precache-v0-obsolete-${registration.scope}`
    await caches.open(name)
    return name
  })
  expect(await page.evaluate(name => caches.has(name), obsoleteCache)).toBe(true)

  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register('/bashnota/sw.js', {
      scope: '/bashnota/',
    })
    await registration.update()
  })
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/bashnota/')
    return {
      active: registration?.active?.scriptURL ?? '',
      installing: registration?.installing?.scriptURL ?? '',
      waiting: registration?.waiting?.scriptURL ?? '',
    }
  })).toEqual({
    active: 'http://127.0.0.1:4174/bashnota/sw.js',
    installing: '',
    waiting: '',
  })

  await expect.poll(() => page.evaluate(name => caches.has(name), obsoleteCache)).toBe(false)

  await page.getByRole('button', { name: /create a nota/i }).click()
  await expect(page).toHaveURL(/\/bashnota\/nota\/[^/]+$/)
  const editorUrl = page.url()
  const title = page.getByRole('textbox', { name: 'Nota title' })
  const editor = page.locator('.ProseMirror')
  await title.fill('Offline editor nota')
  await title.press('Tab')
  await editor.fill('Cached local editor content')
  await editor.press('Tab')
  await expect.poll(() => page.evaluate(async () => {
    const request = indexedDB.open('notaDB')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const transaction = database.transaction(['notas', 'textBlocks'], 'readonly')
      const readAll = <T>(idbRequest: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
        idbRequest.onsuccess = () => resolve(idbRequest.result)
        idbRequest.onerror = () => reject(idbRequest.error)
      })
      const [notas, blocks] = await Promise.all([
        readAll<any[]>(transaction.objectStore('notas').getAll()),
        readAll<any[]>(transaction.objectStore('textBlocks').getAll()),
      ])
      return notas.some(nota => nota.title === 'Offline editor nota')
        && JSON.stringify(blocks).includes('Cached local editor content')
    } finally {
      database.close()
    }
  }), { timeout: 35_000 }).toBe(true)

  await expect.poll(async () => (
    await deferredAssetUrls(page)
  ).some(url => /\/assets\/editor-.*\.js/.test(url))).toBe(true)

  // Disable Chromium's ordinary HTTP cache before going offline. A successful
  // direct navigation must therefore come from the service worker's precache,
  // deferred-feature runtime cache, and IndexedDB—not a hidden browser hit.
  await context.setOffline(true)
  await page.goto(editorUrl)
  await expect(page.getByRole('textbox', { name: 'Nota title' })).toHaveText('Offline editor nota')
  await expect(page.locator('.ProseMirror')).toContainText('Cached local editor content')

  await context.setOffline(false)
  const readerContext = await browser.newContext({
    baseURL: new URL('/bashnota/', page.url()).toString(),
    serviceWorkers: 'allow',
  })
  const readerPage = await readerContext.newPage()
  await disableHttpCache(readerContext, readerPage)
  await readerPage.route('**/rest/v1/rpc/query_publications', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([publicNota]),
  }))
  await readerPage.route('**/rest/v1/rpc/record_nota_view', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ view_count: 2, unique_viewers: 1 }]),
  }))
  await readerPage.goto('./')
  await waitForServiceWorkerControl(readerPage)
  await readerPage.goto(`./p/${publicNotaId}`)
  await expect(readerPage.getByRole('heading', { name: publicNota.title })).toBeVisible()
  await expect(readerPage.getByText('Cached public reader content')).toBeVisible()
  await expect.poll(() => readerPage.evaluate(async () => {
    const cache = await caches.open('bashnota-public-publications-v1')
    return (await cache.keys()).some(key => key.url.includes('/__offline/publications/pwa-public-reader'))
  })).toBe(true)
  const readerDeferredAssets = await deferredAssetUrls(readerPage)
  expect(readerDeferredAssets.some(url => /\/assets\/editor-.*\.js/.test(url))).toBe(true)

  await readerPage.unroute('**/rest/v1/rpc/query_publications')
  await readerPage.unroute('**/rest/v1/rpc/record_nota_view')

  await readerContext.setOffline(true)
  await readerPage.goto(`./p/${publicNotaId}`)
  await expect(readerPage.getByRole('heading', { name: publicNota.title })).toBeVisible()
  await expect(readerPage.getByText('Cached public reader content')).toBeVisible()
  await readerContext.close()
})
