# Editor Extensions (`src/features/editor/components/extensions`)

This directory contains custom Tiptap extensions and Prosemirror plugins that add new functionality to the rich text editor.

## Extensions & Plugins

-   **`Commands.ts`**: Defines custom commands that can be chained and executed within the editor's command flow.
-   **`DragHandlePlugin.ts`**: A Prosemirror plugin that adds a drag handle to each block-level node, allowing users to easily reorder content.
-   **`index.ts`**: A central file that exports all extensions and plugins for easy registration with the Tiptap editor.
-   **`MarkdownExtension.ts`**: An extension that adds support for Markdown shortcuts and input rules, allowing users to write in Markdown and have it converted to rich text on the fly.
-   **`PageLinkExtension.ts`**: A custom extension for creating internal links to other pages or documents within the application.
-   **`suggestion.ts`**: A utility that provides the core logic for suggestion and autocomplete pop-ups, used for features like slash commands, @-mentions, and citation picking.
-   **`types.ts`**: Contains shared TypeScript type definitions used by the extensions in this directory. 