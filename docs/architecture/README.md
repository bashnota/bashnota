# Architecture index

BashNota is a Vue 3/TypeScript single-page application organized by feature
slices under `src/features/`. Pinia coordinates UI state; TipTap/ProseMirror is
the editor model. Nota data is local-first through IndexedDB (Dexie) or the
experimental File System Access adapter. Authenticated publishing and community
features cross the Supabase client boundary. Executable blocks cross a separate
user-configured Jupyter HTTP/WebSocket boundary.

- [System and data flow](data-flow.md)
- [Threat model](threat-model.md)
- [Backup and recovery](backup-recovery.md)
- [`.nota` format compatibility](format-compatibility.md)
- [ADR 0001: preserve authentic history](adr/0001-preserve-authentic-history.md)
- [ADR 0002: Supabase-only production backend](adr/0002-supabase-only-backend.md)

The feature-sliced layout is deliberate. Cross-feature code should use a
feature's public surface rather than deep-importing internal components,
composables, stores, or services.
