# Composables

This directory contains Vue composables, which are reusable, stateful logic functions based on the Composition API.

## Subdirectories

- **`editor/`**: Contains composables that are specifically used within the context of the editor.

## Files

- **`theme.ts`**: A composable for managing application themes (e.g., light/dark mode, color schemes).
- **`useBashhubData.ts`**: A composable for fetching and managing data for the "BashHub" feature.
- **`useCodeExecution.ts`**: A composable that handles the logic for executing code blocks.
- **`useEquationCounter.ts`**: A composable to manage and count equations within a document.
- **`useHomePreferences.ts`**: A composable for managing user preferences related to the home page.
- **`useJupyterServers.ts`**: A composable for managing Jupyter servers (fetching, adding, deleting).
- **`useJupyterSessions.ts`**: A composable for managing Jupyter sessions.
- **`useMathJax.ts`**: A composable that provides helpers for rendering mathematics using MathJax.
- **`useNotaActions.ts`**: A composable that centralizes actions related to 'notas' (e.g., save, publish, delete).
- **`useNotaFiltering.ts`**: A composable for filtering 'notas' based on different criteria.
- **`useNotaMetadata.ts`**: A composable for managing the metadata of a 'nota'.
- **`useResizableSidebar.ts`**: A composable that adds resizing functionality to a sidebar.
- **`useSaveHandler.ts`**: A composable to handle the logic of saving content.
- **`useSidebar.ts`**: A generic composable for managing sidebar state (e.g., open/closed).
- **`useSidebarComposable.ts`**: Another sidebar-related composable, possibly for a more specific use case.
- **`useSidebarsGroup.ts`**: A composable to manage a group of sidebars.
- **`useWorkspacePreferences.ts`**: A composable for managing workspace-level user preferences.
- **`useWorkspaceRefresh.ts`**: A composable to handle refreshing workspace data. 