# Production deployment cutover

The deploy workflow is fail-closed. It requires an HTTPS Supabase project URL, a
browser-safe `sb_publishable_` key, and SHA-256 migration and reconciliation
evidence identifiers. Before building, it calls a fixed-search-path verifier
that exposes one boolean and no restricted marker fields. Approval requires an
exact URL/key hash and both evidence hashes, with `production_cutover` true.

Managed `*.supabase.co` origins are accepted directly. A self-hosted gateway is
accepted only when `SUPABASE_DEPLOY_GATE_SELF_HOSTED_ORIGIN` is set to that exact
HTTPS origin. The value must not contain credentials, a path, query, or fragment.
For the BashNota production environment, both it and `VITE_SUPABASE_URL` are
`https://supabase.apps.tahabouhsine.com`. Hostname lookalikes and remote HTTP
origins fail closed. Local HTTP remains available only with
`SUPABASE_DEPLOY_GATE_ALLOW_HTTP_LOCAL=true` and a localhost address.

Set the evidence identifiers in the protected production environment. They are
not `VITE_` variables and are never bundled. The gate uses only the same
publishable key shipped to the browser; no privileged backend key enters the build
workflow. The local
Docker regression test starts with the marker false, applies
`supabase/tests/deployment/approved-local-cutover.json`, then demonstrates that
the same verifier permits the canonical `npm run build`.
