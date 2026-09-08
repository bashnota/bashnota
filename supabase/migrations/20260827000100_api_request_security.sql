begin;

-- The Data API is the production backend boundary. Keep request state outside
-- the exposed public schema and make each fixed-window increment atomic.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.api_rate_limits (
  scope text not null check (scope in ('ip', 'account')),
  subject text not null,
  route text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (scope, subject, route, window_started_at)
);
create index api_rate_limits_retention_idx
  on private.api_rate_limits(window_started_at);
revoke all on private.api_rate_limits from public, anon, authenticated;

create type public.authenticated_api_request as (
  user_id uuid,
  role_name text
);

create or replace function private.authenticated_request()
returns public.authenticated_api_request
language plpgsql stable security definer set search_path = '' as $$
declare
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  auth_header text := headers->>'authorization';
  actor uuid;
  claimed_role text := claims->>'role';
begin
  if auth_header is null or auth_header !~ '^Bearer [^[:space:]]+$' then
    raise exception 'malformed authorization header' using errcode = '28000';
  end if;
  begin
    actor := nullif(claims->>'sub', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'malformed authenticated subject' using errcode = '28000';
  end;
  if actor is null or claimed_role <> 'authenticated' or actor is distinct from auth.uid() then
    raise exception 'authenticated request required' using errcode = '42501';
  end if;
  return row(actor, claimed_role)::public.authenticated_api_request;
end;
$$;
revoke all on function private.authenticated_request() from public, anon, authenticated;

create or replace function private.consume_api_quota(
  p_scope text,
  p_subject text,
  p_route text,
  p_limit integer,
  p_window_seconds integer default 60,
  p_now timestamptz default clock_timestamp()
) returns table (remaining integer, reset_at timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
declare
  bucket_start timestamptz;
  consumed integer;
begin
  if p_scope not in ('ip', 'account') or nullif(p_subject, '') is null
    or nullif(p_route, '') is null or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit configuration' using errcode = '22023';
  end if;
  bucket_start := to_timestamp(floor(extract(epoch from p_now) / p_window_seconds) * p_window_seconds);
  -- Inline retention keeps the limiter self-contained on deployments without
  -- pg_cron. The timestamp index makes the normally empty cleanup inexpensive.
  delete from private.api_rate_limits
  where window_started_at < bucket_start - interval '1 hour';
  insert into private.api_rate_limits(scope, subject, route, window_started_at, request_count)
  values (p_scope, p_subject, p_route, bucket_start, 1)
  on conflict (scope, subject, route, window_started_at) do update
    set request_count = private.api_rate_limits.request_count + 1
  returning request_count into consumed;
  reset_at := bucket_start + make_interval(secs => p_window_seconds);
  remaining := greatest(p_limit - consumed, 0);
  if consumed > p_limit then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'rate_limit_exceeded',
        'message', 'Rate limit exceeded',
        'details', 'Request quota exhausted; retry after the reset time',
        'hint', null)::text,
      detail = json_build_object(
        'status', 429,
        'status_text', 'Too Many Requests',
        'headers', json_build_object(
          'Retry-After', greatest(1, ceil(extract(epoch from reset_at - p_now)))::integer::text,
          'X-RateLimit-Limit', p_limit::text,
          'X-RateLimit-Remaining', '0',
          'X-RateLimit-Reset', extract(epoch from reset_at)::bigint::text))::text;
  end if;
  return next;
end;
$$;
revoke all on function private.consume_api_quota(text,text,text,integer,integer,timestamptz)
  from public, anon, authenticated;

create or replace function public.api_request_boundary()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  req_method text := current_setting('request.method', true);
  req_path text := trim(leading '/' from coalesce(current_setting('request.path', true), ''));
  auth_header text := headers->>'authorization';
  -- Kong overwrites X-Real-IP from the connection peer before forwarding to
  -- PostgREST. X-Forwarded-For can contain arbitrary client-supplied prefixes
  -- and therefore must never be used as the quota identity.
  gateway_client_address text := headers->>'x-real-ip';
  client_ip inet;
  actor public.authenticated_api_request;
  quota record;
  route_limit integer;
  content_length bigint;
  mutation_routes constant text[] := array[
    'rpc/publish_nota','rpc/publish_nota_hierarchy','rpc/unpublish_nota',
    'rpc/record_nota_clone','rpc/create_comment','rpc/edit_comment','rpc/delete_comment',
    'rpc/toggle_nota_vote','rpc/toggle_comment_vote','rpc/upsert_newsletter_subscription',
    'rpc/unsubscribe_newsletter','rpc/provision_user_profile','rpc/rename_user_tag'
  ];
  expensive_routes constant text[] := array[
    'rpc/query_publications','rpc/query_comments','rpc/record_nota_view'
  ];
begin
  perform set_config('response.headers', jsonb_build_array(
    jsonb_build_object('X-Content-Type-Options','nosniff'),
    jsonb_build_object('X-Frame-Options','DENY'),
    jsonb_build_object('Referrer-Policy','strict-origin-when-cross-origin'),
    jsonb_build_object('Permissions-Policy','camera=(), microphone=(), geolocation=()'),
    jsonb_build_object('Content-Security-Policy','default-src ''none''; frame-ancestors ''none'''),
    jsonb_build_object('Strict-Transport-Security','max-age=31536000; includeSubDomains')
  )::text, true);

  if auth_header is not null and auth_header !~ '^Bearer [^[:space:]]+$' then
    raise exception 'malformed authorization header' using errcode = '28000';
  end if;
  begin
    if gateway_client_address is null or gateway_client_address <> btrim(gateway_client_address)
      or gateway_client_address like '%,%' then
      raise exception 'missing or malformed gateway client address' using errcode = '22023';
    end if;
    client_ip := gateway_client_address::inet;
  exception when invalid_text_representation then
    raise exception 'missing or malformed gateway client address' using errcode = '22023';
  end;
  begin
    content_length := nullif(headers->>'content-length', '')::bigint;
  exception when invalid_text_representation then
    raise exception 'malformed content length' using errcode = '22023';
  end;
  if content_length is not null and content_length > 2097152 then
    raise exception 'request body exceeds 2 MiB' using errcode = '22023';
  end if;

  -- OPTIONS and read-only table/view requests do not consume a write quota.
  if req_method is null or req_method in ('GET', 'HEAD', 'OPTIONS') then return; end if;
  if req_path = any(mutation_routes) then
    actor := private.authenticated_request();
    route_limit := coalesce(nullif(current_setting('app.api_account_limit', true), '')::integer, 60);
    select * into quota from private.consume_api_quota(
      'account', actor.user_id::text, req_path, route_limit, 60);
  elsif req_path = any(expensive_routes) then
    route_limit := coalesce(nullif(current_setting('app.api_ip_limit', true), '')::integer, 30);
    select * into quota from private.consume_api_quota(
      'ip', client_ip::text, req_path, route_limit, 60);
  end if;
end;
$$;
revoke all on function public.api_request_boundary() from public;
grant execute on function public.api_request_boundary() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request = 'public.api_request_boundary';
notify pgrst, 'reload config';

create or replace function private.assert_id(p_value text, p_label text, p_nullable boolean default false)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_value is null and p_nullable then return; end if;
  if p_value is null or length(p_value) not between 1 and 160
    or p_value ~ '[[:cntrl:]]' or p_value <> btrim(p_value) then
    raise exception '% must be a trimmed 1-160 character identifier', p_label using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.assert_id(text,text,boolean) from public, anon, authenticated;

create or replace function private.assert_publication_payload(
  p_id text, p_title text, p_content jsonb, p_author_name text,
  p_parent_id text, p_citations jsonb, p_tags text[], p_child_ids text[]
) returns void language plpgsql immutable set search_path = '' as $$
begin
  perform private.assert_id(p_id, 'publication id');
  perform private.assert_id(p_parent_id, 'parent id', true);
  if p_title is null or length(btrim(p_title)) not between 1 and 500 then
    raise exception 'title must contain 1-500 characters' using errcode = '22023';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' or pg_column_size(p_content) > 1048576 then
    raise exception 'content must be an object no larger than 1 MiB' using errcode = '22023';
  end if;
  if length(coalesce(p_author_name, '')) > 200 then
    raise exception 'author name must be at most 200 characters' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_citations, '[]')) <> 'array' or pg_column_size(coalesce(p_citations, '[]')) > 131072 then
    raise exception 'citations must be an array no larger than 128 KiB' using errcode = '22023';
  end if;
  if cardinality(coalesce(p_tags, '{}')) > 100
    or exists(select 1 from unnest(coalesce(p_tags, '{}')) tag where length(tag) not between 1 and 100) then
    raise exception 'tags must contain at most 100 values of 1-100 characters' using errcode = '22023';
  end if;
  if cardinality(coalesce(p_child_ids, '{}')) > 500 then
    raise exception 'a publication may contain at most 500 ordered children' using errcode = '22023';
  end if;
  perform private.assert_id(child_id, 'child id') from unnest(coalesce(p_child_ids, '{}')) child_id;
end;
$$;
revoke all on function private.assert_publication_payload(text,text,jsonb,text,text,jsonb,text[],text[])
  from public, anon, authenticated;

-- Put strict wrappers in front of the existing, already authorization-safe RPCs.
alter function public.query_publications(text,uuid,text,boolean,integer,timestamptz,text)
  rename to query_publications_bounded_impl;
create function public.query_publications(
  p_id text default null, p_author_id uuid default null, p_author_tag text default null,
  p_owner_only boolean default false, p_limit integer default 20,
  p_before_published_at timestamptz default null, p_before_id text default null
) returns table (
  id text, title text, content jsonb, author_name text, author_tag text,
  is_sub_page boolean, parent_id text, published_sub_pages text[],
  published_nota_citations jsonb, tags text[], published_at timestamptz,
  updated_at timestamptz, view_count bigint, unique_viewers bigint,
  like_count bigint, dislike_count bigint, clone_count bigint,
  comment_count bigint, last_viewed_at timestamptz
)
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.assert_id(p_id, 'publication id', true);
  perform private.assert_id(p_before_id, 'pagination id', true);
  if p_author_tag is not null and p_author_tag !~ '^[a-zA-Z0-9_]{3,30}$' then
    raise exception 'invalid author tag' using errcode = '22023';
  end if;
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'page limit must be between 1 and 100' using errcode = '22023';
  end if;
  return query select * from public.query_publications_bounded_impl(
    p_id,p_author_id,p_author_tag,p_owner_only,p_limit,p_before_published_at,p_before_id);
end;
$$;

alter function public.query_comments(text,text,integer,timestamptz,text)
  rename to query_comments_bounded_impl;
create function public.query_comments(
  p_nota_id text, p_parent_id text default null, p_limit integer default 20,
  p_before_created_at timestamptz default null, p_before_id text default null
) returns setof public.community_comment_result
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.assert_id(p_nota_id, 'publication id');
  perform private.assert_id(p_parent_id, 'parent comment id', true);
  perform private.assert_id(p_before_id, 'pagination id', true);
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'page limit must be between 1 and 100' using errcode = '22023';
  end if;
  return query select * from public.query_comments_bounded_impl(
    p_nota_id,p_parent_id,p_limit,p_before_created_at,p_before_id);
end;
$$;

alter function public.publish_nota(text,text,jsonb,text,boolean,text,jsonb,text[],text[])
  rename to publish_nota_bounded_impl;
create function public.publish_nota(
  p_id text, p_title text, p_content jsonb, p_author_name text,
  p_is_sub_page boolean default false, p_parent_id text default null,
  p_citations jsonb default '[]', p_tags text[] default '{}', p_child_ids text[] default '{}'
) returns setof public.public_published_notas
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.assert_publication_payload(
    p_id,p_title,p_content,p_author_name,p_parent_id,p_citations,p_tags,p_child_ids);
  return query select * from public.publish_nota_bounded_impl(
    p_id,p_title,p_content,p_author_name,p_is_sub_page,p_parent_id,p_citations,p_tags,p_child_ids);
end;
$$;

alter function public.publish_nota_hierarchy(jsonb) rename to publish_nota_hierarchy_bounded_impl;
create function public.publish_nota_hierarchy(p_publications jsonb)
returns setof public.public_published_notas
language plpgsql volatile security definer set search_path = '' as $$
declare publication jsonb;
begin
  if jsonb_typeof(p_publications) <> 'array' or jsonb_array_length(p_publications) not between 1 and 500
    or pg_column_size(p_publications) > 2097152 then
    raise exception 'publication hierarchy must contain 1-500 notas and fit within 2 MiB' using errcode = '22023';
  end if;
  for publication in select value from jsonb_array_elements(p_publications) loop
    perform private.assert_publication_payload(
      publication->>'id', publication->>'title', publication->'content',
      publication->>'author_name', nullif(publication->>'parent_id',''),
      coalesce(publication->'citations','[]'),
      array(select value from jsonb_array_elements_text(coalesce(publication->'tags','[]'))),
      array(select value from jsonb_array_elements_text(coalesce(publication->'child_ids','[]'))));
  end loop;
  if exists (
    with recursive walk(id, depth, path) as (
      select item->>'id', 1, array[item->>'id'] from jsonb_array_elements(p_publications) item
      where nullif(item->>'parent_id','') is null
      union all
      select child->>'id', walk.depth + 1, walk.path || (child->>'id')
      from walk join lateral jsonb_array_elements(p_publications) child
        on nullif(child->>'parent_id','') = walk.id
      where not (child->>'id' = any(walk.path)) and walk.depth <= 32
    ) select 1 from walk where depth > 32
  ) then raise exception 'publication nesting may not exceed 32 levels' using errcode = '22023'; end if;
  return query select * from public.publish_nota_hierarchy_bounded_impl(p_publications);
end;
$$;

alter function public.unpublish_nota(text) rename to unpublish_nota_bounded_impl;
create function public.unpublish_nota(p_id text)
returns text[] language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.assert_id(p_id, 'publication id');
  return public.unpublish_nota_bounded_impl(p_id);
end;
$$;

alter function public.record_nota_view(text,text) rename to record_nota_view_bounded_impl;
create function public.record_nota_view(p_nota_id text, p_referrer_key text default null)
returns table(view_count bigint, unique_viewers bigint)
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.assert_id(p_nota_id, 'publication id');
  if p_referrer_key is not null and p_referrer_key !~ '^[a-zA-Z0-9.-]{1,253}$' then
    raise exception 'invalid referrer key' using errcode = '22023';
  end if;
  return query select * from public.record_nota_view_bounded_impl(p_nota_id,p_referrer_key);
end;
$$;

alter function public.record_nota_clone(text) rename to record_nota_clone_bounded_impl;
create function public.record_nota_clone(p_nota_id text)
returns bigint language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.assert_id(p_nota_id, 'publication id');
  return public.record_nota_clone_bounded_impl(p_nota_id);
end;
$$;

alter function public.create_comment(text,text,jsonb,text,text) rename to create_comment_bounded_impl;
create function public.create_comment(
  p_id text, p_nota_id text, p_content jsonb,
  p_author_name text default null, p_parent_id text default null
) returns setof public.community_comment_result
language plpgsql volatile security definer set search_path = '' as $$
declare parent_depth integer;
begin
  perform private.assert_id(p_id, 'comment id');
  perform private.assert_id(p_nota_id, 'publication id');
  perform private.assert_id(p_parent_id, 'parent comment id', true);
  if p_content is null or pg_column_size(p_content) > 20000 then
    raise exception 'comment content is required and must be at most 20000 bytes' using errcode = '22023';
  end if;
  if length(coalesce(p_author_name,'')) > 200 then
    raise exception 'author name must be at most 200 characters' using errcode = '22023';
  end if;
  if p_parent_id is not null then
    with recursive ancestors(id,parent_id,depth) as (
      select c.id,c.parent_id,1 from public.comments c where c.id=p_parent_id
      union all
      select parent.id,parent.parent_id,ancestors.depth+1
      from ancestors join public.comments parent on parent.id=ancestors.parent_id
      where ancestors.depth <= 8
    ) select coalesce(max(depth),0) into parent_depth from ancestors;
    if parent_depth >= 8 then
      raise exception 'comment nesting may not exceed 8 levels' using errcode = '22023';
    end if;
  end if;
  return query select * from public.create_comment_bounded_impl(
    p_id,p_nota_id,p_content,p_author_name,p_parent_id);
end;
$$;

alter function public.edit_comment(text,jsonb) rename to edit_comment_bounded_impl;
create function public.edit_comment(p_id text,p_content jsonb)
returns setof public.community_comment_result
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.assert_id(p_id, 'comment id');
  if p_content is null or pg_column_size(p_content) > 20000 then
    raise exception 'comment content is required and must be at most 20000 bytes' using errcode = '22023';
  end if;
  return query select * from public.edit_comment_bounded_impl(p_id,p_content);
end;
$$;

alter function public.delete_comment(text) rename to delete_comment_bounded_impl;
create function public.delete_comment(p_id text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.assert_id(p_id, 'comment id');
  perform public.delete_comment_bounded_impl(p_id);
end;
$$;

alter function public.toggle_nota_vote(text,public.vote_type) rename to toggle_nota_vote_bounded_impl;
create function public.toggle_nota_vote(p_nota_id text,p_vote public.vote_type)
returns public.community_vote_result language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.assert_id(p_nota_id, 'publication id');
  return public.toggle_nota_vote_bounded_impl(p_nota_id,p_vote);
end;
$$;

alter function public.toggle_comment_vote(text,public.vote_type) rename to toggle_comment_vote_bounded_impl;
create function public.toggle_comment_vote(p_comment_id text,p_vote public.vote_type)
returns public.community_vote_result language plpgsql volatile security definer set search_path = '' as $$
begin
  perform private.assert_id(p_comment_id, 'comment id');
  return public.toggle_comment_vote_bounded_impl(p_comment_id,p_vote);
end;
$$;

alter function public.provision_user_profile(text,text,text) rename to provision_user_profile_bounded_impl;
create function public.provision_user_profile(
  p_user_tag text, p_display_name text default '', p_photo_url text default ''
) returns public.profiles language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_user_tag !~ '^[a-zA-Z0-9_]{3,30}$' or length(coalesce(p_display_name,'')) > 200
    or length(coalesce(p_photo_url,'')) > 2048 then
    raise exception 'invalid profile fields' using errcode = '22023';
  end if;
  return public.provision_user_profile_bounded_impl(p_user_tag,p_display_name,p_photo_url);
end;
$$;

alter function public.rename_user_tag(text,text) rename to rename_user_tag_bounded_impl;
create function public.rename_user_tag(p_user_tag text,p_photo_url text default null)
returns public.profiles language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_user_tag !~ '^[a-zA-Z0-9_]{3,30}$' or length(coalesce(p_photo_url,'')) > 2048 then
    raise exception 'invalid profile fields' using errcode = '22023';
  end if;
  return public.rename_user_tag_bounded_impl(p_user_tag,p_photo_url);
end;
$$;

alter function public.upsert_newsletter_subscription(text,text)
  rename to upsert_newsletter_subscription_bounded_impl;
create function public.upsert_newsletter_subscription(p_email text,p_display_name text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if length(coalesce(p_email,'')) > 320 or length(coalesce(p_display_name,'')) > 200 then
    raise exception 'newsletter fields are too long' using errcode = '22023';
  end if;
  perform public.upsert_newsletter_subscription_bounded_impl(p_email,p_display_name);
end;
$$;

-- Row constraints close direct/table and future-RPC bypasses as a second line
-- of defense. The RPC wrappers above still reject before any mutation.
alter table public.published_notas
  add constraint published_notas_id_bounded check (length(id) between 1 and 160),
  add constraint published_notas_title_bounded check (length(btrim(title)) between 1 and 500),
  add constraint published_notas_content_bounded check (content is null or pg_column_size(content) <= 1048576),
  add constraint published_notas_author_name_bounded check (length(author_name) <= 200),
  add constraint published_notas_tags_bounded check (cardinality(tags) <= 100);
alter table public.comments
  add constraint comments_id_bounded check (length(id) between 1 and 160),
  add constraint comments_content_bounded check (pg_column_size(content) <= 20000),
  add constraint comments_author_name_bounded check (length(author_name) <= 200);

-- Internal implementations are callable only by their owner through wrappers.
revoke all on function public.query_publications_bounded_impl(text,uuid,text,boolean,integer,timestamptz,text),
  public.query_comments_bounded_impl(text,text,integer,timestamptz,text),
  public.publish_nota_bounded_impl(text,text,jsonb,text,boolean,text,jsonb,text[],text[]),
  public.publish_nota_hierarchy_bounded_impl(jsonb), public.unpublish_nota_bounded_impl(text),
  public.record_nota_view_bounded_impl(text,text), public.record_nota_clone_bounded_impl(text),
  public.create_comment_bounded_impl(text,text,jsonb,text,text),
  public.edit_comment_bounded_impl(text,jsonb), public.delete_comment_bounded_impl(text),
  public.toggle_nota_vote_bounded_impl(text,public.vote_type),
  public.toggle_comment_vote_bounded_impl(text,public.vote_type),
  public.provision_user_profile_bounded_impl(text,text,text),
  public.rename_user_tag_bounded_impl(text,text),
  public.upsert_newsletter_subscription_bounded_impl(text,text)
  from public, anon, authenticated;
revoke all on function public.query_publications(text,uuid,text,boolean,integer,timestamptz,text),
  public.query_comments(text,text,integer,timestamptz,text),
  public.publish_nota(text,text,jsonb,text,boolean,text,jsonb,text[],text[]),
  public.publish_nota_hierarchy(jsonb), public.unpublish_nota(text),
  public.record_nota_view(text,text), public.record_nota_clone(text),
  public.create_comment(text,text,jsonb,text,text), public.edit_comment(text,jsonb),
  public.delete_comment(text), public.toggle_nota_vote(text,public.vote_type),
  public.toggle_comment_vote(text,public.vote_type), public.provision_user_profile(text,text,text),
  public.rename_user_tag(text,text), public.upsert_newsletter_subscription(text,text)
  from public, anon, authenticated;
grant execute on function public.query_publications(text,uuid,text,boolean,integer,timestamptz,text),
  public.query_comments(text,text,integer,timestamptz,text) to anon, authenticated;
grant execute on function public.publish_nota(text,text,jsonb,text,boolean,text,jsonb,text[],text[]),
  public.publish_nota_hierarchy(jsonb), public.unpublish_nota(text), public.record_nota_clone(text),
  public.create_comment(text,text,jsonb,text,text), public.edit_comment(text,jsonb),
  public.delete_comment(text), public.toggle_nota_vote(text,public.vote_type),
  public.toggle_comment_vote(text,public.vote_type), public.provision_user_profile(text,text,text),
  public.rename_user_tag(text,text), public.upsert_newsletter_subscription(text,text)
  to authenticated;
grant execute on function public.record_nota_view(text,text) to anon, authenticated;

comment on function public.query_publications(text,uuid,text,boolean,integer,timestamptz,text) is
  'Bounded publication query. Sort is fixed to the allowlisted published_at,id order; arbitrary sortable fields are not accepted.';
comment on function public.query_comments(text,text,integer,timestamptz,text) is
  'Bounded comment query. Sort is fixed to the allowlisted created_at,id order; arbitrary sortable fields are not accepted.';
comment on function public.api_request_boundary() is
  'Production PostgREST middleware: security headers, typed auth, body bounds, and per-IP/per-account quotas.';

commit;
