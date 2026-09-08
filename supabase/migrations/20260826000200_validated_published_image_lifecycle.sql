-- Image bytes enter Storage only through the authenticated Edge Function.
drop policy if exists "users upload published images to their own folder" on storage.objects;
drop policy if exists "users delete published images from their own folder" on storage.objects;

create table public.published_image_assets (
  path text primary key check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|gif|webp)$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/gif','image/webp')),
  byte_size integer not null check (byte_size between 1 and 5242880),
  width integer not null check (width between 1 and 8192),
  height integer not null check (height between 1 and 8192),
  created_at timestamptz not null default now(),
  deleting_at timestamptz,
  check (width::bigint * height::bigint <= 40000000)
);

create table public.published_image_references (
  path text not null references public.published_image_assets(path) on delete cascade,
  nota_id text not null references public.published_notas(id) on delete cascade,
  primary key (path, nota_id)
);

alter table public.published_image_assets enable row level security;
alter table public.published_image_references enable row level security;
revoke all on public.published_image_assets, public.published_image_references from anon, authenticated;
grant select, insert, update, delete on public.published_image_assets, public.published_image_references to service_role;

create function public.claim_unreferenced_published_images(p_owner_id uuid, p_paths text[])
returns table(claimed_path text, claimed_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  candidate record;
  lease_started_at timestamptz := statement_timestamp();
begin
  -- Publication takes this same row lock before adding a reference. Locking in
  -- path order also gives multi-image claims one deterministic lock order. A
  -- worker that exits after this transaction cannot strand the row forever:
  -- after fifteen minutes another cleanup may atomically renew the lease, but
  -- only while the image is still unreferenced.
  for candidate in
    select asset.path from public.published_image_assets asset
    where asset.owner_id=p_owner_id and asset.path=any(coalesce(p_paths,'{}'))
      and (
        asset.deleting_at is null
        or asset.deleting_at < lease_started_at - interval '15 minutes'
      )
    order by asset.path for update
  loop
    if not exists (
      select 1 from public.published_image_references reference
      where reference.path=candidate.path
    ) then
      update public.published_image_assets set deleting_at=lease_started_at
      where path=candidate.path;
      claimed_path := candidate.path;
      claimed_at := lease_started_at;
      return next;
    end if;
  end loop;
  return;
end;
$$;
revoke all on function public.claim_unreferenced_published_images(uuid,text[]) from public;
grant execute on function public.claim_unreferenced_published_images(uuid,text[]) to service_role;

-- Derive references from the committed document inside the publication
-- transaction. Callers cannot lie about which objects the content references.
create or replace function public.reconcile_published_image_references()
returns trigger language plpgsql security definer set search_path = '' as $$
declare value jsonb; matched text[]; asset_owner uuid; asset_deleting_at timestamptz;
begin
  delete from public.published_image_references where nota_id=new.id;
  for value in select jsonb_path_query(new.content, 'strict $.** ? (@.type() == "string")') loop
    matched := regexp_match(value #>> '{}', '/published-images/([0-9a-f-]{36}/[0-9a-f-]{36}\.(?:png|jpg|gif|webp))(?:[?#].*)?$');
    if matched is not null then
      -- Serialize reference creation with deletion claims on the asset row.
      -- After either waiter acquires the lock it observes the committed state
      -- established by the winner, so an object cannot be claimed and newly
      -- referenced at the same time.
      select owner_id, deleting_at into asset_owner, asset_deleting_at
      from public.published_image_assets where path=matched[1] for update;
      if not found or asset_owner<>new.author_id or asset_deleting_at is not null then
        raise exception 'published content references an unvalidated or foreign image' using errcode = '42501';
      end if;
      insert into public.published_image_references(path,nota_id) values (matched[1],new.id) on conflict do nothing;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.reconcile_published_image_references() from public;
create trigger reconcile_published_image_references
after insert or update of content on public.published_notas
for each row execute function public.reconcile_published_image_references();

comment on table public.published_image_assets is
  'Server-validated raster objects; unreferenced rows older than one hour are eligible for bounded cleanup.';

-- Return the exact owned assets whose last publication references may have
-- been removed, so the authenticated client can ask the image function to
-- delete them. The function removes references and publications atomically.
drop function public.unpublish_nota(text);
create function public.unpublish_nota(p_id text)
returns text[] language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); removed_paths text[];
begin
  if actor is null then raise exception 'authentication required' using errcode = '42501'; end if;
  perform account.id from auth.users account where account.id=actor for update;
  if not found then raise exception 'publishing identity required' using errcode = '42501'; end if;
  if not exists (select 1 from public.published_notas where id=p_id and author_id=actor) then
    raise exception 'publication not found' using errcode = 'P0002';
  end if;
  with recursive descendants(id) as (
    select p_id union
    select child.id from public.published_notas child join descendants d on child.parent_id=d.id
  ) select coalesce(array_agg(distinct reference.path), '{}') into removed_paths
    from public.published_image_references reference join descendants d on d.id=reference.nota_id;
  with recursive descendants(id) as (
    select p_id union
    select child.id from public.published_notas child join descendants d on child.parent_id=d.id
  ) delete from public.published_notas publication using descendants d
    where publication.id=d.id and publication.author_id=actor;
  return removed_paths;
end;
$$;
revoke all on function public.unpublish_nota(text) from public;
grant execute on function public.unpublish_nota(text) to authenticated;
