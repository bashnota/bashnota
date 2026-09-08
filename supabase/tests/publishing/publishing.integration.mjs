import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const make = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const makeWithToken = accessToken => createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${accessToken}` } },
  auth: { persistSession: false, autoRefreshToken: false },
})
const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
const password = `Publish-${suffix}!`
const owner = make()
const ownerSignup = await owner.auth.signUp({ email: `publisher-${suffix}@example.test`, password })
assert.ifError(ownerSignup.error)
assert.ok(ownerSignup.data.session, 'owner browser session must be authenticated')

const notaId = `browser-${suffix}`
const published = await owner.rpc('publish_nota', {
  p_id: notaId, p_title: 'Browser publication', p_content: { type: 'doc' },
  p_author_name: 'Browser Publisher', p_is_sub_page: false, p_parent_id: null,
  p_citations: [{ id: 'ordered-b' }, { id: 'ordered-a' }], p_tags: ['browser'], p_child_ids: [],
})
assert.ifError(published.error)
assert.equal(published.data?.[0]?.id, notaId)
const childId = `${notaId}-child`
assert.ifError((await owner.rpc('publish_nota', {
  p_id: childId, p_title: 'Browser child', p_content: { type: 'doc' },
  p_author_name: 'Browser Publisher', p_is_sub_page: true, p_parent_id: notaId,
  p_citations: [], p_tags: [], p_child_ids: [],
})).error)
assert.ifError((await owner.rpc('publish_nota', {
  p_id: notaId, p_title: 'Browser publication', p_content: { type: 'doc' },
  p_author_name: 'Browser Publisher', p_is_sub_page: false, p_parent_id: null,
  p_citations: [{ id: 'ordered-b' }, { id: 'ordered-a' }], p_tags: ['browser'], p_child_ids: [childId],
})).error)
const directEdgeDelete = await owner.from('published_nota_edges').delete().eq('parent_id', notaId)
assert.ok(directEdgeDelete.error, 'browser roles cannot bypass atomic hierarchy reconciliation')

const anonymous = make()
const beforeCycleAttempts = await anonymous.rpc('query_publications', { p_id: notaId, p_limit: 1 })
assert.ifError(beforeCycleAttempts.error)
const selfParent = await owner.rpc('publish_nota', {
  p_id: notaId, p_title: 'Self cycle', p_content: {},
  p_author_name: 'Browser Publisher', p_is_sub_page: true, p_parent_id: notaId,
  p_citations: [], p_tags: [], p_child_ids: [],
})
assert.equal(selfParent.error?.code, '23514', 'browser RPC rejects self-parenting')
const ancestorUnderDescendant = await owner.rpc('publish_nota', {
  p_id: notaId, p_title: 'Ancestor cycle', p_content: {},
  p_author_name: 'Browser Publisher', p_is_sub_page: true, p_parent_id: childId,
  p_citations: [], p_tags: [], p_child_ids: [],
})
assert.equal(ancestorUnderDescendant.error?.code, '23514', 'browser RPC rejects an ancestor beneath its descendant')
const afterCycleAttempts = await anonymous.rpc('query_publications', { p_id: notaId, p_limit: 1 })
assert.ifError(afterCycleAttempts.error)
assert.deepEqual(afterCycleAttempts.data, beforeCycleAttempts.data,
  'denied hierarchy cycles leave the public row, parent, and ordered edges unchanged')

// Two independent PostgREST clients start opposing reparent requests without
// awaiting either one. The per-owner transaction lock must serialize their
// validation so exactly one can commit and the second observes that new edge.
const concurrentA = `${notaId}-concurrent-a`
const concurrentB = `${notaId}-concurrent-b`
for (const id of [concurrentA, concurrentB]) {
  assert.ifError((await owner.rpc('publish_nota', {
    p_id: id, p_title: id, p_content: { type: 'doc' },
    p_author_name: 'Browser Publisher', p_is_sub_page: false, p_parent_id: null,
    p_citations: [], p_tags: [], p_child_ids: [],
  })).error)
}
const ownerToken = ownerSignup.data.session.access_token
const concurrentClients = [makeWithToken(ownerToken), makeWithToken(ownerToken)]
const opposingReparents = await Promise.allSettled([
  concurrentClients[0].rpc('publish_nota', {
    p_id: concurrentA, p_title: 'Concurrent A', p_content: { type: 'doc' },
    p_author_name: 'Browser Publisher', p_is_sub_page: true, p_parent_id: concurrentB,
    p_citations: [], p_tags: [], p_child_ids: [],
  }),
  concurrentClients[1].rpc('publish_nota', {
    p_id: concurrentB, p_title: 'Concurrent B', p_content: { type: 'doc' },
    p_author_name: 'Browser Publisher', p_is_sub_page: true, p_parent_id: concurrentA,
    p_citations: [], p_tags: [], p_child_ids: [],
  }),
])
assert.ok(opposingReparents.every(result => result.status === 'fulfilled'),
  'both concurrent HTTP requests return database outcomes')
const reparentResponses = opposingReparents.map(result => result.value)
assert.equal(reparentResponses.filter(response => !response.error).length, 1,
  'exactly one opposing reparent commits')
assert.deepEqual(reparentResponses.filter(response => response.error).map(response => response.error.code), ['23514'],
  'the serialized conflicting reparent observes and rejects the cycle')

const [concurrentARead, concurrentBRead] = await Promise.all([
  anonymous.rpc('query_publications', { p_id: concurrentA, p_limit: 1 }),
  anonymous.rpc('query_publications', { p_id: concurrentB, p_limit: 1 }),
])
assert.ifError(concurrentARead.error)
assert.ifError(concurrentBRead.error)
const concurrentRows = [concurrentARead.data[0], concurrentBRead.data[0]]
assert.equal(concurrentRows.filter(row => row.parent_id !== null).length, 1,
  'the final canonical rows contain exactly one parent relationship')
const concurrentParent = concurrentRows.find(row => row.parent_id === null)
const concurrentChild = concurrentRows.find(row => row.parent_id !== null)
assert.equal(concurrentChild.parent_id, concurrentParent.id,
  'the committed reparent points to the remaining root without a cycle')

assert.ifError((await owner.rpc('publish_nota', {
  p_id: concurrentParent.id, p_title: concurrentParent.title, p_content: concurrentParent.content,
  p_author_name: concurrentParent.author_name, p_is_sub_page: false, p_parent_id: null,
  p_citations: concurrentParent.published_nota_citations, p_tags: concurrentParent.tags,
  p_child_ids: [concurrentChild.id],
})).error)
const canonicalEdges = await owner.from('published_nota_edges')
  .select('parent_id,child_id,ordinal').in('parent_id', [concurrentA, concurrentB])
assert.ifError(canonicalEdges.error)
assert.deepEqual(canonicalEdges.data, [{ parent_id: concurrentParent.id, child_id: concurrentChild.id, ordinal: 0 }],
  'the final ordered edge projection matches the acyclic canonical parent relationship')
const publicRead = await anonymous.rpc('query_publications', { p_id: notaId, p_limit: 1 })
assert.ifError(publicRead.error)
assert.equal(publicRead.data?.[0]?.title, 'Browser publication')
assert.deepEqual(publicRead.data?.[0]?.published_nota_citations.map(value => value.id), ['ordered-b', 'ordered-a'])

const attacker = make()
const attackerSignup = await attacker.auth.signUp({ email: `attacker-${suffix}@example.test`, password })
assert.ifError(attackerSignup.error)
const hijack = await attacker.rpc('publish_nota', {
  p_id: notaId, p_title: 'Hijacked', p_content: {}, p_author_name: 'Attacker',
  p_is_sub_page: false, p_parent_id: null, p_citations: [], p_tags: [], p_child_ids: [],
})
assert.equal(hijack.error?.code, '42501', 'another browser identity cannot overwrite the owner')
const forged = await attacker.from('published_notas').update({ view_count: 999 }).eq('id', notaId)
assert.ok(forged.error, 'browser roles cannot forge statistic deltas')

const longReferrer = `${'a'.repeat(80)}.deep.analytics.example.com`
for (const client of [anonymous, anonymous, owner]) {
  const viewed = await client.rpc('record_nota_view', { p_nota_id: notaId, p_referrer_key: longReferrer })
  assert.ifError(viewed.error)
}
const afterViews = await anonymous.rpc('query_publications', { p_id: notaId, p_limit: 1 })
assert.ifError(afterViews.error)
assert.equal(afterViews.data?.[0]?.view_count, 3, 'each explicit view increments exactly once')
assert.equal(afterViews.data?.[0]?.unique_viewers, 1, 'repeat anonymous views create no forged unique markers')

const deniedDelete = await attacker.rpc('unpublish_nota', { p_id: notaId })
assert.equal(deniedDelete.error?.code, 'P0002')
assert.ifError((await owner.rpc('publish_nota', {
  p_id: notaId, p_title: 'Browser publication without edge', p_content: { type: 'doc' },
  p_author_name: 'Browser Publisher', p_is_sub_page: false, p_parent_id: null,
  p_citations: [], p_tags: [], p_child_ids: [],
})).error)
assert.ifError((await owner.rpc('unpublish_nota', { p_id: notaId })).error)
const afterDelete = await anonymous.rpc('query_publications', { p_id: notaId, p_limit: 1 })
assert.ifError(afterDelete.error)
assert.equal(afterDelete.data?.length, 0, 'unpublish immediately removes the public read')
const childAfterDelete = await anonymous.rpc('query_publications', { p_id: childId, p_limit: 1 })
assert.ifError(childAfterDelete.error)
assert.equal(childAfterDelete.data?.length, 0, 'canonical child cannot survive omitted-edge root unpublish')

console.log('Local browser-key publication integration passed (no service-role credential used).')
