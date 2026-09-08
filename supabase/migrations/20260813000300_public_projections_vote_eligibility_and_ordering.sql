-- Defensive convergence migration: keep import/reconciliation metadata on the
-- base tables, but expose only explicit product fields to browser roles.

begin;

alter table public.published_notas
  rename column citations to published_nota_citations;

create table public.published_nota_edges (
  parent_id text not null references public.published_notas(id) on delete cascade,
  child_id text not null references public.published_notas(id) on delete cascade,
  ordinal integer not null,
  primary key (parent_id, child_id),
  constraint published_nota_edges_order_unique unique (parent_id, ordinal),
  constraint published_nota_edges_ordinal_nonnegative check (ordinal >= 0),
  constraint published_nota_edges_not_self check (parent_id <> child_id)
);

create index published_nota_edges_child_idx
  on public.published_nota_edges (child_id);

create or replace function public.enforce_published_nota_edge_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_author_id uuid;
  child_author_id uuid;
  child_is_sub_page boolean;
  child_parent_id text;
begin
  select parent.author_id, child.author_id, child.is_sub_page, child.parent_id
    into parent_author_id, child_author_id, child_is_sub_page, child_parent_id
  from public.published_notas parent
  join public.published_notas child on child.id = new.child_id
  where parent.id = new.parent_id;

  if not found then
    raise exception 'published nota edge endpoints must exist' using errcode = '23503';
  end if;
  if child_author_id is distinct from parent_author_id then
    raise exception 'published nota edge endpoints must have the same owner' using errcode = '23514';
  end if;
  if not child_is_sub_page then
    raise exception 'published nota edge child must be a subpage' using errcode = '23514';
  end if;
  if child_parent_id is distinct from new.parent_id then
    raise exception 'published nota edge must match the child parent_id' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger published_nota_edges_enforce_contract
before insert or update on public.published_nota_edges
for each row execute function public.enforce_published_nota_edge_contract();

revoke all on function public.enforce_published_nota_edge_contract() from public;

-- Firestore arrays are zero-based in the product contract. PostgreSQL WITH
-- ORDINALITY is one-based, so subtract one while expanding. The trigger above
-- makes migration fail closed if a legacy edge disagrees with the canonical
-- child row (owner, is_sub_page, or parent_id) instead of silently importing an
-- inconsistent hierarchy.
insert into public.published_nota_edges (parent_id, child_id, ordinal)
select
  parent.id,
  legacy_edge.child_id,
  (legacy_edge.source_ordinal - 1)::integer
from public.published_notas parent
cross join lateral unnest(parent.published_sub_pages)
  with ordinality as legacy_edge(child_id, source_ordinal);

-- Verify exact per-parent parity and order before deleting the legacy source
-- column. Any mismatch aborts this entire migration transaction.
do $$
begin
  if exists (
    select 1
    from public.published_notas parent
    where coalesce(
      (
        select jsonb_agg(edge.child_id order by edge.ordinal)
        from public.published_nota_edges edge
        where edge.parent_id = parent.id
      ),
      '[]'::jsonb
    ) is distinct from to_jsonb(parent.published_sub_pages)
  ) then
    raise exception 'published_nota_edges backfill did not preserve legacy array parity and order';
  end if;
end;
$$;

alter table public.published_notas
  drop column published_sub_pages;

create or replace function public.current_user_owns_published_nota(p_nota_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.published_notas n
    where n.id = p_nota_id and n.author_id = auth.uid()
  );
$$;

revoke all on function public.current_user_owns_published_nota(text) from public;
grant execute on function public.current_user_owns_published_nota(text) to authenticated;

alter table public.published_nota_edges enable row level security;

create policy published_nota_edges_public_select on public.published_nota_edges
for select to anon, authenticated using (
  exists (
    select 1
    from public.published_notas parent
    join public.published_notas child on child.id = published_nota_edges.child_id
    where parent.id = published_nota_edges.parent_id
      and parent.is_public and child.is_public
  )
);

create policy published_nota_edges_owner_insert on public.published_nota_edges
for insert to authenticated with check (
  public.current_user_owns_published_nota(parent_id)
);

create policy published_nota_edges_owner_delete on public.published_nota_edges
for delete to authenticated using (
  public.current_user_owns_published_nota(parent_id)
);

-- Projections are intentionally SECURITY INVOKER: base-table RLS remains the
-- row boundary, while the view definition is the public column allowlist.
create view public.public_published_notas
with (security_invoker = true)
as
select
  id,
  title,
  content,
  author_name,
  is_sub_page,
  parent_id,
  published_nota_citations,
  tags,
  published_at,
  updated_at,
  view_count,
  unique_viewers,
  like_count,
  dislike_count,
  clone_count,
  comment_count,
  last_viewed_at
from public.published_notas
where is_public;

create view public.public_comments
with (security_invoker = true)
as
select
  id,
  nota_id,
  author_name,
  author_tag,
  content,
  parent_id,
  like_count,
  dislike_count,
  reply_count,
  created_at,
  updated_at
from public.comments
where exists (
  select 1 from public.published_notas n
  where n.id = comments.nota_id and n.is_public
);

comment on view public.public_published_notas is
  'Allowlisted public publication projection; excludes auth identity and migration-only fields.';
comment on view public.public_comments is
  'Allowlisted public comment projection; excludes auth identity and migration-only fields.';
comment on column public.published_notas.published_nota_citations is
  'Order-preserving Firebase citation array; unknown citation fields remain intact as JSON.';
comment on table public.published_nota_edges is
  'Ordered expansion of publishedSubPages; ordinal preserves the source array position.';

-- Replace identity-only vote policies with target-eligibility policies. A
-- denied operation cannot reach the counter triggers, so aggregate values stay
-- unchanged even when a caller knows a private target ID.
drop policy nota_votes_owner_insert on public.nota_votes;
drop policy nota_votes_owner_update on public.nota_votes;
drop policy nota_votes_owner_delete on public.nota_votes;

create policy nota_votes_public_target_insert on public.nota_votes
for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.published_notas n
    where n.id = nota_votes.nota_id and n.is_public
  )
);
create policy nota_votes_public_target_update on public.nota_votes
for update to authenticated using (
  user_id = auth.uid() and exists (
    select 1 from public.published_notas n
    where n.id = nota_votes.nota_id and n.is_public
  )
) with check (
  user_id = auth.uid() and exists (
    select 1 from public.published_notas n
    where n.id = nota_votes.nota_id and n.is_public
  )
);
create policy nota_votes_public_target_delete on public.nota_votes
for delete to authenticated using (
  user_id = auth.uid() and exists (
    select 1 from public.published_notas n
    where n.id = nota_votes.nota_id and n.is_public
  )
);

drop policy comment_votes_owner_insert on public.comment_votes;
drop policy comment_votes_owner_update on public.comment_votes;
drop policy comment_votes_owner_delete on public.comment_votes;

create policy comment_votes_public_target_insert on public.comment_votes
for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1
    from public.comments c
    join public.published_notas n on n.id = c.nota_id
    where c.id = comment_votes.comment_id and n.is_public
  )
);
create policy comment_votes_public_target_update on public.comment_votes
for update to authenticated using (
  user_id = auth.uid() and exists (
    select 1
    from public.comments c
    join public.published_notas n on n.id = c.nota_id
    where c.id = comment_votes.comment_id and n.is_public
  )
) with check (
  user_id = auth.uid() and exists (
    select 1
    from public.comments c
    join public.published_notas n on n.id = c.nota_id
    where c.id = comment_votes.comment_id and n.is_public
  )
);
create policy comment_votes_public_target_delete on public.comment_votes
for delete to authenticated using (
  user_id = auth.uid() and exists (
    select 1
    from public.comments c
    join public.published_notas n on n.id = c.nota_id
    where c.id = comment_votes.comment_id and n.is_public
  )
);

-- The original moderation policy queried the private author_id column from a
-- browser role. Route that ownership predicate through the fixed-search-path,
-- boolean-only helper instead of granting identity-column reads.
drop policy comments_author_or_nota_author_delete on public.comments;
create policy comments_author_or_nota_author_delete on public.comments
for delete to authenticated using (
  author_id = auth.uid() or public.current_user_owns_published_nota(nota_id)
);

-- Remove whole-table reads first. Browser roles receive only the product
-- columns needed by the projections and owner workflows; legacy identities,
-- quarantine payloads, and raw migration timestamps remain server-only.
revoke select on public.published_notas, public.comments from anon, authenticated;

grant select (
  id, title, content, author_name, is_public, is_sub_page, parent_id,
  published_nota_citations, tags, published_at, updated_at, view_count,
  unique_viewers, like_count, dislike_count, clone_count, comment_count,
  last_viewed_at
) on public.published_notas to anon, authenticated;

grant select (
  id, nota_id, author_name, author_tag, content, parent_id, like_count,
  dislike_count, reply_count, created_at, updated_at
) on public.comments to anon, authenticated;

grant select on public.public_published_notas, public.public_comments to anon, authenticated;
grant select on public.published_nota_edges to anon, authenticated;
grant insert, delete on public.published_nota_edges to authenticated;

-- Quarantine/raw import fields are server-maintained and must not be writable
-- through the generic authenticated table grants either.
revoke insert, update on public.published_notas, public.comments from authenticated;

grant insert (
  id, author_id, legacy_author_uid, title, content, author_name, is_public,
  is_sub_page, parent_id, published_nota_citations, tags, published_at, updated_at
) on public.published_notas to authenticated;
grant update (
  title, content, author_name, is_public, is_sub_page, parent_id,
  published_nota_citations, tags, published_at, updated_at
) on public.published_notas to authenticated;

grant insert (
  id, nota_id, author_id, legacy_author_uid, author_name, author_tag, content,
  parent_id, created_at, updated_at
) on public.comments to authenticated;
grant update (author_name, author_tag, content, updated_at)
  on public.comments to authenticated;

commit;
