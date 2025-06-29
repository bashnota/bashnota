# Jupyter Editor Components (`src/features/editor/components/jupyter`)

This directory contains Vue components that facilitate the integration of Jupyter servers directly within the editor environment.

## Components

-   **`AddServerDialog.vue`**: A dialog component that presents a form for users to add a new Jupyter server by providing its URL and other connection details.
-   **`ServerItem.vue`**: A component that represents a single Jupyter server in a list. It displays the server's status and provides actions like connecting, editing, or deleting it.
-   **`ServerSelectDialog.vue`**: A dialog that shows a list of available Jupyter servers and allows the user to select one to use for code execution.
-   **`ServerSelectionDialogWrapper.vue`**: A wrapper component that handles the logic for opening and managing the server selection dialog. 