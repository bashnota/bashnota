# References Components

This directory contains components for managing citations and references in Nota documents with advanced batch processing capabilities.

## Components

### ReferencesList.vue
- Main component for displaying a list of references
- Includes search and filtering functionality
- Shows reference count and allows adding new references

### ReferenceDialog.vue
- **NEW**: Enhanced modal dialog for batch BibTeX import
- Supports multiple BibTeX entries at once
- Real-time parsing and validation preview
- Table view with hover cards showing full details
- Individual entry selection and validation via CrossRef/Semantic Scholar APIs
- Duplicate detection and filtering

### ReferenceEditDialog.vue
- Simple modal for editing single references manually
- Traditional form-based entry for individual references
- Full validation and error handling

### ReferencesPreviewTable.vue
- Interactive table component for previewing parsed references
- Hover cards with detailed reference information
- Selection controls and validation status indicators
- Integration with external validation services

### EmptyReferencesState.vue
- Empty state component shown when no references exist
- Includes call-to-action for adding first reference

## Features

### Batch Processing
- **Multi-Entry Parsing**: Parse multiple BibTeX entries simultaneously
- **Smart Duplicate Detection**: Automatically detect and filter duplicate entries
- **Bulk Validation**: Validate references against CrossRef and Semantic Scholar
- **Selective Import**: Choose which references to import with checkbox selection

### Validation & Quality Control
- **External Validation**: CrossRef and Semantic Scholar API integration
- **Confidence Scoring**: Match confidence percentages for validation results
- **Error Detection**: Identify incomplete or invalid entries
- **Suggestions**: Helpful suggestions for improving reference quality

### User Experience
- **Hover Cards**: Rich preview of reference details on hover
- **Real-time Feedback**: Instant parsing and validation feedback
- **Progress Indicators**: Clear status for parsing and validation operations
- **Responsive Design**: Optimized for all screen sizes

### Legacy Support
- **Manual Entry**: Traditional form-based entry still available
- **Single BibTeX**: Support for single entry parsing
- **Editing**: Full editing capabilities for existing references

## Usage

### Batch Import (Recommended)
```vue
<script setup>
import { ReferencesList, ReferenceDialog } from '@/features/nota/components/references'

const isDialogOpen = ref(false)
const citations = ref([])
</script>

<template>
  <ReferencesList 
    :citations="citations" 
    @add-reference="isDialogOpen = true"
  />
  
  <!-- New batch import dialog -->
  <ReferenceDialog
    v-model:open="isDialogOpen"
    :nota-id="notaId"
    :existing-citations="citations"
    @saved="handleBatchReferenceAdded"
  />
</template>
```

### Single Entry Editing
```vue
<script setup>
import { ReferenceEditDialog } from '@/features/nota/components/references'

const isEditDialogOpen = ref(false)
const currentCitation = ref(null)
</script>

<template>
  <ReferenceEditDialog
    v-model:open="isEditDialogOpen"
    :is-editing="true"
    :current-citation="currentCitation"
    :nota-id="notaId"
    :existing-citations="citations"
    @saved="handleReferenceUpdated"
  />
</template>
```

## Data Structure

References follow the `CitationEntry` interface:

```typescript
interface CitationEntry {
  id: string
  key: string           // Unique citation key (e.g., "smith2023")
  title: string
  authors: string[]
  year: string
  journal?: string
  volume?: string
  number?: string
  pages?: string
  publisher?: string
  url?: string
  doi?: string
  createdAt: Date | string
}
```

Parsed entries include additional metadata:

```typescript
interface ParsedBibTexEntry extends CitationEntry {
  id: string
  type: string                    // Reference type (Journal Article, Book, etc.)
  isValid: boolean               // Whether entry passes validation
  isSelected: boolean            // Whether entry is selected for import
  validationStatus: 'pending' | 'validating' | 'valid' | 'invalid' | 'not_found'
  validationSource?: 'crossref' | 'semantic_scholar'
  validationDetails?: ValidationResult
}
```

## Composables

### useBatchBibTexParser
- **NEW**: Advanced parser for multiple BibTeX entries
- Supports various reference types and formats
- Duplicate detection and validation
- Selection management

### useReferenceBatchDialog
- **NEW**: Complete dialog state management
- Integration with validation services
- Batch operations and save functionality

### useReferenceForm (Legacy)
- Manages form state and validation for single entries
- Handles form population and reset

### useBibTexParser (Legacy)
- Single-entry BibTeX parser
- Maintained for backward compatibility

### useReferencesSearch
- Provides search and filtering functionality
- Debounced search for performance

## Services

### referenceValidationService
- **NEW**: External validation service
- CrossRef API integration for academic papers
- Semantic Scholar API for additional coverage
- Similarity matching and confidence scoring

## Validation Rules

- **Citation Key**: Required, must be unique across the document
- **Title**: Required, minimum length validation
- **Authors**: Required, proper formatting expected
- **Year**: Required, must be 4-digit number
- **DOI**: Optional, format validation when provided
- **URL**: Optional, URL format validation when provided

## External Validation

The system validates references against:
- **CrossRef**: Academic papers, journals, books
- **Semantic Scholar**: AI/CS papers, additional academic content
- **Confidence Scoring**: 0-100% match confidence
- **Automatic Suggestions**: Corrections for common issues

## Migration Guide

Existing code using the old ReferenceDialog will continue to work, but we recommend updating to use the new batch functionality:

1. Replace single BibTeX imports with batch imports
2. Use ReferenceEditDialog for manual single-entry editing
3. Leverage the new validation features for higher quality references
4. Take advantage of hover cards for better reference review