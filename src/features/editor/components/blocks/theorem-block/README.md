# Theorem Block (`src/features/editor/components/blocks/theorem-block`)

This directory contains the components and logic for creating styled blocks for theorems, definitions, proofs, and similar academic content.

## Tiptap Extension

-   **`theorem-extension.ts`**: The Tiptap Node extension that defines the schema for the theorem block, including its type (theorem, definition, etc.) and label.

## Components

-   **`TheoremBlock.vue`**: The main Vue component that renders the styled block in the editor.
-   **`MixedContentDisplay.vue`**: A component for displaying mixed content (e.g., text and equations) within the theorem block.

## Index

-   **`index.ts`**: Exports the extension and components. 