begin;

create extension if not exists pgtap with schema extensions;
select plan(55);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'owner@example.test', '', now(), '{}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'other@example.test', '', now(), '{}', '{}', now(), now()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'third@example.test', '', now(), '{}', '{}', now(), now());

insert into public.identity_map (firebase_uid, supabase_user_id, source_hash) values
  ('firebase-owner', '10000000-0000-0000-0000-000000000001', 'owner-hash'),
  ('firebase-other', '20000000-0000-0000-0000-000000000002', 'other-hash'),
  ('firebase-third', '30000000-0000-0000-0000-000000000003', 'third-hash');

insert into public.private_profiles (user_id, firebase_uid, email) values
  ('10000000-0000-0000-0000-000000000001', 'firebase-owner', 'owner@example.test'),
  ('20000000-0000-0000-0000-000000000002', 'firebase-other', 'other@example.test');
insert into public.profiles (user_id, user_tag, photo_url) values
  ('10000000-0000-0000-0000-000000000001', 'Owner_Tag', 'https://example.test/owner.png'),
  ('20000000-0000-0000-0000-000000000002', 'Other_Tag', 'https://example.test/other.png');
insert into public.user_tags (user_tag, user_id) values
  ('Owner_Tag', '10000000-0000-0000-0000-000000000001'),
  ('Other_Tag', '20000000-0000-0000-0000-000000000002');

insert into public.published_notas (
  id, author_id, legacy_author_uid, title, content, is_public, is_sub_page,
  parent_id, published_nota_citations, published_at, updated_at
) values
  ('public-nota', '10000000-0000-0000-0000-000000000001', 'firebase-owner',
   'Public', '{"type":"doc"}', true, false, null,
   '[{"id":"citation-b","unknown":{"preserved":true}},{"id":"citation-a"}]', now(), now()),
  ('private-nota', '10000000-0000-0000-0000-000000000001', 'firebase-owner',
   'Private', '{"type":"doc"}', false, false, null, '[]', now(), now()),
  ('public-child-a', '10000000-0000-0000-0000-000000000001', 'firebase-owner',
   'Child A', '{"type":"doc"}', true, true, 'public-nota', '[]', now(), now()),
  ('public-child-b', '10000000-0000-0000-0000-000000000001', 'firebase-owner',
   'Child B', '{"type":"doc"}', true, true, 'public-nota', '[]', now(), now()),
  ('valid-edge-child', '10000000-0000-0000-0000-000000000001', 'firebase-owner',
   'Valid private child', '{"type":"doc"}', false, true, 'public-nota', '[]', now(), now()),
  ('root-edge-child', '10000000-0000-0000-0000-000000000001', 'firebase-owner',
   'Root child candidate', '{"type":"doc"}', false, false, null, '[]', now(), now()),
  ('mismatched-edge-child', '10000000-0000-0000-0000-000000000001', 'firebase-owner',
   'Mismatched child', '{"type":"doc"}', false, true, 'public-child-a', '[]', now(), now()),
  ('other-owner-edge-child', '30000000-0000-0000-0000-000000000003', 'firebase-third',
   'Other owner child', '{"type":"doc"}', false, true, 'public-nota', '[]', now(), now());

insert into public.published_nota_edges (parent_id, child_id, ordinal) values
  ('public-nota', 'public-child-b', 0),
  ('public-nota', 'public-child-a', 1);

insert into public.comments (
  id, nota_id, author_id, legacy_author_uid, author_name, content
) values
  ('owner-comment', 'public-nota', '10000000-0000-0000-0000-000000000001',
   'firebase-owner', 'Owner', '"hello"'),
  ('private-comment', 'private-nota', '10000000-0000-0000-0000-000000000001',
   'firebase-owner', 'Owner', '"secret"');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);

select results_eq(
  $$ select user_tag from public.public_profiles order by user_tag $$,
  $$ values ('Other_Tag'::text collate "C"), ('Owner_Tag'::text collate "C") $$,
  'anonymous users can read only the allowlisted public profile projection'
);
select results_eq(
  $$ select column_name::text collate "C"
     from information_schema.columns
     where table_schema = 'public' and table_name = 'public_published_notas'
     order by ordinal_position $$,
  $$ values
     ('id'::text collate "C"), ('title'), ('content'), ('author_name'), ('is_sub_page'),
     ('parent_id'), ('published_nota_citations'), ('tags'), ('published_at'),
     ('updated_at'), ('view_count'), ('unique_viewers'), ('like_count'),
     ('dislike_count'), ('clone_count'), ('comment_count'), ('last_viewed_at') $$,
  'public publication projection contains exactly the approved public fields'
);
select results_eq(
  $$ select column_name::text collate "C"
     from information_schema.columns
     where table_schema = 'public' and table_name = 'public_comments'
     order by ordinal_position $$,
  $$ values
     ('id'::text collate "C"), ('nota_id'), ('author_name'), ('author_tag'), ('content'),
     ('parent_id'), ('like_count'), ('dislike_count'), ('reply_count'),
     ('created_at'), ('updated_at') $$,
  'public comment projection contains exactly the approved public fields'
);
select ok(
  not has_column_privilege('anon', 'public.published_notas', 'author_id', 'select') and
  not has_column_privilege('anon', 'public.published_notas', 'legacy_author_uid', 'select') and
  not has_column_privilege('anon', 'public.published_notas', 'content_quarantine_text', 'select') and
  not has_column_privilege('anon', 'public.published_notas', 'source_published_at_raw', 'select'),
  'anonymous publication reads cannot access identity, quarantine, or raw migration fields'
);
select ok(
  not has_column_privilege('authenticated', 'public.comments', 'author_id', 'select') and
  not has_column_privilege('authenticated', 'public.comments', 'legacy_author_uid', 'select') and
  not has_column_privilege('authenticated', 'public.comments', 'source_created_at_raw', 'select') and
  not has_column_privilege('authenticated', 'public.comments', 'source_updated_at_raw', 'select'),
  'authenticated comment reads cannot access identity or raw migration fields'
);
select is((select count(*) from public.public_published_notas), 3::bigint,
  'anonymous publication projection returns only public notas');
select is((select count(*) from public.public_comments), 1::bigint,
  'anonymous comment projection returns only comments on public notas');
select results_eq(
  $$ select citation.value->>'id'
     from public.public_published_notas p
     cross join lateral jsonb_array_elements(p.published_nota_citations)
       with ordinality as citation(value, ordinal)
     where p.id = 'public-nota'
     order by citation.ordinal $$,
  $$ values ('citation-b'::text), ('citation-a'::text) $$,
  'citation JSON preserves source array order'
);
select results_eq(
  $$ select child_id, ordinal from public.published_nota_edges
     where parent_id = 'public-nota' order by ordinal $$,
  $$ values ('public-child-b'::text, 0), ('public-child-a'::text, 1) $$,
  'published nota edges preserve source subpage order'
);
select is((select count(*) from public.published_notas), 3::bigint,
  'anonymous users can read public notas');
select is((select count(*) from public.comments), 1::bigint,
  'anonymous users can read comments on public notas');
select throws_ok(
  $$ select * from public.private_profiles $$,
  '42501', null, 'anonymous users cannot read private profiles'
);
select throws_ok(
  $$ select * from public.identity_map $$,
  '42501', null, 'anonymous users cannot read the identity map'
);
select throws_ok(
  $$ insert into public.newsletter_subscriptions (user_id, firebase_uid, email)
     values ('10000000-0000-0000-0000-000000000001', 'firebase-owner', 'x@example.test') $$,
  '42501', null, 'anonymous users cannot subscribe'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is((select count(*) from public.private_profiles), 1::bigint,
  'an authenticated user sees only their private profile');
select is((select email from public.private_profiles), 'other@example.test',
  'the visible private profile belongs to the caller');
select is((select count(*) from public.published_notas), 3::bigint,
  'a non-owner cannot see another user private nota');
select throws_ok(
  $$ update public.private_profiles set firebase_uid = 'firebase-owner'
     where user_id = '20000000-0000-0000-0000-000000000002' $$,
  '42501', null, 'private legacy identity is immutable'
);
select throws_ok(
  $$ update public.profiles set user_tag = 'Stolen_Tag'
     where user_id = '20000000-0000-0000-0000-000000000002' $$,
  '42501', null, 'stable user tags are immutable through direct profile updates'
);
select throws_ok(
  $$ insert into public.published_notas
       (id, author_id, legacy_author_uid, title, published_at, updated_at)
     values ('forged-nota', '10000000-0000-0000-0000-000000000001',
       'firebase-owner', 'forged', now(), now()) $$,
  '42501', null, 'a user cannot forge another nota author identity'
);
select throws_ok(
  $$ update public.published_notas set like_count = like_count + 100
     where id = 'public-nota' $$,
  '42501', null,
  'non-owners cannot inflate nota counters'
);

select lives_ok(
  $$ select public.toggle_nota_vote('public-nota','like') $$,
  'a caller can add their own nota vote'
);
select is((select like_count from public.published_notas where id = 'public-nota'), 1::bigint,
  'adding a like increments exactly one counter');
select lives_ok(
  $$ select public.toggle_nota_vote('public-nota','dislike') $$,
  'a caller can switch their vote'
);
select results_eq(
  $$ select like_count, dislike_count from public.published_notas where id = 'public-nota' $$,
  $$ values (0::bigint, 1::bigint) $$,
  'switching a vote decrements and increments the exact counters'
);
select throws_ok(
  $$ update public.nota_votes set user_id = '30000000-0000-0000-0000-000000000003'
     where nota_id = 'public-nota' and user_id = '20000000-0000-0000-0000-000000000002' $$,
  '42501', null, 'vote identities cannot be forged during a transition'
);
select lives_ok(
  $$ select public.toggle_nota_vote('public-nota','dislike') $$,
  'a caller can remove their own nota vote'
);
select results_eq(
  $$ select like_count, dislike_count from public.published_notas where id = 'public-nota' $$,
  $$ values (0::bigint, 0::bigint) $$,
  'removing a vote decrements exactly the previous vote counter'
);
select throws_ok(
  $$ select public.toggle_nota_vote('private-nota','like') $$,
  'P0002', null, 'a caller cannot vote on a private publication'
);
select throws_ok(
  $$ select public.toggle_comment_vote('private-comment','like') $$,
  'P0002', null, 'a caller cannot vote on a comment attached to a private publication'
);

reset role;
select results_eq(
  $$ select like_count, dislike_count from public.published_notas where id = 'private-nota' $$,
  $$ values (0::bigint, 0::bigint) $$,
  'a denied private publication vote leaves both counters unchanged'
);
select results_eq(
  $$ select like_count, dislike_count from public.comments where id = 'private-comment' $$,
  $$ values (0::bigint, 0::bigint) $$,
  'a denied private comment vote leaves both counters unchanged'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select throws_ok(
  $$ insert into public.nota_viewers (nota_id, user_id)
     values ('public-nota', '30000000-0000-0000-0000-000000000003') $$,
  '42501', null, 'clients cannot inject viewer rows directly'
);
select lives_ok(
  $$ select public.record_nota_view('public-nota', 'example.com') $$,
  'authenticated views use the privileged view boundary'
);
select lives_ok(
  $$ select public.record_nota_view('public-nota', null) $$,
  'repeated views are accepted'
);
select results_eq(
  $$ select view_count, unique_viewers from public.published_notas where id = 'public-nota' $$,
  $$ values (2::bigint, 1::bigint) $$,
  'repeated authenticated views increment total twice and unique once'
);
select is(public.record_nota_clone('public-nota'), 1::bigint,
  'clone counters increment only through an authenticated exact-step function');

select public.create_comment('other-comment','public-nota','"moderate me"','Other',null);

select throws_ok(
  $$ insert into public.comments
       (id, nota_id, author_id, legacy_author_uid, author_name, content)
     values ('forged-comment', 'public-nota',
       '10000000-0000-0000-0000-000000000001', 'firebase-owner', 'Owner', '"forged"') $$,
  '42501', null, 'comment author identity cannot be forged'
);
select throws_ok(
  $$ select public.edit_comment('owner-comment','"hijacked"') $$,
  '42501',null,
  'another user cannot edit a comment'
);
select lives_ok(
  $$ select public.toggle_comment_vote('owner-comment','like') $$,
  'a caller can vote on a comment'
);
select is((select like_count from public.comments where id = 'owner-comment'), 1::bigint,
  'comment vote counters are trigger maintained');
select lives_ok(
  $$ select public.toggle_comment_vote('owner-comment','dislike') $$,
  'a caller can switch their comment vote'
);
select results_eq(
  $$ select like_count, dislike_count from public.comments where id = 'owner-comment' $$,
  $$ values (0::bigint, 1::bigint) $$,
  'comment vote switches maintain both counters exactly'
);
select throws_ok(
  $$ insert into public.newsletter_subscriptions (user_id, firebase_uid, email)
     values ('10000000-0000-0000-0000-000000000001', 'firebase-owner', 'owner@example.test') $$,
  '42501', null, 'a caller cannot subscribe another identity'
);
select lives_ok(
  $$ select public.upsert_newsletter_subscription('other@example.test',null) $$,
  'a caller can create their own subscription'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
select lives_ok(
  $$ select public.record_nota_view('public-nota', null) $$,
  'anonymous views do not dereference a null user identity'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select is((select count(*) from public.published_notas), 7::bigint,
  'a nota owner can see their public and private notas');
select throws_ok(
  $$ insert into public.published_nota_edges (parent_id, child_id, ordinal)
     values ('public-nota', 'valid-edge-child', 2) $$,
  '42501', null, 'browser roles cannot bypass the atomic hierarchy RPC'
);
select throws_ok(
  $$ insert into public.published_nota_edges (parent_id, child_id, ordinal)
     values ('public-nota', 'other-owner-edge-child', 3) $$,
  '42501', null, 'direct foreign-owner edge mutation is not granted'
);
select throws_ok(
  $$ insert into public.published_nota_edges (parent_id, child_id, ordinal)
     values ('public-nota', 'root-edge-child', 3) $$,
  '42501', null, 'direct root-child edge mutation is not granted'
);
select throws_ok(
  $$ insert into public.published_nota_edges (parent_id, child_id, ordinal)
     values ('public-nota', 'mismatched-edge-child', 3) $$,
  '42501', null, 'direct mismatched-parent edge mutation is not granted'
);
select lives_ok(
  $$ select public.edit_comment('owner-comment','"edited"') $$,
  'a comment author can edit content'
);
select throws_ok(
  $$ update public.published_notas set comment_count = comment_count + 10
     where id = 'public-nota' $$,
  '42501', null, 'a nota owner cannot inflate server-maintained counters'
);
select throws_ok(
  $$ update public.comments set reply_count = reply_count + 10
     where id = 'owner-comment' $$,
  '42501', null, 'a comment author cannot inflate server-maintained counters'
);
select lives_ok(
  $$ select public.delete_comment('other-comment') $$,
  'a nota author can moderate another user comment on their nota'
);

select * from finish();
rollback;
