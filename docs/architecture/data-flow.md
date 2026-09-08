# System and data flow

```text
Browser UI / routes
        |
        v
Feature slices + Pinia stores <--> TipTap editor JSON
        |                 \
        |                  +--> Jupyter HTTP + WebSocket (user-selected server)
        v
Storage adapter
   |                \
   v                 v
Dexie/IndexedDB    File System Access (.nota, experimental)
        \
         +--> Supabase JS client --> Auth / Postgres+RLS / Storage / Edge Functions
```

## Local nota path

Nota actions enter through `src/features/nota/`; editor state is serialized as
TipTap JSON on the nota record. The legacy normalized block tables and their
`blockStructures` ordering index coexist with that representation. Until the
migration establishes one authority, format conversions and save/load
round-trips are compatibility-critical and backups are mandatory.

Dexie data stays in the browser origin. Filesystem mode uses browser-granted
handles and `.nota` JSON; the browser security model, not a server daemon,
controls access. External modifications are not a durable synchronization
protocol.

## Cloud path

`src/services/cloud/` is the public client boundary for Supabase authentication,
profiles, community, publishing, analytics, and image storage. Browser requests
use a publishable key. Authorization is enforced by Postgres RLS and privileged
transactions in `supabase/migrations/`; server secrets must never enter the SPA.
Published nota content becomes cross-user data and must pass rendering and
storage validation.

## Execution and AI paths

Executable blocks send code and receive outputs over the configured Jupyter
server. AI features send selected content to the provider chosen by the user.
Both paths leave local storage; credentials and notebook content must be
redacted from logs, URLs, durable diagnostics, exports, and release artifacts.

## Deployment path

Pull requests and pushes to `master` run `.github/workflows/ci.yml`. The Pages
workflow consumes the exact successful Quality SHA, rebuilds with the locked
dependency graph, validates Supabase public configuration, and deploys the
static PWA. A direct developer upload is not a supported production path.
