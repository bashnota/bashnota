# Global Stores (`src/stores`)

This directory contains global Pinia stores that manage application-wide state not specific to any single business feature.

## Stores

-   **`shortcutsStore.ts`**: Manages the registration and handling of global keyboard shortcuts.
-   **`sidebarStore.ts`**: Manages the state of the main application sidebars, such as which sidebar is currently open and its dimensions.
-   **`tabsStore.ts`**: Manages the state of the open tabs, including which tab is active and the list of all open documents.
-   **`uiStore.ts`**: A store for managing miscellaneous global UI state, such as the visibility of dialogs or global loading indicators.

## Files

- **`aiConversationStore.ts`**: Manages the state for AI conversations.
- **`aiSettingsStore.ts`**: Stores the user's settings for AI providers.
- **`auth.ts`**: Manages authentication state, including the current user and token.
- **`citationStore.ts`**: Stores and manages citations for documents.
- **`codeExecutionStore.ts`**: Manages the state related to code execution, including outputs and status.
- **`favoriteBlocksStore.ts`**: Manages the user's list of favorite content blocks.
- **`jupyterStore.ts`**: Stores state related to Jupyter servers and sessions.
- **`nota.ts`**: The main store for managing 'nota' documents, content, and metadata.
- **`tableStore.ts`**: Manages state for table blocks. 