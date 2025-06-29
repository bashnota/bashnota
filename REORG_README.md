# Project Reorganization Plan

This document outlines a proposed folder structure to improve the organization and maintainability of the `bashnota` codebase. The current structure has a mix of organizational patterns (by type, by feature) which can make it difficult to locate related files.

The proposed structure aims to group files by **feature** or **domain**. This colocation of related files (components, stores, services, types, etc.) will make the codebase more modular and easier to understand, navigate, and develop.

## Guiding Principles

1.  **Group by Feature:** Code related to a specific feature (e.g., Authentication, Jupyter, Editor) should live in the same directory.
2.  **Shared vs. Feature-Specific:** Create clear distinctions between code that is shared across the entire application and code that is specific to a single feature.
3.  **Clear Naming:** Use clear and consistent naming for directories and files.

---

I will now analyze the existing `README.md` files we've created to build out the full proposed structure and the detailed file-moving plan.

## Proposed New Directory Structure

Here is the proposed high-level structure for the `src/` directory:

```
src/
├── assets/             # (No change) Static assets
├── lib/                # (No change) Truly generic, framework-agnostic utilities
├── router/             # (No change) Vue Router configuration
├── main.ts             # (No change)
├── App.vue             # (No change)
├── shims-vue.d.ts      # (No change)
├── db.ts               # (No change)
│
├── ui/                 # Reusable, generic UI components (from components/ui)
│   └── ...
│
├── services/           # CORE, app-wide services (e.g., firebase, logger)
│   ├── firebase.ts
│   └── logger.ts
│
├── stores/             # CORE, app-wide Pinia stores (e.g., ui, tabs)
│   ├── uiStore.ts
│   └── tabsStore.ts
│
├── composables/        # CORE, shared composables (e.g., theme, resizable-sidebar)
│   ├── theme.ts
│   └── useResizableSidebar.ts
│
├── types/              # CORE, app-wide types
│   └── ...
│
└── features/           # Main application features, each a self-contained module
    ├── auth/
    ├── bashhub/
    ├── comments/
    ├── editor/
    ├── jupyter/
    ├── nota/
    ├── settings/
    └── ...
```

---

## File Migration Plan

This section details where each existing file should be moved.

### 1. `ui/`
The `src/components/ui` directory, which contains generic, reusable UI components, will be moved to the root `src/ui`.

-   **Move:** `src/components/ui/*` -> `src/ui/`

### 2. Core `services/`, `stores/`, `composables/`, `types/`
Only truly global files will remain at the root. Feature-specific files will be moved into their respective feature directories.

**`services/`**
-   **Keep:** `axios.ts`, `firebase.ts`, `logger.ts`
-   **Move to Features:** `auth.ts`, `aiConversationService.ts`, `aiService.ts`, `codeExecutionService.ts`, `commentService.ts`, `jupyterService.ts`, `notaExtensionService.ts`, `publishNotaUtilities.ts`, `statisticsService.ts`, `subNotaService.ts`

**`stores/`**
-   **Keep:** `sidebarStore.ts`, `uiStore.ts`, `tabsStore.ts`, `shortcutsStore.ts`
-   **Move to Features:** `aiConversationStore.ts`, `aiSettingsStore.ts`, `auth.ts`, `citationStore.ts`, `codeExecutionStore.ts`, `favoriteBlocksStore.ts`, `jupyterStore.ts`, `nota.ts`, `tableStore.ts`

**`composables/`**
-   **Keep:** `theme.ts`, `useResizableSidebar.ts`, `useSidebar.ts`, `useSidebarComposable.ts`, `useSidebarsGroup.ts`
-   **Move to Features:** `useBashhubData.ts`, `useCodeExecution.ts`, `useEquationCounter.ts`, `useHomePreferences.ts`, `useJupyterServers.ts`, `useJupyterSessions.ts`, `useMathJax.ts`, `useNotaActions.ts`, `useNotaFiltering.ts`, `useNotaMetadata.ts`, `useSaveHandler.ts`, `useWorkspacePreferences.ts`, `useWorkspaceRefresh.ts`

### 3. `features/`
This is the core of the refactor. We create a directory for each distinct feature.

#### `features/auth`
-   `components/`: `src/components/auth/*`
-   `views/`: `src/views/auth/*`
-   `services/`: `src/services/auth.ts`
-   `stores/`: `src/stores/auth.ts`
-   `types/`: `src/types/user.ts`

#### `features/bashhub` (and Home)
The `home` components are tightly coupled with `bashhub`. We can merge them.
-   `components/`: `src/components/home/*`
-   `views/`: `src/views/BashHubView.vue`, `src/views/HomeView.vue`, `src/views/UserPublishedView.vue`
-   `composables/`: `src/composables/useBashhubData.ts`, `src/composables/useHomePreferences.ts`
-   `services/`: `src/services/statisticsService.ts`

#### `features/nota`
The core of the application.
-   `components/`: `src/components/nota/*`, `src/components/comments/*`, `src/components/layout/*`
-   `views/`: `src/views/NotaView.vue`, `src/views/PublicNotaView.vue`, `src/views/FavoritesView.vue`
-   `services/`: `src/services/commentService.ts`, `src/services/publishNotaUtilities.ts`, `src/services/subNotaService.ts`
-   `stores/`: `src/stores/nota.ts`, `src/stores/favoriteBlocksStore.ts`
-   `composables/`: `src/composables/useNotaActions.ts`, `src/composables/useNotaFiltering.ts`, `src/composables/useNotaMetadata.ts`, `src/composables/useSaveHandler.ts`
-   `types/`: `src/types/nota.ts`

#### `features/editor`
All editor-related blocks, extensions, and components.
-   `components/`: `src/components/editor/*`
-   `services/`: `src/services/notaExtensionService.ts`
-   `stores/`: `src/stores/citationStore.ts`, `src/stores/codeExecutionStore.ts`, `src/stores/tableStore.ts`
-   `composables/`: `src/composables/useCodeExecution.ts`, `src/composables/useEquationCounter.ts`, `src/composables/useMathJax.ts`
-   `types/`: `src/types/codeExecution.ts`, `src/types/tiptap.d.ts`

#### `features/jupyter`
-   `components/`: `src/components/sidebars/jupyter/*`
-   `services/`: `src/services/jupyterService.ts`
-   `stores/`: `src/stores/jupyterStore.ts`
-   `composables/`: `src/composables/useJupyterServers.ts`, `src/composables/useJupyterSessions.ts`
-   `types/`: `src/types/jupyter.ts`

#### `features/settings`
-   `components/`: `src/components/settings/*`
-   `views/`: `src/views/SettingsView.vue`
-   `composables/`: `src/composables/useWorkspacePreferences.ts`, `src/composables/useWorkspaceRefresh.ts`

#### `features/ai`
-   `components/`: `src/components/sidebars/ai-assistant/*`
-   `services/`: `src/services/ai/*`, `src/services/aiService.ts`, `src/services/aiConversationService.ts`
-   `stores/`: `src/stores/aiSettingsStore.ts`, `src/stores/aiConversationStore.ts`

---

## Migration Strategy

To minimize disruption and ensure the application remains functional throughout the process, we will follow an incremental migration strategy.

### Step 1: Create New Directory Structure
The first step is to create all the new directories outlined in the "Proposed New Directory Structure" section. This is a non-breaking operation that prepares the codebase for the refactoring.

### Step 2: Migrate the Global `ui` Library
This is a good, isolated first migration.
1.  **Move Files:** Move the contents of `src/components/ui` to `src/ui`.
2.  **Update Imports:** Perform a global search for imports pointing to `@/components/ui/...` and update them to point to `@/ui/...`.

### Step 3: Migrate Features Incrementally
We will migrate one feature at a time. After each feature migration, the application should be in a stable, working state.

The proposed order is:

1.  **`settings`**
2.  **`auth`**
3.  **`jupyter`**
4.  **`ai`**
5.  **`bashhub`** (and Home)
6.  **`nota`** (including comments and layout)
7.  **`editor`**

For each feature, the process will be:
1.  **Move Files:** Move all components, views, services, stores, and types for that feature into its new `src/features/<feature-name>/` directory.
2.  **Update Imports:**
    -   Update relative imports within the moved files.
    -   Update all absolute imports across the entire application that reference the moved files.

### Step 4: Final Cleanup
After all feature modules have been migrated:
1.  **Move Core Files:** Move the remaining core files (identified in the "File Migration Plan") into their final destination directories.
2.  **Delete Old Directories:** Remove the original `src/components`, `src/views`, `src/stores`, etc., directories, which should now be empty (or contain only files that were moved in the previous step).

This structured approach will allow for careful, verifiable refactoring, reducing the risk of introducing bugs.