# Editor Components (`src/features/editor/components`)

This directory holds all the Vue components that constitute the rich text editor.

## Main Components

-   **`NotaEditor.vue`**: The primary component that wraps the Tiptap editor instance. It's responsible for initializing the editor, loading extensions, and handling user interactions for content creation and editing.
-   **`NotaContentViewer.vue`**: A component designed to display the editor's content in a read-only format. It ensures that the content is rendered accurately and consistently outside of the editing environment.

## Subdirectories

-   **`blocks`**: Contains components for all the custom, node-based content blocks within the editor, such as executable code blocks, theorems, tables, and more.
-   **`dialogs`**: Holds various dialog or modal components that are used for editor-specific actions, like publishing a document or adding a citation.
-   **`extensions`**: Contains Tiptap editor extension configurations and related plugin logic.
-   **`jupyter`**: Houses components that provide Jupyter integration directly within the editor environment.
-   **`ui`**: Contains UI elements that are part of the editor's chrome, such as the toolbar, block command menus, and metadata displays. 