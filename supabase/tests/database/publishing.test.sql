begin;
create extension if not exists pgtap with schema extensions;
select plan(56);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('51000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','publisher@example.test','',now(),'{}','{}',now(),now()),
 ('52000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','attacker@example.test','',now(),'{}','{}',now(),now());
insert into public.identity_map(firebase_uid,supabase_user_id,source_hash) values
 ('firebase-publisher','51000000-0000-0000-0000-000000000001','publisher'),
 ('firebase-attacker','52000000-0000-0000-0000-000000000002','attacker');
insert into public.profiles(user_id,user_tag,photo_url) values
 ('51000000-0000-0000-0000-000000000001','Alice',''),
 ('52000000-0000-0000-0000-000000000002','alice','');

-- Model historical corruption that predates the guarded RPC. A proposed
-- attachment beneath this loop must fail promptly instead of recursing forever.
insert into public.published_notas(id,author_id,legacy_author_uid,title,content,author_name,is_public,is_sub_page,published_at,updated_at)
values
 ('corrupt-a','51000000-0000-0000-0000-000000000001','firebase-publisher','Corrupt A','{}','Publisher',false,true,now(),now()),
 ('corrupt-b','51000000-0000-0000-0000-000000000001','firebase-publisher','Corrupt B','{}','Publisher',false,true,now(),now());
update public.published_notas set parent_id = 'corrupt-b' where id = 'corrupt-a';
update public.published_notas set parent_id = 'corrupt-a' where id = 'corrupt-b';

set local role authenticated;
select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select lives_ok($$
  select * from public.publish_nota_hierarchy($hierarchy$[
    {"id":"atomic-root","title":"Atomic Root","content":{"type":"doc"},"author_name":"Publisher","is_sub_page":false,"parent_id":null,"citations":[],"tags":[],"child_ids":["atomic-child-b","atomic-child-a"]},
    {"id":"atomic-child-b","title":"Atomic Child B","content":{"type":"doc"},"author_name":"Publisher","is_sub_page":true,"parent_id":"atomic-root","citations":[],"tags":[],"child_ids":["atomic-grandchild"]},
    {"id":"atomic-grandchild","title":"Atomic Grandchild","content":{"type":"doc"},"author_name":"Publisher","is_sub_page":true,"parent_id":"atomic-child-b","citations":[],"tags":[],"child_ids":[]},
    {"id":"atomic-child-a","title":"Atomic Child A","content":{"type":"doc"},"author_name":"Publisher","is_sub_page":true,"parent_id":"atomic-root","citations":[],"tags":[],"child_ids":[]}
  ]$hierarchy$::jsonb)
$$, 'one RPC publishes a first-time multilevel hierarchy');
select is((select count(*) from public.published_notas where id like 'atomic-%'),4::bigint,
  'atomic hierarchy creates every canonical publication');
select results_eq($$
  select parent_id,child_id,ordinal from public.published_nota_edges
  where parent_id like 'atomic-%' order by parent_id,ordinal
$$, $$ values
  ('atomic-child-b'::text,'atomic-grandchild'::text,0),
  ('atomic-root'::text,'atomic-child-b'::text,0),
  ('atomic-root'::text,'atomic-child-a'::text,1)
$$, 'atomic hierarchy preserves ordered direct edges at every level');
select lives_ok($$
  select * from public.publish_nota_hierarchy($hierarchy$[
    {"id":"atomic-child-b","title":"Atomic Child B v2","content":{"type":"doc","v":2},"author_name":"Publisher","is_sub_page":true,"parent_id":"atomic-root","citations":[],"tags":[],"child_ids":["atomic-grandchild"]}
  ]$hierarchy$::jsonb)
$$, 'publishing an existing sub-hierarchy succeeds');
select results_eq($$
  select child_id,ordinal from public.published_nota_edges
  where parent_id='atomic-root' order by ordinal
$$, $$ values ('atomic-child-b'::text,0),('atomic-child-a'::text,1) $$,
  'sub-hierarchy publish preserves its external parent ordering');
select throws_ok($$
  select * from public.publish_nota_hierarchy($hierarchy$[
    {"id":"atomic-null-content","title":"Missing Content","author_name":"Publisher","is_sub_page":false,"parent_id":null,"citations":[],"tags":[],"child_ids":[]}
  ]$hierarchy$::jsonb)
$$, '22023', null, 'hierarchy rejects a missing content object');
select is((select count(*) from public.published_notas where id='atomic-null-content'),0::bigint,
  'missing content rejection creates no publication');
select throws_ok($$
  select * from public.publish_nota_hierarchy($hierarchy$[
    {"id":"atomic-root","title":"Must Roll Back","content":{"type":"doc","changed":true},"author_name":"Publisher","is_sub_page":false,"parent_id":null,"citations":[],"tags":[],"child_ids":["atomic-failing-child"]},
    {"id":"atomic-failing-child","title":"","content":{"type":"doc"},"author_name":"Publisher","is_sub_page":true,"parent_id":"atomic-root","citations":[],"tags":[],"child_ids":[]}
  ]$hierarchy$::jsonb)
$$, '22023', null, 'one invalid descendant rejects the complete hierarchy before mutation');
select is((select title from public.published_notas where id='atomic-root'),'Atomic Root',
  'failed hierarchy leaves the existing root unchanged');
select is((select count(*) from public.published_notas where id='atomic-failing-child'),0::bigint,
  'failed hierarchy leaves no partial descendant');
select lives_ok($$ select public.publish_nota('root','Root','{"type":"doc"}','Publisher',false,null,'[{"id":"b"},{"id":"a"}]','{public}', '{}') $$,
 'owner can publish a root through the identity-deriving RPC');
select lives_ok($$ select public.publish_nota('child-b','Child B','{"type":"doc"}','Publisher',true,'root','[]','{}','{}') $$,
 'owner can publish a canonical child');
select lives_ok($$ select public.publish_nota('child-a','Child A','{"type":"doc"}','Publisher',true,'root','[]','{}','{}') $$,
 'owner can publish another canonical child');
select lives_ok($$ select public.publish_nota('root','Root v2','{"type":"doc","v":2}','Publisher',false,null,'[{"id":"b"},{"id":"a"}]','{public}','{child-b,child-a}') $$,
 'owner update replaces ordered child edges atomically');
select lives_ok($$ select public.publish_nota('same-owner-root','Not a child','{"type":"doc"}','Publisher',false,null,'[]','{}','{}') $$,
 'owner can publish a second root used by hierarchy adversarial tests');
select set_config('request.jwt.claim.sub','52000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select lives_ok($$ select public.publish_nota('attacker-root','Other owner','{"type":"doc"}','Attacker',false,null,'[]','{}','{}') $$,
 'second case-distinct tag owner can publish');
select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select results_eq($$ select child_id,ordinal from public.published_nota_edges where parent_id='root' order by ordinal $$,
 $$ values ('child-b'::text,0),('child-a'::text,1) $$, 'child order is preserved');
select lives_ok($$ select public.publish_nota('child-a','Moved child','{"type":"doc"}','Publisher',true,'same-owner-root','[]','{}','{}') $$,
 'child reparent is accepted only through the atomic RPC');
select is((select count(*) from public.published_nota_edges where child_id='child-a'),0::bigint,
 'child reparent removes the stale old-parent edge atomically');
select lives_ok($$ select public.publish_nota('child-a','Child A','{"type":"doc"}','Publisher',true,'root','[]','{}','{}') $$,
 'child can move back to its canonical parent');
select lives_ok($$ select public.publish_nota('root','Root v3','{"type":"doc"}','Publisher',false,null,'[{"id":"b"},{"id":"a"}]','{public}','{child-b,child-a}') $$,
 'parent republish restores the explicit ordered projection');
select throws_ok($$ select public.publish_nota('root','Self cycle','{}','Publisher',true,'root','[]','{}','{}') $$,
 '23514',null,'RPC rejects a publication as its own parent before mutation');
select results_eq($$ select title,parent_id,is_sub_page from public.published_notas where id='root' $$,
 $$ values ('Root v3'::text,null::text,false) $$,'self-parent denial leaves the publication row unchanged');
select results_eq($$ select child_id,ordinal from public.published_nota_edges where parent_id='root' order by ordinal $$,
 $$ values ('child-b'::text,0),('child-a'::text,1) $$,'self-parent denial leaves ordered edges unchanged');
select throws_ok($$ select public.publish_nota('root','Ancestor cycle','{}','Publisher',true,'child-a','[]','{}','{}') $$,
 '23514',null,'RPC rejects moving an ancestor beneath its descendant');
select results_eq($$ select title,parent_id,is_sub_page from public.published_notas where id='root' $$,
 $$ values ('Root v3'::text,null::text,false) $$,'ancestor-cycle denial leaves the publication row unchanged');
select results_eq($$ select child_id,ordinal from public.published_nota_edges where parent_id='root' order by ordinal $$,
 $$ values ('child-b'::text,0),('child-a'::text,1) $$,'ancestor-cycle denial leaves ordered edges unchanged');
select throws_ok($$ select public.publish_nota('root','Corrupt ancestor loop','{}','Publisher',true,'corrupt-a','[]','{}','{}') $$,
 '23514',null,'cycle-safe traversal rejects an already-corrupt ancestor loop');
reset role;
select is((select author_id from public.published_notas where id='root'),'51000000-0000-0000-0000-000000000001'::uuid,
 'publication owner is derived from auth.uid');
select is((select legacy_author_uid from public.published_notas where id='root'),'firebase-publisher',
 'legacy linkage is server-derived when reconciliation exists');

reset role; set local role anon;
select set_config('request.jwt.claim.sub','',true); select set_config('request.jwt.claims','{}',true);
select results_eq($$ select id,author_tag from public.query_publications(p_id=>'root') $$,
 $$ values ('root'::text,'Alice'::text) $$, 'anonymous ID lookup returns the safe public author tag');
select results_eq($$ select id from public.query_publications(p_author_tag=>'Alice') order by id $$,
 $$ values ('atomic-root'::text),('root'::text),('same-owner-root'::text) $$, 'public tag lookup uses exact C-collation identity');
select results_eq($$ select id from public.query_publications(p_author_tag=>'alice') $$,
 $$ values ('attacker-root'::text) $$, 'case-distinct lower-case tag resolves only its owner');
select is((select count(*) from public.query_publications(p_author_tag=>'ALICE')),0::bigint,
 'a differently-cased tag does not alias either owner');
select results_eq($$ select unnest(published_sub_pages) from public.query_publications(p_id=>'root') $$,
 $$ values ('child-b'::text),('child-a'::text) $$, 'public query returns ordered child IDs');
select results_eq($$ select value->>'id' from public.query_publications(p_id=>'root') p cross join lateral jsonb_array_elements(p.published_nota_citations) value $$,
 $$ values ('b'::text),('a'::text) $$, 'citation JSON order survives publish and read');
select lives_ok($$ select public.record_nota_view('root', repeat('a',80)||'.deep.analytics.example.com') $$,
 'long dotted referrer keys are accepted');
select throws_ok($$ select public.record_nota_view('root','https://evil.test/path') $$,'22023',null,
 'raw URL/path referrers are rejected by the database boundary');

reset role; set local role authenticated;
select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select lives_ok($$ select public.record_nota_view('root','reader.example.com') $$,'authenticated view succeeds');
select lives_ok($$ select public.record_nota_view('root','reader.example.com') $$,'refresh records only when explicitly requested');

reset role;
select results_eq($$ select view_count,unique_viewers from public.published_notas where id='root' $$,
 $$ values (3::bigint,1::bigint) $$,'three exact events create three total and one authenticated unique view');
select is((select count(*) from public.nota_view_events where nota_id='root'),3::bigint,'event count exactly matches accepted calls');
select is((select count(*) from public.nota_viewers where nota_id='root'),1::bigint,'unique marker is coupled to authenticated identity');
select results_eq($$ select bucket_kind,view_count from public.nota_view_aggregates where nota_id='root' and bucket_kind in ('daily','weekly','monthly') order by bucket_kind $$,
 $$ values ('daily'::text,3::bigint),('monthly'::text,3::bigint),('weekly'::text,3::bigint) $$,
 'daily weekly and monthly aggregates exactly match events');

set local role authenticated;
select set_config('request.jwt.claim.sub','52000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select throws_ok($$ select public.publish_nota('root','Hijack','{}','Attacker',false,null,'[]','{}','{}') $$,'42501',null,
 'another user cannot change immutable publication ownership');
select throws_ok($$ update public.published_notas set view_count=999 where id='root' $$,'42501',null,
 'browser callers cannot forge counter deltas');
select throws_ok($$ select public.unpublish_nota('root') $$,'P0002',null,'another user cannot unpublish the owner publication');

select set_config('request.jwt.claim.sub','51000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select throws_ok($$ delete from public.published_nota_edges where parent_id='root' $$,'42501',null,
 'browser roles cannot delete derived hierarchy edges directly');
select throws_ok($$ select public.publish_nota('root','Invalid hierarchy','{}','Publisher',false,null,'[]','{}','{same-owner-root}') $$,
 '23514',null,'RPC rejects a same-owner root masquerading as a child');
select throws_ok($$ select public.publish_nota('root','Foreign hierarchy','{}','Publisher',false,null,'[]','{}','{attacker-root}') $$,
 '23514',null,'RPC rejects a foreign-owner hierarchy child');
select lives_ok($$ select public.publish_nota('root','Root without projected edges','{"type":"doc"}','Publisher',false,null,'[]','{}','{}') $$,
 'republishing may omit derived edges without changing canonical child parentage');
select is((select count(*) from public.published_nota_edges where parent_id='root'),0::bigint,
 'omitted edge projection is removed atomically');
select is((select count(*) from public.public_published_notas where parent_id='root'),2::bigint,
 'canonical children remain public until their root is unpublished');
select lives_ok($$ select public.unpublish_nota('root') $$,'owner can atomically unpublish the tree');
reset role;
select is((select count(*) from public.published_notas where id in ('root','child-a','child-b')),0::bigint,
 'unpublish removes root and ordered descendants');
select is((select count(*) from public.nota_view_events where nota_id='root'),0::bigint,
 'unpublish cascades server-controlled viewer events');

select * from finish();
rollback;
