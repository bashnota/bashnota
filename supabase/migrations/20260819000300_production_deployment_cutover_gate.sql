begin;

alter table public.runtime_deployment_state
  add column public_config_sha256 text,
  add column migration_evidence_sha256 text,
  add column reconciliation_evidence_sha256 text,
  add column approved_at timestamptz,
  add column approved_by text,
  add constraint runtime_deployment_public_config_hash check (public_config_sha256 is null or public_config_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint runtime_deployment_migration_hash check (migration_evidence_sha256 is null or migration_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint runtime_deployment_reconciliation_hash check (reconciliation_evidence_sha256 is null or reconciliation_evidence_sha256 ~ '^[0-9a-f]{64}$');

create or replace function public.verify_production_cutover(
  p_public_config_sha256 text,
  p_migration_evidence_sha256 text,
  p_reconciliation_evidence_sha256 text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.runtime_deployment_state
    where singleton and production_cutover
      and public_config_sha256 = p_public_config_sha256
      and migration_evidence_sha256 = p_migration_evidence_sha256
      and reconciliation_evidence_sha256 = p_reconciliation_evidence_sha256
      and approved_at is not null and nullif(approved_by, '') is not null
  );
$$;

revoke all on function public.verify_production_cutover(text, text, text) from public;
grant execute on function public.verify_production_cutover(text, text, text) to anon, authenticated, service_role;

commit;
