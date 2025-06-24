# AI Conversation Refactor

## Overview

This refactor moves AI conversation history from being stored directly in block attributes to a separate database table. This improves modularity, performance, and data management while following best practices for separation of concerns.

## Key Changes

### 1. Database Schema Updates

- **Updated `src/db.ts`**: Added `conversations` table to the database schema
- **Version bump**: Database version increased to 5 to include the new table
- **Migration support**: Existing data is preserved during the upgrade

### 2. Enhanced Data Models

- **Updated `AIConversation` interface**: Added `blockId` field to link conversations to specific AI blocks
- **Updated `AIBlock` interface**: Added optional `blockId` field for unique identification

### 3. Service Layer Architecture

#### New `AIConversationService` (`src/services/aiConversationService.ts`)

A comprehensive service layer that provides:

- **Conversation Management**: Create, read, update, delete operations
- **Block Association**: Link conversations to specific AI blocks via `blockId`
- **Legacy Data Migration**: Automatic migration from old block-stored conversations
- **Error Handling**: Robust error handling with detailed logging
- **Metadata Operations**: Lightweight operations for conversation info

**Key Methods:**
```typescript
- getOrCreateConversation(options: ConversationServiceOptions)
- loadConversationHistory(blockId: string)
- addMessage(blockId: string, message: ConversationMessage)
- updateConversationHistory(blockId: string, messages: ConversationMessage[])
- deleteConversationByBlockId(blockId: string)
- hasConversation(blockId: string)
- getConversationsForNota(notaId: string)
```

### 4. Modular Composables

#### New `useConversationManager` (`src/components/sidebars/ai-assistant/composables/useConversationManager.ts`)

A dedicated composable for conversation management that:

- **Database Integration**: Uses the service layer for all data operations
- **Block ID Management**: Automatically generates and manages unique block IDs
- **Legacy Migration**: Seamlessly migrates old conversation data
- **State Management**: Maintains local conversation state synchronized with database
- **Error Handling**: Comprehensive error handling with user feedback

**Key Features:**
```typescript
- loadConversationFromBlock(block: AIBlock)
- addMessage(blockId: string, message: ConversationMessage)
- updateConversationHistory(blockId: string, messages: ConversationMessage[])
- clearConversation()
- deleteConversation(blockId: string)
- generateBlockId() / getOrCreateBlockId(block: AIBlock)
```

### 5. Updated Core Composables

#### `useAIGeneration` Updates
- **Added `notaId` parameter**: Required for proper conversation management
- **Database Integration**: All conversation operations now use the database
- **Removed Block Storage**: Conversation data no longer stored in block attributes
- **Improved Streaming**: Better real-time updates during streaming operations
- **Conversation Manager Integration**: Full integration with the new conversation manager

#### `useConversation` Updates
- **Database Integration**: Conversation loading/saving now uses database
- **Async Operations**: Conversation loading is now properly async
- **Legacy Support**: Automatic migration of existing conversation data
- **Improved State Management**: Better synchronization between UI and database

### 6. Component Updates

#### `AIAssistantSidebar.vue`
- **Parameter Addition**: Now passes `notaId` to `useAIGeneration`
- **Enhanced Integration**: Better integration with the new conversation system

## Benefits

### 1. **Separation of Concerns**
- **UI Layer**: Components focus purely on presentation and user interaction
- **Business Logic**: Service layer handles all conversation operations
- **Data Layer**: Database operations are centralized and consistent

### 2. **Performance Improvements**
- **Reduced Block Size**: AI blocks no longer store large conversation histories
- **Efficient Queries**: Database queries are optimized for conversation retrieval
- **Lazy Loading**: Conversations are loaded only when needed

### 3. **Data Integrity**
- **Centralized Storage**: Single source of truth for conversation data
- **Atomic Operations**: Database transactions ensure data consistency
- **Backup/Recovery**: Conversations can be backed up and restored independently

### 4. **Scalability**
- **Indexed Queries**: Database indexes improve query performance
- **Modular Architecture**: Easy to extend with new conversation features
- **Memory Efficiency**: Reduced memory usage by storing data in database

### 5. **Developer Experience**
- **Clear APIs**: Well-defined service interfaces
- **Type Safety**: Full TypeScript support with proper types
- **Error Handling**: Comprehensive error handling with detailed logging
- **Testing**: Service layer can be easily unit tested

## Migration Strategy

### Automatic Migration
The system automatically handles migration of existing conversation data:

1. **Detection**: Checks for legacy conversation data in block attributes
2. **Migration**: Converts and saves data to the database
3. **Cleanup**: Removes legacy data from block attributes
4. **Fallback**: Graceful handling if migration fails

## Usage Examples

### Creating a New Conversation
```typescript
const conversationService = aiConversationService;

const conversation = await conversationService.getOrCreateConversation({
  notaId: 'nota-123',
  blockId: 'ai-block-456'
});
```

### Adding Messages
```typescript
const userMessage: ConversationMessage = {
  id: `user-${Date.now()}`,
  role: 'user',
  content: 'Hello, AI!',
  timestamp: new Date()
};

await conversationService.addMessage('ai-block-456', userMessage);
```

### Loading Conversation History
```typescript
const messages = await conversationService.loadConversationHistory('ai-block-456');
console.log(`Loaded ${messages.length} messages`);
```

### Using in Components
```typescript
// In a Vue component
const conversationManager = useConversationManager(editor, notaId);

// Load conversation for an AI block
await conversationManager.loadConversationFromBlock(block);

// Access conversation history
const history = conversationManager.conversationHistory.value;
```

## Best Practices

### 1. **Always Use Block IDs**
- Generate unique block IDs for all AI blocks
- Use `getOrCreateBlockId()` for consistency
- Store block IDs in block attributes for persistence

### 2. **Error Handling**
- Always wrap database operations in try-catch blocks
- Provide meaningful error messages to users
- Log errors for debugging purposes

### 3. **State Synchronization**
- Keep local state synchronized with database
- Use reactive data structures for UI updates
- Batch database updates when possible

### 4. **Performance Optimization**
- Load conversations only when needed
- Use lazy loading for large conversation histories
- Cache frequently accessed conversations

### 5. **Testing**
- Unit test service layer methods
- Integration test conversation flows
- Test migration scenarios

## File Structure

```
src/
├── services/
│   └── aiConversationService.ts          # Service layer for conversation management
├── stores/
│   └── aiConversationStore.ts            # Updated Pinia store with database integration
├── components/sidebars/ai-assistant/
│   ├── composables/
│   │   ├── useConversationManager.ts     # New conversation management composable
│   │   ├── useConversation.ts            # Updated to use database
│   │   └── useAIGeneration.ts            # Updated to use database
│   └── components/
│       └── AIAssistantSidebar.vue        # Updated to pass notaId
├── db.ts                                 # Updated database schema
└── AI_CONVERSATION_REFACTOR.md           # This documentation
```

## Conclusion

This refactor significantly improves the architecture of the AI conversation system by:

- **Improving Modularity**: Clear separation between UI, business logic, and data layers
- **Enhancing Performance**: Efficient database storage and retrieval
- **Ensuring Data Integrity**: Centralized, consistent data management
- **Providing Scalability**: Foundation for future conversation features
- **Following Best Practices**: Industry-standard patterns for data management

The new system is backward-compatible and provides a smooth migration path from the old block-based storage to the new database-centered approach. 