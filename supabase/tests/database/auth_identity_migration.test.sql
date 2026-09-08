begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('51000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'migrated@example.test', '', now(),
   '{"provider":"google","providers":["google"]}', '{}', now(), now()),
  ('52000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'duplicate@example.test', '', now(),
   '{"provider":"google","providers":["google"]}', '{}', now(), now()),
  ('53000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'unverified@example.test', '', null,
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('54000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'provider-duplicate@example.test', '', now(),
   '{"provider":"google","providers":["google"]}', '{}', now(), now());

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at) values
  ('google-provider-123', '51000000-0000-0000-0000-000000000001',
   '{"email":"migrated@example.test"}', 'google', now(), now()),
  ('google-provider-456', '52000000-0000-0000-0000-000000000002',
   '{"email":"duplicate@example.test"}', 'google', now(), now()),
  ('firebase-unverified', '53000000-0000-0000-0000-000000000003',
   '{"email":"unverified@example.test"}', 'email', now(), now()),
  ('google-provider-789', '54000000-0000-0000-0000-000000000004',
   '{"email":"provider-duplicate@example.test"}', 'google', now(), now());

select lives_ok($$
  select public.migrate_firebase_identity(
    'firebase-canonical', '51000000-0000-0000-0000-000000000001',
    'google', 'google-provider-123', 'migrated@example.test',
    'Canonical_Tag', 'Canonical User', 'canonical.png', 'source-hash-1'
  )
$$, 'a verified Firebase identity migrates atomically');
select is((select supabase_user_id from public.identity_map where firebase_uid = 'firebase-canonical'),
  '51000000-0000-0000-0000-000000000001'::uuid, 'Firebase UID maps to exactly one canonical Supabase account');
select is((select provider_links->'google'->>'uid' from public.identity_map where firebase_uid = 'firebase-canonical'),
  'google-provider-123', 'the verified provider identity is recorded on the canonical mapping');
select is((select provider_links->'google'->>'verified_email' from public.identity_map where firebase_uid = 'firebase-canonical'),
  'migrated@example.test', 'the normalized verified email is recorded');
select is((select user_tag from public.profiles where user_id = '51000000-0000-0000-0000-000000000001'),
  'Canonical_Tag', 'the canonical account receives its stable existing tag');
select is((select user_id from public.user_tags where user_tag = 'Canonical_Tag'),
  '51000000-0000-0000-0000-000000000001'::uuid, 'the stable tag has one canonical reservation');

select throws_ok($$
  select public.migrate_firebase_identity(
    'firebase-canonical', '52000000-0000-0000-0000-000000000002',
    'google', 'google-provider-456', 'duplicate@example.test',
    'Duplicate_Tag', 'Duplicate', '', 'source-hash-2'
  )
$$, '23505', null, 'a Firebase UID cannot map to a duplicate Supabase account');
select is((select count(*) from public.profiles where user_id = '52000000-0000-0000-0000-000000000002'),
  0::bigint, 'duplicate identity failure leaves no partial profile');
select throws_ok($$
  select public.migrate_firebase_identity(
    'firebase-second', '52000000-0000-0000-0000-000000000002',
    'google', 'google-provider-456', 'duplicate@example.test',
    'Canonical_Tag', 'Duplicate', '', 'source-hash-2'
  )
$$, '23505', null, 'a migrated account cannot steal an existing stable tag');
select is((select count(*) from public.identity_map where firebase_uid = 'firebase-second'),
  0::bigint, 'tag collision rolls back the identity mapping');
select throws_ok($$
  select public.migrate_firebase_identity(
    'firebase-provider-duplicate', '54000000-0000-0000-0000-000000000004',
    'google', 'google-provider-123', 'provider-duplicate@example.test',
    'Provider_Duplicate', 'Provider Duplicate', '', 'source-hash-4'
  )
$$, '23514', null, 'one external provider identity cannot link to two Supabase accounts');
select is((select count(*) from public.identity_map where firebase_uid = 'firebase-provider-duplicate'),
  0::bigint, 'duplicate provider failure leaves no identity mapping');
select throws_ok($$
  select public.migrate_firebase_identity(
    'firebase-unverified', '53000000-0000-0000-0000-000000000003',
    'email', 'firebase-unverified', 'unverified@example.test',
    'Unverified_Tag', 'Unverified', '', 'source-hash-3'
  )
$$, '23514', null, 'an unverified email cannot link identities');

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select throws_ok($$
  select public.migrate_firebase_identity(
    'browser-forgery', '51000000-0000-0000-0000-000000000001',
    'google', 'forged', 'migrated@example.test',
    'Forged_Tag', 'Forged', '', 'forged-hash'
  )
$$, '42501', null, 'browser roles cannot call the identity migration boundary');

select * from finish();
rollback;
