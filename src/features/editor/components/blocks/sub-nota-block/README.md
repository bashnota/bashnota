# Sub-Nota Block Components

This directory contains the Vue components for rendering sub-nota links in the Tiptap editor.

## Components

### `SubNotaBlock.vue`
The main block component for displaying sub-nota links as full-width blocks. This component:
- Renders as a standalone block (similar to Notion)
- Includes drag handles for reordering
- Provides edit functionality for link properties
- Shows metadata about the linked nota
- Supports different link styles (inline, button, card)

### `SubNotaInlineComponent.vue`
A lightweight inline component for rendering sub-nota links within text. This component:
- Renders as an inline element
- Provides basic navigation functionality
- Supports different link styles
- Minimal UI footprint

## Usage

### In Tiptap Extensions
```typescript
import { SubNotaBlock } from '@/features/editor/components/blocks/sub-nota-block'

// Use in NodeViewRenderer
addNodeView() {
  return VueNodeViewRenderer(SubNotaBlock)
}
```

### As Standalone Components
```vue
<template>
  <SubNotaBlock 
    :node="{ attrs: { targetNotaId: '123', targetNotaTitle: 'Example' }}"
    :is-editing="true"
    @update-attributes="handleUpdate"
  />
</template>
```

## Props

### SubNotaBlock
- `node`: Tiptap node with attributes
- `updateAttributes`: Function to update node attributes
- `isEditing`: Boolean to show/hide edit controls

### SubNotaInlineComponent
- `node`: Tiptap node with attributes

## Features

- **Navigation**: Click to navigate to the target nota
- **Editing**: Modify display text and link style
- **Drag & Drop**: Visual drag handles for reordering
- **Validation**: Checks if target nota exists
- **Accessibility**: Proper ARIA labels and keyboard support
- **Responsive**: Adapts to different screen sizes

## Link Styles

- **inline**: Default style with subtle borders
- **button**: Primary button appearance
- **card**: Card-like appearance with shadows

## Integration

These components are designed to work with:
- Tiptap editor framework
- Vue 3 Composition API
- Tailwind CSS for styling
- Lucide Vue Next for icons
- Vue Router for navigation
- Vue Sonner for notifications
