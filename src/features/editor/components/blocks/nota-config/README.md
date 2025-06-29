# Nota Config Block (`src/features/editor/components/blocks/nota-config`)

This directory contains components related to configuring the settings for a "nota" document, particularly its server and session management for code execution.

## Components

-   **`NotaConfigModal.vue`**: The main modal or dialog component that hosts the configuration options.
-   **`NotaConfigServers.vue`**: A component within the modal that allows the user to manage and select Jupyter servers.
-   **`NotaConfigSessions.vue`**: A component within the modal for managing active Jupyter kernel sessions associated with the document.
-   **`ServerListItem.vue`**: A reusable component for displaying a single server in a list. 