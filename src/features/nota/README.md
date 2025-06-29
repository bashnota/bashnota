# Nota Feature (`src/features/nota`)

This directory contains the code for the core "Nota" feature, which appears to be the primary document or content type within the application.

## Subdirectories

-   `components`: Contains Vue components specific to the Nota feature, such as navigation elements, content lists, and reference management tools.
-   `composables`: Provides Vue composables for managing Nota-related logic, such as parsing BibTeX files, handling user actions, and filtering content.
-   `services`: Holds services for interacting with the backend for Nota-related operations, like managing comments and publishing.
-   `stores`: Contains Pinia stores for managing the global state of Notas, including the currently active documents and favorite blocks.
-   `types`: Defines the primary `Nota` TypeScript type.
-   `views`: Contains the main page components for viewing and managing Notas. 