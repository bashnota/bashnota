# Executable Code Block Composables (`src/features/editor/components/blocks/executable-code-block/composables`)

This directory contains Vue composables that manage the state and logic for the executable code block.

## Composables

-   **`useCodeBlockShortcuts.ts`**: Manages keyboard shortcuts specifically for the code block, such as for executing code or toggling settings.
-   **`useCodeBlockToolbar.ts`**: Handles the logic and state for the code block's toolbar, such as language selection and execution buttons.
-   **`useCodeExecution.ts`**: The core composable for managing the code execution lifecycle, including sending code to the kernel and handling results.
-   **`useCodeFormatting.ts`**: Provides logic for formatting the code within the editor, possibly using a tool like Prettier.
-   **`useCodeTemplates.ts`**: Manages the fetching and application of predefined code templates.
-   **`useFullscreenCode.ts`**: Handles the state for toggling the code editor into and out of fullscreen mode.
-   **`useOutputStreaming.ts`**: Manages the logic for handling streaming output from the execution kernel, allowing for real-time updates. 