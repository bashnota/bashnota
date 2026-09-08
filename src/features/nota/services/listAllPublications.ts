import type { CloudPublishingApi } from '@/services/cloud/api'
import {
  CloudError,
  type CloudPublication,
  type CloudPublicationPageRequest,
} from '@/services/cloud/types'

const MAX_PUBLICATION_PAGES = 1_000

/**
 * Read one complete publication query before callers derive totals or
 * reconcile authoritative state. Any incomplete or structurally unsafe walk
 * rejects without exposing its partial accumulator.
 */
export async function listAllPublications(
  publishing: Pick<CloudPublishingApi, 'listPublications'>,
  request: Omit<CloudPublicationPageRequest, 'cursor'>,
): Promise<CloudPublication[]> {
  const publications: CloudPublication[] = []
  const publicationIds = new Set<string>()
  const visitedCursors = new Set<string>()
  let cursor: string | null = null

  for (let pageNumber = 0; pageNumber < MAX_PUBLICATION_PAGES; pageNumber += 1) {
    if (cursor) {
      if (visitedCursors.has(cursor)) {
        throw new CloudError('invalid', 'Publication pagination repeated a cursor.')
      }
      visitedCursors.add(cursor)
    }

    const result = await publishing.listPublications({ ...request, cursor })
    if (!result.ok) throw result.error

    for (const publication of result.data.items) {
      if (publicationIds.has(publication.id)) {
        throw new CloudError(
          'invalid',
          `Publication pagination returned duplicate id "${publication.id}".`,
        )
      }
      publicationIds.add(publication.id)
      publications.push(publication)
    }

    const nextCursor = result.data.nextCursor
    if (!nextCursor) return publications
    if (nextCursor === cursor || visitedCursors.has(nextCursor)) {
      throw new CloudError('invalid', 'Publication pagination did not advance its cursor.')
    }
    cursor = nextCursor
  }

  throw new CloudError(
    'invalid',
    `Publication pagination exceeded the ${MAX_PUBLICATION_PAGES}-page safety limit.`,
  )
}
