# BashNota capability and browser experience audit

Date: 2026-09-01  
Scope: desktop-first, all user-facing routes and settings destinations, representative actions for every capability family  
Application baseline: `master` at `b1e0ccaa540c9f392eccb516d1ccc5462d8e090a`  
Browser: Codex in-app Chromium, local Vite application at `http://127.0.0.1:4210/bashnota/`

## Executive summary

BashNota has an unusually broad product surface: a local-first nota library, a structured ProseMirror editor, specialist research and data-science blocks, Jupyter execution, AI providers and actions, references, version history, import/export, storage migration, authentication, publishing, and community interaction.

The library and settings information architecture are now substantially clearer. Search, filtering, selection, preview, favorites, split panes, settings navigation, help, guest auth guards, public missing-nota handling, AI configuration errors, and Jupyter connection errors all produced understandable UI.

The primary quality risk is not visual polish. It is the gap between a capability being advertised and the complete journey being reliable. The exploratory browser session found a critical data-loss chain: creating a second nota produced duplicate canonical block structures, every autosave failed, and visible edits disappeared after reload. The same corrupted state made versioning and later mutations unreliable. The slash-command catalog also advertises numerous specialist blocks, but several basic commands and the Insert menu did not create the chosen structure. Imports can report failure after mutating the library.

Overall assessment:

- Information architecture: **Good and improving**
- Core single-nota writing: **Good when canonical state is healthy**
- Multi-nota/editor state: **Critical risk**
- Capability discoverability: **High breadth, inconsistent truthfulness**
- Settings: **Good navigation, several placeholders**
- Error feedback: **Mixed; some clear errors, some silent or contradictory outcomes**
- Automated quality gates: **Broad and green, but too happy-path-oriented for stateful exploratory failures**

## Complete feature and capability inventory

### 1. Library and workspace

- Local private nota library
- Create a blank nota
- Create from Meeting Notes, Idea Capture, and Daily Journal templates
- Search by title, content, and tags
- Sort the library
- Quick filters: favorites, recent, and tagged notas
- Pagination
- Table row selection and select-all
- Batch favorite, tagging, deletion, and clear-selection actions
- Row actions: preview, favorite/unfavorite, and delete
- Quick preview with open-in-editor action
- Recent and favorites navigation
- Import native `.nota` files
- Import Jupyter `.ipynb` notebooks
- Workspace links to settings, authentication, GitHub, and X

### 2. Nota organization and navigation

- Hierarchical nota tree
- Root notas and sub-notas
- Add sub-nota affordances
- Nota tabs
- Multiple open notas
- Split-right and split-down editor panes
- Close panes and tabs
- Breadcrumb navigation
- Nota title, tags, favorite state, metadata, timestamps, IDs, and statistics
- Dedicated favorites route

### 3. Rich editor

- Paragraphs and headings 1–3
- Bold, italic, and inline code
- Bullet, ordered, and task lists
- Block quotes and horizontal rules
- Undo and redo
- Markdown paste/import dialog with block preview
- Drag handles and block context menu
- Word count and save state
- Autosave to normalized canonical blocks
- Math rendering toggle

### 4. Structured and specialist blocks

- Standard code block
- Executable code block
- Execution pipeline
- Math block with LaTeX
- Theorem/proof block
- Citation block and citation picker
- Generated bibliography
- Figure with subfigures
- YouTube embed
- Standard table
- Database table with table, calendar, Kanban, and chart layouts
- Confusion matrix with CSV/Jupyter inputs and metrics
- Mermaid diagram entry
- Draw.io diagram
- Sub-nota links
- Reusable favorite blocks

### 5. References and research

- References sidebar
- Reference search
- BibTeX batch parsing and validation
- Citation insertion
- Bibliography generation
- Reference metadata persistence
- UI copy also advertises manual entry and DOI lookup

### 6. Versioning and portability

- Save a named/versioned snapshot
- List version history
- Restore a version
- Delete a version
- Export a nota/site archive
- Native nota export/import
- Full workspace JSON backup
- Atomic backup validation and restore services
- HTML output route for executable blocks

### 7. Jupyter and code execution

- Add and manage Jupyter servers
- Parse a full Jupyter URL or configure host, port, and token manually
- Local and remote security validation
- Kernel discovery and selection
- Sessions and shared-session state
- Python/notebook execution
- Text, JSON, HTML, table, image, and error output rendering
- Full-screen output and dedicated output route
- Code templates and formatting
- AI code assistance and error analysis surfaces
- “Run All” is visible but explicitly unavailable

### 8. AI

- Google Gemini provider
- In-browser WebLLM provider
- Local Ollama provider
- Provider selection and fallback
- Model selection
- Temperature, token, timeout, and custom-prompt controls
- Editor AI assistant conversations
- Nota mentions in prompts
- Writing actions such as summarize/rewrite/grammar
- Custom writing actions
- Code actions and error analysis
- Provider credentials retained in memory rather than durable settings

### 9. Storage, offline, backup, and recovery

- IndexedDB storage
- File System Access API storage
- In-memory fallback authority
- Storage-mode migration
- Filesystem auto-watch setting
- PWA installation and offline shell
- Full backup export/import
- Cache clearing
- Delete-all-data surface
- System, browser, storage, and performance diagnostics

### 10. Authentication and account

- Email/password registration
- Email/password login
- Google OAuth
- Remember-email control
- Password visibility controls
- Password-reset request and recovery completion route
- Auth callback route
- Authenticated profile guard with post-login redirect
- Profile/tag management
- Logout

### 11. Publishing and community

- Publish/unpublish a nota
- Publish sub-page hierarchies
- Public nota route
- Author/tag portfolio routes
- Legacy author route
- Publication views, likes, and clone counts
- Clone a public nota into the local library
- Comments, replies, voting, refresh, and pagination
- Published-image storage lifecycle
- Portfolio CSV export

### 12. Appearance, accessibility, help, and keyboard use

- System, light, and dark themes
- Color schemes
- Scheduled appearance settings
- Sidebar position and width
- Interface density and visibility preferences
- Custom CSS field
- Reduced motion and high contrast
- Editor typography, code, formatting, and autosave settings
- Settings navigation filter and command palette
- Editor, navigation, and global shortcut pages
- Searchable help dialog
- 404 recovery page
- Responsive/mobile regression coverage

## Browser test matrix

Quality ratings: **Good**, **Fair**, **Poor**, **Failed**, or **Blocked**.

| Capability | Intention | Browser action | Observed result | Quality |
|---|---|---|---|---|
| Empty library | Understand the starting state | Opened `/` with a fresh local library | One clear workspace CTA and an explanatory empty state | Good |
| Nota creation | Start writing quickly | Clicked “Create a nota” | Nota was created, a single bottom notification appeared, and the editor opened after asynchronous navigation | Good |
| Library organization | Find and narrow notas | Used search, no-result query, quick filters, sort/filter disclosure | Counts, empty feedback, and clear/reset actions were understandable | Good |
| Selection | Operate on exact notas | Selected one row | Toolbar showed “1 selected”; header checkbox entered a real mixed state | Good |
| Batch favorite | Favorite a healthy nota | Selected a normal nota and chose Add to Favorites | Success toast and favorite state were correct | Good |
| Batch favorite after failed import | Mutate an imported nota | Selected the partially imported fixture and chose Add to Favorites | “Failed to update favorite status” | Failed |
| Quick preview | Inspect without navigation | Opened Preview from a row action | Modal was compact and offered Open in editor | Good |
| Favorites | Reopen important notas | Favorited a nota and opened `/favorites` | Correct nota appeared as a card/link | Good |
| Nota edit dialog | Change metadata | Opened Edit nota, General/Actions/Info tabs | Title, tags, favorite, share, export, delete, and info were discoverable | Good |
| Templates | Create structured meeting notes | Selected Meeting Notes, entered title, clicked Create | Success toast and library row appeared, but the modal stayed open and the new editor was not selected | Poor |
| Template content | Start from promised structure | Opened the created Meeting Notes nota | The editor was blank; none of the previewed meeting markdown was applied | Failed |
| Core editing | Write and rename | Edited title and body in the first nota | Title and first-nota body persisted across navigation/reload | Good |
| Second-nota autosave | Reliably edit another open nota | Typed in the second nota, waited, reloaded | Visible text disappeared after reload | Failed — critical |
| Autosave diagnostics | Understand why save failed | Inspected browser console after reproduction | Four retries failed because multiple canonical block structures existed | Failed — critical |
| Tabs | Keep multiple notas open | Opened two notas | Tabs appeared and selection/navigation worked | Fair; actions and persistence degraded after the second nota |
| Split panes | Compare notas | Chose Pane options → Split right, then closed the pane | Empty target pane and close-pane behavior worked | Good |
| Split notification | Avoid interruption | Split the editor pane | “Configure Jupyter” notification appeared again merely because a pane mounted | Poor |
| Metadata sidebar | Inspect note facts | View → Sidebars → Metadata | Tags, dates, ID, words, characters, blocks, and shortcut were clear | Good |
| References sidebar | Add sources | Opened References and Add Your First Reference | BibTeX batch dialog was usable | Fair |
| Reference-method promise | Use advertised manual/DOI paths | Compared empty-state copy with the add dialog | UI advertises manual entry and DOI lookup, but the opened flow only presents BibTeX batch input | Poor |
| Jupyter sidebar | Configure execution | Opened Jupyter Servers sidebar and Add Server | Host/port/token fields and security explanation were clear | Good |
| Jupyter connection | Run local code | Entered `127.0.0.1:8888` | Truthful “Could not connect” toast; local Docker service could not be brought up in this environment | Blocked |
| AI assistant | Start a conversation | Opened AI sidebar and created a session | Prompt composer and shortcut hint appeared | Good |
| AI missing credentials | Understand setup requirement | Sent “Summarize this nota” without a configured provider | Clear missing/invalid API key error; prompt was retained | Good |
| File menu | Access document operations | Opened File | Version, history, favorite, share, export, and properties were listed; unavailable items were disabled | Fair |
| Edit menu | Edit with desktop conventions | Opened Edit | Menu contained no actions | Failed |
| Format menu | Format selected text | Opened Format | Menu contained no actions | Failed |
| Run menu | Execute notebook/code | Opened Run | Menu contained no actions | Failed |
| Insert menu | Insert table/code/quote/rule | Selected Code Block and Table in separate attempts | Menu closed, but the document did not gain the chosen block | Failed |
| Slash command discovery | Browse content blocks | Typed `/` | Well-grouped searchable catalog exposed all major blocks | Good discovery |
| Slash command execution | Create heading/list/task | Selected Heading 1, Bullet List, and Task List and typed content | Plain paragraphs and literal `/` paragraphs remained; structures were not created | Failed |
| Mermaid command | Create a diagram | Inspected and exercised the advertised command family | Implementation only deletes the trigger range and inserts no Mermaid node | Failed/placeholder |
| Version history dialog | Review saved versions | Clicked History | Accessible empty state opened correctly | Good surface |
| Version save after multi-nota use | Preserve a snapshot | File → Save The Version and advertised save shortcuts | No toast and no version appeared in either nota | Failed |
| Export after multi-nota use | Download the nota | Clicked editor Export and waited for a browser download | No download or feedback in exploratory session; isolated automated export journey passes | Inconsistent/Poor |
| Native nota import | Restore a fixture | Imported `e2e/fixtures/imported-nota.nota` | Failure toast reported a `DataCloneError`, yet a usable nota and content were added | Failed — high integrity risk |
| Notebook import | Convert `.ipynb` | Uploaded a minimal valid notebook with markdown and Python cells | Journey stalled without adding a nota or showing an error | Failed/Blocked |
| Workspace backup export | Download complete backup | Clicked Export All Data | No browser download/feedback in exploratory session; service tests exist | Inconsistent/Poor |
| Data management | Understand storage | Opened Data management | Backup/restore copy is clear, but Storage Used reports localStorage only (0.0 MB) while notas live in IndexedDB | Poor/misleading |
| Delete all data | Understand destructive scope | Opened Danger Zone; did not confirm destructive action | Current implementation uses native confirms and only clears localStorage, despite promising notas and caches | Failed by source audit |
| Storage mode | Choose authority | Opened Storage mode and Advanced defaults | IndexedDB/filesystem choices and memory warning were understandable | Good surface; permission-based migration not exercised |
| Settings navigation | Reach every setting | Visited all 14 settings destinations and used search palette | Rail, filter, command palette, and URLs were consistent | Good |
| Editor settings | Configure writing | Opened typography, code, formatting, and appearance tabs | Controls and current-value summaries were understandable | Good |
| Appearance | Adjust theme/layout/accessibility | Opened all tabs and cycled theme | Theme state changed; layout/density/accessibility controls were discoverable | Good |
| AI settings | Configure providers/actions | Opened providers, models, generation, writing actions, and code actions | Broad setup surface; no external credential was transmitted | Good surface |
| External tools | Configure integrations | Opened External Tools | Only a “Coming Soon” card exists | Placeholder |
| Navigation/global shortcuts | Learn shortcuts | Opened both destinations | Both are “Coming Soon” pages | Placeholder |
| Help | Learn the product | Opened Help → Documentation and searched topics | Dialog and topic navigation were usable | Good UI, stale content |
| Help accuracy | Follow documented shortcuts/layout | Compared help copy with live UI | Help says Ctrl+Shift+A for AI while UI shows Ctrl+Shift+Alt+I; says Jupyter is a bottom panel though it is a sidebar; Ctrl+K did nothing in editor | Poor |
| Theme toggle | Change appearance globally | Cycled the sidebar theme control | Theme class changed correctly | Good |
| Login/register | Authenticate | Opened `/login` and `/register`, checked password visibility and validation | Labels, disabled submit state, OAuth path, and links were clear | Good surface |
| Forgot password | Recover account | Clicked Forgot password with no email | Clear inline validation guidance appeared | Good |
| Profile guard | Protect private route | Opened `/profile` as guest | Redirected to `/login?redirect=/profile` | Good |
| Password recovery route | Handle invalid link | Opened reset route without a valid recovery session | Disabled form and clear expired/missing-link error | Good |
| Public missing nota | Handle unavailable content | Opened `/p/missing-publication` | Clear failure state and Go Home action | Good |
| Missing author | Handle unknown/outage author | Opened `/@missing-user` while Supabase was unavailable | Rendered a plausible “Author” profile with zero totals instead of an error/not-found state | Failed/misleading |
| Output route | Handle missing output | Opened `/output/missing/missing` | Clear “Nota not found” error with source/refresh controls | Good |
| 404 | Recover from bad route | Opened an unknown path | Clear 404 with Home and Settings actions | Good |
| Runtime cleanliness | Avoid hidden component failures | Reviewed warning/error console after journeys | 82 warnings/errors: 71 warnings, 11 errors, including unresolved `Button`, dialog accessibility warnings, extraneous props/listeners, import failure, and autosave failure | Poor |

## Severity-ranked issues

### Critical

#### C1. Second-nota edits can be lost because duplicate canonical structures block every autosave

Intention: create another nota, type content, and rely on autosave.  
Actions: create Meeting Notes nota, open it, type `Second autosave attempt`, wait 3.5 seconds, reload.  
Result: the text disappeared. Console evidence showed repeated failures:

`Error processing edit queue: Error: multiple canonical block structures exist for this nota`

The editor retries at 250 ms, 1 s, and 3 s, but navigating/reloading before the terminal notification silently loses the visible edit. The duplicate boundary is rejected by `captureCanonicalContent()` in `src/features/nota/services/versionHistoryPersistence.ts`. This must be treated as data loss, not a cosmetic editor issue.

Recommended correction:

1. Make structure initialization idempotent and unique by `notaId`.
2. Collapse legacy duplicates deterministically during load.
3. Make create/update/reorder and structure persistence atomic.
4. Add a browser journey: create first nota → create second template nota → edit → wait for durable rows → reload exact content.
5. Surface save failure immediately enough that navigation cannot look safe.

### High

#### H1. Native import reports failure after changing durable state

Importing the repository’s deterministic fixture produced a `DataCloneError` failure toast, but the library count increased and the imported nota opened with its fixture content. A later batch favorite on that nota failed. The operation is neither mutation-atomic nor truthful.

Recommended correction: validate/clone all payloads before the first write, wrap metadata and canonical content in one authority transaction, roll back all earlier writes on failure, and add a browser assertion that failure leaves the exact pre-import library unchanged.

#### H2. Slash commands advertise structures that do not execute

Basic selections left plain paragraphs/literal slashes. `createSimpleCommand()` constructs command names such as `setBulletList`, `setTaskList`, and `setCodeBlock`, which do not match the stock command names. The Mermaid command explicitly deletes the trigger range without inserting a Mermaid node.

Recommended correction: replace dynamic string construction with explicit typed commands, remove or mark unimplemented entries, and add one real browser assertion for every slash item’s resulting ProseMirror node type.

#### H3. Template selection creates a blank nota and leaves the modal open

The Meeting Notes preview promised a structured document. Create emitted success and added a library row, but kept the modal open and created an empty editor.

Recommended correction: use one creation result contract that atomically writes metadata + template content, closes the dialog only after commit, navigates/selects the new nota, and verifies the exact initial document.

#### H4. Document actions degrade after ordinary multi-nota use

After opening multiple notas, Save The Version produced no visible success/failure and no version; Insert commands made no changes; export produced neither a download nor feedback in the exploratory browser. The isolated version/export Playwright journeys pass, which points to missing multi-tab/active-editor coverage.

Recommended correction: bind actions to the active pane’s explicit nota/editor instance rather than a global/stale active editor and add two-open-tab browser tests for save, insert, export, and history targeting.

#### H5. Delete All Data promises a scope it does not clear

The current component calls `localStorage.clear()` and reloads. Nota metadata and canonical blocks live in IndexedDB or filesystem storage, and caches/session state are separate authorities.

Recommended correction: land the authority-aware deletion coordinator and shadcn AlertDialog implementation already developed for this problem, with backup-first, exact scope, typed confirmation, verification, and partial-failure reporting.

### Medium

#### M1. Empty desktop menus make the product feel unfinished

Edit, Format, and Run open as empty menus. “Run All” is also explicitly unavailable. Remove empty top-level menus until they contain working actions, or implement a small conventional set.

#### M2. Jupyter setup notification repeats on navigation and pane creation

Opening notas and splitting a pane repeatedly emitted “Configure Jupyter.” A configuration hint should appear once per relevant intent (for example, first attempt to run code), not every mount.

#### M3. Help content is stale and contradicts the product

AI shortcut, Jupyter placement, and Ctrl+K behavior do not match the live application. Help should be generated from the same command registry and navigation metadata as the UI.

#### M4. Missing author/cloud outage is rendered as a legitimate empty portfolio

When the public profile request failed, `/@missing-user` rendered “Author” with zero publications/views/likes/clones. This makes an outage or unknown user look like real empty data.

#### M5. Data-management storage usage is materially incomplete

The screen totals only localStorage and labels it “Local Storage,” while the user’s notas and blocks live in IndexedDB or filesystem storage. Report every authority separately and provide an overall total.

#### M6. Reference onboarding advertises unavailable paths

The empty state says references can be added manually, through BibTeX, or by DOI lookup. “Add Your First Reference” opens only the BibTeX batch dialog.

#### M7. Runtime warning volume hides meaningful failures

One session produced 82 warning/error entries. Repeated Reka dialog-title/description warnings, extraneous props/listeners, runtime compiler warnings, and an unresolved `Button` component make genuine import/autosave errors hard to notice.

### Low / product honesty

#### L1. Placeholder settings should be labeled in navigation

External Tools, Navigation Shortcuts, and Global Shortcuts are discoverable as if complete but lead to Coming Soon cards. Add a badge or remove them from primary navigation until useful.

#### L2. Duplicate generic “Close” buttons reduce dialog clarity

Several dialogs expose both a footer Close and the icon Close under the same accessible name. Use “Close [dialog name]” for the icon or avoid duplicate controls.

## Automated quality evidence

The exploratory findings should be read alongside—not instead of—the automated suite.

Pull request #107 completed all required checks before merge:

- Static and supply-chain checks: pass
- Unit and coverage tests: pass
- Production artifacts: pass
- Browser and security journeys: pass
- Supabase schema and security: pass
- Aggregate quality gate: pass

The browser job covered 17 Playwright journeys, PWA lifecycle, iframe output isolation, export security, Jupyter authentication security, GitHub Pages deep links, and lazy-route asset integrity. Existing browser coverage is strongest for clean single-journey contexts. The failures in this audit appeared after chained, realistic state changes: multiple notas, template creation, repeated navigation, import, and subsequent mutation.

## Coverage that was blocked or intentionally stopped

- Authenticated login, Google OAuth, profile editing, publish/unpublish, comments, replies, votes, clone, and image upload were not sent to a real external account. Local Supabase could not be brought up in the audit environment.
- The localhost Jupyter service was reachable during the second pass, but exposed no kernelspec and returned HTTP 500 on kernel creation. The UI failure and real smoke-test failure were exercised; successful execution/output remains blocked.
- File System Access permission was not granted, so the visible storage-mode flow was inspected but no real directory was selected.
- AI provider calls were stopped at the missing-credential boundary; no key or private prompt was transmitted.
- Delete All Data was not confirmed because it would destroy the audit browser’s local dataset and the current implementation is known not to cover its promised authorities.
- Public/community success journeys were supported by the passing Supabase integration suite, but browser quality for authenticated community actions still needs a deterministic local seeded environment.

These are **not passes**. They are explicit environment or safety blocks and should remain on the browser coverage backlog.

## Recommended next browser suite

Add a seeded, deterministic “capability matrix” project rather than one giant dependent test:

1. **Multi-nota durability**: create two notas from different templates, edit both, close/reopen tabs, reload, and compare exact IndexedDB canonical content.
2. **Every slash command**: select each item and assert its resulting node type or expected dialog/sidebar; reject placeholder commands.
3. **Template contract**: for every template, assert modal close, navigation, title, tags, and exact initial document after reload.
4. **Import atomicity**: native and notebook import success plus injected write failure with exact before/after database snapshots.
5. **Active-pane targeting**: two tabs + split pane; save version, insert block, export, and open history from each pane.
6. **Jupyter UI execution**: Docker-backed local server; add server, start kernel, run Python, render text/HTML/table/image/error, interrupt, reconnect, and close session.
7. **Local Supabase user journey**: register/login/session restore/profile, publish/view/comment/vote/clone/unpublish/logout and auth guards.
8. **Storage authorities**: IndexedDB ↔ filesystem migration, memory recovery, directory change, backup/restore, and verified delete-all.
9. **Offline nota use**: open editor once online, go offline, reopen/edit/reload, reconnect, and verify no loss.
10. **Accessibility and runtime cleanliness**: axe checks plus a zero-new-console-warning budget on every major route/dialog.

## Product simplification priorities

1. Stabilize canonical storage and multi-nota durability before adding more blocks.
2. Remove or clearly badge placeholder commands and settings.
3. Collapse the editor’s menus into a smaller set of actions that are guaranteed to target the active pane.
4. Generate shortcut/help text from live command definitions.
5. Show Jupyter/AI setup guidance only when the user expresses execution/AI intent.
6. Treat truthful success/failure and rollback as part of UX, not only backend correctness.

## Second-pass capability closure

The first report intentionally described representative coverage rather than claiming that every
individual command had completed successfully. A second browser pass exercised the remaining
templates, every slash-command entry, reference lookup paths, sub-notas, concurrent tabs, the
production PWA gate, and the available local Jupyter/Supabase boundaries.

### Template matrix

| Template | Action | Result |
|---|---|---|
| Meeting Notes | Selected template, entered `Audit Meeting Template`, chose Create | Success toast and library item appeared; dialog stayed open, route/active editor did not change, and the created nota was empty |
| Idea Capture | Selected template, entered `Audit Idea Template`, chose Create | Same failure contract: library item plus success toast, open dialog, unchanged editor, empty created nota |
| Daily Journal | Selected template, entered `Audit Daily Template`, chose Create | Same failure contract: library item plus success toast, open dialog, unchanged editor, empty created nota |

This confirms the template problem is systematic rather than isolated to Meeting Notes.

### Slash-command matrix

| Command | Browser result | Assessment |
|---|---|---|
| Text | Left the literal `/` and command picker open | Failed |
| Heading 1 | Inserted an empty `h1` node | Passed |
| Heading 2 | Inserted an empty `h2` node | Passed |
| Heading 3 | Inserted an empty `h3` node | Passed |
| Blockquote | Inserted a blockquote | Passed |
| Horizontal Rule | Inserted a rule, but inherited the preceding blockquote context during the sequential test | Context-sensitive/needs isolated regression |
| Bullet List | Left the literal `/` and command picker open | Failed |
| Ordered List | Left the literal `/` and command picker open | Failed |
| Task List | Left the literal `/` and command picker open | Failed |
| Code Block | Left the literal `/` and command picker open | Failed |
| Execution Pipeline | Inserted the full pipeline editor and empty-state controls | Passed surface |
| Math Block | Inserted and rendered the math block | Passed surface |
| Theorem | Inserted theorem and proof UI | Passed surface |
| Citation | Opened Citation Manager | Passed surface; downstream methods are incomplete |
| Bibliography | Inserted bibliography UI with empty-citation state | Passed surface |
| Figure with Subfigures | Inserted figure controls and empty state | Passed surface |
| YouTube Video | Left the literal `/` and command picker open | Failed |
| Table | Inserted a 3-by-3 editable table | Passed surface |
| Database Table | Inserted table UI with Add Column/Add Row | Passed surface |
| Confusion Matrix | Inserted CSV/Jupyter/sample input surface | Passed surface |
| Mermaid Diagram | Removed `/` but inserted no node or dialog | Failed/no-op |
| Draw.io Diagram | Inserted only a static SVG placeholder; no interactive editor opened | Partial/misleading |
| AI Assistant | Removed `/` but opened no visible assistant/sidebar/dialog | Failed/no-op |
| New Sub Nota | Opened creation dialog and created a linked sub-nota block | Partial; navigation and feedback defects below |
| Insert Markdown | Opened a rich 23-block validation preview | Preview passed; commit failed and partially replaced content |

The browser evidence strengthens issue #77: command discovery and command execution must be
tested separately, and every advertised item needs an exact resulting-node or destination contract.

### Newly confirmed journey defects

#### Sub-nota creation emits three success notifications and navigation does not switch the active editor

Creating `Audit Child Nota` from the slash command inserted a sub-nota link but emitted three
simultaneous success messages. Clicking the link changed the URL to the child ID while the active
editor still displayed the parent content. The new child was also not exposed as a normal accessible
sidebar link in the resulting tree state.

#### Markdown import preview is much stronger than its commit behavior

The Markdown dialog parsed its example into 23 valid blocks with zero invalid blocks. Choosing
Insert All Valid Blocks then produced `Failed to insert blocks`, followed by the terminal autosave
warning. Only one paragraph remained in the editor. A successful preview therefore does not imply
an atomic or complete insertion.

#### Reference manager exposes incomplete manual entry and inaccurate DOI results

Citation Manager exposes Library, Search Online, and Add Manual tabs. Add Manual contains only
`Manual citation entry coming soon`. Searching the known DOI `10.1038/nphys1170` returned ten
irrelevant generic results rather than resolving the DOI; result action buttons were unnamed in the
accessibility tree. The separate References sidebar still opens only the BibTeX batch surface.

#### Concurrent editing could not pass the single-tab durability prerequisite

Two browser tabs opened the same nota successfully. Tab A entered `Concurrent edit from tab A` and
tab B entered `Concurrent edit from tab B`. Both tabs reached the terminal autosave failure state;
after reload, both showed an empty document. Cross-tab conflict behavior therefore remains
**blocked by the more fundamental canonical-structure/autosave defect**, not passed.

#### Chained block mutations can leave navigation with an empty application shell

After the first-origin block matrix, direct navigation to other notas and Home left only the global
notification/devtools mounts, with no main application UI. Opening another tab on that origin
produced the same empty shell. A second port/origin was required to continue the audit. This is
consistent with state corruption propagating beyond one editor instance.

### Local-service and offline closure

| Capability | Evidence | Result |
|---|---|---|
| PWA build/install | Production build, artifact gate, service-worker install test | Passed |
| Offline shell | Automated browser went offline and reloaded a non-empty Home shell | Passed |
| Offline nota editing | Current PWA suite never opens or edits a nota offline | Still untested; not a pass |
| Local Jupyter HTTP service | `/api/kernelspecs` returned HTTP 200 with an empty `kernelspecs` object | Reachable but unusable |
| Local Jupyter kernel | Repository smoke test attempted Python kernel creation | Failed with HTTP 500 |
| BashNota Jupyter connection | Submitted `127.0.0.1:8888` through Settings | Failed truthfully; the audit origin also differs from the compose CORS allow-origin |
| Docker service management | Docker Desktop processes and VM started, but CLI calls never received a daemon response | Environment unhealthy; VM log also reported EXT4 write-conversion errors, so no destructive repair was attempted |
| Local Supabase | Auth health endpoint on `127.0.0.1:54321` | Unreachable; authenticated browser journeys remain blocked |
| AI providers | No user credentials or approved remote provider were available | Stopped at the truthful missing-credential boundary |
| File System Access | Native directory permission requires an OS picker outside the controllable browser surface | Permission journey remains blocked |

The exact PWA command passed one test with zero failures. The exact Jupyter smoke command failed at
kernel creation. These service-dependent items remain explicit blocked/failing outcomes rather than
being inferred from settings UI.
