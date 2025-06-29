# Jupyter Components (`src/features/jupyter/components`)

This directory contains components for the Jupyter integration feature, mostly used within the Jupyter management sidebar.

## Components

-   **`EmptyState.vue`**: A component displayed when there is nothing to show, such as no configured servers or active sessions.
-   **`JupyterErrorBoundary.vue`**: An error boundary component to gracefully catch and display errors that occur within the Jupyter feature's UI.
-   **`JupyterServersSidebar.vue`**: The main sidebar component for managing Jupyter servers and sessions.
-   **`KernelLanguageBadge.vue`**: A small badge that displays the programming language of a kernel (e.g., Python, R).
-   **`KernelsList.vue`**: A component that lists the available kernel types on a connected Jupyter server.
-   **`ServerInfo.vue`**: Displays detailed information about a selected Jupyter server.
-   **`ServerItem.vue`**: Represents a single server in the list, showing its status and name.
-   **`SessionsList.vue`**: A component that lists the currently running Jupyter sessions on a server. 