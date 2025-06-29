# Nota Composables (`src/features/nota/composables`)

This directory contains Vue composables that provide stateful logic for the Nota feature.

## Reference Management Composables

-   **`useBibTexParser.ts`**: Handles the logic for parsing `.bib` files and converting them into structured citation data.
-   **`useReferenceDialog.ts`**: Manages the state of the reference dialog (e.g., whether it's open for adding or editing).
-   **`useReferenceForm.ts`**: Manages the form data and validation for manually adding or editing a reference.
-   **`useReferencesSearch.ts`**: Provides search and filtering functionality for the list of references.

## Nota Management Composables

-   **`useNotaActions.ts`**: A composable that centralizes actions related to a Nota, such as saving, publishing, and deleting.
-   **`useNotaFiltering.ts`**: Provides logic for filtering lists of Notas based on different criteria.
-   **`useNotaMetadata.ts`**: Manages the state of a Nota's metadata.
-   **`useSaveHandler.ts`**: A composable that handles the logic of saving content. 