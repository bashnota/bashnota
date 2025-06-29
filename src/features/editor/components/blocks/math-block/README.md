# Math Block (`src/features/editor/components/blocks/math-block`)

This directory contains the components and logic for creating and rendering mathematical equations.

## Tiptap Extension

-   **`math-extension.ts`**: The Tiptap Node extension that defines the schema for both inline equations and block-level equations within the editor.

## Components

-   **`MathBlock.vue`**: The Vue component that renders a block-level equation.
-   **`MathDisplay.vue`**: A component that takes a string of LaTeX and renders it as a formatted equation using a library like KaTeX.
-   **`MathInput.vue`**: A component that provides an input field for users to type LaTeX code.

## Index

-   **`index.ts`**: Exports the extension and components. 