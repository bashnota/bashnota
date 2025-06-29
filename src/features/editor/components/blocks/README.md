# Editor Blocks

This directory contains custom content blocks for the Tiptap editor. Each block is typically a combination of a Vue component and a Tiptap extension.

## Files

- **`index.ts`**: Exports all the block-related components and extensions for easy importing.
- **`CommandsList.vue`**: A component that displays a list of available slash commands within the editor.
- **`SubNotaDialog.vue`**: A dialog component likely used for creating or editing 'sub-notas'.

## Block Subdirectories

Each subdirectory contains the necessary files (Vue components, Tiptap extensions, etc.) for a specific custom block:

- **`citation-block/`**: A block for handling citations and bibliographies.
- **`confusion-matrix/`**: A block for displaying a confusion matrix.
- **`executable-code-block/`**: A block for code that can be executed.
- **`inline-ai-generation/`**: A block or functionality for generating content with AI inline.
- **`math-block/`**: A block for rendering mathematical equations (e.g., using KaTeX).
- **`nota-config/`**: Components related to configuring a 'nota'.
- **`subfigure-block/`**: A block for managing subfigures.
- **`table-block/`**: A block for creating and editing tables.
- **`theorem-block/`**: A block for theorems, definitions, etc.
- **`youtube-block/`**: A block for embedding YouTube videos. 