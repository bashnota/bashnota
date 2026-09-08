import { expect, test } from './fixtures/consoleGuard'
import type {
  CloudPublication,
  CloudPublicationPageRequest,
} from '../../src/services/cloud/types'

test('loads a 125-publication cursor fixture completely in the browser', async ({ page }) => {
  await page.goto('./')

  const result = await page.evaluate(async () => {
    const modulePath = '/bashnota/src/features/nota/services/listAllPublications.ts'
    const { listAllPublications } = (await import(modulePath)) as typeof import(
      '../../src/features/nota/services/listAllPublications'
    )
    const publications: CloudPublication[] = Array.from({ length: 125 }, (_, index) => ({
      id: `publication-${index}`,
      title: `Publication ${index}`,
      content: { type: 'doc' },
      authorName: 'Browser Owner',
      authorTag: 'browser_owner',
      isPublic: true,
      isSubPage: false,
      parentId: null,
      tags: [],
      citations: [],
      publishedSubPages: [],
      publishedAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      viewCount: index + 1,
    }))
    const cursors: Array<string | null | undefined> = []

    const loaded = await listAllPublications(
      {
        async listPublications(request: CloudPublicationPageRequest) {
          cursors.push(request.cursor)
          return request.cursor === 'page-2'
            ? { ok: true as const, data: { items: publications.slice(100), nextCursor: null } }
            : {
                ok: true as const,
                data: { items: publications.slice(0, 100), nextCursor: 'page-2' },
              }
        },
      },
      { limit: 100, authorTag: 'browser_owner' },
    )

    return {
      count: loaded.length,
      cursors,
      totalViews: loaded.reduce((sum, publication) => sum + (publication.viewCount ?? 0), 0),
    }
  })

  expect(result).toEqual({
    count: 125,
    cursors: [null, 'page-2'],
    totalViews: (125 * 126) / 2,
  })
})
