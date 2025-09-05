# Enhanced Markdown Parser System

This directory contains the enhanced markdown parsing and validation system for the Nota editor.

## Overview

The enhanced markdown parser system provides:
- **Real-time parsing** of markdown content with comprehensive block detection
- **Block validation** with detailed error and warning messages
- **Visual preview** of parsed blocks before insertion
- **Enhanced paste handling** with intelligent markdown detection
- **Tiptap integration** for seamless editor compatibility

## Components

### 1. MarkdownParserService (`MarkdownParserService.ts`)

Core service that handles markdown parsing, validation, and conversion.

**Features:**
- Comprehensive block pattern recognition
- Real-time validation with detailed feedback
- Support for all markdown block types
- Tiptap format conversion
- Line number tracking for error reporting

**Usage:**
```typescript
import { markdownParserService } from './MarkdownParserService'

// Parse markdown content
const result = markdownParserService.parseMarkdown(content)

// Convert to Tiptap format
const tiptapBlocks = markdownParserService.convertToTiptap(result.blocks)

// Validate individual blocks
const validation = markdownParserService.validateBlock(block)
```

### 2. BlockPreviewComponent (`BlockPreviewComponent.vue`)

Main component for previewing and managing parsed blocks.

**Features:**
- Real-time block preview with validation status
- List and grid view modes
- Block selection and batch operations
- Inline block editing
- Summary statistics and progress tracking

**Props:**
- `content: string` - Markdown content to parse
- `@insert-blocks` - Emitted when blocks are selected for insertion
- `@cancel` - Emitted when the operation is cancelled

### 3. BlockPreviewItem (`BlockPreviewItem.vue`)

Individual block preview component with validation details.

**Features:**
- Block type and line number display
- Content preview with truncation
- Attribute display and formatting
- Error and warning details
- Compact and detailed view modes

**Props:**
- `block: ParsedBlock` - The parsed block to display
- `index: number` - Block index for selection
- `isSelected: boolean` - Whether the block is selected
- `compact?: boolean` - Use compact display mode

### 4. MarkdownInputComponent (`MarkdownInputComponent.vue`)

Dialog component for markdown input with real-time preview.

**Features:**
- Split-screen interface (input + preview)
- Real-time preview updates
- Quick action templates for common patterns
- Example content loading
- Bulk insertion of valid blocks

**Props:**
- `modelValue: boolean` - Controls dialog visibility
- `@insert-blocks` - Emitted when blocks are inserted

### 5. EnhancedMarkdownPasteHandler (`EnhancedMarkdownPasteHandler.ts`)

Enhanced paste handling service with validation and user feedback.

**Features:**
- Intelligent markdown detection
- Enhanced parsing with validation
- User-friendly error messages
- Content cleaning and normalization
- Block type validation

**Usage:**
```typescript
import { EnhancedMarkdownPasteHandler } from './EnhancedMarkdownPasteHandler'

// Handle paste with validation
const result = await EnhancedMarkdownPasteHandler.handlePaste(content)

// Check if content looks like markdown
const isMarkdown = EnhancedMarkdownPasteHandler.isMarkdownContent(content)

// Get quick preview
const preview = EnhancedMarkdownPasteHandler.getQuickPreview(content)
```

## Integration

### Editor Integration

The system is integrated into the main editor (`NotaEditor.vue`) with:

1. **Toolbar Button**: "Insert Markdown" button opens the markdown input dialog
2. **Enhanced Paste Handling**: Automatic markdown detection and validation on paste
3. **Block Insertion**: Validated blocks are inserted at the cursor position
4. **Auto-save**: Changes trigger automatic saving

### Usage in Editor

```typescript
// Open markdown input dialog
showMarkdownInput.value = true

// Handle block insertion
const handleMarkdownBlocksInsertion = (blocks: any[]) => {
  if (!editor.value || blocks.length === 0) return
  
  // Insert blocks at current cursor position
  editor.value.commands.insertContent(blocks)
  
  // Show success message
  toast.success(`Successfully inserted ${blocks.length} blocks`)
  
  // Close dialog and save
  showMarkdownInput.value = false
  debouncedSave()
}
```

## Supported Block Types

The system supports all standard markdown block types:

- **Headings** (H1-H6)
- **Code blocks** (with language detection)
- **Math blocks** (inline and display)
- **Tables** (with header and data parsing)
- **Blockquotes**
- **Lists** (ordered and unordered)
- **Horizontal rules**
- **Links and images**
- **Executable code blocks**
- **Mermaid diagrams**
- **Citations**
- **YouTube videos**

## Validation Features

Each block type includes comprehensive validation:

- **Required field validation**
- **Format validation** (URLs, LaTeX syntax)
- **Content quality warnings**
- **Accessibility suggestions**
- **Line number tracking for errors**

## Testing

Run the test suite to verify functionality:

```bash
npm run test:unit
```

The test file (`MarkdownParserService.test.ts`) covers:
- Basic parsing functionality
- Block validation
- Tiptap conversion
- Error handling

## Demo

Use the `MarkdownParserDemo.vue` component to test the system:

```vue
<template>
  <MarkdownParserDemo />
</template>
```

The demo provides:
- Sample markdown content
- Real-time parsing results
- Block validation display
- Tiptap conversion testing

## Future Enhancements

### Phase 2: Advanced Features
- **Smart Suggestions**: AI-powered content improvement suggestions
- **Template Library**: User-defined block templates
- **Import/Export**: Support for various markdown flavors
- **Collaboration**: Real-time validation in collaborative editing

### Phase 3: Integration
- **Editor Integration**: Seamless integration with existing editor
- **Keyboard Shortcuts**: Quick access to common operations
- **Custom Block Types**: Extensible block type system
- **Performance Optimization**: Lazy loading and caching

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all components are properly imported
2. **Validation Failures**: Check markdown syntax and block structure
3. **Performance Issues**: Large documents may need optimization
4. **Integration Problems**: Verify editor instance is available

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
import { logger } from '@/services/logger'

logger.setLevel('debug')
```

## Contributing

When adding new block types:

1. **Add pattern** to `MarkdownParserService.blockPatterns`
2. **Implement validation** logic
3. **Add Tiptap conversion** in `convertToTiptap` method
4. **Write tests** for the new functionality
5. **Update documentation** and examples

## License

This system is part of the Nota editor project and follows the same license terms. 