# Component Arrangement & Code Organization Improvements

> **Based on analysis of 664 source files across 7 features**
> **Total LOC:** 108,027 (71,010 Vue + 37,017 TS)

This document outlines needed improvements in code organization, component structure, and architecture across the BashNota codebase.

## Table of Contents
1. [Feature Organization](#feature-organization)
2. [Component Structure Issues](#component-structure-issues)
3. [Store Architecture](#store-architecture)
4. [Service Layer](#service-layer)
5. [Composables Organization](#composables-organization)
6. [Type Definitions](#type-definitions)
7. [File Naming & Conventions](#file-naming--conventions)
8. [Dependency Management](#dependency-management)

---

## Feature Organization

### Current Structure
```
src/features/
├── ai/          (34 files)
├── auth/        (7 files)
├── bashhub/     (8 files)
├── editor/      (187 files) ⚠️ LARGEST - needs refactoring
├── jupyter/     (12 files)
├── nota/        (65 files)
└── settings/    (53 files)
```

### Issues Identified

#### 1. Editor Feature Too Large (187 files)
**Current Structure:**
```
src/features/editor/
├── components/
│   ├── blocks/          (13 block types, varying complexity)
│   │   ├── executable-code-block/  (37 files) ⚠️ Too large
│   │   ├── table-block/            (26 files)
│   │   ├── pipeline/               (15 files)
│   │   ├── confusion-matrix/       (16 files)
│   │   └── ... (9 more blocks)
│   ├── dialogs/
│   ├── extensions/
│   ├── jupyter/
│   └── ui/
├── composables/   (10 composables)
├── services/      (3 services)
├── stores/        (5 stores)
├── types/
├── utils/
└── views/
```

**Problems:**
1. **executable-code-block** is 37 files - should be its own feature
2. Block types have inconsistent structure
3. Some blocks are 2 files, others are 37 files
4. No clear separation between simple and complex blocks

**Recommended Restructure:**

```
src/features/
├── editor/                    (core editor only, ~50 files)
│   ├── components/
│   │   ├── toolbars/
│   │   ├── menus/
│   │   └── ui/
│   ├── composables/
│   ├── services/
│   └── extensions/           (TipTap extensions only)
│
├── blocks/                    (NEW - extract from editor)
│   ├── simple/               (lightweight blocks)
│   │   ├── youtube-block/
│   │   ├── math-block/
│   │   └── theorem-block/
│   ├── complex/              (feature-rich blocks)
│   │   ├── code-execution/   (rename from executable-code-block)
│   │   ├── table/
│   │   ├── pipeline/
│   │   └── confusion-matrix/
│   └── shared/               (common block utilities)
│
└── code-execution/           (NEW - jupyter + execution logic)
    ├── components/
    ├── composables/
    ├── services/
    └── stores/
```

**Benefits:**
- Clear separation of concerns
- Easier to navigate
- Better code reuse
- Simpler testing
- Clearer dependencies

#### 2. Overlapping Responsibilities
**Problem:** Features have blurred boundaries

**Example - Code Execution:**
```
Current (scattered):
- src/features/editor/components/blocks/executable-code-block/ (37 files)
- src/features/editor/composables/useCodeExecution.ts
- src/features/editor/stores/codeExecutionStore.ts
- src/features/jupyter/ (12 files)
- src/services/codeExecutionService.ts

Recommended (consolidated):
- src/features/code-execution/
  ├── blocks/
  ├── composables/
  ├── services/
  ├── stores/
  └── jupyter-integration/
```

**Example - AI Features:**
```
Current (duplicated):
- src/features/ai/stores/aiActionsStore.ts
- src/features/editor/stores/aiActionsStore.ts ⚠️ DUPLICATE

Recommended:
- src/features/ai/stores/aiActionsStore.ts (single source)
- Import in editor when needed
```

---

## Component Structure Issues

### 1. Inconsistent Component Organization

#### Block Components (varying structures)

**Simple Block (youtube-block, 6 files):**
```
youtube-block/
├── YoutubeBlock.vue
├── YoutubeBlockExtension.ts
├── YoutubeNodeView.vue
├── EditYoutubeDialog.vue
├── types.ts
└── index.ts
```

**Medium Block (math-block, 5 files):**
```
math-block/
├── MathBlock.vue
├── MathBlockExtension.ts
├── EditMathDialog.vue
├── types.ts
└── index.ts
```

**Complex Block (executable-code-block, 37 files):**
```
executable-code-block/
├── ExecutableCodeBlock.vue
├── CodeBlockWithExecution.vue
├── ExecutableCodeBlockExtension.ts
├── components/          (10+ components)
├── composables/         (4 subdirectories, 12+ composables)
├── ai/                  (AI integration)
├── types/
└── ... many more files
```

**Problem:** No standard structure as blocks grow in complexity

**Recommended Standard Structure:**
```
{block-name}/
├── index.ts                  # Public API
├── {BlockName}.vue           # TipTap node view wrapper
├── {BlockName}Extension.ts   # TipTap extension
├── components/               # UI components (if needed)
│   ├── Editor.vue
│   ├── Viewer.vue
│   └── Toolbar.vue
├── composables/              # Business logic (if complex)
│   ├── use{BlockName}Core.ts
│   └── use{BlockName}UI.ts
├── services/                 # External integrations (if any)
├── types/                    # TypeScript types
└── README.md                 # Block documentation
```

### 2. Component Naming Inconsistencies

**Issues Found:**
```
❌ Inconsistent:
- ExecutableCodeBlock.vue
- CodeBlockWithExecution.vue
- MathBlock.vue
- YoutubeBlock.vue
- SubNotaDialog.vue
- CitationPicker.vue

✅ Should be:
- CodeExecutionBlock.vue (or ExecutableCodeBlock.vue)
- CodeExecutionCore.vue (clearer purpose)
- MathBlock.vue ✓ (correct)
- VideoBlock.vue (YouTube is just one type)
- SubNotaDialog.vue ✓ (correct)
- CitationPicker.vue ✓ (correct)
```

**Recommended Naming Convention:**
```
Blocks:       {Purpose}Block.vue       (MathBlock, CodeBlock, TableBlock)
Dialogs:      {Purpose}Dialog.vue      (EditDialog, ConfigDialog)
Components:   {Purpose}Component.vue   (ToolbarComponent, EditorComponent)
Composables:  use{Purpose}.ts          (useCodeExecution, useMathRender)
Services:     {purpose}Service.ts      (jupyterService, aiService)
Stores:       {purpose}Store.ts        (notaStore, editorStore)
```

### 3. Deep Nesting Issues

**Problem:** Some components are nested too deeply

**Example - Executable Code Block:**
```
src/features/editor/components/blocks/executable-code-block/
  composables/
    features/
      useCodeFormatting.ts
    ui/
      useCodeBlockUI.ts
      useCodeBlockShortcuts.ts
      useFullscreenCode.ts
    core/
      useCodeExecution.ts
```

**Issue:** 5 levels deep for a single composable

**Recommended (max 3 levels):**
```
src/features/code-execution/
  composables/
    useCodeFormatting.ts
    useCodeBlockUI.ts
    useCodeBlockShortcuts.ts
    useFullscreenCode.ts
    useCodeExecution.ts
```

---

## Store Architecture

### Current Issues

#### 1. Store Duplication
**Problem:** Same functionality in multiple stores

```typescript
// src/features/ai/stores/aiActionsStore.ts
// src/features/editor/stores/aiActionsStore.ts
// ⚠️ Two stores with similar names and purpose
```

**Solution:** Consolidate to single store, use composition

#### 2. Stores Without Tests (ALL 19 stores)
```
❌ No Tests:
- src/stores/tabsStore.ts
- src/stores/sidebarStore.ts
- src/stores/shortcutsStore.ts
- src/stores/settingsStore.ts
- src/stores/layoutStore.ts
- src/stores/uiStore.ts
- src/features/ai/stores/aiConversationStore.ts
- src/features/ai/stores/aiActionsStore.ts
- src/features/ai/stores/aiSettingsStore.ts
- src/features/jupyter/stores/jupyterStore.ts
- src/features/nota/stores/blockStore.ts
- src/features/nota/stores/favoriteBlocksStore.ts
- src/features/nota/stores/nota.ts
- src/features/auth/stores/auth.ts
- src/features/editor/stores/editorStore.ts
- src/features/editor/stores/aiActionsStore.ts
- src/features/editor/stores/tableStore.ts
- src/features/editor/stores/codeExecutionStore.ts
- src/features/editor/stores/citationStore.ts
```

#### 3. Store Organization
**Recommended Structure:**
```
src/stores/
├── app/                 # App-level stores
│   ├── layoutStore.ts
│   ├── uiStore.ts
│   └── settingsStore.ts
├── navigation/          # Navigation-related
│   ├── tabsStore.ts
│   ├── sidebarStore.ts
│   └── shortcutsStore.ts
└── index.ts            # Export all stores
```

**Feature stores should stay in features:**
```
src/features/{feature}/stores/
└── {feature}Store.ts
```

---

## Service Layer

### Current Issues

#### 1. Services Scattered Across Features
**Problem:** Related services in different locations

```
Current:
- src/services/aiService.ts
- src/features/ai/services/aiService.ts      ⚠️ Name collision
- src/features/ai/services/aiConversationService.ts
- src/services/codeExecutionService.ts
- src/features/editor/services/notaExtensionService.ts

Recommended:
- src/features/ai/services/
  ├── index.ts                    # Re-export all
  ├── aiService.ts                # Main AI service
  ├── conversationService.ts      # Conversation management
  ├── providerFactory.ts          # Provider creation
  └── providers/
      ├── geminiProvider.ts
      ├── ollamaProvider.ts
      └── webLLMProvider.ts
```

#### 2. Services Without Tests (22+ services)
```
Priority services needing tests:
🔴 HIGH:
- src/services/firebase.ts               (authentication, database)
- src/services/aiService.ts              (AI core functionality)
- src/features/auth/services/auth.ts     (user authentication)
- src/features/jupyter/services/jupyterService.ts (code execution)

🟡 MEDIUM:
- src/services/codeExecutionService.ts
- src/features/ai/services/aiConversationService.ts
- src/features/nota/services/commentService.ts
- src/features/editor/services/MarkdownParserService.ts

🟢 LOW:
- src/features/nota/services/referenceValidationService.ts
- src/features/nota/services/publishNotaUtilities.ts
- src/features/nota/services/subNotaService.ts
```

#### 3. Service Interface Inconsistency
**Problem:** Services have different patterns

**Example - Inconsistent:**
```typescript
// Some use classes
class JupyterService {
  async connect() { }
}

// Some use plain objects
export const aiService = {
  generate: async () => { }
}

// Some use factory functions
export function createAIService() { }
```

**Recommended - Consistent Pattern:**
```typescript
// services/aiService.ts
export interface AIServiceInterface {
  generate(prompt: string): Promise<string>
  streamGenerate(prompt: string): AsyncGenerator<string>
}

export class AIService implements AIServiceInterface {
  constructor(private config: AIConfig) {}
  
  async generate(prompt: string): Promise<string> {
    // Implementation
  }
  
  async *streamGenerate(prompt: string): AsyncGenerator<string> {
    // Implementation
  }
}

// Factory for dependency injection
export function createAIService(config: AIConfig): AIServiceInterface {
  return new AIService(config)
}
```

---

## Composables Organization

### Current Issues

#### 1. Composables Without Tests (60+ composables)
```
Priority composables needing tests:
🔴 HIGH:
- src/composables/useSettings.ts         (core settings management)
- src/composables/useSidebarManager.ts   (UI management)
- src/features/nota/composables/useNotaActions.ts
- src/features/editor/composables/useCodeExecution.ts

🟡 MEDIUM:
- src/features/ai/components/composables/useAIActions.ts
- src/features/nota/composables/useNotaFilters.ts
- src/features/jupyter/composables/useJupyterServers.ts
- src/features/editor/composables/useMathJax.ts

🟢 LOW:
- Various UI-focused composables
- Feature-specific helpers
```

#### 2. Composable Naming & Organization
**Problem:** Inconsistent organization within features

**Current - Scattered:**
```
src/features/nota/composables/
├── useBatchBibTexParser.ts
├── useBibTexParser.ts
├── useBlockEditor.ts
├── useNotaActions.ts
├── useNotaBatchActions.ts
├── useNotaFiltering.ts
├── useNotaFilters.ts          ⚠️ Similar to useNotaFiltering
├── useNotaImport.ts
├── useNotaList.ts
├── useNotaMetadata.ts
├── useNotaPagination.ts
├── useNotaSelection.ts
├── useNotaSorting.ts
├── useQuickNotaCreation.ts
├── useReferenceBatchDialog.ts
├── useReferenceDialog.ts
├── useReferenceForm.ts
├── useReferencesSearch.ts
└── useSaveHandler.ts
```

**Recommended - Grouped:**
```
src/features/nota/composables/
├── core/
│   ├── useNotaActions.ts
│   ├── useNotaList.ts
│   └── useSaveHandler.ts
├── filtering/
│   ├── useNotaFilters.ts      (combine filtering + filters)
│   ├── useNotaSorting.ts
│   └── useNotaSelection.ts
├── references/
│   ├── useBibTexParser.ts
│   ├── useReferenceDialog.ts
│   └── useReferencesSearch.ts
├── batch/
│   ├── useNotaBatchActions.ts
│   └── useBatchBibTexParser.ts
└── index.ts                   (re-export all)
```

---

## Type Definitions

### Current Issues

#### 1. Type Files Scattered
**Problem:** Types defined in multiple places

```
Current:
- src/types/                    (app-level types)
- src/features/editor/types/
- src/features/nota/types/
- src/features/ai/types/
- ... (each feature has types/)
```

**Issue:** Hard to find shared types, potential duplication

**Recommended:**
```
src/types/
├── global/           # Global types used everywhere
│   ├── common.ts
│   ├── api.ts
│   └── events.ts
└── index.ts

src/features/{feature}/types/
├── models.ts         # Feature-specific models
├── api.ts           # API interfaces
├── events.ts        # Event types
└── index.ts
```

#### 2. Missing Type Exports
**Problem:** Not all types are exported from index.ts

**Solution:** Each types/ folder should have index.ts:
```typescript
// src/features/nota/types/index.ts
export * from './nota'
export * from './blocks'
export type { /* specific exports */ } from './internal'
```

---

## File Naming & Conventions

### Current Inconsistencies

#### 1. Component Files
```
❌ Inconsistent:
- PipelineBlock.vue
- pipeline-block.vue
- BlockCommandMenu.vue
- block-command-menu.vue

✅ Standard:
- PascalCase.vue for all components
- PipelineBlock.vue
- BlockCommandMenu.vue
```

#### 2. TypeScript Files
```
❌ Inconsistent:
- useCodeExecution.ts
- use-code-execution.ts
- code_execution.ts

✅ Standard:
- camelCase.ts for composables: useCodeExecution.ts
- camelCase.ts for services: codeExecutionService.ts
- camelCase.ts for stores: codeExecutionStore.ts
- camelCase.ts for utilities: codeExecutionUtils.ts
```

#### 3. Directory Names
```
❌ Inconsistent:
- executable-code-block/
- confusion-matrix/
- confusionMatrix/

✅ Standard:
- kebab-case for all directories
- executable-code-block/
- confusion-matrix/
```

### Recommended Conventions

```
Files:
- *.vue           → PascalCase (ComponentName.vue)
- *.ts/*.js       → camelCase (fileName.ts)
- *.test.ts       → matches source (fileName.test.ts)
- *.d.ts          → matches source (fileName.d.ts)

Directories:
- features/*      → kebab-case (feature-name/)
- components/*    → kebab-case (component-type/)
- All others      → kebab-case (folder-name/)

Special Files:
- index.ts        → Always lowercase
- README.md       → Always uppercase
- types.ts        → Common name for type definitions
```

---

## Dependency Management

### Issues

#### 1. Circular Dependencies
**Problem:** Some features import from each other

```
Example:
- editor imports from nota
- nota imports from editor
- Creates circular dependency
```

**Solution:** Extract shared code to common location
```
src/shared/
├── blocks/
├── extensions/
└── utilities/
```

#### 2. Deep Import Paths
**Problem:** Long import paths

```typescript
import { useCodeExecution } from '@/features/editor/components/blocks/executable-code-block/composables/core/useCodeExecution'
```

**Solution:** Better barrel exports
```typescript
// src/features/code-execution/index.ts
export { useCodeExecution } from './composables'
export { CodeExecutionBlock } from './components'
export { codeExecutionStore } from './stores'

// Usage
import { useCodeExecution } from '@/features/code-execution'
```

#### 3. Component Dependencies
**Problem:** Components directly import from other features

**Recommended:** Use composition and props instead
```typescript
// ❌ Bad: Direct cross-feature import
import { NotaEditor } from '@/features/editor'

// ✅ Good: Pass as prop or use composable
const props = defineProps<{
  editor: EditorInstance
}>()
```

---

## Recommended Refactoring Plan

### Phase 1: Foundation (Week 1-2)
1. ✅ Standardize file naming across entire codebase
2. ✅ Create barrel exports (index.ts) for all features
3. ✅ Document architectural decisions

### Phase 2: Feature Extraction (Week 3-4)
1. Extract `code-execution` from `editor`
2. Extract `blocks` as separate feature
3. Consolidate AI stores (remove duplicates)

### Phase 3: Service Layer (Week 5-6)
1. Standardize all service interfaces
2. Add service tests (priority order)
3. Remove service duplication

### Phase 4: Composables (Week 7-8)
1. Organize composables by category
2. Add composable tests (priority order)
3. Document composable usage

### Phase 5: Store Cleanup (Week 9-10)
1. Add store tests (all 19 stores)
2. Remove store duplication
3. Standardize store patterns

### Phase 6: Types & Documentation (Week 11-12)
1. Consolidate type definitions
2. Update all component documentation
3. Create architecture diagrams

---

## Metrics

### Current State
- **Total Files:** 664
- **Features:** 7
- **Largest Feature:** editor (187 files)
- **Largest Block:** executable-code-block (37 files)
- **Stores Without Tests:** 19 (100%)
- **Services Without Tests:** 22+
- **Composables Without Tests:** 60+
- **Deep Nesting (>4 levels):** ~15 locations
- **Duplicate Names:** 5+ identified

### Target State
- **Features:** 9 (after extraction)
- **Max Files Per Feature:** <100
- **Max Files Per Block:** <20
- **Stores With Tests:** 100%
- **Services With Tests:** 100%
- **Composables With Tests:** >80%
- **Max Nesting:** 3 levels
- **Duplicate Names:** 0

---

**Last Updated:** December 2024
**Based on:** Complete analysis of 664 source files
