# References Sidebar

A modular and improved references management system for the Nota application.

## Features

### 🎯 **Improved User Experience**
- **Clean, modern interface** with better visual hierarchy
- **Smart search** across all citation fields (title, authors, journal, DOI, etc.)
- **Empty state guidance** to help users get started
- **Visual feedback** with loading states and error handling
- **Citation type badges** (Journal, Book, Other) for quick identification
- **Copy to clipboard** functionality for citations
- **Hover actions** for better discoverability

### 🧩 **Modular Architecture**
- **Composables-based logic** for reusable functionality
- **Separated concerns** with dedicated components
- **Type-safe interfaces** throughout
- **Easy to test and maintain**

### 📚 **Enhanced Citation Management**
- **BibTeX import** with improved parsing and error handling
- **Form validation** with clear error messages
- **Duplicate detection** for citation keys
- **Rich metadata support** (DOI, URL, volume, pages, etc.)
- **Multiple citation formats** support

## Components

### Core Components

#### `ReferencesSidebar.vue`
Main sidebar component that orchestrates all functionality.

#### `ReferencesList.vue`
Displays the list of references with actions (edit, delete, insert, copy).

#### `ReferenceDialog.vue`
Modal dialog for adding/editing references with tabs for manual entry and BibTeX import.

#### `EmptyReferencesState.vue`
Friendly empty state component to guide users when no references exist.

### Composables

#### `useReferencesSearch.ts`
Handles search functionality across citation fields.

```typescript
const { searchQuery, filteredCitations, clearSearch } = useReferencesSearch(citations)
```

#### `useReferenceDialog.ts`
Manages dialog state and operations.

```typescript
const { 
  showAddDialog, 
  isEditing, 
  currentCitation, 
  openAddDialog, 
  editCitation, 
  closeDialog 
} = useReferenceDialog()
```

#### `useReferenceForm.ts`
Handles form data, validation, and state management.

```typescript
const { 
  formData, 
  validationErrors, 
  validateForm, 
  resetForm, 
  populateForm 
} = useReferenceForm(existingCitations, getCurrentCitation)
```

#### `useBibTexParser.ts`
Parses BibTeX entries into structured data.

```typescript
const { 
  bibtexInput, 
  isParsing, 
  parseError, 
  parseBibTex, 
  clearBibTex 
} = useBibTexParser(onParsed)
```

## Usage

### Basic Usage

```vue
<template>
  <ReferencesSidebar 
    :editor="editor"
    :nota-id="notaId"
    @close="handleClose"
  />
</template>
```

### Using Individual Components

```vue
<script setup>
import { ReferencesList, useReferencesSearch } from '@/components/sidebars/references'

const { searchQuery, filteredCitations } = useReferencesSearch(citations)
</script>

<template>
  <ReferencesList
    :citations="filteredCitations"
    @edit="handleEdit"
    @delete="handleDelete"
    @insert="handleInsert"
  />
</template>
```

## Improvements Made

### 🎨 **User Experience**
1. **Better Visual Design**: Modern card-based layout with hover effects
2. **Improved Search**: Real-time search across all fields
3. **Clear Actions**: Intuitive buttons and icons
4. **Loading States**: Visual feedback during operations
5. **Error Handling**: Clear error messages and validation
6. **Empty States**: Helpful guidance for new users

### 🏗️ **Code Architecture**
1. **Modular Components**: Separated into focused, reusable components
2. **Composables**: Logic extracted into reusable composables
3. **Type Safety**: Full TypeScript support with proper interfaces
4. **Separation of Concerns**: Clear boundaries between UI and logic
5. **Testability**: Easy to unit test individual components and composables

### 🚀 **Performance**
1. **Efficient Search**: Optimized filtering with computed properties
2. **Lazy Loading**: Components only render when needed
3. **Memory Management**: Proper cleanup and state management

### 🔧 **Maintainability**
1. **Clear Structure**: Organized file structure
2. **Documentation**: Comprehensive comments and documentation
3. **Consistent Patterns**: Following Vue 3 Composition API best practices
4. **Error Boundaries**: Proper error handling throughout

## File Structure

```
src/components/sidebars/references/
├── README.md                           # This documentation
├── index.ts                           # Export barrel
├── ReferencesSidebar.vue              # Main sidebar component
├── ReferencesList.vue                 # References list component
├── ReferenceDialog.vue                # Add/edit dialog component
├── EmptyReferencesState.vue           # Empty state component
└── composables/
    ├── useReferencesSearch.ts         # Search functionality
    ├── useReferenceDialog.ts          # Dialog state management
    ├── useReferenceForm.ts            # Form validation and state
    └── useBibTexParser.ts             # BibTeX parsing logic
```

## Best Practices Implemented

1. **Composition API**: Using Vue 3's Composition API for better logic reuse
2. **TypeScript**: Full type safety with interfaces and proper typing
3. **Single Responsibility**: Each component and composable has a clear purpose
4. **Accessibility**: Proper ARIA labels and keyboard navigation
5. **Performance**: Optimized rendering and state management
6. **Error Handling**: Comprehensive error handling and user feedback
7. **Testing**: Structure designed for easy unit and integration testing 