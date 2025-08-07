# Executable Code Block System

## 🏗️ Architecture Overview

The executable code block system consists of two main components with different purposes:

### 🎯 Main Components

#### 1. `ExecutableCodeBlock.vue` (TipTap Node View)
- **Purpose**: Official TipTap node view wrapper that handles nota persistence  
- **Key Features**:
  - Receives `updateAttributes` prop from TipTap editor
  - Handles loading/saving output from/to nota database
  - Manages configuration modal and server/kernel setup
  - Wraps the modular `CodeBlockWithExecution.vue`
- **Critical**: This is the ONLY component that can save to nota

#### 2. `CodeBlockWithExecution.vue` (Modular Component)
- **Purpose**: Reusable, standalone executable code block
- **Key Features**:
  - Modular design with composables
  - Rich UI with toolbars and controls
  - Enhanced output management
  - Can be used independently of TipTap
- **Limitation**: Cannot save to nota directly (needs parent wrapper)

## 📁 Component Structure

```
executable-code-block/
├── ExecutableCodeBlock.vue          # TipTap wrapper (saves to nota)
├── CodeBlockWithExecution.vue       # Modular component
├── ExecutableCodeBlockExtension.ts  # TipTap extension definition
├── components/                      # UI components
│   ├── CodeBlockToolbar.vue        # Main toolbar
│   ├── SideToolbar.vue             # Sidebar controls
│   ├── StatusIndicator.vue         # Execution status
│   ├── WarningBanners.vue          # Configuration warnings
│   ├── CodeEditor.vue              # Code editing interface
│   ├── OutputDisplay.vue           # Output rendering
│   ├── ServerKernelSelector.vue    # Server/kernel selection
│   └── SessionSelector.vue         # Session management
├── composables/                     # Business logic
│   ├── core/
│   │   └── useCodeExecution.ts     # Core execution logic
│   ├── ui/
│   │   └── useCodeBlockUI.ts       # UI state management
│   └── useCodeBlockExecutionSimplified.ts
├── ai/                             # AI integration
│   └── components/
│       └── AICodeAssistantContainer.vue
├── types/
│   └── index.ts                    # TypeScript definitions
├── OutputRenderer.vue              # Rich output display
├── ErrorDisplay.vue               # Error handling
├── ExecutionStatus.vue            # Status feedback
├── CodeMirror.vue                 # Code editor
├── FullScreenCodeBlock.vue        # Fullscreen mode
├── TemplateSelector.vue           # Code templates
└── IframeOutputRenderer.vue       # Isolated output rendering
```

## 🔄 Data Flow

### Current Flow (BROKEN for nota saving):
```
CodeBlockWithExecution → Enhanced Output Management → ❌ NO NOTA SAVING
```

### Fixed Flow (What we need):
```
CodeBlockWithExecution → emit('update:output') → ExecutableCodeBlock.updateOutput() → nota saved
```

## 🚨 Critical Issues Identified

### 1. **Output Not Saving to Nota**
- **Problem**: `CodeBlockWithExecution.vue` doesn't emit `update:output` properly
- **Root Cause**: Enhanced output management bypasses the event emission
- **Fix**: Ensure all output updates emit the event to parent wrapper

### 2. **Missing Output on Reload**
- **Problem**: Saved output not loaded from nota attributes
- **Root Cause**: Modular component doesn't initialize output from props
- **Fix**: Load initial output from nota in `CodeBlockWithExecution.vue`

### 3. **HTML Errors on Reload**
- **Problem**: Output contains HTML that breaks on reload
- **Root Cause**: Output not properly sanitized/validated
- **Fix**: Add output validation and sanitization

## 🔧 Component Details

### Core Components

#### `ExecutableCodeBlock.vue`
**Props**: 
- `node` - TipTap node with attributes
- `updateAttributes` - Function to save to nota
- `editor` - TipTap editor instance
- `getPos` - Position function

**Key Methods**:
- `updateOutput(newOutput)` - Saves output to nota via `updateAttributes`
- `updateCode(newCode)` - Updates code content
- `handleOpenConfiguration()` - Opens kernel config modal

#### `CodeBlockWithExecution.vue`
**Props**:
- `code` - Code content string  
- `language` - Programming language
- `id` - Block identifier
- `sessionId` - Execution session
- `notaId` - Parent nota ID

**Events**:
- `update:code` - Code changed
- `update:output` - Output changed (CRITICAL for nota saving)
- `update:session-id` - Session changed
- `open-configuration` - Configuration requested

### UI Components

#### `SideToolbar.vue`
- Execute button
- Configuration button
- Code visibility toggle
- Fullscreen toggle
- Copy code button
- Clear output button (NEW)

#### `OutputDisplay.vue`
- Output rendering with type detection
- Metadata display (lines, size, etc.)
- Copy/clear controls
- Collapsible interface
- Error handling

#### `CodeEditor.vue`
- Syntax highlighting (CodeMirror)
- Auto-completion
- Format code
- Template insertion
- Keyboard shortcuts

### Composables

#### `useEnhancedOutputManagement.ts`
- Central output state management
- Store and nota synchronization
- Clear/copy functionality
- Type-safe interfaces

#### `useCodeBlockExecutionSimplified.ts`
- Code execution logic
- Session management
- Error handling
- Progress tracking

#### `useCodeBlockCore.ts`
- Core state management
- Code editing functionality
- Save/copy operations

#### `useCodeBlockUI.ts`
- UI state (hover, toolbar visibility)
- Fullscreen mode
- Template dialogs

## 🐛 Bug Analysis

### Issue 1: Output Not Persisting
**Location**: `CodeBlockWithExecution.vue` line 130-140
**Problem**: Enhanced output management calls `config.updateAttributes` but this function just emits an event, it doesn't directly save to nota.
**Solution**: Ensure emission chain works properly.

### Issue 2: Output Not Loading  
**Location**: `CodeBlockWithExecution.vue` initialization
**Problem**: Component doesn't load initial output from props.
**Solution**: Initialize output from passed props.

### Issue 3: Clear Output Not Working
**Location**: `OutputDisplay.vue` clear functionality  
**Problem**: Clear operation doesn't properly emit to parent.
**Solution**: Ensure clear emits `update:output` with empty string.

## 🚀 Implementation Plan

### Phase 1: Fix Event Emission Chain
1. Ensure `CodeBlockWithExecution.vue` properly emits `update:output`
2. Fix enhanced output management to trigger emissions
3. Validate event flow from execution to nota saving

### Phase 2: Fix Output Loading
1. Add proper initialization from props
2. Handle output attribute loading on component mount
3. Sync store with nota attributes

### Phase 3: Fix Clear Functionality  
1. Ensure clear operation emits proper events
2. Update both store and nota
3. Test persistence across page reloads

### Phase 4: Add Validation
1. Sanitize HTML output before saving
2. Add output size limits
3. Handle malformed output gracefully

## 🧪 Testing Checklist

- [ ] Execute code → output appears
- [ ] Execute code → refresh page → output persists  
- [ ] Clear output → refresh page → output stays cleared
- [ ] Error output → refresh page → error persists
- [ ] HTML output → refresh page → no HTML errors
- [ ] Large output → proper handling
- [ ] Malformed output → graceful degradation

## 🔮 Future Improvements

1. **Performance**: Virtual scrolling for large outputs
2. **Collaboration**: Real-time multi-user execution
3. **Caching**: Intelligent output caching
4. **Export**: Output export functionality
5. **Templates**: More code templates
6. **Plugins**: Extensible plugin system

This modular architecture provides flexibility while maintaining the critical nota persistence through the TipTap wrapper pattern.
