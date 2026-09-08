create or replace function public.reject_immutable_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.firebase_uid is distinct from old.firebase_uid then
    raise exception 'firebase identity is immutable' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.supabase_user_id is distinct from old.supabase_user_id then
    raise exception 'Supabase identity is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger identity_map_immutable before update on public.identity_map
for each row execute function public.reject_immutable_identity();
revoke all on function public.reject_immutable_identity() from public;

create or replace function public.enforce_client_safe_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  before_row jsonb := to_jsonb(old);
  after_row jsonb := to_jsonb(new);
begin
  -- Nested writes from SECURITY DEFINER maintenance functions run as their
  -- owner. Browser mutations always run as anon/authenticated.
  if current_user not in ('anon', 'authenticated') then return new; end if;

  if tg_table_name = 'published_notas' then
    if after_row->'id' is distinct from before_row->'id' or
       after_row->'author_id' is distinct from before_row->'author_id' or
       after_row->'legacy_author_uid' is distinct from before_row->'legacy_author_uid' or
       after_row->'view_count' is distinct from before_row->'view_count' or
       after_row->'unique_viewers' is distinct from before_row->'unique_viewers' or
       after_row->'like_count' is distinct from before_row->'like_count' or
       after_row->'dislike_count' is distinct from before_row->'dislike_count' or
       after_row->'comment_count' is distinct from before_row->'comment_count' or
       after_row->'clone_count' is distinct from before_row->'clone_count' or
       after_row->'last_viewed_at' is distinct from before_row->'last_viewed_at' or
       after_row->'content_quarantine_text' is distinct from before_row->'content_quarantine_text' or
       after_row->'source_published_at_raw' is distinct from before_row->'source_published_at_raw' or
       after_row->'source_updated_at_raw' is distinct from before_row->'source_updated_at_raw' then
      raise exception 'identity and aggregate columns are server maintained' using errcode = '42501';
    end if;
  elsif tg_table_name = 'comments' then
    if after_row->'id' is distinct from before_row->'id' or
       after_row->'nota_id' is distinct from before_row->'nota_id' or
       after_row->'author_id' is distinct from before_row->'author_id' or
       after_row->'legacy_author_uid' is distinct from before_row->'legacy_author_uid' or
       after_row->'parent_id' is distinct from before_row->'parent_id' or
       after_row->'like_count' is distinct from before_row->'like_count' or
       after_row->'dislike_count' is distinct from before_row->'dislike_count' or
       after_row->'reply_count' is distinct from before_row->'reply_count' or
       after_row->'created_at' is distinct from before_row->'created_at' or
       after_row->'source_created_at_raw' is distinct from before_row->'source_created_at_raw' or
       after_row->'source_updated_at_raw' is distinct from before_row->'source_updated_at_raw' then
      raise exception 'comment identity, relationship, and aggregate columns are server maintained' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger published_notas_safe_changes before update on public.published_notas
for each row execute function public.enforce_client_safe_changes();
create trigger comments_safe_changes before update on public.comments
for each row execute function public.enforce_client_safe_changes();
revoke all on function public.enforce_client_safe_changes() from public;

create or replace function public.enforce_client_insert_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(new);
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_table_name = 'published_notas' and
     ((row_data->>'view_count')::bigint <> 0 or
      (row_data->>'unique_viewers')::bigint <> 0 or
      (row_data->>'like_count')::bigint <> 0 or
      (row_data->>'dislike_count')::bigint <> 0 or
      (row_data->>'clone_count')::bigint <> 0 or
      (row_data->>'comment_count')::bigint <> 0 or
      row_data->'last_viewed_at' <> 'null'::jsonb or
      row_data->'content_quarantine_text' <> 'null'::jsonb or
      row_data->'source_published_at_raw' <> 'null'::jsonb or
      row_data->'source_updated_at_raw' <> 'null'::jsonb) then
    raise exception 'new publication aggregate columns must start empty' using errcode = '42501';
  elsif tg_table_name = 'comments' and
        ((row_data->>'like_count')::bigint <> 0 or
         (row_data->>'dislike_count')::bigint <> 0 or
         (row_data->>'reply_count')::bigint <> 0 or
         row_data->'source_created_at_raw' <> 'null'::jsonb or
         row_data->'source_updated_at_raw' <> 'null'::jsonb) then
    raise exception 'new comment aggregate columns must start empty' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger published_notas_empty_counts before insert on public.published_notas
for each row execute function public.enforce_client_insert_defaults();
create trigger comments_empty_counts before insert on public.comments
for each row execute function public.enforce_client_insert_defaults();
revoke all on function public.enforce_client_insert_defaults() from public;

create or replace function public.enforce_owned_row_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  before_row jsonb := to_jsonb(old);
  after_row jsonb := to_jsonb(new);
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_table_name = 'profiles' and
     (after_row->'user_id' is distinct from before_row->'user_id' or
      after_row->'user_tag' is distinct from before_row->'user_tag') then
    raise exception 'profile identity and user tag are immutable' using errcode = '42501';
  elsif tg_table_name = 'private_profiles' and
        (after_row->'user_id' is distinct from before_row->'user_id' or
         after_row->'firebase_uid' is distinct from before_row->'firebase_uid' or
         after_row->'created_at' is distinct from before_row->'created_at' or
         after_row->'source_created_at_raw' is distinct from before_row->'source_created_at_raw' or
         after_row->'source_updated_at_raw' is distinct from before_row->'source_updated_at_raw') then
    raise exception 'private profile identity is immutable' using errcode = '42501';
  elsif tg_table_name = 'nota_votes' and
        (after_row->'nota_id' is distinct from before_row->'nota_id' or
         after_row->'user_id' is distinct from before_row->'user_id') then
    raise exception 'vote identity is immutable' using errcode = '42501';
  elsif tg_table_name = 'comment_votes' and
        (after_row->'comment_id' is distinct from before_row->'comment_id' or
         after_row->'user_id' is distinct from before_row->'user_id') then
    raise exception 'vote identity is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_immutable_identity before update on public.profiles
for each row execute function public.enforce_owned_row_identity();
create trigger private_profiles_immutable_identity before update on public.private_profiles
for each row execute function public.enforce_owned_row_identity();
create trigger nota_votes_immutable_identity before update on public.nota_votes
for each row execute function public.enforce_owned_row_identity();
create trigger comment_votes_immutable_identity before update on public.comment_votes
for each row execute function public.enforce_owned_row_identity();
revoke all on function public.enforce_owned_row_identity() from public;

create or replace function public.validate_comment_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.comments p where p.id = new.parent_id and p.nota_id = new.nota_id
  ) then
    raise exception 'comment parent must belong to the same nota' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger comments_validate_parent before insert on public.comments
for each row execute function public.validate_comment_parent();
revoke all on function public.validate_comment_parent() from public;

create or replace function public.sync_nota_vote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.published_notas set
      like_count = like_count - case when old.vote = 'like' then 1 else 0 end,
      dislike_count = dislike_count - case when old.vote = 'dislike' then 1 else 0 end
    where id = old.nota_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.published_notas set
      like_count = like_count + case when new.vote = 'like' then 1 else 0 end,
      dislike_count = dislike_count + case when new.vote = 'dislike' then 1 else 0 end
    where id = new.nota_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger nota_votes_sync_count after insert or update or delete on public.nota_votes
for each row execute function public.sync_nota_vote_count();
revoke all on function public.sync_nota_vote_count() from public;

create or replace function public.sync_comment_vote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.comments set
      like_count = like_count - case when old.vote = 'like' then 1 else 0 end,
      dislike_count = dislike_count - case when old.vote = 'dislike' then 1 else 0 end
    where id = old.comment_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.comments set
      like_count = like_count + case when new.vote = 'like' then 1 else 0 end,
      dislike_count = dislike_count + case when new.vote = 'dislike' then 1 else 0 end
    where id = new.comment_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger comment_votes_sync_count after insert or update or delete on public.comment_votes
for each row execute function public.sync_comment_vote_count();
revoke all on function public.sync_comment_vote_count() from public;

create or replace function public.sync_comment_relationship_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.published_notas set comment_count = comment_count + 1 where id = new.nota_id;
    if new.parent_id is not null then
      update public.comments set reply_count = reply_count + 1 where id = new.parent_id;
    end if;
  elsif tg_op = 'DELETE' then
    update public.published_notas set comment_count = comment_count - 1 where id = old.nota_id;
    if old.parent_id is not null then
      update public.comments set reply_count = reply_count - 1 where id = old.parent_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger comments_sync_relationship_counts after insert or delete on public.comments
for each row execute function public.sync_comment_relationship_counts();
revoke all on function public.sync_comment_relationship_counts() from public;

create or replace function public.record_nota_view(p_nota_id text, p_referrer_key text default null)
returns table (view_count bigint, unique_viewers bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  was_new_viewer boolean := false;
  viewed_at timestamptz := statement_timestamp();
begin
  if p_referrer_key is not null and p_referrer_key !~ '^[a-zA-Z0-9.-]{1,50}$' then
    raise exception 'invalid referrer key' using errcode = '22023';
  end if;
  if not exists (select 1 from public.published_notas where id = p_nota_id and is_public) then
    raise exception 'published nota not found' using errcode = 'P0002';
  end if;

  if actor is not null then
    insert into public.nota_viewers (nota_id, user_id, first_viewed_at)
      values (p_nota_id, actor, viewed_at)
      on conflict do nothing;
    was_new_viewer := found;
  end if;

  insert into public.nota_view_events (nota_id, viewer_id, occurred_at, referrer_key)
    values (p_nota_id, actor, viewed_at, p_referrer_key);

  insert into public.nota_view_aggregates (nota_id, bucket_kind, bucket_key, view_count)
    values
      (p_nota_id, 'daily', to_char(viewed_at at time zone 'UTC', 'YYYY-MM-DD'), 1),
      (p_nota_id, 'weekly', to_char(viewed_at at time zone 'UTC', 'IYYY-IW'), 1),
      (p_nota_id, 'monthly', to_char(viewed_at at time zone 'UTC', 'YYYY-MM'), 1)
    on conflict (nota_id, bucket_kind, bucket_key)
    do update set view_count = public.nota_view_aggregates.view_count + 1;

  if p_referrer_key is not null then
    insert into public.nota_view_aggregates (nota_id, bucket_kind, bucket_key, view_count)
      values (p_nota_id, 'referrer', p_referrer_key, 1)
      on conflict (nota_id, bucket_kind, bucket_key)
      do update set view_count = public.nota_view_aggregates.view_count + 1;
  end if;

  update public.published_notas n set
    view_count = n.view_count + 1,
    unique_viewers = n.unique_viewers + case when was_new_viewer then 1 else 0 end,
    last_viewed_at = viewed_at
  where n.id = p_nota_id
  returning n.view_count, n.unique_viewers into view_count, unique_viewers;
  return next;
end;
$$;

revoke all on function public.record_nota_view(text, text) from public;
grant execute on function public.record_nota_view(text, text) to anon, authenticated;

create or replace function public.record_nota_clone(p_nota_id text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  result bigint;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  update public.published_notas n
    set clone_count = n.clone_count + 1
    where n.id = p_nota_id and n.is_public
    returning n.clone_count into result;
  if not found then
    raise exception 'published nota not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

revoke all on function public.record_nota_clone(text) from public;
grant execute on function public.record_nota_clone(text) to authenticated;

alter table public.identity_map enable row level security;
alter table public.private_profiles enable row level security;
alter table public.profiles enable row level security;
alter table public.user_tags enable row level security;
alter table public.published_notas enable row level security;
alter table public.nota_votes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_votes enable row level security;
alter table public.nota_viewers enable row level security;
alter table public.nota_view_events enable row level security;
alter table public.nota_view_aggregates enable row level security;
alter table public.newsletter_subscriptions enable row level security;

create policy private_profiles_owner_select on public.private_profiles
for select to authenticated using (user_id = auth.uid());
create policy private_profiles_owner_insert on public.private_profiles
for insert to authenticated with check (user_id = auth.uid());
create policy private_profiles_owner_update on public.private_profiles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy private_profiles_owner_delete on public.private_profiles
for delete to authenticated using (user_id = auth.uid());

create policy profiles_public_select on public.profiles for select to anon, authenticated using (true);
create policy profiles_owner_insert on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy profiles_owner_update on public.profiles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_owner_delete on public.profiles for delete to authenticated using (user_id = auth.uid());

create policy user_tags_public_select on public.user_tags for select to anon, authenticated using (true);
create policy user_tags_owner_insert on public.user_tags for insert to authenticated with check (user_id = auth.uid());
create policy user_tags_owner_delete on public.user_tags for delete to authenticated using (user_id = auth.uid());

create policy published_notas_public_or_owner_select on public.published_notas
for select to anon, authenticated using (is_public or author_id = auth.uid());
create policy published_notas_owner_insert on public.published_notas
for insert to authenticated with check (author_id = auth.uid() and id <> '');
create policy published_notas_owner_update on public.published_notas
for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy published_notas_owner_delete on public.published_notas
for delete to authenticated using (author_id = auth.uid());

create policy nota_votes_owner_select on public.nota_votes for select to authenticated using (user_id = auth.uid());
create policy nota_votes_owner_insert on public.nota_votes for insert to authenticated with check (user_id = auth.uid());
create policy nota_votes_owner_update on public.nota_votes
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy nota_votes_owner_delete on public.nota_votes for delete to authenticated using (user_id = auth.uid());

create policy comments_public_select on public.comments for select to anon, authenticated
using (exists (select 1 from public.published_notas n where n.id = nota_id and n.is_public));
create policy comments_author_insert on public.comments for insert to authenticated
with check (author_id = auth.uid() and exists (
  select 1 from public.published_notas n where n.id = nota_id and n.is_public
));
create policy comments_author_update on public.comments for update to authenticated
using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_author_or_nota_author_delete on public.comments for delete to authenticated
using (author_id = auth.uid() or exists (
  select 1 from public.published_notas n where n.id = nota_id and n.author_id = auth.uid()
));

create policy comment_votes_owner_select on public.comment_votes for select to authenticated using (user_id = auth.uid());
create policy comment_votes_owner_insert on public.comment_votes for insert to authenticated with check (user_id = auth.uid());
create policy comment_votes_owner_update on public.comment_votes
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comment_votes_owner_delete on public.comment_votes for delete to authenticated using (user_id = auth.uid());

create policy nota_viewers_viewer_or_author_select on public.nota_viewers for select to authenticated
using (user_id = auth.uid() or exists (
  select 1 from public.published_notas n where n.id = nota_id and n.author_id = auth.uid()
));

create policy nota_view_aggregates_author_select on public.nota_view_aggregates for select to authenticated
using (exists (select 1 from public.published_notas n where n.id = nota_id and n.author_id = auth.uid()));

create policy newsletter_owner_select on public.newsletter_subscriptions
for select to authenticated using (user_id = auth.uid());
create policy newsletter_owner_insert on public.newsletter_subscriptions
for insert to authenticated with check (user_id = auth.uid());
create policy newsletter_owner_delete on public.newsletter_subscriptions
for delete to authenticated using (user_id = auth.uid());

revoke all on public.identity_map from anon, authenticated;
grant select, insert, update, delete on public.private_profiles, public.profiles, public.user_tags,
  public.published_notas, public.nota_votes, public.comments, public.comment_votes,
  public.newsletter_subscriptions to authenticated;
grant select on public.nota_viewers to authenticated;
grant select on public.profiles, public.public_profiles, public.user_tags, public.published_notas,
  public.comments to anon;
grant select on public.nota_view_aggregates to authenticated;
revoke all on public.nota_view_events from anon, authenticated;
revoke insert, update, delete on public.nota_view_aggregates from anon, authenticated;
revoke update on public.newsletter_subscriptions from anon, authenticated;
