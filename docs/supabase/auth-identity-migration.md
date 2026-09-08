# Legacy identity migration

Supabase is the application's only runtime provider. Email/password, Google
OAuth, password recovery, profiles, stable public tags, publications,
community interactions, newsletter subscriptions, metrics, and published
images all use browser-safe Supabase APIs guarded by Postgres RLS.

Migrated accounts keep an immutable private mapping from their historical
Firebase UID to their Supabase Auth UUID. The mapping exists only for audit,
reconciliation, and exact restore; application code and public projections use
the Supabase UUID and never select a provider from migration state.

The operator-only `migrate_firebase_identity` transaction validates an already
confirmed Supabase account and its provider identity before atomically creating
the immutable mapping, private profile, public profile, and stable tag. It is
not granted to browser roles. Native Supabase accounts leave legacy identifiers
null.

Production deployment remains a separate gate. A fresh database initializes
`runtime_deployment_state.production_cutover` to `false`; only the deployment
owner may change it with the service role after the external import and
reconciliation evidence has been approved. The browser does not read this flag
and has no alternate backend path.

Required rehearsal:

1. Reset the local Docker stack and apply every migration from an empty database.
2. Run database RLS and browser-key integration tests.
3. Rehearse the incremental upgrade fixture and verify generated types.
4. Confirm the runtime state remains `production_cutover=false`.
5. Run the forbidden-backend scanner, typecheck, unit suite, security regression,
   production build, and bundle budget.
