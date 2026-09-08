# Editor bundle baseline

The application entry chunk must stay at or below **1,941,760 bytes** (the
pre-ProseMirror-cutover baseline).

## Cutover regression and recovery

| Build | Entry chunk | Editor chunk |
| --- | ---: | ---: |
| Pre-cutover baseline | 1,941,760 | — |
| Cutover regression | 1,971,812 | 2,015,380 |
| Recovered build | 1,940,090 | 2,047,000 |

The 30,052-byte (+1.55%) entry increase came from the raw ProseMirror adapter
being application source rather than a `node_modules` package. In particular,
Rollup placed `src/features/editor/pm/editor.ts` (17,607 rendered bytes) and
`src/features/editor/pm/stockExtensions.ts` (19,891 rendered bytes), along with
their bridge modules, in `index` after TipTap was removed. Previously, the
manual `editor` chunk matched the `@tiptap/*` package paths.

`vite.config.ts` now assigns the in-house ProseMirror adapter and the
editor-only Markdown extension to that existing `editor` chunk. This restores
the prior editor-boundary chunking without changing imports or runtime editor
behaviour. CI builds after a clean dependency install and reports both chunks;
it enforces the entry baseline exactly.
