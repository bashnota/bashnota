# Editor Blocks (`src/features/editor/components/blocks`)

This directory contains all the custom content blocks available in the rich text editor. Each block is a self-contained feature, usually consisting of a Tiptap Node extension and a Vue component to render it.

## General Components

-   **`CommandsList.vue`**: A UI component that renders the list of available slash commands (`/`) that the user can trigger to insert different blocks.
-   **`index.ts`**: A central file that exports all the block extensions, making them easy to register with the main Tiptap editor instance.
-   **`SubNotaDialog.vue`**: A dialog component used for creating or linking "sub-notas," which are likely nested or related documents.

## Block Subdirectories

Each subdirectory is a self-contained block with its own logic and Vue component:

-   `citation-block`: For creating and managing bibliographic citations.
-   `confusion-matrix`: For displaying a confusion matrix, a common tool in machine learning.
-   `executable-code-block`: For code blocks that can be executed, with language selection and output display.
-   `inline-ai-generation`: For triggering and displaying AI-generated content directly within the text flow.
-   `math-block`: For writing and rendering mathematical equations, likely using KaTeX or MathJax.
-   `nota-config`: For configuring metadata and settings for the entire document ("nota").
-   `subfigure-block`: For arranging and captioning a group of figures.
-   `table-block`: For creating and editing structured tables.
-   `theorem-block`: For special-cased blocks like theorems, definitions, and proofs.
-   `youtube-block`: For embedding and displaying YouTube videos. 