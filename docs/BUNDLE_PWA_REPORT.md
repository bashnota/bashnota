# Bundle and PWA report

Measured on 2026-09-05 from a clean production build with the default
`/bashnota/` deployment base. The package scripts supply the same inert local
Supabase URL and public test key used by CI, so their artifacts are
deterministic without a developer `.env`. Run `npm run build:analyze` to
regenerate the ignored interactive treemap at
`reports/bundle-visualizer.html`, then run
`npm run test:initial-route-assets` and `npm run test:pwa` to reproduce the
budgets and browser journeys below.

## Before and current bundle

| Metric | Issue #11 audit baseline | Current production build | Enforced ceiling |
| --- | ---: | ---: | ---: |
| Application entry, raw | about 10 MB | 388,223 B | 400,000 B |
| Application entry, gzip | about 3.3 MB | about 133,420 B | reported by Vite |
| Initial CSS, raw | not recorded | 140,139 B | 150,000 B |
| Module preloads | not recorded | 0 B | 0 B |
| Largest editor chunk, raw | bundled into entry | 1,395,914 B | reported separately |
| Largest lazy chunk (WebLLM), raw | bundled into entry | 4,600,978 B | 5,000,000 B |

The baseline values are the measurements recorded when issue #11 was opened;
the exact historical artifact is not retained, so they remain approximate.
Current values come from the production artifact and are checked by
`scripts/initial-route-assets.self-test.mjs`. A regression over any numeric
ceiling fails CI.

## Representative browser route loads

These are successful JavaScript and CSS responses observed by Chromium from a
fresh profile after each route reached rendered readiness. They are raw file
bytes, not transfer-compressed bytes.

| Route | Loaded assets | Raw bytes | Heavy optional assets |
| --- | ---: | ---: | --- |
| `/` | 67 | 1,123,248 | none |
| `/login` | 29 | 855,467 | none |
| `/settings/unified-editor` | 55 | 1,039,389 | none |
| `/p/published-nota` before content exists | 46 | 1,132,879 | reader/editor deferred |

The browser gate also rejects external markup resources and any unexpected
WebLLM, editor, D3/chart, KaTeX, or Vue Flow request on these initial routes.
The current route request counts remain higher than desirable and are a useful
target for the next feature-level splitting slice.

## Offline lifecycle

The production PWA test now proves the behavior users depend on rather than
only checking an offline empty shell:

- a deliberately obsolete Workbox precache is removed when the replacement
  service worker activates;
- a nota is created, edited, durably stored, reopened by direct URL while
  offline, and rendered from IndexedDB plus the deferred-feature cache;
- a public nota is fetched online, stored as a bounded public-only snapshot,
  reopened by direct URL while offline, and rendered with its reader assets;
- public snapshots expire after seven days, are capped at 40 entries, are
  removed when the server confirms a nota is no longer public, and are cleared
  by the existing delete-all-data workflow.

The service worker continues to exclude editor, WebLLM, chart, KaTeX, and Vue
Flow payloads from install-time precaching. It caches those same-origin assets
only after a user opens the corresponding feature.
