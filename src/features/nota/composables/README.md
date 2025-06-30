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
-   **`useNotaImport.ts`**: **NEW**: Centralized import functionality for both nota files and Jupyter notebooks.

## Available Composables

### `useNotaActions`
Provides actions for managing notas (create, delete, duplicate, export, import, etc.)

### `useNotaImport`
**NEW**: Centralized import functionality for both nota files and Jupyter notebooks.

#### Features:
- **Nota Import**: Supports `.nota` files
- **Jupyter Notebook Import**: Full `.ipynb` support with cell conversion
- **Reusable**: Can be used across different components
- **Configurable**: Options for navigation and callbacks
- **Type Safe**: Full TypeScript support

#### Usage:

```typescript
import { useNotaImport } from './useNotaImport'

// Basic usage
const { importNota, importJupyterNotebook, isImporting } = useNotaImport()

// With options
const { importNota, importJupyterNotebook } = useNotaImport({
  navigateToNota: false, // Don't auto-navigate after import
  onSuccess: (notaId) => console.log('Imported nota:', notaId),
  onError: (error) => console.error('Import failed:', error)
})

// Import nota files
await importNota(['.nota'])

// Import Jupyter notebooks
await importJupyterNotebook()
```

#### Conversion Features:
- **Markdown Cells**: Converted to paragraph blocks
- **Code Cells**: Converted to executable code blocks with language detection
- **Raw Cells**: Converted to plain text paragraphs
- **Output Preservation**: Maintains cell outputs when available
- **Error Handling**: Robust error handling with user feedback

#### API:

```typescript
interface ImportOptions {
  onSuccess?: (notaId: string) => void
  onError?: (error: Error) => void
  navigateToNota?: boolean
}

function useNotaImport(options?: ImportOptions) {
  return {
    // State
    isImporting: Ref<boolean>
    importProgress: Ref<number>
    
    // Methods
    importNota: (acceptedExtensions?: string[]) => Promise<boolean>
    importJupyterNotebook: () => Promise<boolean>
    
    // Utility methods (for advanced usage)
    readFileAsText: (file: File) => Promise<string>
    extractNotebookTitle: (notebook: any, filename: string) => string
    convertNotebookToNota: (notebook: any) => any
    // ... other conversion utilities
  }
}
```

## Migration Guide

If you're using import functionality in your components, consider migrating to `useNotaImport`:

### Before:
```typescript
// Duplicated import logic in multiple files
const handleImport = () => {
  const input = document.createElement('input')
  // ... lots of duplicated code
}
```

### After:
```typescript
import { useNotaImport } from '@/features/nota/composables/useNotaImport'

const { importNota, importJupyterNotebook } = useNotaImport()
```

This reduces code duplication and provides a consistent import experience across the application. 