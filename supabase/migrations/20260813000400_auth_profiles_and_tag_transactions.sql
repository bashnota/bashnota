begin;

-- Native Supabase accounts do not have a Firebase UID. Migrated accounts keep
-- their immutable mapping; new accounts leave this column null.
alter table public.private_profiles
  alter column firebase_uid drop not null;

create table public.auth_rollout_state (
  singleton boolean primary key default true check (singleton),
  version text not null default 'firebase-v1' check (version in ('firebase-v1', 'supabase-v1')),
  reconciliation_marker text,
  reconciled_percent numeric(5,2) not null default 0 check (reconciled_percent between 0 and 100),
  identity_mismatches bigint not null default 0 check (identity_mismatches >= 0),
  enabled_at timestamptz,
  constraint auth_rollout_enabled_only_when_reconciled check (
    version <> 'supabase-v1' or (
      reconciliation_marker like 'auth-c4-%' and
      reconciled_percent = 100 and identity_mismatches = 0 and enabled_at is not null
    )
  )
);

insert into public.auth_rollout_state (singleton) values (true);
revoke all on public.auth_rollout_state from public, anon, authenticated;
grant select, update on public.auth_rollout_state to service_role;

create or replace function public.verify_auth_rollout(p_version text, p_marker text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.auth_rollout_state
    where singleton
      and version = p_version
      and version = 'supabase-v1'
      and reconciliation_marker = p_marker
      and reconciled_percent = 100
      and identity_mismatches = 0
      and enabled_at is not null
  );
$$;

revoke all on function public.verify_auth_rollout(text, text) from public;
grant execute on function public.verify_auth_rollout(text, text) to anon, authenticated;

-- Restricted migration operator boundary. It validates the already-created
-- Supabase auth identity, then creates the immutable translation plus its
-- private/public/tag projections atomically. It is intentionally granted to no
-- browser role.
create or replace function public.migrate_firebase_identity(
  p_firebase_uid text,
  p_supabase_user_id uuid,
  p_provider text,
  p_provider_uid text,
  p_verified_email text,
  p_user_tag text,
  p_display_name text,
  p_photo_url text,
  p_source_hash text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  account auth.users;
  migrated_profile public.profiles;
begin
  if p_firebase_uid = '' or p_provider_uid = '' or p_source_hash = '' then
    raise exception 'identity migration fields must be nonempty' using errcode = '22023';
  end if;
  if p_provider not in ('email', 'google') then
    raise exception 'unsupported identity provider' using errcode = '22023';
  end if;
  if p_user_tag !~ '^[a-zA-Z0-9_]{3,30}$' then
    raise exception 'invalid user tag' using errcode = '22023';
  end if;

  select * into account from auth.users where id = p_supabase_user_id for update;
  if not found or account.email_confirmed_at is null or
     lower(account.email) is distinct from lower(p_verified_email) then
    raise exception 'verified Supabase account does not match migration identity' using errcode = '23514';
  end if;
  if not (
    account.raw_app_meta_data->>'provider' = p_provider or
    coalesce(account.raw_app_meta_data->'providers', '[]'::jsonb) ? p_provider
  ) then
    raise exception 'Supabase account provider does not match migration identity' using errcode = '23514';
  end if;
  if not exists (
    select 1 from auth.identities
    where user_id = p_supabase_user_id
      and provider = p_provider
      and provider_id = p_provider_uid
      and lower(email) = lower(p_verified_email)
  ) then
    raise exception 'verified Supabase provider identity does not match migration identity' using errcode = '23514';
  end if;

  insert into public.identity_map (
    firebase_uid, supabase_user_id, provider_links, source_hash
  ) values (
    p_firebase_uid,
    p_supabase_user_id,
    jsonb_build_object(p_provider, jsonb_build_object(
      'uid', p_provider_uid, 'verified_email', lower(p_verified_email)
    )),
    p_source_hash
  );
  insert into public.private_profiles (user_id, firebase_uid, email, display_name)
    values (p_supabase_user_id, p_firebase_uid, lower(p_verified_email), nullif(p_display_name, ''));
  insert into public.profiles (user_id, user_tag, photo_url)
    values (p_supabase_user_id, p_user_tag, coalesce(p_photo_url, ''))
    returning * into migrated_profile;
  insert into public.user_tags (user_tag, user_id)
    values (p_user_tag, p_supabase_user_id);
  return migrated_profile;
end;
$$;

revoke all on function public.migrate_firebase_identity(text, uuid, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.migrate_firebase_identity(text, uuid, text, text, text, text, text, text, text)
  to service_role;

create unique index identity_map_google_provider_uid_unique
  on public.identity_map ((provider_links->'google'->>'uid'))
  where provider_links->'google'->>'uid' is not null;
create unique index identity_map_email_provider_uid_unique
  on public.identity_map ((provider_links->'email'->>'uid'))
  where provider_links->'email'->>'uid' is not null;

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
  if not public.verify_auth_rollout('supabase-v1', (
    select reconciliation_marker from public.auth_rollout_state where singleton
  )) then
    raise exception 'new profile provisioning is disabled before auth reconciliation' using errcode = '42501';
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

create or replace function public.rename_user_tag(
  p_user_tag text,
  p_photo_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_profile public.profiles;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_user_tag !~ '^[a-zA-Z0-9_]{3,30}$' then
    raise exception 'invalid user tag' using errcode = '22023';
  end if;

  select * into current_profile
  from public.profiles
  where user_id = actor
  for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if current_profile.user_tag = p_user_tag then
    update public.profiles
      set photo_url = coalesce(p_photo_url, photo_url), updated_at = now()
      where user_id = actor
      returning * into current_profile;
    return current_profile;
  end if;

  -- The FK from user_tags to profiles requires this order. All three writes
  -- remain atomic and invisible until commit, so the old public URL cannot
  -- disappear without the new reservation and profile becoming visible.
  delete from public.user_tags
    where user_tag = current_profile.user_tag and user_id = actor;
  update public.profiles
    set user_tag = p_user_tag,
        photo_url = coalesce(p_photo_url, photo_url),
        updated_at = now()
    where user_id = actor
    returning * into current_profile;
  insert into public.user_tags (user_tag, user_id)
    values (p_user_tag, actor);

  return current_profile;
end;
$$;

revoke all on function public.provision_user_profile(text, text, text) from public;
revoke all on function public.rename_user_tag(text, text) from public;
grant execute on function public.provision_user_profile(text, text, text) to authenticated;
grant execute on function public.rename_user_tag(text, text) to authenticated;

-- Browser writes must cross the collision-safe functions above. RLS still
-- governs reads, while service-role migration jobs retain their bypass.
revoke insert, update, delete on public.profiles, public.user_tags, public.private_profiles
  from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

commit;
