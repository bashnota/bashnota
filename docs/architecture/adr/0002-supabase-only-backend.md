# ADR 0002: Supabase-only production backend

- Status: accepted
- Date: 2026-09-03

## Context

Early BashNota history used Firebase and issue text referred to a Functions
install and Firebase emulator. The current runtime, migrations, tests, and
deployment gate establish Supabase as the sole production backend.

## Decision

Clean-room and release instructions use the pinned Supabase CLI and
`supabase/functions/`. Firebase SDKs, Functions workspaces, emulator defaults,
credentials, and deployment paths are retired and cannot be restored as
compatibility fallbacks. Historical Firebase data may enter only through the
documented offline JSON migration boundary.

## Consequences

Old Firebase-oriented instructions are evidence of history, not supported
commands. Alternate web hosting remains possible only when it uses the same
locked SPA build and Supabase public origin boundary; GitHub Pages is the
production deployment target.
