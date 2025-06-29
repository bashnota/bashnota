# Executable Code Block (`src/features/editor/components/blocks/executable-code-block`)

This directory contains the components and logic for a code block that can be executed, with its output displayed directly in the document.

## Tiptap Extension

-   **`ExecutableCodeBlockExtension.ts`**: The Tiptap Node extension that defines the schema for the executable code block within the editor.

## Main Components

-   **`ExecutableCodeBlock.vue`**: The main Vue component that renders the code block within the editor. It likely orchestrates the other components.
-   **`CodeBlockWithExecution.vue`**: A more specific component that bundles the code editor (`CodeMirror`) with the execution logic and output rendering.
-   **`FullScreenCodeBlock.vue`**: A component to display and edit the code block in a fullscreen overlay for a better editing experience.

## UI Components

-   **`CodeMirror.vue`**: A wrapper around the CodeMirror 6 editor, providing syntax highlighting, line numbers, and other code editing features.
-   **`ErrorDisplay.vue`**: A component specifically for rendering errors that occur during code execution.
-   **`ExecutionStatus.vue`**: A UI element that shows the current status of the code execution (e.g., running, completed, error).
-   **`InteractiveOutputRenderer.vue`**: Renders interactive outputs from code execution, such as plots or widgets.
-   **`OutputRenderer.vue`**: Renders standard, non-interactive outputs from code execution (e.g., text, images).
-   **`TemplateSelector.vue`**: A component that allows users to select from a list of predefined code templates.
-   **`VariableInspector.vue`**: A tool for inspecting the variables that exist in the execution environment after the code has run.

## Types & Composables

-   **`OutputRenderer.d.ts`**: TypeScript declaration file for the output renderer.
-   `composables`: Contains Vue composables for managing the state and logic of the code block, such as handling the execution flow and managing the CodeMirror instance.
-   `types`: Contains TypeScript types and interfaces related to code execution and output formats. 