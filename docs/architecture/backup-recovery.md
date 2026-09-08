# Backup and recovery

## IndexedDB mode

Use the application's export function to create `.nota` files and store copies
outside the browser profile. Browser storage can be evicted or lost when site
data/profile data is cleared. Before upgrades that change schemas, export a
representative nota and verify it can be imported into a separate browser
profile.

Recovery: preserve the damaged profile, create a clean profile, import copies
one at a time, and verify document structure, nested notas, code, and outputs.
Do not overwrite the only backup during diagnosis.

## Filesystem mode

Back up the workspace directory with a tool that preserves complete files and
supports snapshots (for example version control for non-sensitive work or an
encrypted backup system). Filesystem watching is experimental; external edits
may not be observed immediately. Close/reopen and validate before relying on an
external edit. Never commit secrets, personal notebook exports, or large
execution outputs merely because the files are Git-compatible.

Recovery: copy the workspace to a new location, inspect JSON before granting a
browser handle, then open/import a copy. Keep the original immutable.

## Supabase production data

Database and Storage backup/restore is an operator responsibility. Record the
project ref, migration SHA, schema version, backup timestamp, retention, and a
restore rehearsal. Restore into an isolated project first; run migrations and
RLS/security tests before cutover. Authentication identity mapping and legacy
migration procedures are under `docs/supabase/`.

## Release/source recovery

Verify an archive with `sha256sum -c <archive>.sha256`, extract it, and clone
`history/bashnota.bundle`. Compare the checked-out commit with
`release-manifest.json`, verify the signed tag against a separately trusted
maintainer key, and run the clean-room commands. The bundle is supplemental
history, not a substitute for validating the source snapshot and signature.
