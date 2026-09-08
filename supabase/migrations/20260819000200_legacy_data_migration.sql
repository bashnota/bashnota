-- Restricted, resumable operator state for the provider-neutral legacy backfill.
-- Product roles receive no access and production cutover remains disabled.
begin;

alter table public.published_notas add column source_last_viewed_at_raw text;
alter table public.nota_votes
  add column source_created_at_raw text,
  add column source_updated_at_raw text;
alter table public.comment_votes
  add column source_created_at_raw text,
  add column source_updated_at_raw text;
alter table public.nota_viewers add column source_first_viewed_at_raw text;

create table public.legacy_notas (
  id text primary key,
  legacy_owner_uid text not null,
  payload jsonb not null,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  imported_at timestamptz not null default now()
);

create table public.legacy_migration_runs (
  id text primary key,
  source_watermark text not null,
  manifest_hash text not null check (manifest_hash ~ '^[0-9a-f]{64}$'),
  identity_plan_hash text not null check (identity_plan_hash ~ '^[0-9a-f]{64}$'),
  tool_version text not null,
  dry_run boolean not null default false,
  state text not null check (state in ('running','completed','failed','rolling-back','rolled-back')),
  checkpoint_sequence bigint not null default 0 check (checkpoint_sequence >= 0),
  counters jsonb not null default '{}'::jsonb check (jsonb_typeof(counters) = 'object'),
  lease_owner_hash text check (lease_owner_hash is null or lease_owner_hash ~ '^[0-9a-f]{64}$'),
  lease_expires_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.legacy_identity_provisioning (
  source_uid text primary key,
  supabase_user_id uuid not null unique,
  provider text not null check (provider in ('email','google')),
  provider_uid text not null,
  verified_email_hash text not null check (verified_email_hash ~ '^[0-9a-f]{64}$'),
  state text not null check (state in ('planned','provisioned','linked')),
  created_at timestamptz not null default now(),
  unique(provider,provider_uid)
);

create table public.legacy_migration_journal (
  entity_kind text not null check (entity_kind in (
    'identity','legacy_nota','publication','publication_edge','nota_vote',
    'nota_viewer','metric_bucket','comment','comment_vote','newsletter'
  )),
  source_key_hash text not null check (source_key_hash ~ '^[0-9a-f]{64}$'),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  first_run_id text not null references public.legacy_migration_runs(id) on delete restrict,
  sequence bigint not null check (sequence > 0),
  target_key jsonb not null check (jsonb_typeof(target_key) = 'object'),
  target_hash text not null check (target_hash ~ '^[0-9a-f]{64}$'),
  state text not null check (state in ('applying','applied','failed','rolled-back')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  mutation_kind text check (mutation_kind in ('created','preexisting')),
  applied_by_run_id text references public.legacy_migration_runs(id) on delete restrict,
  prior_row_hash text check (prior_row_hash is null or prior_row_hash ~ '^[0-9a-f]{64}$'),
  error_class text check (error_class in ('transient','conflict','permanent')),
  applied_at timestamptz,
  primary key (entity_kind, source_key_hash),
  unique (first_run_id, sequence)
);

create table public.legacy_migration_audit (
  run_id text not null references public.legacy_migration_runs(id) on delete restrict,
  sequence bigint not null,
  previous_hash text,
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  event jsonb not null check (jsonb_typeof(event) = 'object'),
  event_hash text not null check (event_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (run_id, sequence),
  unique (run_id, idempotency_key),
  unique (event_hash)
);

alter table public.legacy_notas enable row level security;
alter table public.legacy_migration_runs enable row level security;
alter table public.legacy_identity_provisioning enable row level security;
alter table public.legacy_migration_journal enable row level security;
alter table public.legacy_migration_audit enable row level security;

revoke all on public.legacy_notas, public.legacy_migration_runs, public.legacy_identity_provisioning,
  public.legacy_migration_journal, public.legacy_migration_audit from public, anon, authenticated;
grant select, insert, update, delete on public.legacy_notas to service_role;
grant select, insert, update on public.legacy_migration_runs to service_role;
grant select, insert, update on public.legacy_identity_provisioning to service_role;
grant select on public.legacy_migration_journal, public.legacy_migration_audit to service_role;
grant select, insert, update, delete on public.identity_map, public.private_profiles,
  public.profiles, public.user_tags, public.published_notas, public.published_nota_edges,
  public.nota_votes, public.nota_viewers, public.nota_view_aggregates,
  public.comments, public.comment_votes, public.newsletter_subscriptions to service_role;

create or replace function public.normalize_legacy_migration_target(
  p_entity_kind text,p_payload jsonb
) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb;
begin
  case p_entity_kind
    when 'identity' then result:=jsonb_build_object(
      'source_uid',p_payload->>'source_uid','supabase_user_id',p_payload->>'supabase_user_id',
      'provider',p_payload->>'provider','provider_uid',p_payload->>'provider_uid',
      'verified_email',lower(p_payload->>'verified_email'),'user_tag',p_payload->>'user_tag',
      'display_name',nullif(p_payload->>'display_name',''),'photo_url',coalesce(p_payload->>'photo_url',''),
      'created_at',(p_payload->>'created_at')::timestamptz,'updated_at',(p_payload->>'updated_at')::timestamptz,
      'profile_updated_at',(p_payload->>'profile_updated_at')::timestamptz,'tag_created_at',(p_payload->>'tag_created_at')::timestamptz,
      'source_created_at_raw',p_payload->'source_created_at_raw','source_updated_at_raw',p_payload->'source_updated_at_raw'
    );
    when 'legacy_nota' then result:=to_jsonb(jsonb_populate_record(null::public.legacy_notas,p_payload))-'imported_at';
    when 'publication' then result:=to_jsonb(jsonb_populate_record(null::public.published_notas,p_payload));
    when 'publication_edge' then result:=to_jsonb(jsonb_populate_record(null::public.published_nota_edges,p_payload));
    when 'nota_vote' then result:=to_jsonb(jsonb_populate_record(null::public.nota_votes,p_payload));
    when 'nota_viewer' then result:=to_jsonb(jsonb_populate_record(null::public.nota_viewers,p_payload));
    when 'metric_bucket' then result:=to_jsonb(jsonb_populate_record(null::public.nota_view_aggregates,p_payload));
    when 'comment' then result:=to_jsonb(jsonb_populate_record(null::public.comments,p_payload));
    when 'comment_vote' then result:=to_jsonb(jsonb_populate_record(null::public.comment_votes,p_payload));
    when 'newsletter' then result:=to_jsonb(jsonb_populate_record(null::public.newsletter_subscriptions,p_payload));
    else raise exception 'unsupported migration entity kind' using errcode='22023';
  end case;
  return result;
end;
$$;

create or replace function public.legacy_migration_target_snapshot(
  p_entity_kind text,p_target_key jsonb
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; provider_name text;
begin
  case p_entity_kind
    when 'identity' then
      provider_name:=p_target_key->>'provider';
      select jsonb_build_object(
        'source_uid',mapping.firebase_uid,'supabase_user_id',mapping.supabase_user_id::text,
        'provider',provider_name,'provider_uid',mapping.provider_links->provider_name->>'uid',
        'verified_email',lower(mapping.provider_links->provider_name->>'verified_email'),'user_tag',profile.user_tag,
        'display_name',private_profile.display_name,'photo_url',profile.photo_url,
        'created_at',private_profile.created_at,'updated_at',private_profile.updated_at,
        'profile_updated_at',profile.updated_at,'tag_created_at',tag.created_at,
        'source_created_at_raw',to_jsonb(private_profile.source_created_at_raw),
        'source_updated_at_raw',to_jsonb(private_profile.source_updated_at_raw)
      ) into result
      from public.identity_map mapping
      join public.private_profiles private_profile on private_profile.user_id=mapping.supabase_user_id
      join public.profiles profile on profile.user_id=mapping.supabase_user_id
      join public.user_tags tag on tag.user_id=mapping.supabase_user_id and tag.user_tag=profile.user_tag
      where mapping.firebase_uid=p_target_key->>'sourceUid';
    when 'legacy_nota' then select to_jsonb(row)-'imported_at' into result from public.legacy_notas row where row.id=p_target_key->>'id';
    when 'publication' then select to_jsonb(row) into result from public.published_notas row where row.id=p_target_key->>'id';
    when 'publication_edge' then select to_jsonb(row) into result from public.published_nota_edges row where row.parent_id=p_target_key->>'parentId' and row.child_id=p_target_key->>'childId';
    when 'nota_vote' then select to_jsonb(row) into result from public.nota_votes row where row.nota_id=p_target_key->>'notaId' and row.user_id=(p_target_key->>'userId')::uuid;
    when 'nota_viewer' then select to_jsonb(row) into result from public.nota_viewers row where row.nota_id=p_target_key->>'notaId' and row.user_id=(p_target_key->>'userId')::uuid;
    when 'metric_bucket' then select to_jsonb(row) into result from public.nota_view_aggregates row where row.nota_id=p_target_key->>'notaId' and row.bucket_kind=p_target_key->>'bucketKind' and row.bucket_key=p_target_key->>'bucketKey';
    when 'comment' then select to_jsonb(row) into result from public.comments row where row.id=p_target_key->>'id';
    when 'comment_vote' then select to_jsonb(row) into result from public.comment_votes row where row.comment_id=p_target_key->>'commentId' and row.user_id=(p_target_key->>'userId')::uuid;
    when 'newsletter' then select to_jsonb(row) into result from public.newsletter_subscriptions row where row.user_id=(p_target_key->>'userId')::uuid;
    else raise exception 'unsupported migration entity kind' using errcode='22023';
  end case;
  return result;
end;
$$;

create or replace function public.preflight_legacy_migration_target(
  p_entity_kind text,p_target_key jsonb,p_expected_row jsonb
) returns text language plpgsql stable security definer set search_path='' as $$
declare actual jsonb; expected jsonb; provider_name text;
begin
  actual:=public.legacy_migration_target_snapshot(p_entity_kind,p_target_key);
  expected:=public.normalize_legacy_migration_target(p_entity_kind,p_expected_row);
  if actual is not null then return case when actual=expected then 'matching' else 'conflict' end; end if;
  if p_entity_kind='identity' then
    provider_name:=p_target_key->>'provider';
    if exists(select 1 from public.identity_map m where m.supabase_user_id=(p_target_key->>'userId')::uuid
      or m.provider_links->provider_name->>'uid'=p_expected_row->>'provider_uid')
      or exists(select 1 from public.private_profiles p where p.user_id=(p_target_key->>'userId')::uuid or p.firebase_uid=p_target_key->>'sourceUid')
      or exists(select 1 from public.profiles p where p.user_id=(p_target_key->>'userId')::uuid or p.user_tag=p_expected_row->>'user_tag')
      or exists(select 1 from public.user_tags t where t.user_id=(p_target_key->>'userId')::uuid or t.user_tag=p_expected_row->>'user_tag') then
      return 'conflict';
    end if;
  elsif p_entity_kind='publication_edge' and exists(
    select 1 from public.published_nota_edges e where e.child_id=p_target_key->>'childId'
  ) then return 'conflict';
  end if;
  return 'absent';
end;
$$;

create or replace function public.start_legacy_migration_run(
  p_run_id text,p_source_watermark text,p_manifest_hash text,p_identity_plan_hash text,
  p_tool_version text,p_dry_run boolean,p_lease_owner text
) returns void language plpgsql security definer set search_path='' as $$
declare existing public.legacy_migration_runs; owner_hash text;
begin
  if nullif(p_lease_owner,'') is null then raise exception 'migration lease owner is required' using errcode='22023'; end if;
  owner_hash:=encode(extensions.digest(p_lease_owner,'sha256'),'hex');
  insert into public.legacy_migration_runs(
    id,source_watermark,manifest_hash,identity_plan_hash,tool_version,dry_run,state,lease_owner_hash,lease_expires_at
  ) values(p_run_id,p_source_watermark,p_manifest_hash,p_identity_plan_hash,p_tool_version,p_dry_run,'running',owner_hash,clock_timestamp()+interval '5 minutes')
  on conflict(id) do nothing;
  select * into existing from public.legacy_migration_runs where id=p_run_id for update;
  if existing.source_watermark is distinct from p_source_watermark or existing.manifest_hash is distinct from p_manifest_hash
    or existing.identity_plan_hash is distinct from p_identity_plan_hash or existing.dry_run is distinct from p_dry_run then
    raise exception 'migration run manifest binding conflicts with existing run' using errcode='23505';
  end if;
  if existing.lease_expires_at>clock_timestamp() and existing.lease_owner_hash is distinct from owner_hash then
    raise exception 'migration run is leased by another live process' using errcode='55P03';
  end if;
  update public.legacy_migration_runs set state='running',tool_version=p_tool_version,completed_at=null,
    lease_owner_hash=owner_hash,lease_expires_at=clock_timestamp()+interval '5 minutes'
    where id=p_run_id;
end;
$$;

create or replace function public.assert_legacy_migration_run_lease(p_run_id text,p_lease_owner text)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.legacy_migration_runs set lease_expires_at=clock_timestamp()+interval '5 minutes'
    where id=p_run_id and state='running' and lease_expires_at>clock_timestamp()
      and lease_owner_hash=encode(extensions.digest(p_lease_owner,'sha256'),'hex');
  if not found then raise exception 'migration run lease is absent, expired, or owned by another process' using errcode='55P03'; end if;
end;
$$;

create or replace function public.finish_legacy_migration_run(
  p_run_id text,p_status text,p_counters jsonb,p_lease_owner text
) returns void language plpgsql security definer set search_path='' as $$
declare existing public.legacy_migration_runs; owner_hash text;
begin
  if p_status not in ('completed','failed') or jsonb_typeof(p_counters)<>'object' then
    raise exception 'invalid migration completion' using errcode='22023';
  end if;
  owner_hash:=encode(extensions.digest(p_lease_owner,'sha256'),'hex');
  select * into existing from public.legacy_migration_runs where id=p_run_id for update;
  if not found then raise exception 'migration run not found' using errcode='P0002'; end if;
  if existing.state=p_status and existing.lease_owner_hash=owner_hash and existing.lease_expires_at is null then return; end if;
  if existing.state<>'running' or existing.lease_owner_hash is distinct from owner_hash or existing.lease_expires_at<=clock_timestamp() then
    raise exception 'migration run completion does not own the live lease' using errcode='55P03';
  end if;
  update public.legacy_migration_runs set state=p_status,counters=p_counters,completed_at=clock_timestamp(),lease_expires_at=null
    where id=p_run_id;
end;
$$;

create or replace function public.apply_legacy_migration_target(
  p_run_id text,p_entity_kind text,p_source_key_hash text,p_target_key jsonb,
  p_insert_row jsonb,p_existing_row jsonb,p_lease_owner text
) returns text language plpgsql security definer set search_path='' as $$
declare journal public.legacy_migration_journal; actual jsonb; expected jsonb;
begin
  perform public.assert_legacy_migration_run_lease(p_run_id,p_lease_owner);
  select * into journal from public.legacy_migration_journal j
    where j.entity_kind=p_entity_kind and j.source_key_hash=p_source_key_hash for update;
  if not found or journal.first_run_id<>p_run_id or journal.state<>'applying' then
    raise exception 'migration journal record is not owned by this applying run' using errcode='55000';
  end if;
  actual:=public.legacy_migration_target_snapshot(p_entity_kind,p_target_key);
  if actual is not null then
    expected:=public.normalize_legacy_migration_target(p_entity_kind,
      case when journal.mutation_kind='created' and journal.applied_by_run_id=p_run_id then p_insert_row else p_existing_row end);
    if actual<>expected then raise exception 'pre-existing migration target conflicts with source' using errcode='23505'; end if;
    if journal.mutation_kind='created' and journal.applied_by_run_id=p_run_id then return 'created'; end if;
    update public.legacy_migration_journal set mutation_kind='preexisting',applied_by_run_id=p_run_id,
      prior_row_hash=encode(extensions.digest(actual::text,'sha256'),'hex')
      where entity_kind=p_entity_kind and source_key_hash=p_source_key_hash;
    return 'preexisting';
  end if;

  case p_entity_kind
    when 'identity' then
      perform public.migrate_firebase_identity(
        p_insert_row->>'source_uid',(p_insert_row->>'supabase_user_id')::uuid,p_insert_row->>'provider',p_insert_row->>'provider_uid',
        p_insert_row->>'verified_email',p_insert_row->>'user_tag',p_insert_row->>'display_name',p_insert_row->>'photo_url',journal.source_hash
      );
      update public.private_profiles set created_at=(p_insert_row->>'created_at')::timestamptz,
        updated_at=(p_insert_row->>'updated_at')::timestamptz,source_created_at_raw=p_insert_row->>'source_created_at_raw',
        source_updated_at_raw=p_insert_row->>'source_updated_at_raw' where user_id=(p_insert_row->>'supabase_user_id')::uuid;
      update public.profiles set updated_at=(p_insert_row->>'profile_updated_at')::timestamptz where user_id=(p_insert_row->>'supabase_user_id')::uuid;
      update public.user_tags set created_at=(p_insert_row->>'tag_created_at')::timestamptz where user_id=(p_insert_row->>'supabase_user_id')::uuid;
      update public.legacy_identity_provisioning set state='linked' where source_uid=p_insert_row->>'source_uid' and supabase_user_id=(p_insert_row->>'supabase_user_id')::uuid;
    when 'legacy_nota' then insert into public.legacy_notas select populated.* from jsonb_populate_record(null::public.legacy_notas,p_insert_row||jsonb_build_object('imported_at',now())) populated;
    when 'publication' then insert into public.published_notas select populated.* from jsonb_populate_record(null::public.published_notas,p_insert_row) populated;
    when 'publication_edge' then insert into public.published_nota_edges select populated.* from jsonb_populate_record(null::public.published_nota_edges,p_insert_row) populated;
    when 'nota_vote' then insert into public.nota_votes select populated.* from jsonb_populate_record(null::public.nota_votes,p_insert_row) populated;
    when 'nota_viewer' then insert into public.nota_viewers select populated.* from jsonb_populate_record(null::public.nota_viewers,p_insert_row) populated;
    when 'metric_bucket' then insert into public.nota_view_aggregates select populated.* from jsonb_populate_record(null::public.nota_view_aggregates,p_insert_row) populated;
    when 'comment' then insert into public.comments select populated.* from jsonb_populate_record(null::public.comments,p_insert_row) populated;
    when 'comment_vote' then insert into public.comment_votes select populated.* from jsonb_populate_record(null::public.comment_votes,p_insert_row) populated;
    when 'newsletter' then insert into public.newsletter_subscriptions select populated.* from jsonb_populate_record(null::public.newsletter_subscriptions,p_insert_row) populated;
    else raise exception 'unsupported migration entity kind' using errcode='22023';
  end case;
  actual:=public.legacy_migration_target_snapshot(p_entity_kind,p_target_key);
  expected:=public.normalize_legacy_migration_target(p_entity_kind,p_insert_row);
  if actual is null or actual<>expected then raise exception 'inserted migration target differs from source' using errcode='23505'; end if;
  update public.legacy_migration_journal set mutation_kind='created',applied_by_run_id=p_run_id,prior_row_hash=null
    where entity_kind=p_entity_kind and source_key_hash=p_source_key_hash;
  return 'created';
end;
$$;

create or replace function public.reserve_legacy_migration_record(
  p_run_id text, p_sequence bigint, p_entity_kind text,
  p_source_key_hash text, p_source_hash text, p_target_key jsonb,p_target_hash text,p_lease_owner text
) returns text
language plpgsql security definer set search_path = '' as $$
declare existing public.legacy_migration_journal;
begin
  perform public.assert_legacy_migration_run_lease(p_run_id,p_lease_owner);
  if not exists(select 1 from public.legacy_migration_runs r where r.id=p_run_id and r.state='running' and not r.dry_run) then
    raise exception 'migration run is not writable' using errcode='55000';
  end if;
  select * into existing from public.legacy_migration_journal j
    where j.entity_kind=p_entity_kind and j.source_key_hash=p_source_key_hash for update;
  if found then
    if existing.source_hash is distinct from p_source_hash or existing.target_key is distinct from p_target_key
      or existing.target_hash is distinct from p_target_hash then
      raise exception 'immutable migration source or target changed' using errcode='23505';
    end if;
    if existing.state='applied' then
      return case when existing.first_run_id=p_run_id then 'already_applied_by_run' else 'already_applied' end;
    end if;
    if existing.first_run_id<>p_run_id then
      raise exception 'migration record belongs to a different run' using errcode='23505';
    end if;
    update public.legacy_migration_journal set attempt_count=attempt_count+1,
      sequence=p_sequence,state='applying',error_class=null
      where entity_kind=p_entity_kind and source_key_hash=p_source_key_hash;
    return 'resume';
  end if;
  insert into public.legacy_migration_journal(
    entity_kind,source_key_hash,source_hash,first_run_id,sequence,target_key,target_hash,state
  ) values(p_entity_kind,p_source_key_hash,p_source_hash,p_run_id,p_sequence,p_target_key,p_target_hash,'applying');
  return 'reserved';
end;
$$;

create or replace function public.complete_legacy_migration_record(
  p_run_id text,p_entity_kind text,p_source_key_hash text,p_source_hash text,p_target_hash text,p_lease_owner text
) returns void language plpgsql security definer set search_path='' as $$
declare existing public.legacy_migration_journal;
begin
  perform public.assert_legacy_migration_run_lease(p_run_id,p_lease_owner);
  select * into existing from public.legacy_migration_journal
    where entity_kind=p_entity_kind and source_key_hash=p_source_key_hash for update;
  if not found or existing.first_run_id<>p_run_id or existing.source_hash<>p_source_hash or existing.target_hash<>p_target_hash
    or existing.applied_by_run_id<>p_run_id or existing.mutation_kind is null then
    raise exception 'migration journal completion binding conflicts with this run' using errcode='55000';
  end if;
  if existing.state='applied' then return; end if;
  if existing.state<>'applying' then raise exception 'migration journal record is not applying' using errcode='55000'; end if;
  update public.legacy_migration_journal set state='applied',applied_at=now(),error_class=null
    where entity_kind=p_entity_kind and source_key_hash=p_source_key_hash;
end;
$$;

create or replace function public.fail_legacy_migration_record(
  p_run_id text,p_entity_kind text,p_source_key_hash text,p_error_class text,p_lease_owner text
) returns void language plpgsql security definer set search_path='' as $$
declare existing public.legacy_migration_journal;
begin
  perform public.assert_legacy_migration_run_lease(p_run_id,p_lease_owner);
  if p_error_class not in ('transient','conflict','permanent') then
    raise exception 'invalid migration error class' using errcode='22023';
  end if;
  select * into existing from public.legacy_migration_journal
    where entity_kind=p_entity_kind and source_key_hash=p_source_key_hash for update;
  if not found or existing.first_run_id<>p_run_id then raise exception 'migration journal record is not owned by this run' using errcode='55000'; end if;
  if existing.state='applied' then return; end if;
  if existing.state not in ('applying','failed') then raise exception 'migration journal record is not fail-able' using errcode='55000'; end if;
  update public.legacy_migration_journal set state='failed',error_class=p_error_class
    where entity_kind=p_entity_kind and source_key_hash=p_source_key_hash;
end;
$$;

create or replace function public.append_legacy_migration_audit(
  p_run_id text,p_idempotency_key text,p_event jsonb,p_lease_owner text
)
returns text language plpgsql security definer set search_path='' as $$
declare next_sequence bigint; prior text; result text; existing public.legacy_migration_audit; allowed text[] := array[
  'phase','kind','keyHash','sourceHash','status','attempt','errorClass','elapsedMs','count','checkpoint'
];
begin
  perform public.assert_legacy_migration_run_lease(p_run_id,p_lease_owner);
  perform 1 from public.legacy_migration_runs where id=p_run_id for update;
  if not found then
    raise exception 'migration run not found' using errcode='P0002';
  end if;
  if exists(select 1 from jsonb_object_keys(p_event) key where not (key=any(allowed))) then
    raise exception 'audit event contains a disallowed field' using errcode='22023';
  end if;
  if p_idempotency_key!~'^[0-9a-f]{64}$' then raise exception 'invalid audit idempotency key' using errcode='22023'; end if;
  select * into existing from public.legacy_migration_audit
    where run_id=p_run_id and idempotency_key=p_idempotency_key;
  if found then
    if existing.event is distinct from p_event then raise exception 'audit idempotency key has divergent content' using errcode='23505'; end if;
    return existing.event_hash;
  end if;
  select coalesce(max(sequence),0)+1 into next_sequence from public.legacy_migration_audit where run_id=p_run_id;
  select event_hash into prior from public.legacy_migration_audit where run_id=p_run_id order by sequence desc limit 1 for update;
  result:=encode(extensions.digest(coalesce(prior,'')||p_run_id||next_sequence::text||p_idempotency_key||p_event::text,'sha256'),'hex');
  insert into public.legacy_migration_audit(run_id,sequence,previous_hash,idempotency_key,event,event_hash)
    values(p_run_id,next_sequence,prior,p_idempotency_key,p_event,result);
  return result;
end;
$$;

create or replace function public.reconcile_legacy_migration()
returns jsonb language sql stable security definer set search_path='' as $$
  with grouped as (
    select entity_kind,count(*)::bigint as row_count,
      encode(extensions.digest(string_agg(source_hash,'' order by source_key_hash),'sha256'),'hex') as multiset_hash
    from public.legacy_migration_journal where state='applied' group by entity_kind
  ), publication_mismatches as (
    select count(*)::bigint as value
    from public.legacy_migration_journal j
    join public.published_notas n on n.id=j.target_key->>'id'
    where j.entity_kind='publication' and j.state='applied' and (
      n.view_count::text is distinct from j.target_key->'expectedCounts'->>'view_count' or
      n.unique_viewers::text is distinct from j.target_key->'expectedCounts'->>'unique_viewers' or
      n.like_count::text is distinct from j.target_key->'expectedCounts'->>'like_count' or
      n.dislike_count::text is distinct from j.target_key->'expectedCounts'->>'dislike_count' or
      n.comment_count::text is distinct from j.target_key->'expectedCounts'->>'comment_count' or
      n.clone_count::text is distinct from j.target_key->'expectedCounts'->>'clone_count'
    )
  ), comment_mismatches as (
    select count(*)::bigint as value
    from public.legacy_migration_journal j
    join public.comments c on c.id=j.target_key->>'id'
    where j.entity_kind='comment' and j.state='applied' and (
      c.like_count::text is distinct from j.target_key->'expectedCounts'->>'like_count' or
      c.dislike_count::text is distinct from j.target_key->'expectedCounts'->>'dislike_count' or
      c.reply_count::text is distinct from j.target_key->'expectedCounts'->>'reply_count'
    )
  ), integrity as (
    select
      (select count(*) from public.published_notas n left join public.identity_map i on i.supabase_user_id=n.author_id where i.supabase_user_id is null)
      +(select count(*) from public.comments c left join public.identity_map i on i.supabase_user_id=c.author_id where i.supabase_user_id is null)
      +(select count(*) from public.comments c left join public.published_notas n on n.id=c.nota_id where n.id is null)
      +(select count(*) from public.comments c left join public.comments p on p.id=c.parent_id where c.parent_id is not null and (p.id is null or p.nota_id<>c.nota_id))
      +(select count(*) from public.published_nota_edges e left join public.published_notas p on p.id=e.parent_id left join public.published_notas c on c.id=e.child_id where p.id is null or c.id is null or c.parent_id<>p.id)
      +(select count(*) from public.legacy_identity_provisioning p left join public.identity_map i on i.firebase_uid=p.source_uid and i.supabase_user_id=p.supabase_user_id where p.state<>'linked' or i.firebase_uid is null)
      as orphan_count,
      (select count(*) from public.published_notas n where n.is_public and not exists(select 1 from public.public_published_notas p where p.id=n.id))
      +(select count(*) from public.profiles p where not exists(select 1 from public.public_profiles v where v.user_id=p.user_id and v.user_tag=p.user_tag))
      as public_url_mismatches
  ), target_integrity as (
    select
      (select count(*) from public.legacy_migration_journal j where j.state='applied' and (
        j.entity_kind='identity' and not exists(select 1 from public.identity_map t where t.firebase_uid=j.target_key->>'sourceUid') or
        j.entity_kind='legacy_nota' and not exists(select 1 from public.legacy_notas t where t.id=j.target_key->>'id') or
        j.entity_kind='publication' and not exists(select 1 from public.published_notas t where t.id=j.target_key->>'id') or
        j.entity_kind='publication_edge' and not exists(select 1 from public.published_nota_edges t where t.parent_id=j.target_key->>'parentId' and t.child_id=j.target_key->>'childId') or
        j.entity_kind='nota_vote' and not exists(select 1 from public.nota_votes t where t.nota_id=j.target_key->>'notaId' and t.user_id=(j.target_key->>'userId')::uuid) or
        j.entity_kind='nota_viewer' and not exists(select 1 from public.nota_viewers t where t.nota_id=j.target_key->>'notaId' and t.user_id=(j.target_key->>'userId')::uuid) or
        j.entity_kind='metric_bucket' and not exists(select 1 from public.nota_view_aggregates t where t.nota_id=j.target_key->>'notaId' and t.bucket_kind=j.target_key->>'bucketKind' and t.bucket_key=j.target_key->>'bucketKey') or
        j.entity_kind='comment' and not exists(select 1 from public.comments t where t.id=j.target_key->>'id') or
        j.entity_kind='comment_vote' and not exists(select 1 from public.comment_votes t where t.comment_id=j.target_key->>'commentId' and t.user_id=(j.target_key->>'userId')::uuid) or
        j.entity_kind='newsletter' and not exists(select 1 from public.newsletter_subscriptions t where t.user_id=(j.target_key->>'userId')::uuid)
      )) as missing_target_rows,
      (select count(*) from public.identity_map t where not exists(select 1 from public.legacy_migration_journal j where j.state='applied' and j.entity_kind='identity' and j.target_key->>'sourceUid'=t.firebase_uid))
      +(select count(*) from public.legacy_notas t where not exists(select 1 from public.legacy_migration_journal j where j.state='applied' and j.entity_kind='legacy_nota' and j.target_key->>'id'=t.id))
      +(select count(*) from public.published_notas t where not exists(select 1 from public.legacy_migration_journal j where j.state='applied' and j.entity_kind='publication' and j.target_key->>'id'=t.id))
      +(select count(*) from public.published_nota_edges t where not exists(select 1 from public.legacy_migration_journal j where j.state='applied' and j.entity_kind='publication_edge' and j.target_key->>'parentId'=t.parent_id and j.target_key->>'childId'=t.child_id))
      +(select count(*) from public.nota_votes t where not exists(select 1 from public.legacy_migration_journal j where j.state='applied' and j.entity_kind='nota_vote' and j.target_key->>'notaId'=t.nota_id and j.target_key->>'userId'=t.user_id::text))
      +(select count(*) from public.nota_viewers t where not exists(select 1 from public.legacy_migration_journal j where j.state='applied' and j.entity_kind='nota_viewer' and j.target_key->>'notaId'=t.nota_id and j.target_key->>'userId'=t.user_id::text))
      +(select count(*) from public.nota_view_aggregates t where not exists(select 1 from public.legacy_migration_journal j where j.state='applied' and j.entity_kind='metric_bucket' and j.target_key->>'notaId'=t.nota_id and j.target_key->>'bucketKind'=t.bucket_kind and j.target_key->>'bucketKey'=t.bucket_key))
      +(select count(*) from public.comments t where not exists(select 1 from public.legacy_migration_journal j where j.state='applied' and j.entity_kind='comment' and j.target_key->>'id'=t.id))
      +(select count(*) from public.comment_votes t where not exists(select 1 from public.legacy_migration_journal j where j.state='applied' and j.entity_kind='comment_vote' and j.target_key->>'commentId'=t.comment_id and j.target_key->>'userId'=t.user_id::text))
      +(select count(*) from public.newsletter_subscriptions t where not exists(select 1 from public.legacy_migration_journal j where j.state='applied' and j.entity_kind='newsletter' and j.target_key->>'userId'=t.user_id::text))
      as unexplained_target_rows
  )
  select jsonb_build_object(
    'entities',coalesce((select jsonb_object_agg(entity_kind,jsonb_build_object('count',row_count,'hash',multiset_hash)) from grouped),'{}'::jsonb),
    'publicationCounterMismatches',(select value from publication_mismatches),
    'commentCounterMismatches',(select value from comment_mismatches),
    'orphanCount',(select orphan_count from integrity),
    'publicUrlMismatches',(select public_url_mismatches from integrity),
    'missingTargetRows',(select missing_target_rows from target_integrity),
    'unexplainedTargetRows',(select unexplained_target_rows from target_integrity),
    'cutoverDisabled',
      (select not production_cutover from public.runtime_deployment_state where singleton)
  );
$$;

create or replace function public.start_legacy_migration_rollback(p_run_id text,p_lease_owner text)
returns text language plpgsql security definer set search_path='' as $$
declare existing public.legacy_migration_runs; owner_hash text;
begin
  if nullif(p_lease_owner,'') is null then raise exception 'migration rollback lease owner is required' using errcode='22023'; end if;
  owner_hash:=encode(extensions.digest(p_lease_owner,'sha256'),'hex');
  select * into existing from public.legacy_migration_runs where id=p_run_id for update;
  if not found then raise exception 'migration run not found' using errcode='P0002'; end if;
  if existing.state='rolled-back' then return 'already_rolled_back'; end if;
  if existing.dry_run then raise exception 'dry-run has no rollback target' using errcode='55000'; end if;
  if existing.lease_expires_at>clock_timestamp() and existing.lease_owner_hash is distinct from owner_hash then
    raise exception 'migration run is leased by another live process' using errcode='55P03';
  end if;
  update public.legacy_migration_runs set state='rolling-back',lease_owner_hash=owner_hash,
    lease_expires_at=clock_timestamp()+interval '5 minutes' where id=p_run_id;
  return case when existing.state='rolling-back' then 'resumed' else 'acquired' end;
end;
$$;

create or replace function public.assert_legacy_migration_rollback_lease(p_run_id text,p_lease_owner text)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.legacy_migration_runs set lease_expires_at=clock_timestamp()+interval '5 minutes'
    where id=p_run_id and state='rolling-back' and lease_expires_at>clock_timestamp()
      and lease_owner_hash=encode(extensions.digest(p_lease_owner,'sha256'),'hex');
  if not found then raise exception 'migration rollback lease is absent, expired, or owned by another process' using errcode='55P03'; end if;
end;
$$;

create or replace function public.rollback_next_legacy_migration_record(p_run_id text,p_lease_owner text)
returns text language plpgsql security definer set search_path='' as $$
declare candidate public.legacy_migration_journal; result text:='unapplied';
begin
  perform public.assert_legacy_migration_rollback_lease(p_run_id,p_lease_owner);
  select * into candidate from public.legacy_migration_journal j
    where j.first_run_id=p_run_id and j.entity_kind<>'identity' and j.state<>'rolled-back'
    order by case j.entity_kind
      when 'comment_vote' then 10 when 'comment' then 20 when 'nota_vote' then 30
      when 'nota_viewer' then 40 when 'metric_bucket' then 50 when 'publication_edge' then 60
      when 'publication' then 70 when 'newsletter' then 80 when 'legacy_nota' then 90 else 100 end,
      j.sequence desc
    for update skip locked limit 1;
  if not found then return 'done'; end if;

  if candidate.mutation_kind='created' and candidate.applied_by_run_id=p_run_id then
    case candidate.entity_kind
      when 'comment_vote' then delete from public.comment_votes where comment_id=candidate.target_key->>'commentId' and user_id=(candidate.target_key->>'userId')::uuid;
      when 'comment' then delete from public.comments where id=candidate.target_key->>'id';
      when 'nota_vote' then delete from public.nota_votes where nota_id=candidate.target_key->>'notaId' and user_id=(candidate.target_key->>'userId')::uuid;
      when 'nota_viewer' then delete from public.nota_viewers where nota_id=candidate.target_key->>'notaId' and user_id=(candidate.target_key->>'userId')::uuid;
      when 'metric_bucket' then delete from public.nota_view_aggregates where nota_id=candidate.target_key->>'notaId' and bucket_kind=candidate.target_key->>'bucketKind' and bucket_key=candidate.target_key->>'bucketKey';
      when 'publication_edge' then delete from public.published_nota_edges where parent_id=candidate.target_key->>'parentId' and child_id=candidate.target_key->>'childId';
      when 'publication' then delete from public.published_notas where id=candidate.target_key->>'id';
      when 'newsletter' then delete from public.newsletter_subscriptions where user_id=(candidate.target_key->>'userId')::uuid;
      when 'legacy_nota' then delete from public.legacy_notas where id=candidate.target_key->>'id';
      else raise exception 'unsupported rollback entity kind' using errcode='22023';
    end case;
    result:='deleted';
  elsif candidate.mutation_kind='preexisting' then result:='retained';
  end if;
  update public.legacy_migration_journal set state='rolled-back',error_class=null
    where entity_kind=candidate.entity_kind and source_key_hash=candidate.source_key_hash;
  return result;
end;
$$;

create or replace function public.mark_legacy_migration_rolled_back(p_run_id text,p_lease_owner text)
returns void language plpgsql security definer set search_path='' as $$
declare existing public.legacy_migration_runs; owner_hash text;
begin
  owner_hash:=encode(extensions.digest(p_lease_owner,'sha256'),'hex');
  select * into existing from public.legacy_migration_runs where id=p_run_id for update;
  if not found then raise exception 'migration run not found' using errcode='P0002'; end if;
  if existing.state='rolled-back' and existing.lease_owner_hash=owner_hash and existing.lease_expires_at is null then return; end if;
  perform public.assert_legacy_migration_rollback_lease(p_run_id,p_lease_owner);
  if exists(select 1 from public.legacy_migration_journal j
    where j.first_run_id=p_run_id and j.entity_kind<>'identity' and j.state<>'rolled-back') then
    raise exception 'migration rollback still has pending records' using errcode='55000';
  end if;
  -- Stable identity translations are deliberately retained. They remain inert
  -- behind Firebase rollout gates and let the same manifest resume exactly.
  update public.legacy_migration_runs set state='rolled-back',completed_at=clock_timestamp(),lease_expires_at=null
    where id=p_run_id;
end;
$$;

create or replace function public.prevent_legacy_migration_audit_mutation()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'firebase migration audit is immutable' using errcode='55000'; end;
$$;
create trigger legacy_migration_audit_immutable before update or delete on public.legacy_migration_audit
for each row execute function public.prevent_legacy_migration_audit_mutation();

revoke all on function public.normalize_legacy_migration_target(text,jsonb),
  public.legacy_migration_target_snapshot(text,jsonb),public.preflight_legacy_migration_target(text,jsonb,jsonb),
  public.start_legacy_migration_run(text,text,text,text,text,boolean,text),public.assert_legacy_migration_run_lease(text,text),
  public.finish_legacy_migration_run(text,text,jsonb,text),
  public.apply_legacy_migration_target(text,text,text,jsonb,jsonb,jsonb,text),
  public.reserve_legacy_migration_record(text,bigint,text,text,text,jsonb,text,text),
  public.complete_legacy_migration_record(text,text,text,text,text,text),public.fail_legacy_migration_record(text,text,text,text,text),
  public.append_legacy_migration_audit(text,text,jsonb,text),public.reconcile_legacy_migration(),
  public.start_legacy_migration_rollback(text,text),public.assert_legacy_migration_rollback_lease(text,text),
  public.rollback_next_legacy_migration_record(text,text),public.mark_legacy_migration_rolled_back(text,text),
  public.prevent_legacy_migration_audit_mutation() from public,anon,authenticated;
grant execute on function public.preflight_legacy_migration_target(text,jsonb,jsonb),
  public.start_legacy_migration_run(text,text,text,text,text,boolean,text),public.assert_legacy_migration_run_lease(text,text),
  public.finish_legacy_migration_run(text,text,jsonb,text),
  public.apply_legacy_migration_target(text,text,text,jsonb,jsonb,jsonb,text),
  public.reserve_legacy_migration_record(text,bigint,text,text,text,jsonb,text,text),
  public.complete_legacy_migration_record(text,text,text,text,text,text),public.fail_legacy_migration_record(text,text,text,text,text),
  public.append_legacy_migration_audit(text,text,jsonb,text),public.reconcile_legacy_migration() to service_role;
grant execute on function public.start_legacy_migration_rollback(text,text),
  public.assert_legacy_migration_rollback_lease(text,text),public.rollback_next_legacy_migration_record(text,text),
  public.mark_legacy_migration_rolled_back(text,text) to service_role;

commit;
