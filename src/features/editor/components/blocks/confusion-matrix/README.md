# Confusion Matrix Block (`src/features/editor/components/blocks/confusion-matrix`)

This block provides an interactive confusion matrix for evaluating machine learning model performance.

## Main Files

-   **`ConfusionMatrixBlock.vue`**: The main Vue component that renders the interactive confusion matrix.
-   **`ConfusionMatrixExtension.ts`**: The Tiptap Node extension that defines the schema and behavior of the confusion matrix block in the editor.
-   **`index.ts`**: Exports the extension and component.

## Subdirectories

-   **`components`**: Contains smaller, reusable components used to build the main `ConfusionMatrixBlock`.
-   **`utils`**: Contains utility functions for calculations and data manipulation related to the confusion matrix. 