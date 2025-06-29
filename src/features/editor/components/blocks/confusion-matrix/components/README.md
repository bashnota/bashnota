# Confusion Matrix Components (`src/features/editor/components/blocks/confusion-matrix/components`)

This directory contains the various UI components that are assembled to create the interactive confusion matrix block.

## Components

-   **`AdvancedMetricsPanel.vue`**: A panel that displays advanced classification metrics derived from the confusion matrix (e.g., F1-score, MCC).
-   **`BreadcrumbNavigation.vue`**: A navigation component for browsing file systems (e.g., in the Jupyter file browser).
-   **`ConnectionStatus.vue`**: A small UI element that displays the connection status to a Jupyter server.
-   **`FileIcon.vue`**: A component that displays an appropriate icon for a given file type.
-   **`FilePreview.vue`**: A component to show a preview of a selected data file.
-   **`FileRow.vue`**: Renders a single row in the file browser.
-   **`FileUpload.vue`**: A component that handles the UI and logic for uploading data files.
-   **`InteractiveMatrix.vue`**: The core component that renders the interactive confusion matrix itself.
-   **`JupyterFileBrowser.vue`**: A file browser for selecting data files from a connected Jupyter server.
-   **`ModelComparisonPanel.vue`**: A panel for comparing the performance of multiple models.
-   **`ServerCard.vue`**: A card component to display information about a Jupyter server.
-   **`StatsVisualization.vue`**: A component for visualizing statistics, possibly with charts or graphs. 