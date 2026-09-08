begin;

-- Provider rollout selectors are obsolete: every browser/server operation now
-- targets Supabase. The retained identity map and legacy source columns remain
-- restricted migration/audit data and are never used to choose a runtime.
create or replace function public.provision_user_profile(
  p_user_tag text,
  p_display_name text default '',
  p_photo_url text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_email text;
  existing_profile public.profiles;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_user_tag !~ '^[a-zA-Z0-9_]{3,30}$' then
    raise exception 'invalid user tag' using errcode = '22023';
  end if;

  select * into existing_profile
  from public.profiles
  where user_id = actor
  for update;

  if found then
    update public.profiles
      set photo_url = coalesce(p_photo_url, ''), updated_at = now()
      where user_id = actor
      returning * into existing_profile;

    insert into public.user_tags (user_tag, user_id)
      values (existing_profile.user_tag, actor)
      on conflict (user_tag) do update set user_id = excluded.user_id
      where public.user_tags.user_id = excluded.user_id;
    return existing_profile;
  end if;

  if exists (select 1 from public.identity_map where supabase_user_id = actor) then
    raise exception 'migrated identities must be pre-provisioned by reconciliation' using errcode = '42501';
  end if;

  select email into actor_email from auth.users where id = actor;
  if not found then
    raise exception 'authenticated account not found' using errcode = 'P0002';
  end if;

  insert into public.private_profiles (user_id, email, display_name)
    values (actor, actor_email, nullif(p_display_name, ''))
    on conflict (user_id) do update set
      email = excluded.email,
      display_name = coalesce(excluded.display_name, public.private_profiles.display_name),
      updated_at = now();

  insert into public.profiles (user_id, user_tag, photo_url)
    values (actor, p_user_tag, coalesce(p_photo_url, ''))
    returning * into existing_profile;

  insert into public.user_tags (user_tag, user_id)
    values (p_user_tag, actor);

  return existing_profile;
end;
$$;

drop function if exists public.verify_auth_rollout(text, text);
drop function if exists public.verify_publishing_rollout(text, text);
drop function if exists public.verify_community_rollout(text, text);
drop table if exists public.auth_rollout_state;
drop table if exists public.publishing_rollout_state;
drop table if exists public.community_rollout_state;

create table public.runtime_deployment_state (
  singleton boolean primary key default true check (singleton),
  production_cutover boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.runtime_deployment_state (singleton, production_cutover)
values (true, false);

alter table public.runtime_deployment_state enable row level security;
revoke all on public.runtime_deployment_state from public, anon, authenticated;
grant select, update on public.runtime_deployment_state to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'published-images',
  'published-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "published images are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'published-images');

create policy "users upload published images to their own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'published-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users delete published images from their own folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'published-images'
  and owner_id = auth.uid()::text
);

commit;
