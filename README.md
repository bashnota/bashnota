# BashNota

<div align="center">
  <img src="src/assets/logo.svg" alt="BashNota Logo" width="120" />
  <h3>More Than a Second Brain, It's a Second Brain Cracked on Code and AI</h3>
  
  [![Issues](https://img.shields.io/github/issues/mlnomadpy/bashnota)](https://github.com/mlnomadpy/bashnota/issues)
  [![Pull Requests](https://img.shields.io/github/issues-pr/mlnomadpy/bashnota)](https://github.com/mlnomadpy/bashnota/pulls)
  [![License](https://img.shields.io/github/license/mlnomadpy/bashnota)](LICENSE)
  [![Deploy](https://img.shields.io/badge/deploy-live-brightgreen)](https://offline.bashnota.com)
</div>

## Overview

BashNota combines rich text editing with executable code blocks, AI assistance, and seamless organization. Built for developers who need more than just notes.

**Key Features:**
- 📝 Rich markdown editing with TipTap
- 💻 Execute Python/JavaScript code blocks
- 🤖 AI assistant integration
- 📊 LaTeX math & Mermaid diagrams
- 🔗 Jupyter notebook integration
- 🌙 Dark/light themes
- 💾 **Dual storage modes**: IndexedDB or direct file system access
- 🔄 **Filesystem workspace (experimental)**: Import/export `.nota` files through the browser

## Quick Start

### Prerequisites

- Node.js 22.14.0 or newer in the Node 22 line, and npm 10.9.2+
- Docker for the local Supabase and Jupyter integration suites
- Chrome/Chromium for browser verification

### Development
```bash
git clone https://github.com/mlnomadpy/bashnota.git
cd bashnota
npm ci
cp .env.example .env  # Configure your environment
npm run dev
```

The frontend has no nested installation step. Supabase Edge Functions are Deno
projects under `supabase/functions/`; the pinned Supabase CLI downloads their
runtime when local services start. This repository no longer contains a
Firebase Functions runtime or Firebase emulator. See
[development setup](docs/development.md) for environment variables, supported
hosts, and clean-room commands.

### Build & deployment
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deployment is performed by the GitHub Pages workflow after quality checks.
```

There is intentionally no local deployment script: contributors build and verify a
candidate locally; the pinned workflow deploys the exact tested commit.

### Supabase local services
```bash
npm run supabase:start
npm run supabase:reset
npm run test:supabase
```

### Local Jupyter server

For executable-code development and end-to-end testing, start the localhost-only Jupyter service:

```bash
docker compose -f docker-compose.jupyter.yml up -d
```

The compose stack allows BashNota at `http://127.0.0.1:5173` by default. When
testing the app on another local port, set the exact origin explicitly:

```bash
JUPYTER_ALLOWED_ORIGIN=http://127.0.0.1:5174 docker compose -f docker-compose.jupyter.yml up -d
```

In BashNota, add a Jupyter server with host `127.0.0.1`, port `8888`, and an empty token. The container accepts requests only through the loopback port and allows the local Vite origin (`http://127.0.0.1:5173`). Authentication and XSRF protection are disabled for this local test service, so do not expose port 8888 beyond localhost.

Verify real kernel creation, WebSocket execution, output, and cleanup with:

```bash
npm run test:jupyter-local
```

Stop it with:

```bash
docker compose -f docker-compose.jupyter.yml down
```

### Verification suites

```bash
# Deterministic unit/integration tests; writes test-results/vitest-junit.xml.
# The command fails on test failures and on skips outside the explicit local-
# Supabase integration allowlist.
npm run test:fast

# Critical storage, migration, publishing, editor-service, and store coverage.
# The command emits coverage/lcov.info and fails below 60% lines or branches.
npm run test:coverage

# Focused large-library, many-block, and large-output regression budgets. These
# also run as part of test:fast.
npm run test:performance

# Real-Chrome application workflow E2E with no automatic retries; writes
# test-results/playwright-junit.xml. Set CHROME_BIN for a nonstandard install.
npm run test:playwright

# Production-build PWA install, service-worker replacement, and offline-load
# checks; writes test-results/pwa-junit.xml.
npm run test:pwa

# Full local Supabase emulator suite followed by Playwright application E2E and
# the browser security, Jupyter, deep-link, and initial-route gates. Requires
# Docker and a Chrome installation.
npm run test:emulator-e2e
```

Production builds default to the GitHub Pages base `/bashnota/`. Set
`VITE_DEPLOY_BASE=/` for Netlify or another custom-domain root, or
set it to an absolute path such as `/notebooks/` for a subpath deployment.
The value is validated during config loading and always normalized with a
trailing slash.

GitHub Pages is the production web target. A local Vite host, the production
container, and a root-path static host are supported for development or
verification only; all hosts must use the same locked npm build and the
Supabase-only backend boundary.

### Coolify container deployment

The production image performs the type-checked build and serves the generated
PWA from an unprivileged Nginx process on port `8080`. In a Coolify Dockerfile
application, configure these build variables:

- `VITE_DEPLOY_BASE=/`
- `VITE_SUPABASE_URL=https://supabase.apps.tahabouhsine.com`
- `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`

Only the publishable key is browser-safe. Never provide privileged backend
credentials, a database password, or an SMTP credential as a Docker build
argument. Configure `SUPABASE_DEPLOY_GATE_SELF_HOSTED_ORIGIN` only in the
protected deployment-gate environment; for production its exact value is
`https://supabase.apps.tahabouhsine.com`. The public gateway must proxy Auth,
REST, Storage, and Edge Functions through that same HTTPS origin.

To verify the image locally (including SPA deep links, PWA MIME/cache policy,
security headers, health endpoint, and browser-bundle secret markers), run:

```bash
npm run test:container
```

Coolify should use `/healthz` as the health-check path. TLS terminates at
Traefik, while the container exposes only internal HTTP port `8080`.

The fast suite includes deterministic AI streaming contracts and an in-memory
Jupyter HTTP/WebSocket protocol server, so neither suite contacts a production
provider. The emulator command uses generated fixture users and nota content
only. It does not require production credentials or customer data. Unit tests
are never retried automatically; a flaky failure remains visible and blocking.

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Editor**: TipTap (ProseMirror)
- **UI**: Tailwind CSS + Radix Vue + Shadcn
- **Backend**: Supabase (Auth, Postgres, RLS, Storage)
- **Code Execution**: Jupyter protocol
- **AI**: OpenAI, Gemini, Claude

## Project Structure

```
src/
├── features/           # Feature modules
│   ├── ai/            # AI assistant
│   ├── editor/        # Note editor
│   ├── nota/          # Note management
│   └── jupyter/       # Jupyter integration
├── components/        # Shared components
├── ui/               # UI components
└── stores/           # State management
```

## Storage Modes

BashNota supports two storage modes for maximum flexibility:

- **IndexedDB Mode** (default): Browser-based storage for quick setup
- **File System Mode**: Direct file system access for .nota files
  - Explicit browser-mediated import/export
  - External-edit watching remains experimental; keep independent backups
  - Easy backup and version control
  - Works with git

See [FILE_SYSTEM_MODE.md](docs/FILE_SYSTEM_MODE.md) for detailed documentation.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

Release, security, provenance, and architecture material is indexed in
[docs/release-readiness.md](docs/release-readiness.md). Release candidates can
be checked and packaged with `npm run release:check` and `npm run
release:package`; these commands do not publish or tag anything.

## Acknowledgments

Built with these amazing open-source projects:

- [Vue.js](https://vuejs.org/) - Progressive JavaScript framework
- [TipTap](https://tiptap.dev/) - Headless rich-text editor
- [ProseMirror](https://prosemirror.net/) - Rich text editing toolkit
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix Vue](https://www.radix-vue.com/) - Unstyled, accessible components
- [Supabase](https://supabase.com/) - Backend platform
- [Vite](https://vitejs.dev/) - Build tool

## License

GNU Affero General Public License v3.0 only. See [LICENSE](LICENSE) and
[NOTICE](NOTICE). Dependency licenses are separate and are emitted by `npm run
release:licenses`.

---

<div align="center">
  <a href="https://offline.bashnota.com">🚀 Try BashNota</a> • 
  <a href="https://github.com/mlnomadpy/bashnota/issues">Report Bug</a> •
  <a href="https://github.com/mlnomadpy/bashnota/discussions">Discussions</a>
</div>
