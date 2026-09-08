begin;

create function public.get_nota_vote(p_nota_id text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_vote text;
begin
  perform private.assert_id(p_nota_id, 'publication id');
  if actor is null then return null; end if;
  if not exists (
    select 1 from public.published_notas
    where id = p_nota_id and is_public
  ) then
    raise exception 'published nota not found' using errcode = 'P0002';
  end if;

  select vote::text into current_vote
  from public.nota_votes
  where nota_id = p_nota_id and user_id = actor;
  return current_vote;
end;
$$;

create function public.count_comments(
  p_nota_id text,
  p_parent_id text default null
)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  total bigint;
begin
  perform private.assert_id(p_nota_id, 'publication id');
  perform private.assert_id(p_parent_id, 'parent comment id', true);
  if not exists (
    select 1 from public.published_notas
    where id = p_nota_id and is_public
  ) then
    raise exception 'published nota not found' using errcode = 'P0002';
  end if;

  select count(*) into total
  from public.comments
  where nota_id = p_nota_id
    and parent_id is not distinct from p_parent_id;
  return total;
end;
$$;

revoke all on function public.get_nota_vote(text), public.count_comments(text, text) from public;
grant execute on function public.get_nota_vote(text) to anon, authenticated;
grant execute on function public.count_comments(text, text) to anon, authenticated;

comment on function public.count_comments(text, text) is
  'Authoritative count for one comment level. A null parent counts top-level discussion threads only; replies are counted per parent.';

commit;
