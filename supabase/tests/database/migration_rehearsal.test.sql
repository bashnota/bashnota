begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

set local role service_role;
select lives_ok($$ select public.start_legacy_migration_run('test-run','fixture-watermark',repeat('a',64),repeat('8',64),'test',false,'lease-a') $$,
  'operator acquires the exclusive run lease');
select throws_ok($$ select public.start_legacy_migration_run('test-run','fixture-watermark',repeat('a',64),repeat('8',64),'test',false,'lease-intruder') $$,
  '55P03',null,'a second live process cannot acquire the same run lease');
select is((select count(*)::integer from public.legacy_migration_journal),0,
  'rejected concurrent process cannot touch the journal');
select lives_ok($$ select public.start_legacy_migration_run('other-run','fixture-watermark',repeat('a',64),repeat('8',64),'test',false,'lease-b') $$,
  'a distinct run acquires its own lease');
insert into public.legacy_identity_provisioning(source_uid,supabase_user_id,provider,provider_uid,verified_email_hash,state)
values('opaque-fixture-uid','71000000-0000-4000-8000-000000000007','email','71000000-0000-4000-8000-000000000007',repeat('9',64),'planned');
select is((select verified_email_hash from public.legacy_identity_provisioning where source_uid='opaque-fixture-uid'),
  repeat('9',64),'identity provisioning checkpoints contain only the verified email hash');
select is(public.reserve_legacy_migration_record('test-run',1,'legacy_nota',repeat('b',64),repeat('c',64),'{"id":"original-target"}',repeat('0',64),'lease-a'),
  'reserved','operator reserves one immutable source record');
select lives_ok($$ select public.apply_legacy_migration_target('test-run','legacy_nota',repeat('b',64),'{"id":"original-target"}',
  jsonb_build_object('id','original-target','legacy_owner_uid','opaque','payload','{}'::jsonb,'source_hash',repeat('c',64)),
  jsonb_build_object('id','original-target','legacy_owner_uid','opaque','payload','{}'::jsonb,'source_hash',repeat('c',64)),'lease-a') $$,
  'operator atomically applies the reserved target');
select lives_ok($$ select public.complete_legacy_migration_record('test-run','legacy_nota',repeat('b',64),repeat('c',64),repeat('0',64),'lease-a') $$,
  'operator finalizes the record');
select lives_ok($$ select public.complete_legacy_migration_record('test-run','legacy_nota',repeat('b',64),repeat('c',64),repeat('0',64),'lease-a') $$,
  'lost completion response can be confirmed idempotently');
select lives_ok($$ select public.fail_legacy_migration_record('test-run','legacy_nota',repeat('b',64),'transient','lease-a') $$,
  'late failure report is an idempotent no-op for applied state');
select is((select state||':'||mutation_kind from public.legacy_migration_journal where source_key_hash=repeat('b',64)),
  'applied:created','late failure cannot downgrade applied created provenance');
select is(public.reserve_legacy_migration_record('test-run',2,'legacy_nota',repeat('b',64),repeat('c',64),'{"id":"original-target"}',repeat('0',64),'lease-a'),
  'already_applied_by_run','same exact run can idempotently confirm a lost terminal response');
select throws_ok($$ select public.reserve_legacy_migration_record('test-run',2,'legacy_nota',repeat('b',64),repeat('d',64),'{"id":"original-target"}',repeat('0',64),'lease-a') $$,
  '23505',null,'changed source hash fails closed');
select throws_ok($$ select public.reserve_legacy_migration_record('test-run',2,'legacy_nota',repeat('b',64),repeat('c',64),'{"id":"changed-target"}',repeat('f',64),'lease-a') $$,
  '23505',null,'changed target binding fails closed after apply');
select is(public.reserve_legacy_migration_record('test-run',3,'legacy_nota',repeat('1',64),repeat('2',64),'{"id":"created-target"}',repeat('1',64),'lease-a'),
  'reserved','created-target provenance record is reserved');
select is(public.apply_legacy_migration_target('test-run','legacy_nota',repeat('1',64),'{"id":"created-target"}',
  jsonb_build_object('id','created-target','legacy_owner_uid','opaque','payload','{}'::jsonb,'source_hash',repeat('2',64)),
  jsonb_build_object('id','created-target','legacy_owner_uid','opaque','payload','{}'::jsonb,'source_hash',repeat('2',64)),'lease-a'),
  'created','target insert and created provenance commit atomically');
select is((select mutation_kind from public.legacy_migration_journal where entity_kind='legacy_nota' and source_key_hash=repeat('1',64)),
  'created','journal records that the exact run created the row');
select lives_ok($$ select public.fail_legacy_migration_record('test-run','legacy_nota',repeat('1',64),'transient','lease-a') $$,
  'interruption after atomic insert records a failed attempt');
select is(public.reserve_legacy_migration_record('test-run',3,'legacy_nota',repeat('1',64),repeat('2',64),'{"id":"created-target"}',repeat('1',64),'lease-a'),
  'resume','same run resumes its interrupted created target');
select is(public.apply_legacy_migration_target('test-run','legacy_nota',repeat('1',64),'{"id":"created-target"}',
  jsonb_build_object('id','created-target','legacy_owner_uid','opaque','payload','{}'::jsonb,'source_hash',repeat('2',64)),
  jsonb_build_object('id','created-target','legacy_owner_uid','opaque','payload','{}'::jsonb,'source_hash',repeat('2',64)),'lease-a'),
  'created','resume preserves created ownership instead of reclassifying the row');
select is((select mutation_kind from public.legacy_migration_journal where entity_kind='legacy_nota' and source_key_hash=repeat('1',64)),
  'created','interrupted created provenance remains exact-run owned');
insert into public.legacy_notas(id,legacy_owner_uid,payload,source_hash)
values('matching-target','opaque','{}',repeat('3',64));
select is(public.reserve_legacy_migration_record('test-run',4,'legacy_nota',repeat('4',64),repeat('3',64),'{"id":"matching-target"}',repeat('4',64),'lease-a'),
  'reserved','matching pre-existing target is reserved');
select is(public.apply_legacy_migration_target('test-run','legacy_nota',repeat('4',64),'{"id":"matching-target"}',
  jsonb_build_object('id','matching-target','legacy_owner_uid','opaque','payload','{}'::jsonb,'source_hash',repeat('3',64)),
  jsonb_build_object('id','matching-target','legacy_owner_uid','opaque','payload','{}'::jsonb,'source_hash',repeat('3',64)),'lease-a'),
  'preexisting','exact matching pre-existing row is never claimed as created');
select is((select mutation_kind from public.legacy_migration_journal where entity_kind='legacy_nota' and source_key_hash=repeat('4',64)),
  'preexisting','journal records matching pre-existing provenance');
insert into public.legacy_notas(id,legacy_owner_uid,payload,source_hash)
values('conflicting-target','other-owner','{}',repeat('5',64));
select is(public.preflight_legacy_migration_target('legacy_nota','{"id":"conflicting-target"}',
  jsonb_build_object('id','conflicting-target','legacy_owner_uid','expected-owner','payload','{}'::jsonb,'source_hash',repeat('5',64))),
  'conflict','conflicting pre-existing target fails read-only preflight');
select is(public.reserve_legacy_migration_record('test-run',5,'legacy_nota',repeat('6',64),repeat('7',64),'{"id":"owned-by-a"}',repeat('6',64),'lease-a'),
  'reserved','run A reserves an applying record');
select throws_ok($$ select public.reserve_legacy_migration_record('other-run',5,'legacy_nota',repeat('6',64),repeat('7',64),'{"id":"owned-by-a"}',repeat('6',64),'lease-b') $$,
  '23505',null,'run B cannot claim run A applying record');
select lives_ok($$ select public.append_legacy_migration_audit('test-run',repeat('a',64),'{"phase":"import","status":"started"}','lease-a') $$,
  'allowlisted redacted audit event appends');
select lives_ok($$ select public.append_legacy_migration_audit('test-run',repeat('a',64),'{"phase":"import","status":"started"}','lease-a') $$,
  'lost audit response retries the same logical event idempotently');
select is((select count(*)::integer from public.legacy_migration_audit where run_id='test-run' and idempotency_key=repeat('a',64)),1,
  'idempotent audit retry creates one physical event');
select throws_ok($$ select public.append_legacy_migration_audit('test-run',repeat('a',64),'{"phase":"import","status":"diverged"}','lease-a') $$,
  '23505',null,'audit idempotency key rejects divergent content');
select throws_ok($$ select public.append_legacy_migration_audit('test-run',repeat('b',64),'{"email":"secret@example.test"}','lease-a') $$,
  '22023',null,'PII-shaped unallowlisted audit field is rejected');
select throws_ok($$ update public.legacy_migration_audit set event='{}' where run_id='test-run' $$,
  '42501',null,'audit rows cannot be changed even by the operator role');
select lives_ok($$ select public.append_legacy_migration_audit('test-run',repeat('c',64),'{"phase":"import","status":"checkpoint","checkpoint":2}','lease-a') $$,
  'a second audit event extends the chain');
select is((select previous_hash from public.legacy_migration_audit where run_id='test-run' and sequence=2),
  (select event_hash from public.legacy_migration_audit where run_id='test-run' and sequence=1),
  'audit events form an explicit immutable hash chain');
select throws_ok($$ select public.start_legacy_migration_rollback('test-run','rollback-contender') $$,
  '55P03',null,'rollback contender cannot take a live apply lease');
select is((select state from public.legacy_migration_runs where id='test-run'),'running',
  'rejected rollback leaves run state unchanged');
select is((select count(*)::integer from public.legacy_migration_journal where first_run_id='test-run' and state='rolled-back'),0,
  'rejected rollback leaves journal provenance unchanged');
select is((select count(*)::integer from public.legacy_notas where id in ('original-target','created-target')),2,
  'rejected rollback performs no target delete');
update public.legacy_migration_runs set lease_expires_at=clock_timestamp()-interval '1 second' where id='test-run';
select is(public.start_legacy_migration_rollback('test-run','rollback-owner'),'acquired',
  'expired apply lease is atomically acquired by rollback owner');
select throws_ok($$ select public.rollback_next_legacy_migration_record('test-run','lease-a') $$,
  '55P03',null,'stale apply owner is fenced after rollback takeover');
select is(public.rollback_next_legacy_migration_record('test-run','rollback-owner'),'unapplied',
  'reserved but unapplied provenance is rolled back without target deletion');
select is(public.rollback_next_legacy_migration_record('test-run','rollback-owner'),'retained',
  'matching pre-existing target is retained');
select is(public.rollback_next_legacy_migration_record('test-run','rollback-owner'),'deleted',
  'exact-run created target is deleted atomically with provenance');
select is(public.rollback_next_legacy_migration_record('test-run','rollback-owner'),'deleted',
  'completed exact-run created target is deleted atomically with provenance');
select is(public.rollback_next_legacy_migration_record('test-run','rollback-owner'),'done',
  'rollback is resumable and reports a durable terminal phase');
select lives_ok($$ select public.mark_legacy_migration_rolled_back('test-run','rollback-owner') $$,
  'rollback owner marks the run only after every record transaction completes');
select is((select state from public.legacy_migration_runs where id='test-run'),'rolled-back',
  'completed rollback releases the run in rolled-back state');
select is((select count(*)::integer from public.legacy_notas where id in ('original-target','created-target')),0,
  'rollback deletes exact-run created targets');
select is((select count(*)::integer from public.legacy_notas where id='matching-target'),1,
  'rollback preserves pre-existing matching target');
select is((select count(*)::integer from public.legacy_migration_journal where first_run_id='test-run' and entity_kind<>'identity' and state<>'rolled-back'),0,
  'rollback provenance is complete before run finalization');

reset role;set local role authenticated;
select throws_ok($$ select public.reserve_legacy_migration_record('test-run',3,'legacy_nota',repeat('e',64),repeat('f',64),'{}',repeat('e',64),'lease-a') $$,
  '42501',null,'browser role cannot reserve migration work');
select throws_ok($$ select * from public.legacy_migration_audit $$,
  '42501',null,'browser role cannot read restricted audit evidence');
select throws_ok($$ select public.reconcile_legacy_migration() $$,
  '42501',null,'browser role cannot invoke operator reconciliation');
select throws_ok($$ select public.start_legacy_migration_rollback('test-run','browser-owner') $$,
  '42501',null,'browser role cannot acquire rollback lease');
select throws_ok($$ select * from public.legacy_identity_provisioning $$,
  '42501',null,'browser roles cannot inspect restricted identity provisioning checkpoints');
reset role;set local role anon;
select throws_ok($$ select * from public.legacy_notas $$,
  '42501',null,'anonymous role cannot read quarantined legacy notas');

select * from finish();
rollback;
