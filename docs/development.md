# Clean-room development setup

These steps are intended for a new checkout with no cached dependencies or
credentials.

## Toolchain and installation

1. Install Git, Node 22.14.x, npm 10.9.x, Docker, and Chrome/Chromium.
2. Clone `https://github.com/mlnomadpy/bashnota.git` and check out `master` or
   the exact signed release tag being evaluated.
3. Run `npm ci` at the repository root. Do not run `npm install` for a release
   build: `package-lock.json` is the resolved dependency contract.
4. Copy `.env.example` to `.env` and supply only browser-public values.

There is no `functions/` npm workspace. Current Edge Functions live in
`supabase/functions/` and use the Deno runtime supplied by the pinned Supabase
CLI. Historical Firebase Functions and their emulator are retired and must not
be restored; use `npm run supabase:start` and `npm run supabase:reset`.

## Environment variables

| Variable | Context | Purpose |
| --- | --- | --- |
| `VITE_NODE_ENV` | browser build | Development/production label; not a security boundary. |
| `VITE_APP_BASE_URL` | browser build | Canonical public application origin. |
| `VITE_DEPLOY_BASE` | browser build | Optional static-host path; defaults to `/bashnota/`. |
| `VITE_SUPABASE_URL` | browser build | Public Supabase HTTPS origin (localhost HTTP is allowed in tests). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser build | Browser-safe publishable key only. |
| `SUPABASE_DEPLOY_GATE_SELF_HOSTED_ORIGIN` | protected CI/operator process | Explicitly approves one self-hosted production origin; never prefix with `VITE_`. |
| `JUPYTER_ALLOWED_ORIGIN` | local Jupyter container | Exact local application origin accepted by the test server. |
| `CHROME_BIN` | tests | Optional path to a system Chrome/Chromium executable. |

Never place AI API keys, Jupyter tokens, service-role keys, database passwords,
SMTP credentials, private keys, or customer data in a tracked file or `VITE_*`
variable. User-entered AI/Jupyter credentials are runtime data and are not part
of a release archive.

## Run and verify

```bash
npm ci
cp .env.example .env
npm run supabase:start
npm run supabase:reset
npm run dev
```

Vite development (`127.0.0.1`/`localhost`), GitHub Pages under `/bashnota/`,
and the repository's Nginx container are supported. Alternate static hosts are
verification targets only and must preserve SPA fallback, the configured base
path, security headers, and the Supabase-only runtime.

For local executable-code testing:

```bash
docker compose -f docker-compose.jupyter.yml up -d --wait
npm run test:jupyter-local
docker compose -f docker-compose.jupyter.yml down
```

The compose service deliberately disables authentication for loopback-only
testing. Never bind it publicly. Token-authenticated behavior is exercised by
`npm run test:jupyter-security` without persisting the token in URLs.

## Clean-room release verification

```bash
npm ci
npm run release:check
npm run release:licenses
npm run release:sbom
npm run release:package
```

Docker-backed Supabase and browser suites remain required release evidence; see
`docs/release-readiness.md`. `npm run release:package` creates local artifacts
only and never deploys, tags, pushes, or opens a GitHub release.
