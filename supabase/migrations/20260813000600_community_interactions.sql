-- Community writes are exposed only through identity-deriving, fixed-search-
-- path RPCs. Firebase remains the production source until the versioned
-- reconciliation state below is explicitly enabled for task-008 cutover.
begin;

alter table public.comments alter column legacy_author_uid drop not null;
alter table public.newsletter_subscriptions alter column firebase_uid drop not null;

create table public.community_rollout_state (
  singleton boolean primary key default true check (singleton),
  version text not null default 'firebase-v1',
  reconciliation_marker text,
  comment_mismatches bigint not null default 0,
  relationship_mismatches bigint not null default 0,
  vote_mismatches bigint not null default 0,
  count_mismatches bigint not null default 0,
  subscription_mismatches bigint not null default 0,
  timestamp_mismatches bigint not null default 0,
  orphan_count bigint not null default 0,
  task008_cutover_ready boolean not null default false,
  enabled_at timestamptz
);
insert into public.community_rollout_state (singleton) values (true);
alter table public.community_rollout_state enable row level security;
revoke all on public.community_rollout_state from anon, authenticated;

create or replace function public.verify_community_rollout(p_version text, p_marker text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_rollout_state s
    where s.singleton and s.version = p_version
      and s.reconciliation_marker = p_marker and s.enabled_at is not null
      and s.task008_cutover_ready
      and s.comment_mismatches = 0 and s.relationship_mismatches = 0
      and s.vote_mismatches = 0 and s.count_mismatches = 0
      and s.subscription_mismatches = 0 and s.timestamp_mismatches = 0
      and s.orphan_count = 0
  );
$$;
revoke all on function public.verify_community_rollout(text,text) from public;
grant execute on function public.verify_community_rollout(text,text) to anon, authenticated;

create type public.community_comment_result as (
  id text,
  nota_id text,
  author_name text,
  author_tag text,
  content jsonb,
  parent_id text,
  like_count bigint,
  dislike_count bigint,
  reply_count bigint,
  created_at timestamptz,
  updated_at timestamptz,
  is_owner boolean,
  can_delete boolean,
  user_vote text
);

create type public.community_vote_result as (
  like_count bigint,
  dislike_count bigint,
  user_vote text
);

create or replace function public.query_comments(
  p_nota_id text,
  p_parent_id text default null,
  p_limit integer default 20,
  p_before_created_at timestamptz default null,
  p_before_id text default null
) returns setof public.community_comment_result
language sql stable security definer set search_path = '' as $$
  select
    c.id, c.nota_id, c.author_name, c.author_tag, c.content, c.parent_id,
    c.like_count, c.dislike_count, c.reply_count, c.created_at, c.updated_at,
    auth.uid() is not null and c.author_id = auth.uid(),
    auth.uid() is not null and (c.author_id = auth.uid() or n.author_id = auth.uid()),
    (select cv.vote::text from public.comment_votes cv
      where cv.comment_id = c.id and cv.user_id = auth.uid())
  from public.comments c
  join public.published_notas n on n.id = c.nota_id
  where n.is_public and c.nota_id = p_nota_id
    and c.parent_id is not distinct from p_parent_id
    and (p_before_created_at is null
      or (c.created_at, c.id) < (p_before_created_at, coalesce(p_before_id, '')))
  order by c.created_at desc, c.id desc
  limit greatest(1, least(coalesce(p_limit,20),100));
$$;
revoke all on function public.query_comments(text,text,integer,timestamptz,text) from public;
grant execute on function public.query_comments(text,text,integer,timestamptz,text) to anon, authenticated;

create or replace function public.create_comment(
  p_id text,
  p_nota_id text,
  p_content jsonb,
  p_author_name text default null,
  p_parent_id text default null
) returns setof public.community_comment_result
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  legacy_uid text;
  display_name text;
  user_tag text;
begin
  if actor is null then raise exception 'authentication required' using errcode='42501'; end if;
  select nullif(account.raw_user_meta_data->>'display_name','') into display_name
    from auth.users account where account.id = actor for update;
  if not found then raise exception 'comment identity required' using errcode='42501'; end if;
  if p_id is null or p_id = '' or length(p_id) > 160 then
    raise exception 'invalid comment id' using errcode='22023';
  end if;
  if p_content is null or length(p_content::text) > 20000 then
    raise exception 'comment content is required and must be at most 20000 bytes' using errcode='22023';
  end if;
  if not exists (select 1 from public.published_notas n where n.id=p_nota_id and n.is_public) then
    raise exception 'published nota not found' using errcode='P0002';
  end if;
  if p_parent_id is not null and not exists (
    select 1 from public.comments parent
    where parent.id=p_parent_id and parent.nota_id=p_nota_id
  ) then raise exception 'comment parent must belong to the same nota' using errcode='23514'; end if;
  if exists (select 1 from public.comments c where c.id=p_id) then
    raise exception 'comment id already exists' using errcode='23505';
  end if;

  select firebase_uid into legacy_uid from public.identity_map where supabase_user_id=actor;
  select profile.user_tag into user_tag from public.profiles profile where profile.user_id=actor;
  insert into public.comments(
    id,nota_id,author_id,legacy_author_uid,author_name,author_tag,content,parent_id
  ) values (
    p_id,p_nota_id,actor,legacy_uid,
    coalesce(display_name,nullif(trim(p_author_name),''),'Anonymous'),user_tag,p_content,p_parent_id
  );

  return query select
    c.id,c.nota_id,c.author_name,c.author_tag,c.content,c.parent_id,
    c.like_count,c.dislike_count,c.reply_count,c.created_at,c.updated_at,true,true,null::text
  from public.comments c where c.id=p_id;
end;
$$;
revoke all on function public.create_comment(text,text,jsonb,text,text) from public;
grant execute on function public.create_comment(text,text,jsonb,text,text) to authenticated;

create or replace function public.edit_comment(p_id text,p_content jsonb)
returns setof public.community_comment_result
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'authentication required' using errcode='42501'; end if;
  perform account.id from auth.users account where account.id=actor for update;
  if p_content is null or length(p_content::text)>20000 then
    raise exception 'comment content is required and must be at most 20000 bytes' using errcode='22023';
  end if;
  update public.comments c set content=p_content,updated_at=statement_timestamp()
    where c.id=p_id and c.author_id=actor;
  if not found then
    if exists(select 1 from public.comments where id=p_id) then
      raise exception 'only the comment author may edit' using errcode='42501';
    end if;
    raise exception 'comment not found' using errcode='P0002';
  end if;
  return query select
    c.id,c.nota_id,c.author_name,c.author_tag,c.content,c.parent_id,
    c.like_count,c.dislike_count,c.reply_count,c.created_at,c.updated_at,true,true,
    (select cv.vote::text from public.comment_votes cv where cv.comment_id=c.id and cv.user_id=actor)
  from public.comments c where c.id=p_id;
end;
$$;
revoke all on function public.edit_comment(text,jsonb) from public;
grant execute on function public.edit_comment(text,jsonb) to authenticated;

create or replace function public.delete_comment(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target_nota text; target_author uuid;
begin
  if actor is null then raise exception 'authentication required' using errcode='42501'; end if;
  perform account.id from auth.users account where account.id=actor for update;
  select c.nota_id,c.author_id into target_nota,target_author
    from public.comments c where c.id=p_id for update;
  if not found then raise exception 'comment not found' using errcode='P0002'; end if;
  if actor <> target_author and not exists(
    select 1 from public.published_notas n where n.id=target_nota and n.author_id=actor
  ) then raise exception 'comment deletion is not allowed' using errcode='42501'; end if;

  -- Explicit hard-cascade policy: deleting a comment deletes its complete reply
  -- subtree and its votes. DEFERRABLE parent FKs make this one atomic statement;
  -- relationship triggers decrement nota/parent counters exactly once per row.
  with recursive subtree(id) as (
    select p_id union
    select child.id from public.comments child join subtree parent on child.parent_id=parent.id
  ) delete from public.comments c using subtree where c.id=subtree.id;
end;
$$;
revoke all on function public.delete_comment(text) from public;
grant execute on function public.delete_comment(text) to authenticated;

create or replace function public.toggle_nota_vote(p_nota_id text,p_vote public.vote_type)
returns public.community_vote_result
language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); previous public.vote_type; current_vote text;
  likes bigint; dislikes bigint;
begin
  if actor is null then raise exception 'authentication required' using errcode='42501'; end if;
  perform account.id from auth.users account where account.id=actor for update;
  if not exists(select 1 from public.published_notas n where n.id=p_nota_id and n.is_public) then
    raise exception 'published nota not found' using errcode='P0002';
  end if;
  select like_count,dislike_count into likes,dislikes
    from public.published_notas where id=p_nota_id for update;
  select vote into previous from public.nota_votes where nota_id=p_nota_id and user_id=actor for update;
  if found and previous=p_vote then
    delete from public.nota_votes where nota_id=p_nota_id and user_id=actor;
    if p_vote='like' then likes:=likes-1; else dislikes:=dislikes-1; end if;
    current_vote:=null;
  elsif previous is not null then
    update public.nota_votes set vote=p_vote,updated_at=statement_timestamp()
      where nota_id=p_nota_id and user_id=actor;
    if p_vote='like' then likes:=likes+1; dislikes:=dislikes-1;
    else likes:=likes-1; dislikes:=dislikes+1; end if;
    current_vote:=p_vote::text;
  else
    insert into public.nota_votes(nota_id,user_id,vote) values(p_nota_id,actor,p_vote);
    if p_vote='like' then likes:=likes+1; else dislikes:=dislikes+1; end if;
    current_vote:=p_vote::text;
  end if;
  return row(likes,dislikes,current_vote)::public.community_vote_result;
end;
$$;
revoke all on function public.toggle_nota_vote(text,public.vote_type) from public;
grant execute on function public.toggle_nota_vote(text,public.vote_type) to authenticated;

create or replace function public.toggle_comment_vote(p_comment_id text,p_vote public.vote_type)
returns public.community_vote_result
language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); previous public.vote_type; current_vote text;
  likes bigint; dislikes bigint;
begin
  if actor is null then raise exception 'authentication required' using errcode='42501'; end if;
  perform account.id from auth.users account where account.id=actor for update;
  if not exists(
    select 1 from public.comments c join public.published_notas n on n.id=c.nota_id
    where c.id=p_comment_id and n.is_public
  ) then raise exception 'comment not found' using errcode='P0002'; end if;
  select like_count,dislike_count into likes,dislikes
    from public.comments where id=p_comment_id for update;
  select vote into previous from public.comment_votes where comment_id=p_comment_id and user_id=actor for update;
  if found and previous=p_vote then
    delete from public.comment_votes where comment_id=p_comment_id and user_id=actor;
    if p_vote='like' then likes:=likes-1; else dislikes:=dislikes-1; end if;
    current_vote:=null;
  elsif previous is not null then
    update public.comment_votes set vote=p_vote,updated_at=statement_timestamp()
      where comment_id=p_comment_id and user_id=actor;
    if p_vote='like' then likes:=likes+1; dislikes:=dislikes-1;
    else likes:=likes-1; dislikes:=dislikes+1; end if;
    current_vote:=p_vote::text;
  else
    insert into public.comment_votes(comment_id,user_id,vote) values(p_comment_id,actor,p_vote);
    if p_vote='like' then likes:=likes+1; else dislikes:=dislikes+1; end if;
    current_vote:=p_vote::text;
  end if;
  return row(likes,dislikes,current_vote)::public.community_vote_result;
end;
$$;
revoke all on function public.toggle_comment_vote(text,public.vote_type) from public;
grant execute on function public.toggle_comment_vote(text,public.vote_type) to authenticated;

create or replace function public.get_comment_vote(p_comment_id text)
returns text language sql stable security definer set search_path = '' as $$
  select vote::text from public.comment_votes
  where comment_id=p_comment_id and user_id=auth.uid();
$$;
revoke all on function public.get_comment_vote(text) from public;
grant execute on function public.get_comment_vote(text) to authenticated;

create or replace function public.upsert_newsletter_subscription(p_email text,p_display_name text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); legacy_uid text; verified_email text; supplied_email text:=lower(trim(p_email));
begin
  if actor is null then raise exception 'authentication required' using errcode='42501'; end if;
  select lower(trim(account.email)) into verified_email
    from auth.users account
    where account.id=actor and account.email_confirmed_at is not null
    for update;
  if not found or verified_email is null then
    raise exception 'a verified account email is required' using errcode='42501';
  end if;
  if verified_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(verified_email)>320 then
    raise exception 'verified account email is invalid' using errcode='22023';
  end if;
  if p_email is not null and supplied_email is distinct from verified_email then
    raise exception 'newsletter email must match the verified account email' using errcode='22023';
  end if;
  if p_display_name is not null and length(p_display_name)>200 then
    raise exception 'display name is too long' using errcode='22023';
  end if;
  select firebase_uid into legacy_uid from public.identity_map where supabase_user_id=actor;
  insert into public.newsletter_subscriptions(user_id,firebase_uid,email,display_name)
    values(actor,legacy_uid,verified_email,nullif(trim(p_display_name),''))
  on conflict(user_id) do update set email=excluded.email,display_name=excluded.display_name;
end;
$$;
revoke all on function public.upsert_newsletter_subscription(text,text) from public;
grant execute on function public.upsert_newsletter_subscription(text,text) to authenticated;

create or replace function public.unsubscribe_newsletter()
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'authentication required' using errcode='42501'; end if;
  perform account.id from auth.users account where account.id=actor for update;
  delete from public.newsletter_subscriptions where user_id=actor;
end;
$$;
revoke all on function public.unsubscribe_newsletter() from public;
grant execute on function public.unsubscribe_newsletter() to authenticated;

-- All browser mutations now pass through the RPC boundaries above. Direct
-- table writes could otherwise bypass toggle/idempotency and caller derivation.
revoke insert,update,delete on public.comments from authenticated;
revoke insert,update,delete on public.nota_votes from authenticated;
revoke insert,update,delete on public.comment_votes from authenticated;
revoke insert,update,delete on public.newsletter_subscriptions from authenticated;

commit;
