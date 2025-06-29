# Citation Block (`src/features/editor/components/blocks/citation-block`)

This block provides functionality for adding and managing citations and generating a bibliography.

## Components

-   **`Bibliography.vue`**: A Vue component that renders the complete bibliography for the document, listing all cited sources.
-   **`Citation.vue`**: The Vue component that renders an individual inline citation within the text.
-   **`CitationPicker.vue`**: A dialog or pop-up component that allows the user to search for and select a reference to cite.

## Tiptap Extension

-   **`CitationExtension.ts`**: The Tiptap Node extension that defines the schema and behavior of the inline citation node and the bibliography block within the editor. 