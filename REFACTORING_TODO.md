# Refactoring To-Do List

This document outlines the steps to refactor the `src` directory from a type-based structure to a feature-based structure. This will improve code organization, scalability, and make it easier for new contributors to get started.

**Legend:**
- `[ ]` To-Do
- `[x]` Done
- `->` means "moves to"

---

## Phase 1: Create New Directory Structure

- [ ] Create `src/api`
- [ ] Create `src/config`
- [ ] Create `src/features`
- [ ] Create `src/lib`
- [ ] Create feature folders inside `src/features`:
    - [ ] `auth`
    - [ ] `ai`
    - [ ] `bashhub`
    - [ ] `code-execution`
    - [ ] `comments`
    - [ ] `home`
    - [ ] `jupyter`
    - [ ] `nota`
    - [ ] `settings`
    - [ ] `shortcuts`
- [ ] Create `components`, `composables`, `services`, `stores`, `views`, `lib`, `types` subdirectories inside each relevant feature folder.
- [ ] Restructure `src/assets` into `src/assets/styles` and `src/assets/images`.

---

## Phase 2: File Migration

### Step 2.1: Root Files
- [ ] `src/db.ts` -> `src/config/dexie.ts`
- [ ] `src/shims-vue.d.ts` -> `src/types/global.d.ts`

### Step 2.2: Assets
- [ ] `src/assets/editor-styles.css` -> `src/assets/styles/editor.css`
- [ ] `src/assets/index.css` -> `src/assets/styles/main.css`
- [ ] `src/assets/logo.svg` -> `src/assets/images/logo.svg`

### Step 2.3: Config & Libs
- [ ] `src/constants/app.ts` -> `src/config/app.ts`
- [ ] `src/services/firebase.ts` -> `src/config/firebase.ts`
- [ ] `src/services/logger.ts` -> `src/lib/logger.ts`
- [ ] Merge `src/utils` into `src/lib`:
    - [ ] `src/utils/dateUtils.ts` -> `src/lib/dateUtils.ts`
    - [ ] `src/lib/utils.ts` -> `src/lib/utils.ts`

### Step 2.4: API Clients
- [ ] `src/services/axios.ts` -> `src/api/axios.ts`

### Step 2.5: Shared Components & Composables
- [ ] Move generic components from `src/components` to `src/components/ui/`.
- [ ] Move layout components from `src/components/{layout,sidebars}` to `src/components/layout/`.
- [ ] Move shared composables to `src/composables/`.

### Step 2.6: Feature-by-Feature Migration

#### Auth Feature
- [ ] **Components**: `src/components/auth/**` -> `src/features/auth/components/`
- [ ] **Services**: `src/services/auth.ts` -> `src/features/auth/services/authService.ts`
- [ ] **Stores**: `src/stores/auth.ts` -> `src/features/auth/stores/authStore.ts`
- [ ] **Types**: `src/types/user.ts` -> `src/features/auth/types.ts`
- [ ] **Views**: `src/views/auth/**` -> `src/features/auth/views/`
- [ ] **Libs**: `src/utils/userTagGenerator.ts` -> `src/features/auth/lib/userTagGenerator.ts`

#### AI Feature
- [ ] **Services**: `src/services/ai/**` & `aiService.ts` -> `src/features/ai/services/`
- [ ] **Stores**: `src/stores/aiSettingsStore.ts` -> `src/features/ai/stores/aiSettingsStore.ts`

#### BashHub Feature
- [ ] **Components**: `src/components/home/BashHub.vue` -> `src/features/bashhub/components/BashHub.vue`
- [ ] **Composables**: `src/composables/useBashhubData.ts` -> `src/features/bashhub/composables/`
- [ ] **Services**: `src/services/statisticsService.ts` -> `src/features/bashhub/services/`
- [ ] **Views**: `src/views/BashHubView.vue`, `UserPublishedView.vue` -> `src/features/bashhub/views/`

#### Code Execution & Jupyter Features
- [ ] **Composables**: `useCodeExecution`, `useJupyter*` -> `features/{code-execution,jupyter}/composables/`
- [ ] **Services**: `codeExecutionService`, `jupyterService` -> `features/{code-execution,jupyter}/services/`
- [ ] **Stores**: `codeExecutionStore`, `jupyterStore` -> `features/{code-execution,jupyter}/stores/`
- [ ] **Types**: `codeExecution.ts`, `jupyter.ts` -> `features/{code-execution,jupyter}/types.ts`

#### Nota Feature
- [ ] **Components**: `NotaTree`, `editor/**`, `nota/**` -> `src/features/nota/components/`
- [ ] **Composables**: `useNota*`, `useSaveHandler`, etc. -> `src/features/nota/composables/`
- [ ] **Services**: `notaExtensionService`, `publishNotaUtilities`, `subNotaService` -> `src/features/nota/services/`
- [ ] **Stores**: `nota`, `citationStore`, `favoriteBlocksStore`, `tableStore`, `tabsStore` -> `src/features/nota/stores/`
- [ ] **Types**: `nota.ts` -> `src/features/nota/types.ts`
- [ ] **Views**: `NotaView`, `FavoritesView`, `PublicNotaView` -> `src/features/nota/views/`

#### Other Features (Home, Settings, etc.)
- [ ] Systematically move remaining components, views, stores, and composables into their new feature directories (`home`, `settings`, `comments`, `shortcuts`).

---

## Phase 3: Refactoring and Cleanup

- [ ] **Update Imports**: Go through every moved file and update all import paths. This will be the most time-consuming step. Use your IDE's "find and replace in files" feature.
- [ ] **Router**: Update `src/router/index.ts` to dynamically import routes from `src/features/**/routes.ts` if you choose to create them, or update the static imports.
- [ ] **Global Stores**: Update `src/main.ts` to correctly register all Pinia stores from their new locations.
- [ ] **Global Types**: Consolidate `tippy.d.ts` and `tiptap.d.ts` into `src/types/global.d.ts`.
- [ ] **Testing**: Run the application and test all features to ensure everything works as expected. Check the browser console for errors.
- [ ] **Delete Empty Folders**: Remove all the old, now-empty directories from `src`.

---
