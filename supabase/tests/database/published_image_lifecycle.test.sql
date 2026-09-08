begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('61000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','image-owner@example.test','',now(),'{}','{}',now(),now()),
 ('62000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','image-attacker@example.test','',now(),'{}','{}',now(),now());
insert into public.identity_map(firebase_uid,supabase_user_id,source_hash) values
 ('image-owner','61000000-0000-0000-0000-000000000001','image-owner'),
 ('image-attacker','62000000-0000-0000-0000-000000000002','image-attacker');
insert into public.profiles(user_id,user_tag,photo_url) values
 ('61000000-0000-0000-0000-000000000001','image_owner',''),
 ('62000000-0000-0000-0000-000000000002','image_attacker','');
insert into public.published_image_assets(path,owner_id,mime_type,byte_size,width,height,created_at) values
 ('61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000001.png','61000000-0000-0000-0000-000000000001','image/png',68,1,1,now()-interval '2 hours'),
 ('61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000002.png','61000000-0000-0000-0000-000000000001','image/png',68,1,1,now()-interval '2 hours'),
 ('61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000003.png','61000000-0000-0000-0000-000000000001','image/png',68,1,1,now()),
 ('62000000-0000-0000-0000-000000000002/72000000-0000-0000-0000-000000000001.png','62000000-0000-0000-0000-000000000002','image/png',68,1,1,now()-interval '2 hours');

set local role authenticated;
select set_config('request.jwt.claim.sub','61000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select throws_ok($$ insert into storage.objects(bucket_id,name,metadata) values ('published-images','61000000-0000-0000-0000-000000000001/direct.png','{"mimetype":"image/png"}') $$,
  '42501',null,'publishable-key callers cannot bypass validation with direct Storage inserts');
select lives_ok($$ select public.publish_nota('image-root','Images',
  '{"type":"doc","content":[{"attrs":{"src":"http://127.0.0.1:54321/storage/v1/object/public/published-images/61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000001.png"}}]}',
  'Owner',false,null,'[]','{}','{}') $$,'validated owned image can be published');
reset role;
select is((select count(*) from public.published_image_references where nota_id='image-root'),1::bigint,
  'publication trigger records the live reference');
reset role;
select results_eq(
  $$ select claimed_path from public.claim_unreferenced_published_images(
    '61000000-0000-0000-0000-000000000001',
    array[
      '61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000001.png',
      '61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000002.png'
    ]) $$,
  $$ values ('61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000002.png'::text) $$,
  'a mixed claim preserves the referenced asset and claims the unreferenced subset');
select isnt((select deleting_at from public.published_image_assets where path like '%000000000002.png'),null::timestamptz,
  'the removable subset is durably marked for deletion');
select is((select deleting_at from public.published_image_assets where path like '%000000000001.png' and owner_id='61000000-0000-0000-0000-000000000001'),null::timestamptz,
  'the referenced asset remains available');
select results_eq(
  $$ select claimed_path from public.claim_unreferenced_published_images(
    '61000000-0000-0000-0000-000000000001',
    array['61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000003.png']) $$,
  $$ values ('61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000003.png'::text) $$,
  'an unreferenced asset receives a deletion lease');
select is((select count(*) from public.claim_unreferenced_published_images(
    '61000000-0000-0000-0000-000000000001',
    array['61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000003.png'])),0::bigint,
  'an active deletion lease cannot be claimed twice');
update public.published_image_assets set deleting_at=now()-interval '16 minutes'
where path='61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000003.png';
select results_eq(
  $$ select claimed_path from public.claim_unreferenced_published_images(
    '61000000-0000-0000-0000-000000000001',
    array['61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000003.png']) $$,
  $$ values ('61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000003.png'::text) $$,
  'an interrupted stale lease is atomically reclaimed while still unreferenced');
select ok((select deleting_at > now()-interval '1 minute' from public.published_image_assets
  where path like '%000000000003.png'),'stale reclaim renews the bounded deletion lease');
select throws_ok($$ update public.published_notas set content='{"type":"doc","content":[{"attrs":{"src":"http://localhost/storage/v1/object/public/published-images/61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000002.png"}}]}' where id='image-root' $$,
  '42501',null,'publication cannot acquire an asset after it is claimed for deletion');
set local role authenticated;
select throws_ok($$ select public.publish_nota('foreign-image','Foreign',
  '{"type":"doc","content":[{"attrs":{"src":"http://localhost/storage/v1/object/public/published-images/62000000-0000-0000-0000-000000000002/72000000-0000-0000-0000-000000000001.png"}}]}',
  'Owner',false,null,'[]','{}','{}') $$,'42501',null,'publication rejects a foreign owned image');
select throws_ok($$ select public.publish_nota('unregistered-image','Unknown',
  '{"type":"doc","content":[{"attrs":{"src":"http://localhost/storage/v1/object/public/published-images/61000000-0000-0000-0000-000000000001/79999999-0000-0000-0000-000000000999.png"}}]}',
  'Owner',false,null,'[]','{}','{}') $$,'42501',null,'publication rejects an unregistered image path');
reset role;
select is((select count(*) from public.published_notas where id in ('foreign-image','unregistered-image')),0::bigint,
  'failed reference validation rolls publication rows back');
set local role authenticated;
select results_eq($$ select unnest(public.unpublish_nota('image-root')) $$,
  $$ values ('61000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000001.png'::text) $$,
  'unpublish returns only assets released by the deleted nota tree');
reset role;
select is((select count(*) from public.published_image_references where nota_id='image-root'),0::bigint,
  'nota deletion cascades its image references');
select is((select count(*) from public.published_image_assets),4::bigint,
  'database publication deletion never removes storage asset metadata directly');
select is((select count(*) from public.published_image_assets where owner_id='61000000-0000-0000-0000-000000000001'),3::bigint,
  'owned referenced and staged assets remain distinguishable for the server cleanup boundary');
select is((select count(*) from public.published_image_assets where owner_id='62000000-0000-0000-0000-000000000002'),1::bigint,
  'another owner assets remain preserved');
set local role authenticated;
select throws_ok($$ delete from public.published_image_assets $$,'42501',null,
  'browser callers cannot delete registry rows or bypass reference checks');
reset role;

select * from finish();
rollback;
