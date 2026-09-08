begin;
select plan(11);

select is(
  (select production_cutover from public.runtime_deployment_state where singleton),
  false,
  'production cutover remains disabled before deployment'
);

-- The former rollout tables and verification functions must be absent, not
-- merely inaccessible, so no database configuration can select another runtime.
select is(to_regclass('public.auth_rollout_state'), null, 'auth rollout selector is removed');
select is(to_regclass('public.publishing_rollout_state'), null, 'publishing rollout selector is removed');
select is(to_regclass('public.community_rollout_state'), null, 'community rollout selector is removed');

select is((select public from storage.buckets where id = 'published-images'), true,
  'published image bucket is public');
select is((select file_size_limit from storage.buckets where id = 'published-images'), 5242880::bigint,
  'published image bucket enforces the five-megabyte limit');
select is((select allowed_mime_types from storage.buckets where id = 'published-images'),
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']::text[],
  'published image bucket allowlists image MIME types');

select is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
  and policyname like '%published images%'), 1::bigint,
  'browser roles have public read only; all mutations cross the validating function');
select ok((select relrowsecurity from pg_class where oid='public.published_image_assets'::regclass),
  'validated image asset registry has row security enabled');
select ok((select relrowsecurity from pg_class where oid='public.published_image_references'::regclass),
  'publication image references have row security enabled');
select has_trigger('public','published_notas','reconcile_published_image_references',
  'publication writes transactionally derive image references from content');

select * from finish();
rollback;
