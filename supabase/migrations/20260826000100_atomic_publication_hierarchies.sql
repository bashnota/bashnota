create or replace function public.publish_nota_hierarchy(p_publications jsonb)
returns setof public.public_published_notas
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  legacy_uid text;
  publication jsonb;
  publication_id text;
  target_parent_id text;
  child_id text;
  child_ordinal integer;
  child_ids text[];
  input_ids text[] := '{}'::text[];
  batch_root_count integer;
  hierarchy_has_cycle boolean;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  perform account.id from auth.users account
    where account.id = actor for update;
  if not found then
    raise exception 'publishing identity required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_publications) <> 'array'
    or jsonb_array_length(p_publications) = 0
    or jsonb_array_length(p_publications) > 500 then
    raise exception 'publication hierarchy must contain between 1 and 500 notas' using errcode = '22023';
  end if;

  for publication in select value from jsonb_array_elements(p_publications)
  loop
    if jsonb_typeof(publication) <> 'object'
      or nullif(publication->>'id', '') is null
      or nullif(publication->>'title', '') is null
      or jsonb_typeof(publication->'content') is distinct from 'object'
      or jsonb_typeof(coalesce(publication->'citations', '[]'::jsonb)) <> 'array'
      or jsonb_typeof(coalesce(publication->'tags', '[]'::jsonb)) <> 'array'
      or jsonb_typeof(coalesce(publication->'child_ids', '[]'::jsonb)) <> 'array' then
      raise exception 'each publication requires an id, title, object content, and ordered array fields' using errcode = '22023';
    end if;
    publication_id := publication->>'id';
    target_parent_id := nullif(publication->>'parent_id', '');
    if coalesce((publication->>'is_sub_page')::boolean, false) <> (target_parent_id is not null) then
      raise exception 'subpage and parent must agree for %', publication_id using errcode = '22023';
    end if;
    if target_parent_id = publication_id then
      raise exception 'publication cannot be its own parent' using errcode = '23514';
    end if;
    input_ids := array_append(input_ids, publication_id);
  end loop;

  if cardinality(input_ids) <> (select count(distinct id) from unnest(input_ids) ids(id)) then
    raise exception 'publication hierarchy contains duplicate ids' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.published_notas existing
    where existing.id = any(input_ids) and existing.author_id <> actor
  ) then
    raise exception 'publication owner is immutable' using errcode = '42501';
  end if;

  batch_root_count := 0;
  for publication in select value from jsonb_array_elements(p_publications)
  loop
    target_parent_id := nullif(publication->>'parent_id', '');
    if target_parent_id is null or not (target_parent_id = any(input_ids)) then
      batch_root_count := batch_root_count + 1;
    end if;
    if target_parent_id is not null
      and not (target_parent_id = any(input_ids))
      and not exists (
        select 1 from public.published_notas parent
        where parent.id = target_parent_id and parent.author_id = actor
      ) then
      raise exception 'canonical parent not found' using errcode = '42501';
    end if;
  end loop;
  if batch_root_count <> 1 then
    raise exception 'publication hierarchy must contain exactly one connected root' using errcode = '23514';
  end if;
  if (
    select count(*) <> count(distinct listed_child_id)
    from jsonb_array_elements(p_publications) item
    cross join lateral jsonb_array_elements_text(coalesce(item->'child_ids', '[]'::jsonb)) listed(listed_child_id)
  ) then
    raise exception 'a hierarchy child may be ordered exactly once' using errcode = '23514';
  end if;

  select firebase_uid into legacy_uid
  from public.identity_map where supabase_user_id = actor;

  -- Materialize every endpoint before assigning parent foreign keys. All of
  -- these writes are transaction-local until the complete hierarchy validates.
  for publication in select value from jsonb_array_elements(p_publications)
  loop
    insert into public.published_notas (
      id, author_id, legacy_author_uid, title, content, author_name, is_public,
      is_sub_page, parent_id, published_nota_citations, tags, published_at, updated_at
    ) values (
      publication->>'id', actor, legacy_uid, publication->>'title', publication->'content',
      coalesce(publication->>'author_name', ''), true, false, null,
      coalesce(publication->'citations', '[]'::jsonb),
      array(select value from jsonb_array_elements_text(coalesce(publication->'tags', '[]'::jsonb)) tags(value)),
      now(), now()
    ) on conflict (id) do update set
      title = excluded.title,
      content = excluded.content,
      author_name = excluded.author_name,
      is_public = true,
      is_sub_page = false,
      parent_id = null,
      published_nota_citations = excluded.published_nota_citations,
      tags = excluded.tags,
      updated_at = now()
    where public.published_notas.author_id = actor;
    if not found then
      raise exception 'publication owner is immutable' using errcode = '42501';
    end if;
  end loop;

  for publication in select value from jsonb_array_elements(p_publications)
  loop
    update public.published_notas
    set is_sub_page = coalesce((publication->>'is_sub_page')::boolean, false),
        parent_id = nullif(publication->>'parent_id', '')
    where id = publication->>'id' and author_id = actor;
  end loop;

  with recursive ancestors(origin, id, path, is_cycle) as (
    select source.id, source.id, array[source.id]::text[], false
    from unnest(input_ids) source(id)
    union all
    select ancestors.origin, parent.parent_id,
      ancestors.path || parent.parent_id,
      parent.parent_id = any(ancestors.path)
    from ancestors
    join public.published_notas parent on parent.id = ancestors.id
    where parent.parent_id is not null and not ancestors.is_cycle
  )
  select exists(select 1 from ancestors where is_cycle) into hierarchy_has_cycle;
  if hierarchy_has_cycle then
    raise exception 'publication hierarchy would contain a cycle' using errcode = '23514';
  end if;

  -- Replace every outgoing ordering owned by this batch. Preserve a batch
  -- root's incoming edge when its canonical parent remains outside the batch;
  -- otherwise publishing a sub-hierarchy would silently drop it from the
  -- external parent's ordered public projection.
  delete from public.published_nota_edges edge
  where edge.parent_id = any(input_ids)
    or (
      edge.child_id = any(input_ids)
      and not exists (
        select 1 from public.published_notas child
        where child.id = edge.child_id
          and child.parent_id is not distinct from edge.parent_id
      )
    );

  -- A first publication or an explicit reparent beneath an external parent
  -- has no caller-provided sibling ordinal. Append it deterministically while
  -- the per-owner mutex is held; an existing matching edge keeps its ordinal.
  insert into public.published_nota_edges(parent_id, child_id, ordinal)
  select child.parent_id, child.id, coalesce(max(sibling.ordinal) + 1, 0)
  from public.published_notas child
  left join public.published_nota_edges sibling on sibling.parent_id = child.parent_id
  where child.id = any(input_ids)
    and child.parent_id is not null
    and not (child.parent_id = any(input_ids))
    and not exists (
      select 1 from public.published_nota_edges incoming
      where incoming.parent_id = child.parent_id and incoming.child_id = child.id
    )
  group by child.parent_id, child.id;

  for publication in select value from jsonb_array_elements(p_publications)
  loop
    publication_id := publication->>'id';
    child_ids := array(
      select value from jsonb_array_elements_text(coalesce(publication->'child_ids', '[]'::jsonb)) children(value)
    );
    if exists (
      select 1 from unnest(child_ids) requested(child_id)
      left join public.published_notas child on child.id = requested.child_id
      where child.id is null
        or child.author_id <> actor
        or child.parent_id is distinct from publication_id
        or not child.is_sub_page
    ) then
      raise exception 'ordered children must be canonical children owned by the publisher' using errcode = '23514';
    end if;
    if exists (
      select 1 from public.published_notas child
      where child.author_id = actor and child.parent_id = publication_id
        and not (child.id = any(child_ids))
    ) then
      raise exception 'ordered children must include every canonical child' using errcode = '23514';
    end if;
    for child_id, child_ordinal in
      select value, (ordinality - 1)::integer
      from unnest(child_ids) with ordinality children(value, ordinality)
    loop
      insert into public.published_nota_edges(parent_id, child_id, ordinal)
      values (publication_id, child_id, child_ordinal);
    end loop;
  end loop;

  return query
    select projection.*
    from jsonb_array_elements(p_publications) with ordinality input(value, ordinal)
    join public.public_published_notas projection on projection.id = input.value->>'id'
    order by input.ordinal;
end;
$$;

revoke all on function public.publish_nota_hierarchy(jsonb) from public;
grant execute on function public.publish_nota_hierarchy(jsonb) to authenticated;

comment on function public.publish_nota_hierarchy(jsonb) is
  'Atomically validates and publishes one ordered nota hierarchy for the authenticated owner.';
