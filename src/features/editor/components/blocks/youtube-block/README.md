# YouTube Block (`src/features/editor/components/blocks/youtube-block`)

This directory contains the logic for embedding YouTube videos into the document.

## Tiptap Extension

-   **`youtube-extension.ts`**: The Tiptap Node extension that defines the schema for the YouTube block. (It seems there might be a duplicate or alternative extension file, `YoutubeExtension.ts`.)

## Components

-   **`YoutubeBlock.vue`**: The main Vue component that renders the YouTube video embed within the editor.
-   **`YoutubePlayer.vue`**: The component that wraps the YouTube iframe player.

## Composable

-   **`useYoutubeParser.ts`**: A composable that contains logic for parsing YouTube URLs to extract the video ID.

## Index

-   **`index.ts`**: Exports the extension and components. 