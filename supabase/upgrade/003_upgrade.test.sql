begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select hasnt_column(
  'public', 'published_notas', 'published_sub_pages',
  'migration 003 removes the legacy array only after its backfill succeeds'
);
select results_eq(
  $$ select child_id, ordinal
     from public.published_nota_edges
     where parent_id = 'legacy-parent'
     order by ordinal $$,
  $$ values ('legacy-child-b'::text, 0), ('legacy-child-a'::text, 1) $$,
  'legacy subpage arrays are expanded with zero-based source order intact'
);
select is(
  (select count(*) from public.published_nota_edges where parent_id = 'legacy-parent'),
  2::bigint,
  'every legacy array member has a corresponding edge'
);
select results_eq(
  $$ select citation.value->>'id'
     from public.published_notas p
     cross join lateral jsonb_array_elements(p.published_nota_citations)
       with ordinality as citation(value, ordinal)
     where p.id = 'legacy-parent'
     order by citation.ordinal $$,
  $$ values ('citation-second'::text), ('citation-first'::text) $$,
  'the citation column rename preserves JSON array order'
);
select is(
  (
    select published_nota_citations #>> '{1,unknown}'
    from public.published_notas where id = 'legacy-parent'
  ),
  'true',
  'the citation rename preserves unknown migration fields'
);

select * from finish();
rollback;
