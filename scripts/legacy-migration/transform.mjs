import { canonicalContent, canonicalCount, canonicalTimestamp, MigrationDataError, opaqueKey, optionalTimestamp, sha256, stableJson, stableValue } from './canonical.mjs'

const COLLECTIONS = ['users', 'publicProfiles', 'userTags', 'notas', 'publishedNotas', 'publishedNotaViewers', 'publishedNotaViewerDocuments', 'notaVotes', 'comments', 'newsletterSubscriptions']
const record = (kind, sourceKey, payload) => ({ kind, sourceKey, keyHash: opaqueKey(kind, sourceKey), payload, sourceHash: sha256({ kind, sourceKey, payload }) })
const requiredText = (value, label) => {
  if (typeof value !== 'string' || value === '') throw new MigrationDataError(`${label} must be a nonempty string`)
  return value
}
const optionalText = value => value == null ? null : String(value)
const vote = (value, label) => {
  if (value !== 'like' && value !== 'dislike') throw new MigrationDataError(`${label} must be like or dislike`)
  return value
}
const ensureArray = (value, label) => {
  if (value == null) return []
  if (!Array.isArray(value)) throw new MigrationDataError(`${label} must be an array`)
  return value
}
const ensureObject = (value, label) => {
  if (value == null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) throw new MigrationDataError(`${label} must be an object`)
  return value
}

function parentFirst(rows, { id = row => row.id, parent = row => row.parent_id, kind, orphans }) {
  const byId = new Map(rows.map(row => [id(row), row]))
  const state = new Map()
  const ordered = []
  const rejected = new Set()

  const visit = (row, trail = []) => {
    const rowId = id(row)
    if (state.get(rowId) === 'done') return !rejected.has(rowId)
    if (state.get(rowId) === 'visiting') {
      for (const cycleId of trail.slice(trail.indexOf(rowId))) rejected.add(cycleId)
      orphans.push({ type: `${kind}-cycle`, idHash: sha256(rowId) })
      return false
    }
    state.set(rowId, 'visiting')
    const parentId = parent(row)
    if (parentId !== null && byId.has(parentId) && !visit(byId.get(parentId), [...trail, rowId])) rejected.add(rowId)
    state.set(rowId, 'done')
    if (!rejected.has(rowId)) ordered.push(row)
    return !rejected.has(rowId)
  }

  for (const row of [...rows].sort((a, b) => id(a).localeCompare(id(b)))) visit(row)
  return ordered
}

export function validateExport(source) {
  if (!source || source.version !== 1 || typeof source.watermark !== 'string') throw new MigrationDataError('export version/watermark is invalid')
  canonicalTimestamp(source.watermark, 'export watermark')
  if (!Array.isArray(source.authUsers)) throw new MigrationDataError('authUsers must be an array')
  if (!source.collections || typeof source.collections !== 'object') throw new MigrationDataError('legacy collection export is missing')
  for (const name of COLLECTIONS) if (!Array.isArray(source.collections[name])) throw new MigrationDataError(`collections.${name} must be an array`)
  if (!Array.isArray(source.storageManifest ?? [])) throw new MigrationDataError('storageManifest must be an array')
  const authIds = new Set()
  for (const user of source.authUsers) {
    if (typeof user.uid !== 'string' || user.uid === '' || authIds.has(user.uid)) throw new MigrationDataError('authUsers must have unique nonempty UIDs')
    authIds.add(user.uid)
  }
  for (const name of COLLECTIONS) {
    const keys = new Set()
    for (const item of source.collections[name]) {
      const key = name === 'publishedNotaViewerDocuments' || name === 'notaVotes' ? `${item.notaId ?? ''}\0${item.userId ?? ''}` : item.id
      if (typeof key !== 'string' || key === '' || key === '\0' || keys.has(key)) throw new MigrationDataError(`collections.${name} must have unique nonempty source keys`)
      keys.add(key)
    }
  }
}

export function identityRequirements(source) {
  validateExport(source)
  return source.authUsers.map(user => {
    if (user.provider !== 'email' && user.provider !== 'google') throw new MigrationDataError(`auth ${sha256(user.uid)} has an unsupported provider`)
    const email = requiredText(user.email, `auth ${user.uid} email`)
    if (email !== email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new MigrationDataError(`auth ${sha256(user.uid)} email is invalid`)
    return {
      sourceUid: requiredText(user.uid, 'auth uid'), email: email.toLowerCase(),
      emailVerified: user.emailVerified === true, provider: user.provider,
      providerUid: optionalText(user.providerUid), disabled: user.disabled === true,
      displayName: optionalText(user.displayName),
    }
  })
}

export function transformExport(source, provisionedIdentities) {
  validateExport(source)
  const fs = source.collections
  const identities = new Map(provisionedIdentities.map(item => [item.sourceUid, item]))
  if (identities.size !== provisionedIdentities.length) throw new MigrationDataError('provisioned identity map contains duplicate source UIDs')
  const targetUsers = new Set(), providerIdentities = new Set()
  for (const requirement of identityRequirements(source)) {
    const target = identities.get(requirement.sourceUid)
    if (!target) continue
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target.supabaseUserId)
      || target.provider !== requirement.provider || typeof target.providerUid !== 'string' || target.providerUid === ''
      || target.email?.toLowerCase() !== requirement.email || !requirement.emailVerified || requirement.disabled) {
      throw new MigrationDataError(`identity ${sha256(requirement.sourceUid)} has an invalid canonical target mapping`)
    }
    if (targetUsers.has(target.supabaseUserId)) throw new MigrationDataError('two source identities map to one Supabase account')
    const providerKey = `${target.provider}\0${target.providerUid}`
    if (providerIdentities.has(providerKey)) throw new MigrationDataError('two source identities map to one provider identity')
    targetUsers.add(target.supabaseUserId); providerIdentities.add(providerKey)
  }
  const users = new Map(fs.users.map(item => [item.id, item]))
  const publicProfiles = new Map(fs.publicProfiles.map(item => [item.id, item]))
  const tagsByUid = new Map()
  const tagDocumentsByUid = new Map()
  const tagOwners = new Map()
  const orphans = []
  const quarantined = []
  const records = []

  for (const tag of fs.userTags) {
    const tagName = requiredText(tag.id, 'userTag id')
    const uid = requiredText(tag.uid, `userTag ${tagName} uid`)
    if (tagOwners.has(tagName) && tagOwners.get(tagName) !== uid) orphans.push({ type: 'tag-conflict', tagHash: sha256(tagName) })
    tagOwners.set(tagName, uid)
    if (tagsByUid.has(uid) && tagsByUid.get(uid) !== tagName) orphans.push({ type: 'multiple-tags', uidHash: sha256(uid) })
    tagsByUid.set(uid, tagName)
    tagDocumentsByUid.set(uid, tag)
  }

  for (const auth of source.authUsers) {
    const uid = requiredText(auth.uid, 'auth uid')
    const target = identities.get(uid)
    const privateProfile = users.get(uid)
    const publicProfile = publicProfiles.get(uid)
    const userTag = publicProfile?.userTag ?? privateProfile?.userTag ?? tagsByUid.get(uid)
    if (!target) { orphans.push({ type: 'missing-provisioned-identity', uidHash: sha256(uid) }); continue }
    if (!privateProfile || !publicProfile || !userTag || tagsByUid.get(uid) !== userTag) {
      orphans.push({ type: 'identity-profile-link', uidHash: sha256(uid) }); continue
    }
    if (privateProfile.email != null && String(privateProfile.email).toLowerCase() !== target.email) {
      orphans.push({ type: 'identity-profile-email', uidHash: sha256(uid) }); continue
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(userTag)) throw new MigrationDataError(`identity ${sha256(uid)} has an invalid userTag`)
    const created = canonicalTimestamp(privateProfile.createdAt, `users/${sha256(uid)} createdAt`)
    const updated = optionalTimestamp(privateProfile.lastUpdatedAt ?? publicProfile.lastUpdatedAt ?? privateProfile.createdAt, `users/${sha256(uid)} updatedAt`)
    const publicUpdated = optionalTimestamp(publicProfile.lastUpdatedAt ?? privateProfile.lastUpdatedAt ?? privateProfile.createdAt, `publicProfiles/${sha256(uid)} updatedAt`)
    const tagCreated = canonicalTimestamp(tagDocumentsByUid.get(uid).createdAt, `userTags/${sha256(userTag)} createdAt`)
    const identityPayload = {
      source_uid: uid, supabase_user_id: target.supabaseUserId,
      provider: target.provider, provider_uid: target.providerUid,
      verified_email: target.email, user_tag: userTag,
      display_name: privateProfile.displayName ?? auth.displayName ?? '', photo_url: publicProfile.photoURL ?? '',
      created_at: created.utc, updated_at: updated.utc,
      profile_updated_at: publicUpdated.utc, tag_created_at: tagCreated.utc,
      source_created_at_raw: created.raw, source_updated_at_raw: updated.raw,
    }
    records.push(record('identity', uid, identityPayload))
  }

  const owner = (uid, label) => {
    const mapped = identities.get(uid)
    if (!mapped) { orphans.push({ type: 'missing-owner', entityHash: sha256(label), uidHash: sha256(String(uid)) }); return null }
    return mapped.supabaseUserId
  }

  for (const nota of fs.notas) {
    const id = requiredText(nota.id, 'legacy nota id')
    const sourceOwner = requiredText(nota.userId, `notas/${id} userId`)
    records.push(record('legacy_nota', id, { id, legacy_owner_uid: sourceOwner, payload: stableValue(nota) }))
  }

  const publications = new Map(fs.publishedNotas.map(item => [item.id, item]))
  const publicationRows = []
  for (const item of fs.publishedNotas) {
    const id = requiredText(item.id, 'published nota id')
    const authorUid = requiredText(item.authorId, `publishedNotas/${id} authorId`)
    const authorId = owner(authorUid, `publishedNotas/${id}`)
    if (!authorId) continue
    const publishedAt = canonicalTimestamp(item.publishedAt, `publishedNotas/${id} publishedAt`)
    const updatedAt = canonicalTimestamp(item.updatedAt, `publishedNotas/${id} updatedAt`)
    if (updatedAt.utc < publishedAt.utc) orphans.push({ type: 'publication-timestamp-order', idHash: sha256(id) })
    const lastViewedAt = optionalTimestamp(item.lastViewedAt, `publishedNotas/${id} lastViewedAt`)
    const parsed = canonicalContent(item.content, `publishedNotas/${id} content`)
    if (parsed.quarantineText !== null) quarantined.push({ type: 'publication-content', idHash: sha256(id) })
    const row = {
      id, author_id: authorId, legacy_author_uid: authorUid,
      title: requiredText(item.title, `publishedNotas/${id} title`), content: parsed.content,
      content_quarantine_text: parsed.quarantineText, author_name: String(item.authorName ?? ''),
      is_public: item.isPublic !== false, is_sub_page: item.isSubPage === true,
      parent_id: optionalText(item.parentId), published_nota_citations: stableValue(ensureArray(item.citations, `publishedNotas/${id} citations`)),
      tags: ensureArray(item.tags, `publishedNotas/${id} tags`).map(String),
      published_at: publishedAt.utc, updated_at: updatedAt.utc,
      source_published_at_raw: publishedAt.raw, source_updated_at_raw: updatedAt.raw,
      view_count: canonicalCount(item.viewCount, `publishedNotas/${id} viewCount`, 0),
      unique_viewers: canonicalCount(item.uniqueViewers, `publishedNotas/${id} uniqueViewers`, 0),
      like_count: '0', dislike_count: '0', clone_count: canonicalCount(item.cloneCount, `publishedNotas/${id} cloneCount`, 0),
      comment_count: '0', last_viewed_at: lastViewedAt.utc, source_last_viewed_at_raw: lastViewedAt.raw,
      expected_counts: {
        view_count: canonicalCount(item.viewCount, `publishedNotas/${id} viewCount`, 0),
        unique_viewers: canonicalCount(item.uniqueViewers, `publishedNotas/${id} uniqueViewers`, 0),
        like_count: canonicalCount(item.likeCount, `publishedNotas/${id} likeCount`, 0),
        dislike_count: canonicalCount(item.dislikeCount, `publishedNotas/${id} dislikeCount`, 0),
        comment_count: canonicalCount(item.commentCount, `publishedNotas/${id} commentCount`, 0),
        clone_count: canonicalCount(item.cloneCount, `publishedNotas/${id} cloneCount`, 0),
      },
    }
    if (BigInt(row.view_count) < BigInt(row.expected_counts.unique_viewers)) orphans.push({ type: 'publication-view-counter-order', idHash: sha256(id) })
    publicationRows.push(row)
  }
  for (const row of parentFirst(publicationRows, { kind: 'publication-parent', orphans })) {
    if (row.parent_id !== null) {
      const parent = publications.get(row.parent_id)
      const listed = parent ? ensureArray(parent.publishedSubPages, `publishedNotas/${parent.id} publishedSubPages`).filter(childId => childId === row.id).length : 0
      if (!parent || parent.authorId !== row.legacy_author_uid || row.is_sub_page !== true || listed !== 1) orphans.push({ type: 'publication-parent', idHash: sha256(row.id) })
    }
    records.push(record('publication', row.id, row))
  }
  for (const parent of fs.publishedNotas) {
    ensureArray(parent.publishedSubPages, `publishedNotas/${parent.id} publishedSubPages`).forEach((childId, ordinal) => {
      const child = publications.get(childId)
      if (!child || child.parentId !== parent.id || child.authorId !== parent.authorId || child.isSubPage !== true) {
        orphans.push({ type: 'publication-edge', idHash: sha256(`${parent.id}/${childId}`) }); return
      }
      records.push(record('publication_edge', `${parent.id}/${childId}`, { parent_id: parent.id, child_id: childId, ordinal }))
    })
  }

  const notaVoteCandidates = new Map()
  for (const publication of fs.publishedNotas) {
    const embeddedAt = canonicalTimestamp(publication.updatedAt, `publishedNotas/${publication.id} updatedAt`)
    for (const [uid, value] of Object.entries(ensureObject(publication.votes, `publishedNotas/${publication.id} votes`))) {
      notaVoteCandidates.set(`${publication.id}\0${uid}`, { notaId: publication.id, uid, vote: vote(value, 'embedded nota vote'), createdAt: embeddedAt.utc, updatedAt: embeddedAt.utc, createdRaw: embeddedAt.raw, updatedRaw: embeddedAt.raw, source: 'embedded' })
    }
  }
  for (const item of fs.notaVotes) {
    const createdAt = optionalTimestamp(item.createdAt, 'notaVote createdAt')
    const updatedAt = optionalTimestamp(item.updatedAt ?? item.createdAt, 'notaVote updatedAt')
    const candidate = { notaId: requiredText(item.notaId, 'notaVote notaId'), uid: requiredText(item.userId, 'notaVote userId'), vote: vote(item.voteType, 'notaVote voteType'), updatedAt: updatedAt.utc, updatedRaw: updatedAt.raw, source: 'dedicated', createdAt: createdAt.utc, createdRaw: createdAt.raw }
    if (!candidate.createdAt || !candidate.updatedAt || candidate.updatedAt < candidate.createdAt) orphans.push({ type: 'nota-vote-timestamp-order', idHash: sha256(`${candidate.notaId}/${candidate.uid}`) })
    const key = `${candidate.notaId}\0${candidate.uid}`
    const existing = notaVoteCandidates.get(key)
    if (!existing || candidate.updatedAt > existing.updatedAt) notaVoteCandidates.set(key, candidate)
    else if (existing.vote !== candidate.vote) orphans.push({ type: 'nota-vote-conflict', idHash: sha256(key) })
  }
  for (const candidate of [...notaVoteCandidates.values()].sort((a, b) => `${a.notaId}/${a.uid}`.localeCompare(`${b.notaId}/${b.uid}`))) {
    const userId = owner(candidate.uid, `notaVote/${candidate.notaId}`)
    if (!publications.has(candidate.notaId)) { orphans.push({ type: 'nota-vote-target', idHash: sha256(candidate.notaId) }); continue }
    if (!userId) continue
    records.push(record('nota_vote', `${candidate.notaId}/${candidate.uid}`, { nota_id: candidate.notaId, user_id: userId, vote: candidate.vote, created_at: candidate.createdAt ?? candidate.updatedAt, updated_at: candidate.updatedAt, source_created_at_raw: candidate.createdRaw ?? candidate.updatedRaw, source_updated_at_raw: candidate.updatedRaw }))
  }

  const viewerRows = new Map()
  const addViewer = (notaId, uid, timestamp) => {
    if (!publications.has(notaId)) { orphans.push({ type: 'viewer-target', idHash: sha256(notaId) }); return }
    const userId = owner(uid, `viewer/${notaId}`); if (!userId) return
    const at = canonicalTimestamp(timestamp, `viewer/${sha256(`${notaId}/${uid}`)} firstViewedAt`)
    const key = `${notaId}\0${uid}`, existing = viewerRows.get(key)
    if (!existing || at.utc < existing.first_viewed_at) viewerRows.set(key, { nota_id: notaId, user_id: userId, first_viewed_at: at.utc, source_first_viewed_at_raw: at.raw })
  }
  for (const parent of fs.publishedNotaViewers) for (const uid of ensureArray(parent.viewers, `publishedNotaViewers/${parent.id} viewers`)) addViewer(parent.id, uid, parent.lastUpdated)
  for (const item of fs.publishedNotaViewerDocuments) addViewer(item.notaId, item.userId, item.firstViewedAt)
  for (const [key, payload] of [...viewerRows.entries()].sort()) records.push(record('nota_viewer', key.replace('\0', '/'), payload))

  for (const publication of fs.publishedNotas) {
    const stats = ensureObject(publication.stats, `publishedNotas/${publication.id} stats`)
    for (const [sourceName, kind] of [['dailyViews', 'daily'], ['weeklyViews', 'weekly'], ['monthlyViews', 'monthly']]) {
      for (const [bucketKey, value] of Object.entries(ensureObject(stats[sourceName], `${sourceName}`))) {
        const validBucket = kind === 'daily' ? /^\d{4}-\d{2}-\d{2}$/.test(bucketKey) && new Date(`${bucketKey}T00:00:00Z`).toISOString().slice(0, 10) === bucketKey
          : kind === 'weekly' ? /^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/.test(bucketKey)
            : /^\d{4}-(?:0[1-9]|1[0-2])$/.test(bucketKey)
        if (!validBucket) throw new MigrationDataError(`publishedNotas/${publication.id} has an invalid ${kind} metric bucket`)
        records.push(record('metric_bucket', `${publication.id}/${kind}/${bucketKey}`, { nota_id: publication.id, bucket_kind: kind, bucket_key: bucketKey, view_count: canonicalCount(value, `${sourceName}.${bucketKey}`) }))
      }
    }
    for (const [bucketKey, value] of Object.entries(ensureObject(publication.referrers, `publishedNotas/${publication.id} referrers`))) {
      if (!/^[a-zA-Z0-9./:_-]{1,253}$/.test(bucketKey)) throw new MigrationDataError(`publishedNotas/${publication.id} referrer key is invalid`)
      records.push(record('metric_bucket', `${publication.id}/referrer/${bucketKey}`, { nota_id: publication.id, bucket_kind: 'referrer', bucket_key: bucketKey, view_count: canonicalCount(value, `referrers.${bucketKey}`) }))
    }
  }

  const comments = new Map(fs.comments.map(item => [item.id, item]))
  const commentRows = []
  for (const item of fs.comments) {
    const id = requiredText(item.id, 'comment id'), notaId = requiredText(item.notaId, `comments/${id} notaId`)
    const authorUid = requiredText(item.authorId, `comments/${id} authorId`), authorId = owner(authorUid, `comments/${id}`)
    if (!publications.has(notaId)) { orphans.push({ type: 'comment-target', idHash: sha256(id) }); continue }
    if (!authorId) continue
    const created = canonicalTimestamp(item.createdAt, `comments/${id} createdAt`), updated = canonicalTimestamp(item.updatedAt, `comments/${id} updatedAt`)
    if (updated.utc < created.utc) orphans.push({ type: 'comment-timestamp-order', idHash: sha256(id) })
    const parsed = canonicalContent(item.content, `comments/${id} content`, { allowText: true })
    const canonicalAuthorTag = tagsByUid.get(authorUid)
    if (item.authorTag != null && item.authorTag !== canonicalAuthorTag) orphans.push({ type: 'comment-author-tag', idHash: sha256(id) })
    commentRows.push({
      id, nota_id: notaId, author_id: authorId, legacy_author_uid: authorUid,
      author_name: String(item.authorName ?? ''), author_tag: canonicalAuthorTag, content: parsed.content,
      parent_id: optionalText(item.parentId), like_count: '0', dislike_count: '0', reply_count: '0',
      created_at: created.utc, updated_at: updated.utc, source_created_at_raw: created.raw, source_updated_at_raw: updated.raw,
      expected_counts: { like_count: canonicalCount(item.likeCount, `comments/${id} likeCount`), dislike_count: canonicalCount(item.dislikeCount, `comments/${id} dislikeCount`), reply_count: canonicalCount(item.replyCount, `comments/${id} replyCount`) },
    })
  }
  for (const row of parentFirst(commentRows, { kind: 'comment-parent', orphans })) {
    if (row.parent_id !== null) {
      const parent = comments.get(row.parent_id)
      if (!parent || parent.notaId !== row.nota_id) orphans.push({ type: 'comment-parent', idHash: sha256(row.id) })
    }
    records.push(record('comment', row.id, row))
  }
  for (const item of fs.comments) {
    const created = canonicalTimestamp(item.createdAt, `comments/${item.id} createdAt`)
    const updated = canonicalTimestamp(item.updatedAt, `comments/${item.id} updatedAt`)
    for (const [uid, value] of Object.entries(ensureObject(item.votes, `comments/${item.id} votes`))) {
      const userId = owner(uid, `commentVote/${item.id}`); if (!userId) continue
      if (!comments.has(item.id)) { orphans.push({ type: 'comment-vote-target', idHash: sha256(item.id) }); continue }
      records.push(record('comment_vote', `${item.id}/${uid}`, { comment_id: item.id, user_id: userId, vote: vote(value, 'comment vote'), created_at: created.utc, updated_at: updated.utc, source_created_at_raw: created.raw, source_updated_at_raw: updated.raw }))
    }
  }

  for (const item of fs.newsletterSubscriptions) {
    const uid = requiredText(item.id, 'newsletter id'), userId = owner(uid, `newsletter/${uid}`); if (!userId) continue
    const email = requiredText(item.email, 'newsletter email').toLowerCase()
    if (email !== identities.get(uid).email) throw new MigrationDataError(`newsletter ${sha256(uid)} email does not match the verified identity`)
    const subscribed = canonicalTimestamp(item.subscribedAt, `newsletter/${sha256(uid)} subscribedAt`)
    records.push(record('newsletter', uid, { user_id: userId, source_uid: uid, email, display_name: optionalText(item.displayName), subscribed_at: subscribed.utc, source_subscribed_at_raw: subscribed.raw }))
  }

  const derived = new Map(publicationRows.map(row => [row.id, { unique_viewers: 0n, like_count: 0n, dislike_count: 0n, comment_count: 0n }]))
  const derivedComments = new Map(commentRows.map(row => [row.id, { like_count: 0n, dislike_count: 0n, reply_count: 0n }]))
  for (const item of records) {
    if (item.kind === 'nota_viewer') derived.get(item.payload.nota_id).unique_viewers += 1n
    if (item.kind === 'nota_vote') derived.get(item.payload.nota_id)[`${item.payload.vote}_count`] += 1n
    if (item.kind === 'comment') {
      derived.get(item.payload.nota_id).comment_count += 1n
      if (item.payload.parent_id !== null && derivedComments.has(item.payload.parent_id)) derivedComments.get(item.payload.parent_id).reply_count += 1n
    }
    if (item.kind === 'comment_vote') derivedComments.get(item.payload.comment_id)[`${item.payload.vote}_count`] += 1n
  }
  for (const item of records) {
    if (item.kind === 'publication') {
      const counts = derived.get(item.payload.id)
      for (const name of Object.keys(counts)) if (counts[name].toString() !== item.payload.expected_counts[name]) {
        orphans.push({ type: 'publication-counter', idHash: sha256(item.payload.id), counter: name })
      }
      Object.assign(item.payload, Object.fromEntries(Object.entries(counts).map(([name, value]) => [name, value.toString()])))
    }
    if (item.kind === 'comment') {
      const counts = derivedComments.get(item.payload.id)
      for (const name of Object.keys(counts)) if (counts[name].toString() !== item.payload.expected_counts[name]) {
        orphans.push({ type: 'comment-counter', idHash: sha256(item.payload.id), counter: name })
      }
      Object.assign(item.payload, Object.fromEntries(Object.entries(counts).map(([name, value]) => [name, value.toString()])))
    }
    item.sourceHash = sha256({ kind: item.kind, sourceKey: item.sourceKey, payload: item.payload })
  }

  const storagePaths = new Set()
  const storageManifest = ensureArray(source.storageManifest, 'storageManifest').map(item => {
    const path = requiredText(item.path, 'storage path'), contentHash = requiredText(item.sha256, 'storage sha256')
    if (storagePaths.has(path)) throw new MigrationDataError('storage manifest contains a duplicate object path')
    if (!/^[0-9a-f]{64}$/.test(contentHash)) throw new MigrationDataError('storage object SHA-256 must be lowercase hexadecimal')
    if (item.ownerUid && !identities.has(item.ownerUid)) orphans.push({ type: 'storage-owner', pathHash: sha256(path) })
    storagePaths.add(path)
    return { pathHash: sha256(path), contentHash, mediaType: requiredText(item.mediaType, 'storage mediaType'), ownerUidHash: item.ownerUid ? sha256(item.ownerUid) : null }
  })
  const manifest = {
    version: 1, watermark: canonicalTimestamp(source.watermark, 'export watermark').utc, records,
    sourceCounts: Object.fromEntries(COLLECTIONS.map(name => [name, fs[name].length])),
    authCount: source.authUsers.length, storageManifest,
    orphans: orphans.sort((a, b) => stableJson(a).localeCompare(stableJson(b))),
    quarantined: quarantined.sort((a, b) => stableJson(a).localeCompare(stableJson(b))),
  }
  manifest.sourceWatermarkHash = sha256(manifest.watermark)
  manifest.identityPlanHash = sha256(records.filter(item => item.kind === 'identity').map(item => ({
    sourceKeyHash: item.keyHash,
    targetUserId: item.payload.supabase_user_id,
    provider: item.payload.provider,
    providerUidHash: sha256(item.payload.provider_uid),
  })))
  manifest.manifestHash = sha256({ ...manifest, manifestHash: undefined })
  return manifest
}
