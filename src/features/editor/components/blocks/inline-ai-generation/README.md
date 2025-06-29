# Inline AI Generation Block (`src/features/editor/components/blocks/inline-ai-generation`)

This directory contains the logic for the inline AI generation feature, which allows users to generate content directly within the flow of their document.

## Components

-   **`InlineAIGeneration.vue`**: The Vue component that renders the UI for the inline AI generation process, which might include a loading state or a placeholder for the generated content.

## Tiptap Extension

-   **`InlineAIGenerationExtension.ts`**: The Tiptap extension that defines the behavior of the inline AI generation feature. This could be a Mark that wraps the text being generated or a Node that handles the entire interaction.

## Index

-   **`index.ts`**: Exports the necessary components and extensions. 