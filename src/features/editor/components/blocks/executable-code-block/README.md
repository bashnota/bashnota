# Executable Code Block Components

This directory contains the components and composables for the AI-enhanced executable code block system. The implementation follows modular design principles with a unified AI assistant interface.

## Core Components

### `CodeBlockWithExecution.vue`
The main executable code block component that orchestrates code execution, AI assistance, and user interactions.

**Key Features:**
- Code editing with syntax highlighting
- Multiple execution environments (Jupyter, local, shared sessions)
- Integrated AI assistance
- Output rendering with interactive elements
- Template system for code snippets

### `AICodeAssistant.vue`
Unified AI interface that consolidates all AI-powered features into a single, cohesive component.

**Key Features:**
- Tabbed interface (Quick Actions, Custom Actions, Error Assistance)
- Integration with AI actions store
- Context-aware assistance
- Auto-triggered error analysis
- One-click code application

## Supporting Components

### `OutputRenderer.vue`
Handles rendering of code execution outputs with support for:
- HTML, text, and JSON output
- Interactive plots and visualizations
- Error display with syntax highlighting
- Copy and download functionality

### `CodeMirror.vue`
Code editor component with:
- Syntax highlighting for multiple languages
- Auto-completion and formatting
- Template insertion
- Keyboard shortcuts

### `TemplateSelector.vue`
Template management system for:
- Language-specific code templates
- Custom template creation
- Quick code insertion

### `AICodePreferences.vue`
Simplified settings interface that links to the main AI configuration panel.

## Composables

### `useAICodeAssistant.ts`
**Unified AI composable** that replaces previous redundant AI composables. Provides:
- Integration with AI actions store
- Caching for performance
- Error handling and retries
- Result formatting utilities

### `useCodeExecution.ts`
Manages code execution lifecycle:
- Execution state management
- Output streaming
- Error handling

### `useCodeBlockToolbar.ts`
Toolbar state and interactions:
- Server/kernel selection
- Execution controls
- Visibility toggles

### `useOutputStreaming.ts`
Real-time output streaming for long-running executions.

### `useCodeFormatting.ts`
Code formatting utilities for different languages.

### `useCodeTemplates.ts`
Template management and insertion logic.

## Architecture Improvements

### ✅ Eliminated Redundancies
- **Removed:** `AICodeActions.vue`, `CustomAIActions.vue`, `ErrorAssistance.vue`
- **Replaced with:** Single `AICodeAssistant.vue` component
- **Removed:** `useCodeAnalysis.ts`, `useErrorTrigger.ts` 
- **Replaced with:** Unified `useAICodeAssistant.ts` composable

### ✅ Centralized AI Management
- All AI functionality routes through the `aiActionsStore`
- Consistent API for custom and built-in actions
- Unified configuration and settings

### ✅ Modular Design
- Clear separation of concerns
- Reusable composables
- Consistent interfaces between components

### ✅ Performance Optimizations
- Result caching to avoid re-analysis
- Lazy loading of AI components
- Efficient state management

## Usage Examples

### Basic Code Block
```vue
<CodeBlockWithExecution
  :code="pythonCode"
  language="python"
  :id="blockId"
  :session-id="sessionId"
  :nota-id="notaId"
  @update:code="handleCodeUpdate"
/>
```

### AI Assistant Integration
The AI assistant is automatically integrated and can be toggled via the toolbar. It provides:

1. **Quick Actions** - Common AI operations (explain, optimize, fix)
2. **Custom Actions** - User-defined AI workflows
3. **Error Assistance** - Automatic error analysis and fixes

### Custom AI Actions
Custom actions are managed through the settings panel and executed via the unified AI interface:

```typescript
// Example custom action execution
const result = await aiCodeAssistant.executeAction(
  'custom-action-id',
  code,
  language,
  error
)
```

## Integration with AI Actions Store

The components integrate seamlessly with the centralized AI actions store:

- **Provider Management:** AI provider selection and configuration
- **Action Execution:** Unified execution pipeline for all AI actions
- **Settings:** Centralized configuration for all AI features
- **Caching:** Intelligent caching to improve performance

## Best Practices

1. **Single Responsibility:** Each component has a clear, focused purpose
2. **Composable Logic:** Reusable logic extracted into composables
3. **Type Safety:** Full TypeScript support throughout
4. **Error Handling:** Graceful degradation and user feedback
5. **Performance:** Efficient state management and lazy loading
6. **Accessibility:** Proper ARIA labels and keyboard navigation

## Future Enhancements

- **Plugin System:** Extensible architecture for custom AI providers
- **Collaborative AI:** Real-time collaborative AI assistance
- **Advanced Caching:** More sophisticated caching strategies
- **AI Model Selection:** Per-action AI model configuration 