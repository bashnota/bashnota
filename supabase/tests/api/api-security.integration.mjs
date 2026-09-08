import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url=process.env.SUPABASE_URL??'http://127.0.0.1:54321'
const key=process.env.SUPABASE_PUBLISHABLE_KEY??'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const rest=`${url}/rest/v1/rpc`
const post=(route,body,headers={})=>fetch(`${rest}/${route}`,{
  method:'POST',
  headers:{apikey:key,'content-type':'application/json',...headers},
  body:JSON.stringify(body),
})

const anonymous=await post('query_publications',{p_limit:1},{'x-forwarded-for':'192.0.2.40'})
assert.equal(anonymous.status,200,'anonymous bounded reads remain available')
assert.equal(anonymous.headers.get('x-content-type-options'),'nosniff')
assert.equal(anonymous.headers.get('x-frame-options'),'DENY')
assert.match(anonymous.headers.get('content-security-policy')??'',/frame-ancestors 'none'/)

const credentialSentinel='must-not-appear-in-errors'
const malformed=await post('query_publications',{p_limit:1},{
  authorization:`Basic ${credentialSentinel}`,
  'x-forwarded-for':'192.0.2.41',
})
assert.ok(malformed.status>=400)
assert.doesNotMatch(await malformed.text(),new RegExp(credentialSentinel),
  'authentication failures never reflect credential material')

const invalidLimit=await post('query_publications',{p_limit:101},{'x-forwarded-for':'192.0.2.42'})
assert.equal(invalidLimit.status,400)
assert.equal((await invalidLimit.json()).code,'22023')

const suffix=randomUUID().replaceAll('-','').slice(0,12)
const password=`Api-${suffix}!`
async function signup(label){
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  const result=await client.auth.signUp({
    email:`api-${label}-${suffix}@example.test`,password,options:{data:{display_name:label}},
  })
  assert.ifError(result.error);assert.ok(result.data.session);return client
}
const owner=await signup('owner')
const other=await signup('other')
const notaId=`api-security-${suffix}`
const published=await owner.rpc('publish_nota',{
  p_id:notaId,p_title:'Security boundary',p_content:{type:'doc'},p_author_name:'Owner',
  p_is_sub_page:false,p_parent_id:null,p_citations:[],p_tags:[],p_child_ids:[],
})
assert.ifError(published.error)
const wrongUser=await other.rpc('unpublish_nota',{p_id:notaId})
assert.ok(wrongUser.error,'another authenticated account cannot mutate the owner publication')
assert.ifError((await owner.rpc('unpublish_nota',{p_id:notaId})).error)

const rateResponses=[]
for(let index=0;index<31;index+=1){
  rateResponses.push(await post('query_comments',{
    p_nota_id:'rate-limit-target',p_parent_id:null,p_limit:1,
  },{
    // Kong must overwrite X-Real-IP with this connection's peer and must not
    // let a rotated X-Forwarded-For prefix create a new anonymous quota.
    'x-forwarded-for':`192.0.2.${index+1}`,
    'x-real-ip':`198.51.100.${index+1}`,
  }))
}
const firstDenied=rateResponses.findIndex(response=>response.status===429)
assert.ok(firstDenied>=0&&firstDenied<=30,
  'same-peer requests with poisoned forwarding headers exhaust one shared quota')
assert.ok(rateResponses.slice(0,firstDenied).every(response=>response.status===200))
assert.ok(rateResponses.slice(firstDenied).every(response=>response.status===429),
  'quota denial remains deterministic for the rest of the fixed window')
assert.equal(rateResponses[firstDenied].headers.get('x-ratelimit-remaining'),'0')
assert.ok(Number(rateResponses[firstDenied].headers.get('retry-after'))>0)

console.log('Local Data API security integration passed (no credential material logged or reflected).')
