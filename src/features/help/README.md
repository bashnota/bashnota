# Help Feature (`src/features/help`)

This directory contains the in-app help and documentation system for BashNota.

## Overview

The help system provides comprehensive documentation for all BashNota features, accessible directly within the application.

## Components

### HelpDialog.vue
The main help dialog component that displays:
- Searchable topic list organized by category
- Full documentation content with markdown rendering
- Navigation between topics
- Keyboard shortcut hints

### HelpButton.vue
A reusable button component that opens the help dialog. Can be placed anywhere in the UI.

## Usage

### Opening Help

```vue
<script setup>
import { useHelp } from '@/features/help'

const { openHelp } = useHelp()

// Open help to a specific topic
function showEditorHelp() {
  openHelp('editor-basics')
}
</script>

<template>
  <button @click="openHelp()">Help</button>
  <button @click="showEditorHelp()">Editor Help</button>
</template>
```

### Using HelpButton Component

```vue
<template>
  <HelpButton show-label />
</template>
```

### Keyboard Shortcut

Press **F1** anywhere in the app to open the help dialog.

## Content Structure

Help content is organized into categories:

1. **Getting Started**: Basic introduction and first steps
2. **Editor**: Rich text editing and formatting
3. **Code Execution**: Jupyter integration and running code
4. **AI Assistant**: Using AI features
5. **Notes Management**: Organizing and finding notes
6. **Keyboard Shortcuts**: Complete shortcut reference
7. **Settings**: Customizing BashNota

## Adding New Help Topics

1. Open `src/features/help/data/helpContent.ts`
2. Add a new topic to the `helpTopics` array:

```typescript
{
  id: 'unique-topic-id',
  title: 'Topic Title',
  description: 'Brief description',
  category: HelpCategory.Editor, // Choose appropriate category
  keywords: ['keyword1', 'keyword2'], // For search
  content: `# Topic Title
  
  Your markdown content here...
  `
}
```

3. The topic will automatically appear in the help dialog under its category

## Search

The help system includes full-text search across:
- Topic titles
- Descriptions
- Content
- Keywords

Search is instant and highlights matching topics.

## Styling

Help content uses Tailwind's prose plugin for consistent markdown rendering. Custom styles are applied for:
- Code blocks with syntax highlighting
- Keyboard shortcuts (kbd elements)
- Tables
- Blockquotes
- Lists

## Technical Details

- **Markdown Rendering**: Uses `marked` library
- **UI Components**: Built with Radix Vue primitives
- **State Management**: Composable-based with reactive refs
- **Keyboard Events**: F1 shortcut handled globally
