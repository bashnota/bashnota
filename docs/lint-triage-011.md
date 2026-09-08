# Lint Triage — Task 011

Triage of the ESLint violations exposed after the parser was repaired (task 002).
Unused *values* were treated as potential bug evidence, not just style noise.

## Violation counts (`npx eslint src`)

| Rule | Before | After | Action |
|------|-------:|------:|--------|
| `@typescript-eslint/no-unused-vars` | 573 | 324 | 249 unused **imports** removed; 206 assigned + 117 non-import defined **kept** (triaged, not deleted) |
| `prefer-const` | 10 | 10 | out of task scope (not in acceptance set) |
| `vue/multi-word-component-names` | 2 | 2 | out of scope |
| `vue/no-unused-vars` | 2 | 2 | out of scope (unused template `v-for` index) |
| `@typescript-eslint/no-require-imports` | 2 | 2 | out of scope |
| `vue/no-mutating-props` | 2 | **1** | 1 fixed (TableBlock), 1 documented (CommentItem) |
| `vue/no-dupe-keys` | 2 | 2 | both documented (benign shadow) |
| `vue/no-side-effects-in-computed-properties` | 1 | 1 | documented (error-path only) |
| `vue/no-dupe-v-else-if` | 1 | 1 | documented (dead branch, text still shown) |
| `vue/return-in-computed-property` | 1 | **0** | fixed (CalendarLayout) |
| `@typescript-eslint/no-unsafe-function-type` | 2 | **0** | fixed (suggestion.ts) |
| `@typescript-eslint/no-empty-object-type` | 2 | 2 | documented (generated Vue shim) |
| **TOTAL** | **600** | **347** | |

(Root reported 604; the working tree measured 600 after siblings 002/003/004/007 landed.)

## The 577/604 no-unused-vars, split two ways

The 573 `no-unused-vars` in this tree divide into:

- **Unused IMPORTS — 249 specifiers across 123 files. SAFE, REMOVED.**
  Deleted with an AST-driven codemod (TypeScript compiler API) that only ever
  edits `ImportDeclaration` specifiers, so it is structurally incapable of
  touching an assigned value. 66 import statements became empty and were dropped
  whole; 183 were narrowed. Verified: type-check green, 338 tests pass, build ok.
- **Assigned values — 206. KEPT. Each triaged below; none deleted.**
- **Other `defined but never used` (non-import) — 117. KEPT.**
  Function parameters, destructured-but-unused composable members, and unused
  type parameters. Not imports, so not in the "safe to delete" bucket.

## Assigned-value triage (the bug-evidence category)

Of the 206 assigned-but-unused values, **65 hold a function-call / `await` /
`getJSON` / `.map` / `.filter` result** — the category where a "computed a value
then forgot to use it" bug hides (per root's rank-1 finding on NotaEditor:952).
Each was inspected individually:

- **2 are real bugs** (filed as findings, NOT deleted).
- **55 are dead code** — unused `computed`/`ref`, destructured composable members
  never read, handlers declared but never wired to a template or `emit`, and
  stale local parses. No downstream consumer expected the value; deleting the
  *declaration* loses nothing (but is out of this task's delete-scope).
- **8 are benign** — `const props = defineProps(...)` / `const emit = defineEmits(...)`
  where the compiler macro still applies; the binding is merely unread.

The remaining 141 assigned values are literals / simple locals (`ref('')`,
booleans, strings) — dead reactive state, no computed result at risk.

### The 2 real bugs

1. **`NotaEditor.vue:951` — version save discards document content (data-loss).**
   `saveVersion()` computes `const content = editor.value.getJSON()` but then
   builds `versionNota = { ...currentNota.value }` and passes *that* to
   `notaStore.saveNotaVersion(...)`. `content` is never attached. Every saved
   version stores stale nota content, not the live editor state. This is the
   worked example root flagged (line 952 is the eslint anchor; the `getJSON()`
   call is line 951). Corroborates sibling findings 01KZRVA9MX / 01KZRV1X9X.
   **Left in place as evidence; filed, not silently deleted.**

2. **`migrationService.test.ts:190` — rollback test never verifies the rollback.**
   `const targetNotas = await mockTargetBackend.listNotas()` fetches post-rollback
   state, but the only assertion is `expect(mockTargetBackend.deleteNota).toHaveBeenCalled()`.
   The intended `expect(targetNotas).toEqual([])` (target cleared) was never
   written. The test passes without checking what it claims. Weak-test bug.

Full per-item classification: see `hot-classified` output captured in the task
finding (65 lines, dead/bug/benign each with `file:line` and the RHS expression).

## The 8 named non-unused-vars violations

| Rule | Site | Verdict |
|------|------|---------|
| `no-unsafe-function-type` | `suggestion.ts:270,278` | **FIXED** — `Function` → `(...args: any[]) => any`; behavior-identical, types tightened. |
| `return-in-computed-property` | `CalendarLayout.vue:218` | **FIXED** — `viewModeLabel` switch had no default; added `default: return ''` so the computed always returns. |
| `no-mutating-props` | `TableBlock.vue:90` | **FIXED** — removed `props.node.attrs.tableData = ...` direct mutation; the following `updateAttributes()` / transaction already sets it the correct (ProseMirror) way, so the direct write was redundant and an anti-pattern. |
| `no-mutating-props` | `CommentItem.vue:145` | **DOCUMENTED (intentional)** — `props.comment.replyCount++` is optimistic UI; the component immediately `emit('comment-updated')` so the parent reconciles. Rewriting to a local mirror is a behavior change beyond scope. Minor one-way-data-flow smell. |
| `no-side-effects-in-computed-properties` | `SubfigureBlock.vue:102` | **DOCUMENTED (intentional)** — `error.value = ...` runs only inside the `catch` of the `attrs` computed (invalid-attrs guard). Defensive, fires only on malformed input; low risk. |
| `no-dupe-v-else-if` | `ErrorRenderer.vue:157` | **DOCUMENTED (real, cosmetic)** — the `v-else-if="!isJupyterErr && showFullError"` branch is unreachable: the earlier `v-if="formattedError?.details || showFullError"` (line 128) already matches whenever `showFullError` is true. The raw-error text still renders via branch 128 (`{{ formattedError?.details || error }}`), so only the distinct "Raw Error Output" styling is lost. Correcting it requires guessing the author's intent (likely 128 should gate on `isJupyterErr`), so left as a documented finding rather than a speculative behavior change. |
| `no-dupe-keys` | `AddServerDialog.vue:70` (`form`) | **DOCUMENTED (benign)** — a `form` prop and a `const form = useForm(...)` share the name. In the template the setup binding wins (Vue resolves setup > props), and script uses `props.form` explicitly. Works; renaming touches ~10 sites. |
| `no-dupe-keys` | `SidebarToggleButton.vue:46` (`closeIcon`) | **DOCUMENTED (benign)** — `const closeIcon = computed(...)` wraps `props.closeIcon` via `effectiveCloseIcon`; the computed shadows the prop in the template, which is the intended value. Works. |
| `no-empty-object-type` | `shims-vue.d.ts:3` (×2) | **DOCUMENTED (intentional)** — `DefineComponent<{}, {}, any>` is the canonical create-vue SFC shim. Changing `{}` to `object`/`unknown` would break the component-type contract. Generated boilerplate; left as-is. |

## What was NOT touched (scope discipline)

`prefer-const` (10), `vue/multi-word-component-names` (2), `vue/no-unused-vars`
(2), `no-require-imports` (2) — the "8 others" root mentioned — are outside this
task's acceptance set and were left untouched to keep the diff narrow. The 206
assigned values and 117 non-import unused identifiers were kept (triaged, not
deleted) per the acceptance rule that assigned values are never removed without a
stated judgement.

## Verification

- `npx vue-tsc --build --force`: exit 0, 0 errors, 0 `.js` emitted under `src/`.
- `npx vitest run`: 24 files, **338 passed** (baseline unchanged).
- `npx vite build`: succeeds in ~8.4s, entry chunk 10,057.90 kB (baseline).
- `npx eslint src`: **600 → 347** violations.
