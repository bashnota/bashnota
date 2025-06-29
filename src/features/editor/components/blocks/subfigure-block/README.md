# Subfigure Block (`src/features/editor/components/blocks/subfigure-block`)

This directory contains the components and logic for creating a block of subfigures, which allows grouping multiple images with individual captions under a single main caption.

## Tiptap Extension

-   **`subfigure-extension.ts`**: The Tiptap Node extension that defines the schema for the subfigure block and its nested items.

## Components

-   **`SubfigureBlock.vue`**: The main Vue component that renders the entire subfigure block, including the grid and the main caption.
-   **`SubfigureCaption.vue`**: A component for editing the caption of the main figure or an individual subfigure.
-   **`SubfigureControls.vue`**: UI controls for managing the subfigure block, such as adding or removing images.
-   **`SubfigureGrid.vue`**: The component that lays out the individual subfigure items in a grid.
-   **`SubfigureItem.vue`**: Represents a single image and its caption within the grid.
-   **`ImagePreviewModal.vue`**: A modal for previewing an image in a larger size.

## Index

-   **`index.ts`**: Exports the extension and components. 