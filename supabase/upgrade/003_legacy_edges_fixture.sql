-- This fixture is deliberately loaded after migrations 001/002 and before
-- migration 003 by `npm run test:supabase:upgrade`. It represents persisted
-- production-shaped legacy arrays that migration 003 must not drop.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '90000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'upgrade-owner@example.test', '', now(),
  '{}', '{}', now(), now()
);

insert into public.identity_map (firebase_uid, supabase_user_id, source_hash)
values (
  'firebase-upgrade-owner',
  '90000000-0000-0000-0000-000000000009',
  'upgrade-owner-hash'
);

insert into public.published_notas (
  id, author_id, legacy_author_uid, title, content, is_public, is_sub_page,
  parent_id, published_sub_pages, citations, published_at, updated_at
) values
  (
    'legacy-parent', '90000000-0000-0000-0000-000000000009',
    'firebase-upgrade-owner', 'Legacy parent', '{"type":"doc"}', true, false,
    null, array['legacy-child-b', 'legacy-child-a'],
    '[{"id":"citation-second"},{"id":"citation-first","unknown":true}]',
    now(), now()
  ),
  (
    'legacy-child-a', '90000000-0000-0000-0000-000000000009',
    'firebase-upgrade-owner', 'Legacy child A', '{"type":"doc"}', true, true,
    'legacy-parent', '{}', '[]', now(), now()
  ),
  (
    'legacy-child-b', '90000000-0000-0000-0000-000000000009',
    'firebase-upgrade-owner', 'Legacy child B', '{"type":"doc"}', true, true,
    'legacy-parent', '{}', '[]', now(), now()
  );
