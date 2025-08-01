# Executable Code Block - Modular Design

## Overview

The Executable Code Block has been refactored into a clean, modular architecture that separates concerns and improves maintainability. The new design consists of:

### Core Component
- **`CodeBlockWithExecutionModular.vue`** - The main component that orchestrates all functionality

### Modular Components (`./components/`)
- **`CodeBlockToolbar.vue`** - Main toolbar with execution controls, session/server management
- **`StatusIndicator.vue`** - Visual status indicators for execution state
- **`WarningBanners.vue`** - Warning messages for configuration issues
- **`CodeEditor.vue`** - Code editing interface with syntax highlighting
- **`OutputSection.vue`** - Output display and AI assistant integration
- **`SessionSelector.vue`** - Session management UI (integrated into toolbar)
- **`ServerKernelSelector.vue`** - Server and kernel selection UI (integrated into toolbar)

### Composables (`./composables/`)
- **`useCodeBlockState.ts`** - Core state management and initialization
- **`useSessionManagement.ts`** - Session and kernel lifecycle management
- **`useCodeBlockExecution.ts`** - Code execution logic and progress tracking
- **`usePreferencesManagement.ts`** - User preferences and persistence
- **`useCodeBlockShortcuts.ts`** - Keyboard shortcuts handling
- **`useOutputStreaming.ts`** - Real-time output streaming
- **`useAICodeAssistant.ts`** - AI features integration

## Architecture Benefits

### 1. Separation of Concerns
Each component and composable has a single, well-defined responsibility:
- UI components focus only on presentation
- Composables handle all business logic
- State management is centralized and predictable

### 2. Reusability
Components can be used independently in different contexts:
- `CodeBlockToolbar` can be used in modal dialogs
- `OutputSection` can be embedded in different layouts
- Composables can be shared across different components

### 3. Testability
Each unit can be tested in isolation:
- Components have clear props/events interfaces
- Composables have pure functions with predictable inputs/outputs
- Business logic is separated from UI concerns

### 4. Maintainability
Changes are localized and predictable:
- Session management changes only affect `useSessionManagement.ts`
- UI changes only affect the specific component
- New features can be added as new composables

## Migration Guide

### For Existing Code
Replace imports of the old component:
```typescript
// Old (deprecated)
import CodeBlockWithExecution from './CodeBlockWithExecution.vue'

// New (recommended)
import CodeBlockWithExecutionModular from './CodeBlockWithExecutionModular.vue'
// or use the alias
import { CodeBlockWithExecution } from './index.ts' // Now points to modular version
```

### Props Interface
The modular version uses a cleaner props interface:
```typescript
interface Props {
  code: string
  language: string
  id: string
  sessionId: string | null
  notaId: string
  kernelPreference?: KernelConfig | null
  isReadOnly?: boolean
  isExecuting?: boolean
  isPublished?: boolean
}
```

### Events
The modular version emits the same events for compatibility:
- `update:code` - Code content changes
- `kernel-select` - Kernel selection changes
- `update:output` - Output updates
- `update:session-id` - Session changes

## Component Hierarchy

```
CodeBlockWithExecutionModular
├── StatusIndicator
├── CodeBlockToolbar
│   ├── SessionSelector (embedded)
│   └── ServerKernelSelector (embedded)
├── WarningBanners
├── CodeEditor
├── OutputSection
│   └── AICodeAssistant (conditional)
├── FullScreenCodeBlock (modal)
├── ExecutionStatus (conditional)
├── ErrorDisplay (conditional)
└── TemplateSelector (modal)
```

## State Management Flow

```
useCodeBlockState (core state)
├── UI State (toolbar visibility, code visibility, etc.)
├── Code State (content, unsaved changes, etc.)
└── Execution State (progress, status, errors)

useSessionManagement (session lifecycle)
├── Available Sessions/Kernels
├── Session Creation/Selection
└── Server Connection Management

useCodeBlockExecution (execution logic)
├── Code Execution Pipeline
├── Output Streaming
└── Error Handling

usePreferencesManagement (persistence)
├── User Preferences Loading/Saving
├── Kernel/Server Preferences
└── Session Restoration
```

## Best Practices

### 1. Use TypeScript Interfaces
All components and composables use strict TypeScript interfaces for props, events, and state.

### 2. Reactive State Management
All state is reactive using Vue 3's Composition API with proper dependency tracking.

### 3. Error Boundaries
Each composable handles its own errors and provides appropriate fallbacks.

### 4. Performance Optimization
- Computed properties for derived state
- Lazy loading of heavy components
- Efficient event handling with proper cleanup

### 5. Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility

## Development Guidelines

### Adding New Features
1. Create a new composable if it involves business logic
2. Create a new component if it involves UI
3. Update the main component to integrate the new functionality
4. Add appropriate TypeScript interfaces
5. Write tests for the new functionality

### Modifying Existing Features
1. Identify the appropriate component or composable
2. Make changes in isolation
3. Update interfaces if necessary
4. Test the integration with the main component

### Performance Considerations
- Use `computed()` for derived state
- Use `watchEffect()` for side effects
- Use `shallowRef()` for large objects that don't need deep reactivity
- Implement proper cleanup in `onUnmounted()`
