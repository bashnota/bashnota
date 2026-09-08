begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select set_config('request.method','POST',true);
select set_config('request.path','rpc/query_publications',true);
select set_config('request.headers','{"authorization":"Bearer anonymous.token.value","x-real-ip":"198.51.100.10","content-length":"64"}',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;

select lives_ok($$ select public.api_request_boundary() $$,
  'anonymous public RPCs cross the pre-request boundary');
select ok(current_setting('response.headers',true) like '%X-Content-Type-Options%',
  'the API boundary installs documented security headers');

reset role;
select set_config('request.headers','{"authorization":"Basic credential-material","x-real-ip":"198.51.100.10"}',true);
select throws_ok($$ select public.api_request_boundary() $$,'28000','malformed authorization header',
  'malformed authentication is rejected without reflecting credentials');

select set_config('request.method','POST',true);
select set_config('request.path','rpc/publish_nota',true);
select set_config('request.headers','{"authorization":"Bearer valid.token.value","x-real-ip":"198.51.100.11"}',true);
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$ select public.api_request_boundary() $$,'42501','authenticated request required',
  'a token subject that differs from auth.uid is rejected by the typed boundary');

select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select lives_ok($$ select public.api_request_boundary() $$,
  'a matching authenticated subject crosses the typed boundary');

reset role;
delete from private.api_rate_limits;
select set_config('app.api_ip_limit','2',true);
select set_config('request.method','POST',true);
select set_config('request.path','rpc/query_comments',true);
select set_config('request.headers','{"authorization":"Bearer anonymous.token.value","x-real-ip":"203.0.113.9","x-forwarded-for":"192.0.2.1"}',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select lives_ok($$ select public.api_request_boundary() $$,'the first per-IP request is allowed');
select lives_ok($$ select public.api_request_boundary() $$,'the final in-quota per-IP request is allowed');
select throws_ok($$ select public.api_request_boundary() $$,'PGRST',null,
  'the next per-IP request is denied deterministically');

reset role;
delete from private.api_rate_limits;
select set_config('request.headers','{"authorization":"Bearer anonymous.token.value","x-forwarded-for":"192.0.2.1"}',true);
set local role anon;
select throws_ok($$ select public.api_request_boundary() $$,'22023',
  'missing or malformed gateway client address',
  'a client-controlled forwarding chain cannot replace the trusted gateway address');

reset role;
delete from private.api_rate_limits;
select set_config('request.headers','{"authorization":"Bearer anonymous.token.value","x-real-ip":"203.0.113.9"}',true);
set local role anon;
select lives_ok($$ select public.api_request_boundary() $$,
  'deleting the fixed-window bucket deterministically resets the IP quota');

reset role;
delete from private.api_rate_limits;
insert into private.api_rate_limits(scope,subject,route,window_started_at,request_count)
values
  ('ip','expired','rpc/query_comments','2026-08-27 09:59:00+00',1),
  ('ip','retained','rpc/query_comments','2026-08-27 11:30:00+00',1);
select lives_ok($$ select * from private.consume_api_quota(
  'ip','current','rpc/query_comments',2,60,'2026-08-27 12:00:30+00') $$,
  'quota consumption prunes expired buckets');
select is((select count(*) from private.api_rate_limits),2::bigint,
  'quota retention keeps only the current hour and new bucket');
select is((select count(*) from private.api_rate_limits where subject='expired'),0::bigint,
  'quota retention removes buckets older than one hour');

delete from private.api_rate_limits;
select set_config('app.api_account_limit','2',true);
select set_config('request.path','rpc/create_comment',true);
select set_config('request.headers','{"authorization":"Bearer valid.token.value","x-real-ip":"203.0.113.10"}',true);
select set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select lives_ok($$ select public.api_request_boundary() $$,'the first per-account mutation is allowed');
select lives_ok($$ select public.api_request_boundary() $$,'the final in-quota account mutation is allowed');
select throws_ok($$ select public.api_request_boundary() $$,'PGRST',null,
  'the next per-account mutation is denied deterministically');

reset role;
delete from private.api_rate_limits;
set local role authenticated;
select lives_ok($$ select public.api_request_boundary() $$,
  'deleting the fixed-window bucket deterministically resets the account quota');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
select throws_ok($$ select public.query_publications(p_limit=>0) $$,'22023',
  'page limit must be between 1 and 100','zero pagination is rejected rather than silently clamped');
select throws_ok($$ select public.query_publications(p_limit=>101) $$,'22023',
  'page limit must be between 1 and 100','oversized pagination is rejected rather than silently clamped');
select throws_ok($$ select public.query_comments(repeat('n',161),p_limit=>20) $$,'22023',
  'publication id must be a trimmed 1-160 character identifier','oversized IDs fail before comment lookup');
reset role;
set local role authenticated;
select throws_ok($$ select public.create_comment(
  'comment','nota',jsonb_build_object('body',repeat('x',20000)),null,null) $$,'22023',
  'comment content is required and must be at most 20000 bytes',
  'oversized comment content fails before authentication or database mutation');

reset role;
select throws_ok($$ select private.assert_publication_payload(
  'nota','Title',jsonb_build_object('body',repeat('x',1048576)),'Author',null,'[]','{}','{}') $$,
  '22023','content must be an object no larger than 1 MiB','oversized nota content is rejected');
select throws_ok($$ select private.assert_publication_payload(
  'nota',repeat('t',501),'{}','Author',null,'[]','{}','{}') $$,
  '22023','title must contain 1-500 characters','oversized titles are rejected');
select throws_ok($$
  select public.publish_nota_hierarchy((
    select jsonb_agg(jsonb_build_object(
      'id','nested-'||level,
      'title','Nested '||level,
      'content','{"type":"doc"}'::jsonb,
      'author_name','Author',
      'is_sub_page',level>1,
      'parent_id',case when level=1 then null else 'nested-'||(level-1) end,
      'citations','[]'::jsonb,
      'tags','[]'::jsonb,
      'child_ids',case when level=33 then '[]'::jsonb else jsonb_build_array('nested-'||(level+1)) end
    ) order by level) from generate_series(1,33) level
  ))
$$,'22023','publication nesting may not exceed 32 levels',
  'over-deep publication nesting fails before any hierarchy mutation');

select * from finish();
rollback;
