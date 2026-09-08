import { stableValue } from './canonical.mjs'

export const EXPORT_COLLECTIONS = ['users', 'publicProfiles', 'userTags', 'notas', 'publishedNotas', 'publishedNotaViewers', 'publishedNotaViewerDocuments', 'notaVotes', 'comments', 'newsletterSubscriptions']

export function normalizeAuthExport(authExport) {
  const users = Array.isArray(authExport) ? authExport : authExport?.users
  if (!Array.isArray(users)) throw new Error('legacy auth export must contain a users array')
  return users.map(user => {
    const uid = user.uid ?? user.localId
    const providers = user.providerUserInfo ?? user.providers ?? []
    const google = providers.find(provider => (provider.providerId ?? provider.provider) === 'google.com')
    return {
      uid, email: user.email, emailVerified: user.emailVerified === true,
      provider: google ? 'google' : 'email', providerUid: google?.rawId ?? google?.providerUid ?? null,
      disabled: user.disabled === true, displayName: user.displayName ?? null,
    }
  }).sort((a, b) => a.uid.localeCompare(b.uid))
}

export function assembleExport({ watermark, authExport, collections, storageManifest = [] }) {
  if (typeof watermark !== 'string' || Number.isNaN(new Date(watermark).valueOf())) throw new Error('a valid UTC export watermark is required')
  const normalizedCollections = {}
  for (const name of EXPORT_COLLECTIONS) {
    if (!Array.isArray(collections[name])) throw new Error(`missing exact export collection ${name}`)
    normalizedCollections[name] = [...collections[name]].sort((a, b) => String(a.id ?? `${a.notaId}/${a.userId}`).localeCompare(String(b.id ?? `${b.notaId}/${b.userId}`))).map(stableValue)
  }
  return stableValue({ version: 1, watermark: new Date(watermark).toISOString(), authUsers: normalizeAuthExport(authExport), collections: normalizedCollections, storageManifest })
}
