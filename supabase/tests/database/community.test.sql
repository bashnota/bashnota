begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('61000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','nota-owner@example.test','',now(),'{}','{"display_name":"Nota Owner"}',now(),now()),
 ('62000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','commenter@example.test','',now(),'{}','{"display_name":"Commenter"}',now(),now()),
 ('63000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other@example.test','',now(),'{}','{"display_name":"Other"}',now(),now()),
 ('64000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','unverified@example.test','',null,'{}','{"display_name":"Unverified"}',now(),now());
insert into public.identity_map(firebase_uid,supabase_user_id,source_hash) values
 ('firebase-nota-owner','61000000-0000-0000-0000-000000000001','a'),
 ('firebase-commenter','62000000-0000-0000-0000-000000000002','b'),
 ('firebase-other','63000000-0000-0000-0000-000000000003','c');
insert into public.profiles(user_id,user_tag,photo_url) values
 ('61000000-0000-0000-0000-000000000001','NotaOwner',''),
 ('62000000-0000-0000-0000-000000000002','Commenter',''),
 ('63000000-0000-0000-0000-000000000003','Other','');

set local role authenticated;
select set_config('request.jwt.claim.sub','61000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select lives_ok($$ select public.publish_nota('community-nota','Community','{"type":"doc"}','Owner',false,null,'[]','{}','{}') $$,
  'nota owner can publish the eligible target');
select lives_ok($$ select public.publish_nota('other-nota','Other','{"type":"doc"}','Owner',false,null,'[]','{}','{}') $$,
  'second public target exists for parent validation');

reset role; set local role anon;
select set_config('request.jwt.claim.sub','',true); select set_config('request.jwt.claims','{}',true);
select is((select count(*) from public.query_comments('community-nota')),0::bigint,
  'anonymous readers can query an empty public thread');
select throws_ok($$ select public.create_comment('anon','community-nota','"no"','Anon',null) $$,
  '42501',null,'anonymous users cannot create comments');

reset role; set local role authenticated;
select set_config('request.jwt.claim.sub','62000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"62000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select lives_ok($$ select public.create_comment('root-comment','community-nota','"Root"','Spoofed',null) $$,
  'authenticated commenter creates a top-level comment');
select results_eq($$ select author_name,author_tag,is_owner,can_delete from public.query_comments('community-nota') $$,
  $$ values ('Commenter'::text,'Commenter'::text,true,true) $$,
  'server derives public author metadata and author delete capability');
select lives_ok($$ select public.create_comment('reply-comment','community-nota','"Reply"','Commenter','root-comment') $$,
  'commenter creates a reply');

select set_config('request.jwt.claim.sub','63000000-0000-0000-0000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"63000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
select lives_ok($$ select public.create_comment('nested-comment','community-nota','"Nested"','Other','reply-comment') $$,
  'nested replies are supported');
select is(public.count_comments('community-nota'),1::bigint,
  'authoritative thread count includes only top-level comments');
select is(public.count_comments('community-nota','root-comment'),1::bigint,
  'authoritative reply count includes only direct replies');
select is(public.count_comments('community-nota','reply-comment'),1::bigint,
  'authoritative nested reply count is scoped to its direct parent');
select throws_ok($$ select public.create_comment('cross-parent','other-nota','"Wrong"','Other','root-comment') $$,
  '23514',null,'reply parent must belong to the same nota');
select throws_ok($$ select public.create_comment('root-comment','community-nota','"Duplicate"','Other',null) $$,
  '23505',null,'comment IDs are immutable and duplicate-safe');
select throws_ok($$ select public.edit_comment('root-comment','"Hijack"') $$,
  '42501',null,'another user cannot edit a comment');
select throws_ok($$ select public.delete_comment('root-comment') $$,
  '42501',null,'another user cannot delete a comment');
select results_eq($$ select is_owner,can_delete from public.query_comments('community-nota') where id='root-comment' $$,
  $$ values (false,false) $$,'unrelated callers receive no author or moderator capability');

select set_config('request.jwt.claim.sub','62000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"62000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select lives_ok($$ select public.edit_comment('root-comment','"Edited"') $$,
  'comment author can edit content');
select is((select content from public.comments where id='root-comment'),'"Edited"'::jsonb,
  'edit preserves comment identity and changes only content');
select results_eq($$ select r.* from public.toggle_comment_vote('root-comment','like') r $$,
  $$ values (1::bigint,0::bigint,'like'::text) $$,'comment vote create increments exactly once');
select results_eq($$ select r.* from public.toggle_comment_vote('root-comment','dislike') r $$,
  $$ values (0::bigint,1::bigint,'dislike'::text) $$,'comment vote change moves the exact counter');
select results_eq($$ select r.* from public.toggle_comment_vote('root-comment','dislike') r $$,
  $$ values (0::bigint,0::bigint,null::text) $$,'repeating a comment vote removes it exactly once');
select results_eq($$ select r.* from public.toggle_nota_vote('community-nota','like') r $$,
  $$ values (1::bigint,0::bigint,'like'::text) $$,'nota vote create increments exactly once');
select is(public.get_nota_vote('community-nota'),'like'::text,
  'the authenticated reader recovers their persisted nota vote');
select results_eq($$ select r.* from public.toggle_nota_vote('community-nota','dislike') r $$,
  $$ values (0::bigint,1::bigint,'dislike'::text) $$,'nota vote change moves the exact counter');
select is(public.get_nota_vote('community-nota'),'dislike'::text,
  'the nota vote reader tracks vote changes');
select results_eq($$ select r.* from public.toggle_nota_vote('community-nota','dislike') r $$,
  $$ values (0::bigint,0::bigint,null::text) $$,'repeating a nota vote removes it exactly once');
select is(public.get_nota_vote('community-nota'),null::text,
  'the nota vote reader returns null after vote removal');
select throws_ok($$ insert into public.comment_votes(comment_id,user_id,vote)
  values('root-comment','62000000-0000-0000-0000-000000000002','like') $$,
  '42501',null,'direct browser vote writes are revoked');
select throws_ok($$ update public.comments set content='"bypass"' where id='root-comment' $$,
  '42501',null,'direct browser comment edits are revoked');

select lives_ok($$ select public.upsert_newsletter_subscription('  COMMENTER@EXAMPLE.TEST  ','Commenter') $$,
  'newsletter subscription accepts the authenticated user');
reset role;
create temporary table first_subscription as
  select email,display_name,subscribed_at from public.newsletter_subscriptions where user_id='62000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','62000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"62000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select throws_ok($$ select public.upsert_newsletter_subscription('attacker@example.test','Hijacked') $$,
  '22023',null,'newsletter rejects an email that differs from the verified account email');
reset role;
select results_eq($$ select email,display_name,subscribed_at from public.newsletter_subscriptions
  where user_id='62000000-0000-0000-0000-000000000002' $$,
  $$ select email,display_name,subscribed_at from first_subscription $$,
  'rejected newsletter mismatch leaves the existing subscription unchanged');
set local role authenticated;
select set_config('request.jwt.claim.sub','64000000-0000-0000-0000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"64000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
select throws_ok($$ select public.upsert_newsletter_subscription('unverified@example.test','Unverified') $$,
  '42501',null,'newsletter rejects an account without a verified email');
reset role;
select is((select count(*) from public.newsletter_subscriptions where user_id='64000000-0000-0000-0000-000000000004'),0::bigint,
  'unverified newsletter rejection creates no subscription');
set local role authenticated;
select set_config('request.jwt.claim.sub','62000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"62000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select lives_ok($$ select public.upsert_newsletter_subscription('commenter@example.test','Renamed') $$,
  'duplicate newsletter submission is an idempotent upsert');
reset role;
select is((select count(*) from public.newsletter_subscriptions where user_id='62000000-0000-0000-0000-000000000002'),1::bigint,
  'newsletter upsert retains one row per identity');
select results_eq($$ select email,display_name,subscribed_at from public.newsletter_subscriptions
  where user_id='62000000-0000-0000-0000-000000000002' $$,
  $$ select 'commenter@example.test'::text,'Renamed'::text,subscribed_at from first_subscription $$,
  'newsletter upsert normalizes email, updates display name, and preserves original timestamp');

select results_eq($$ select comment_count from public.published_notas where id='community-nota' $$,
  $$ values (3::bigint) $$,'nota comment count includes the nested subtree exactly');
select results_eq($$ select id,reply_count from public.comments where id in ('root-comment','reply-comment') order by id $$,
  $$ values ('reply-comment'::text,1::bigint),('root-comment'::text,1::bigint) $$,
  'direct parent reply counts are exact at each nesting level');

set local role authenticated;
select set_config('request.jwt.claim.sub','61000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select results_eq($$ select is_owner,can_delete from public.query_comments('community-nota') where id='root-comment' $$,
  $$ values (false,true) $$,'nota owner receives moderator delete capability without comment ownership');
select lives_ok($$ select public.delete_comment('root-comment') $$,
  'nota owner may moderate with the documented hard subtree cascade');
reset role;
select is((select count(*) from public.comments where nota_id='community-nota'),0::bigint,
  'hard delete removes the complete nested reply subtree');
select is((select comment_count from public.published_notas where id='community-nota'),0::bigint,
  'hard subtree delete restores the exact nota comment count');

set local role authenticated;
select set_config('request.jwt.claim.sub','62000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"62000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select lives_ok($$ select public.unsubscribe_newsletter() $$,'owner can unsubscribe');
select lives_ok($$ select public.unsubscribe_newsletter() $$,'newsletter unsubscribe is idempotent');
reset role;
select is((select count(*) from public.newsletter_subscriptions where user_id='62000000-0000-0000-0000-000000000002'),0::bigint,
  'unsubscribe removes the private subscription row');

select * from finish();
rollback;
