# Editor UI Components (`src/features/editor/components/ui`)

This directory contains UI components that form the chrome and primary interface of the rich text editor.

## UI Components

-   **`BlockCommandMenu.vue`**: A pop-up menu that appears when the user types `/`, suggesting different content blocks that can be inserted into the document.
-   **`EditorToolbar.vue`**: The main toolbar for the editor. It contains formatting buttons (bold, italic), block type selectors, and other tools for manipulating the content.
-   **`NotaMetadata.vue`**: A component for displaying and editing the metadata associated with the current document, such as its title, tags, and other properties.
-   **`TableOfContents.vue`**: An auto-generated table of contents based on the headings within the document, providing an outline and quick navigation. 