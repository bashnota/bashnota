import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url=process.env.SUPABASE_URL??'http://127.0.0.1:54321'
const key=process.env.SUPABASE_PUBLISHABLE_KEY??'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const make=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const withToken=token=>createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}})
const suffix=randomUUID().replaceAll('-','').slice(0,12)
const password=`Community-${suffix}!`
async function signup(label){
  const client=make();const result=await client.auth.signUp({email:`${label}-${suffix}@example.test`,password,options:{data:{display_name:label}}})
  assert.ifError(result.error);assert.ok(result.data.session);return{client,session:result.data.session}
}
const owner=await signup('Owner'),commenter=await signup('Commenter'),other=await signup('Other')
const notaId=`community-${suffix}`
assert.ifError((await owner.client.rpc('publish_nota',{p_id:notaId,p_title:'Community',p_content:{type:'doc'},p_author_name:'Owner',
  p_is_sub_page:false,p_parent_id:null,p_citations:[],p_tags:[],p_child_ids:[]})).error)

const anonymous=make()
const empty=await anonymous.rpc('query_comments',{p_nota_id:notaId,p_parent_id:null,p_limit:20})
assert.ifError(empty.error);assert.deepEqual(empty.data,[])
const anonCreate=await anonymous.rpc('create_comment',{p_id:'anon',p_nota_id:notaId,p_content:'no',p_author_name:'Anon',p_parent_id:null})
assert.equal(anonCreate.error?.code,'42501')

const rootId=`${notaId}-root`
const created=await commenter.client.rpc('create_comment',{p_id:rootId,p_nota_id:notaId,p_content:'Root',p_author_name:'Spoofed',p_parent_id:null})
assert.ifError(created.error);assert.equal(created.data?.[0]?.author_name,'Commenter','database derives auth metadata')
assert.equal(created.data?.[0]?.can_delete,true)
const authorRead=await commenter.client.rpc('query_comments',{p_nota_id:notaId,p_parent_id:null,p_limit:20})
assert.ifError(authorRead.error);assert.deepEqual([authorRead.data[0].is_owner,authorRead.data[0].can_delete],[true,true])
const unrelatedRead=await other.client.rpc('query_comments',{p_nota_id:notaId,p_parent_id:null,p_limit:20})
assert.ifError(unrelatedRead.error);assert.deepEqual([unrelatedRead.data[0].is_owner,unrelatedRead.data[0].can_delete],[false,false])
const moderatorRead=await owner.client.rpc('query_comments',{p_nota_id:notaId,p_parent_id:null,p_limit:20})
assert.ifError(moderatorRead.error);assert.deepEqual([moderatorRead.data[0].is_owner,moderatorRead.data[0].can_delete],[false,true])
const replyId=`${notaId}-reply`
assert.ifError((await other.client.rpc('create_comment',{p_id:replyId,p_nota_id:notaId,p_content:'Reply',p_author_name:'Other',p_parent_id:rootId})).error)
const nestedId=`${notaId}-nested`
assert.ifError((await commenter.client.rpc('create_comment',{p_id:nestedId,p_nota_id:notaId,p_content:'Nested',p_author_name:'Commenter',p_parent_id:replyId})).error)
const topLevelCount=await anonymous.rpc('count_comments',{p_nota_id:notaId,p_parent_id:null})
assert.ifError(topLevelCount.error);assert.equal(topLevelCount.data,1,'thread total counts only top-level comments')
const rootReplyCount=await anonymous.rpc('count_comments',{p_nota_id:notaId,p_parent_id:rootId})
assert.ifError(rootReplyCount.error);assert.equal(rootReplyCount.data,1,'reply total is scoped to its direct parent')

const otherEdit=await other.client.rpc('edit_comment',{p_id:rootId,p_content:'Hijack'})
assert.equal(otherEdit.error?.code,'42501')
const edited=await commenter.client.rpc('edit_comment',{p_id:rootId,p_content:'Edited'})
assert.ifError(edited.error);assert.equal(edited.data?.[0]?.content,'Edited')
const directEdit=await commenter.client.from('comments').update({content:'bypass'}).eq('id',rootId)
assert.ok(directEdit.error,'direct browser comment writes stay revoked')

const like=await commenter.client.rpc('toggle_comment_vote',{p_comment_id:rootId,p_vote:'like'})
assert.ifError(like.error);assert.deepEqual(like.data,{like_count:1,dislike_count:0,user_vote:'like'})
const dislike=await commenter.client.rpc('toggle_comment_vote',{p_comment_id:rootId,p_vote:'dislike'})
assert.ifError(dislike.error);assert.deepEqual(dislike.data,{like_count:0,dislike_count:1,user_vote:'dislike'})
const removed=await commenter.client.rpc('toggle_comment_vote',{p_comment_id:rootId,p_vote:'dislike'})
assert.ifError(removed.error);assert.deepEqual(removed.data,{like_count:0,dislike_count:0,user_vote:null})
const notaLike=await commenter.client.rpc('toggle_nota_vote',{p_nota_id:notaId,p_vote:'like'})
assert.ifError(notaLike.error);assert.equal(notaLike.data.like_count,1)
const hydratedNotaVote=await commenter.client.rpc('get_nota_vote',{p_nota_id:notaId})
assert.ifError(hydratedNotaVote.error);assert.equal(hydratedNotaVote.data,'like')
const notaRemoved=await commenter.client.rpc('toggle_nota_vote',{p_nota_id:notaId,p_vote:'like'})
assert.ifError(notaRemoved.error);assert.equal(notaRemoved.data.like_count,0)
const clearedNotaVote=await commenter.client.rpc('get_nota_vote',{p_nota_id:notaId})
assert.ifError(clearedNotaVote.error);assert.equal(clearedNotaVote.data,null)

// Same bearer, two independent HTTP clients, one immutable ID. The actor-row
// lock serializes the duplicate race and exactly one request can create it.
const duplicateId=`${notaId}-duplicate`
const peers=[withToken(commenter.session.access_token),withToken(commenter.session.access_token)]
const duplicateRace=await Promise.allSettled(peers.map(client=>client.rpc('create_comment',{
  p_id:duplicateId,p_nota_id:notaId,p_content:'Duplicate',p_author_name:'Commenter',p_parent_id:null,
})))
assert.ok(duplicateRace.every(result=>result.status==='fulfilled'))
const duplicateResults=duplicateRace.map(result=>result.value)
assert.equal(duplicateResults.filter(result=>!result.error).length,1)
assert.deepEqual(duplicateResults.filter(result=>result.error).map(result=>result.error.code),['23505'])

// Two identical concurrent toggles serialize to create then remove, never two
// rows or a forged counter delta.
const voteRace=await Promise.allSettled(peers.map(client=>client.rpc('toggle_comment_vote',{p_comment_id:duplicateId,p_vote:'like'})))
assert.ok(voteRace.every(result=>result.status==='fulfilled'&&!result.value.error))
const duplicateRead=await anonymous.rpc('query_comments',{p_nota_id:notaId,p_parent_id:null,p_limit:20})
assert.ifError(duplicateRead.error)
const duplicateRow=duplicateRead.data.find(row=>row.id===duplicateId)
assert.deepEqual([duplicateRow.like_count,duplicateRow.dislike_count],[0,0])

const newsletterRace=await Promise.allSettled(peers.map(client=>client.rpc('upsert_newsletter_subscription',{
  p_email:`COMMENTER-${suffix}@EXAMPLE.TEST`,p_display_name:'Commenter',
})))
assert.ok(newsletterRace.every(result=>result.status==='fulfilled'&&!result.value.error))
const subscriptionBefore=await commenter.client.from('newsletter_subscriptions').select('email,display_name,subscribed_at')
assert.ifError(subscriptionBefore.error);assert.equal(subscriptionBefore.data.length,1)
assert.equal(subscriptionBefore.data[0].email,`commenter-${suffix}@example.test`)
const mismatchedEmail=await commenter.client.rpc('upsert_newsletter_subscription',{p_email:'attacker@example.test',p_display_name:'Hijacked'})
assert.equal(mismatchedEmail.error?.code,'22023')
const subscriptionAfterMismatch=await commenter.client.from('newsletter_subscriptions').select('email,display_name,subscribed_at')
assert.ifError(subscriptionAfterMismatch.error);assert.deepEqual(subscriptionAfterMismatch.data,subscriptionBefore.data,'mismatch leaves subscription unchanged')
assert.ifError((await commenter.client.rpc('upsert_newsletter_subscription',{p_email:`commenter-${suffix}@example.test`,p_display_name:'Renamed'})).error)
const subscriptionAfter=await commenter.client.from('newsletter_subscriptions').select('email,display_name,subscribed_at')
assert.ifError(subscriptionAfter.error);assert.equal(subscriptionAfter.data.length,1)
assert.equal(subscriptionAfter.data[0].display_name,'Renamed')
assert.equal(subscriptionAfter.data[0].subscribed_at,subscriptionBefore.data[0].subscribed_at)

const otherDelete=await other.client.rpc('delete_comment',{p_id:rootId})
assert.equal(otherDelete.error?.code,'42501')
assert.ifError((await owner.client.rpc('delete_comment',{p_id:rootId})).error)
const afterModeration=await anonymous.rpc('query_comments',{p_nota_id:notaId,p_parent_id:null,p_limit:20})
assert.ifError(afterModeration.error)
assert.ok(!afterModeration.data.some(row=>[rootId,replyId,nestedId].includes(row.id)),'hard moderation removes the nested subtree')
const publicNota=await anonymous.rpc('query_publications',{p_id:notaId,p_limit:1})
assert.ifError(publicNota.error);assert.equal(publicNota.data[0].comment_count,1,'only the separately raced duplicate remains')

assert.ifError((await commenter.client.rpc('unsubscribe_newsletter')).error)
assert.ifError((await commenter.client.rpc('unsubscribe_newsletter')).error)
const subscriptionGone=await commenter.client.from('newsletter_subscriptions').select('user_id')
assert.ifError(subscriptionGone.error);assert.equal(subscriptionGone.data.length,0)

console.log('Local browser-key community concurrency integration passed (no service-role credential used).')
