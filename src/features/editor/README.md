# Editor Feature (`src/features/editor`)

This directory contains all the code related to the rich text editor, which is a core feature of the application.

## Subdirectories

-   `components`: Contains all Vue components that make up the editor, including custom content blocks, dialogs, toolbars, and the main editor instance.
-   `composables`: Provides Vue composables for managing complex logic within the editor, such as equation counting, code execution, and MathJax rendering.
-   `services`: Holds services related to the editor, such as managing custom Tiptap extensions.
-   `stores`: Contains Pinia stores for managing the editor's state, such as code execution status, citation data, and table states.
-   `types`: Defines TypeScript types and interfaces specific to the editor, including custom block attributes and code execution types. 