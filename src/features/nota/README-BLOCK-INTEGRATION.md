# Block-Based Editor Integration

This document explains how to integrate our new block-based database system with existing Tiptap editors.

## 🎯 **What This Integration Does**

- **Tiptap stays the same** - All your existing editor functionality works unchanged
- **Database layer changes** - Content is now stored as individual blocks instead of one large JSON
- **Performance improvements** - Only changed blocks are saved, not the entire document
- **Better data structure** - Structured content that's easier to analyze and query

## 🚀 **How to Use**

### 1. **Basic Integration**

```vue
<template>
  <div>
    <!-- Your existing Tiptap editor -->
    <TiptapEditor 
      v-model:content="editorContent"
      @update:content="handleContentUpdate"
    />
    
    <!-- Block integration panel (optional, for debugging) -->
    <BlockEditorIntegration 
      :nota-id="notaId"
      :tiptap-content="editorContent"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useBlockEditor } from '@/features/nota/composables/useBlockEditor'

const notaId = 'your-nota-id'
const editorContent = ref(null)

// Initialize block integration
const { syncContentToBlocks } = useBlockEditor(notaId)

// Handle content updates from Tiptap
const handleContentUpdate = async (newContent) => {
  // Save to blocks (this happens automatically)
  await syncContentToBlocks(newContent)
  
  // Your existing save logic can remain unchanged
  // The block system works in parallel
}
</script>
```

### 2. **Automatic Integration (Recommended)**

The integration automatically syncs content when you use the `useBlockEditor` composable:

```vue
<script setup>
import { useBlockEditor } from '@/features/nota/composables/useBlockEditor'

const { 
  isInitialized,
  blocks,
  blockStats,
  syncContentToBlocks 
} = useBlockEditor(notaId)

// Content automatically syncs when Tiptap changes
// You can also manually sync if needed
const manualSync = () => {
  syncContentToBlocks(tiptapContent.value)
}
</script>
```

## 🔄 **How It Works**

### **Content Flow**

1. **User types in Tiptap** → Tiptap updates its internal content
2. **Content change detected** → `syncContentToBlocks()` is called
3. **Content converted to blocks** → Each Tiptap node becomes a database block
4. **Blocks saved individually** → Only changed blocks are updated in the database
5. **Block structure updated** → Order and relationships are maintained

### **Block Conversion**

The system automatically converts Tiptap content to our block types:

- `paragraph` → `TextBlock`
- `heading` → `HeadingBlock` 
- `codeBlock` → `CodeBlock`
- `mathBlock` → `MathBlock`
- `table` → `TableBlock`
- `image` → `ImageBlock`
- And many more...

## 📊 **Benefits You Get Immediately**

### **Performance**
- ✅ **Faster saves** - Only save changed blocks
- ✅ **Reduced database size** - No duplicate content storage
- ✅ **Better caching** - Cache individual blocks

### **Data Analysis**
- ✅ **Block-level statistics** - Count words, characters, block types
- ✅ **Content insights** - Analyze document structure
- ✅ **Search optimization** - Search within specific block types

### **Future Features**
- ✅ **Collaborative editing** - Lock individual blocks
- ✅ **Version control** - Track changes per block
- ✅ **AI integration** - Process specific block types
- ✅ **Export flexibility** - Export specific block types

## 🛠️ **Advanced Usage**

### **Custom Block Types**

You can extend the system with custom block types:

```typescript
// In your blocks.ts
export interface CustomBlock extends BaseBlock {
  type: 'custom'
  customData: any
}

// The integration will automatically handle them
```

### **Block-Level Operations**

```typescript
const { 
  insertBlock,
  updateBlock, 
  deleteBlock,
  reorderBlocks 
} = useBlockEditor(notaId)

// Insert a new block
await insertBlock('text', 'New content', 5)

// Update existing block
await updateBlock(blockId, { content: 'Updated content' })

// Reorder blocks
await reorderBlocks(['block1', 'block3', 'block2'])
```

### **Block Statistics**

```typescript
const { blockStats } = useBlockEditor(notaId)

// Access statistics
console.log(blockStats.value.totalBlocks)      // Total blocks
console.log(blockStats.value.wordCount)        // Word count
console.log(blockStats.value.blockTypes)       // Count by type
```

## 🔧 **Migration**

### **Automatic Migration**
- Existing notas are automatically converted when first accessed
- Legacy content is preserved and accessible
- No data loss during migration

### **Manual Migration**
```typescript
const { convertLegacyContent } = useBlockEditor(notaId)

// Convert existing Tiptap content
await convertLegacyContent(tiptapContent)
```

## 🚨 **Important Notes**

1. **Tiptap Editor Unchanged** - Your existing editor code works exactly the same
2. **Content Sync** - Content automatically syncs between Tiptap and blocks
3. **Backward Compatible** - Old content continues to work
4. **Performance** - Only changed blocks are saved, improving performance
5. **Database Schema** - New tables are added, existing data is preserved

## 🎉 **What You Get**

- **Zero breaking changes** to your existing Tiptap implementation
- **Immediate performance improvements** from block-level saves
- **Better data structure** for future features
- **Analytics and insights** about your content
- **Foundation for advanced features** like collaboration and AI

The integration is designed to be **invisible** to your users while providing **massive benefits** under the hood! 🚀
