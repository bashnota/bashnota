# Missing Unit Tests - BashNota

> **Comprehensive Test Coverage Analysis**
> **Current Test Files:** 11
> **Files Without Tests:** 650+
> **Test Coverage:** ~1.7%

This document catalogs ALL files that need unit tests, organized by priority and complexity.

## Table of Contents
1. [Test Coverage Summary](#test-coverage-summary)
2. [Services Without Tests](#services-without-tests)
3. [Composables Without Tests](#composables-without-tests)
4. [Stores Without Tests](#stores-without-tests)
5. [Utils Without Tests](#utils-without-tests)
6. [Component Tests Needed](#component-tests-needed)
7. [Integration Tests Needed](#integration-tests-needed)
8. [E2E Tests Needed](#e2e-tests-needed)

---

## Test Coverage Summary

### Current Test Files (11 total)
```
✅ Existing Tests:
1. functions/src/utils/__tests__/NotaContentProcessor.test.ts
2. src/utils/__tests__/randomTitleGenerator.test.ts
3. src/utils/__tests__/dateUtils.test.ts
4. src/utils/__tests__/userTagGenerator.test.ts
5. src/services/__tests__/logger.test.ts
6. src/lib/__tests__/utils.test.ts
7. src/lib/__tests__/citation.test.ts
8. src/features/ai/utils/__tests__/iconResolver.test.ts
9. src/features/ai/services/__tests__/utils.test.ts
10. src/features/bashhub/services/__tests__/statisticsService.test.ts
11. src/features/editor/utils/__tests__/jupyterErrorParser.test.ts
```

### Test Coverage by Category
```
Category              Total Files    With Tests    Coverage
─────────────────────────────────────────────────────────────
Services             25             2             8%
Composables          66             0             0%
Stores               19             0             0%
Utils                6              4             67%
Components (Vue)     449            0             0%
Types/Interfaces     Multiple       N/A           N/A
─────────────────────────────────────────────────────────────
TOTAL                664            11            1.7%
```

---

## Services Without Tests

### Priority: CRITICAL 🔴

These services handle core functionality and MUST have tests:

#### 1. `src/services/firebase.ts`
**Why Critical:** Authentication, database, storage - core infrastructure
```typescript
Tests Needed:
- Authentication initialization
- Database connection
- Error handling
- Reconnection logic
- Security rules enforcement
```

#### 2. `src/services/aiService.ts`
**Why Critical:** Main AI service interface
```typescript
Tests Needed:
- Request/response handling
- Error handling
- Rate limiting
- Response streaming
- Provider switching
```

#### 3. `src/features/auth/services/auth.ts`
**Why Critical:** User authentication and session management
```typescript
Tests Needed:
- Login flow
- Registration flow
- Session management
- Token refresh
- Logout
- Password reset
- Error scenarios
```

#### 4. `src/features/jupyter/services/jupyterService.ts`
**Why Critical:** Code execution functionality
```typescript
Tests Needed:
- Server connection
- Kernel management
- Code execution
- Output handling
- Error handling
- Session management
- WebSocket communication
```

#### 5. `src/services/codeExecutionService.ts`
**Why Critical:** Core code execution logic
```typescript
Tests Needed:
- Execution queueing
- Error handling
- Output parsing
- Timeout handling
- Cancellation
```

### Priority: HIGH 🟡

#### 6. `src/features/ai/services/aiConversationService.ts`
```typescript
Tests Needed:
- Conversation creation
- Message handling
- Conversation history
- Context management
- Conversation deletion
```

#### 7. `src/features/ai/services/providerFactory.ts`
```typescript
Tests Needed:
- Provider creation
- Provider configuration
- Provider switching
- Error handling
```

#### 8. `src/features/ai/services/providers/geminiProvider.ts`
```typescript
Tests Needed:
- API initialization
- Request handling
- Response parsing
- Streaming responses
- Error handling
- Rate limiting
```

#### 9. `src/features/ai/services/providers/ollamaProvider.ts`
```typescript
Tests Needed:
- Local server connection
- Model loading
- Request handling
- Streaming
- Error scenarios
```

#### 10. `src/features/ai/services/providers/webLLMProvider.ts`
```typescript
Tests Needed:
- Browser-based model loading
- Memory management
- Inference
- Progress tracking
- Error handling
```

#### 11. `src/features/ai/services/webLLMDefaultModelService.ts`
```typescript
Tests Needed:
- Default model selection
- Model configuration
- Download handling
- Storage management
```

#### 12. `src/features/nota/services/commentService.ts`
```typescript
Tests Needed:
- Comment CRUD operations
- Comment threading
- Permissions
- Notifications
```

#### 13. `src/features/nota/services/referenceValidationService.ts`
```typescript
Tests Needed:
- BibTeX validation
- Format checking
- Required field validation
- URL validation
- DOI validation
```

#### 14. `src/features/nota/services/publishNotaUtilities.ts`
```typescript
Tests Needed:
- Publishing workflow
- Visibility settings
- Metadata handling
- Error scenarios
```

#### 15. `src/features/nota/services/subNotaService.ts`
```typescript
Tests Needed:
- Sub-nota creation
- Relationship management
- Hierarchy handling
```

#### 16. `src/features/editor/services/MarkdownParserService.ts`
```typescript
Tests Needed:
- Markdown to blocks conversion
- Block validation
- Error handling
- Edge cases (malformed markdown)
- Performance with large documents
```

#### 17. `src/features/editor/services/EnhancedMarkdownPasteHandler.ts`
```typescript
Tests Needed:
- Paste detection
- Content cleaning
- Block creation
- Format preservation
```

#### 18. `src/features/editor/services/notaExtensionService.ts`
```typescript
Tests Needed:
- Extension registration
- Extension initialization
- Extension configuration
```

#### 19. `src/features/editor/components/extensions/services/SubNotaLinkService.ts`
```typescript
Tests Needed:
- Link creation
- Link resolution
- Link validation
- Suggestions
```

### Priority: MEDIUM 🟢

#### 20. `src/services/axios.ts`
```typescript
Tests Needed:
- Request interceptors
- Response interceptors
- Error handling
- Retry logic
```

#### 21. `src/features/ai/services/index.ts`
```typescript
Tests Needed:
- Service exports
- Factory functions
```

#### 22. `src/features/ai/services/types.ts`
```typescript
Tests Needed:
- Type validation (if runtime validation exists)
```

---

## Composables Without Tests

### Priority: CRITICAL 🔴

#### Core App Composables

##### 1. `src/composables/useSettings.ts`
**Why Critical:** Central settings management for entire app
```typescript
Tests Needed:
- Get/set settings
- Settings persistence
- Default values
- Type safety
- Settings migration
- Reset to defaults
```

##### 2. `src/composables/useSidebarManager.ts`
**Why Critical:** Core UI management
```typescript
Tests Needed:
- Sidebar state management
- Toggle functionality
- Pin/unpin
- Active sidebar tracking
- Multiple sidebar handling
```

##### 3. `src/composables/theme.ts`
**Why Critical:** Theme switching and persistence
```typescript
Tests Needed:
- Theme initialization
- Theme switching
- Dark/light mode
- System preference detection
- Theme persistence
```

##### 4. `src/composables/useCommandList.ts`
**Why Critical:** Command palette functionality
```typescript
Tests Needed:
- Command registration
- Command execution
- Command search
- Keyboard shortcuts
```

### Priority: HIGH 🟡

#### Nota Composables (18 composables)

##### 5. `src/features/nota/composables/useNotaActions.ts`
```typescript
Tests Needed:
- Create nota
- Update nota
- Delete nota
- Duplicate nota
- Toggle favorite
- Error handling
```

##### 6. `src/features/nota/composables/useNotaList.ts`
```typescript
Tests Needed:
- List loading
- Pagination
- Sorting
- Filtering
- Search integration
```

##### 7. `src/features/nota/composables/useNotaFilters.ts`
```typescript
Tests Needed:
- Filter application
- Filter combinations
- Filter persistence
- Clear filters
```

##### 8. `src/features/nota/composables/useNotaSorting.ts`
```typescript
Tests Needed:
- Sort by different fields
- Sort direction
- Custom sort functions
- Sort persistence
```

##### 9. `src/features/nota/composables/useNotaSelection.ts`
```typescript
Tests Needed:
- Single selection
- Multi-selection
- Select all/none
- Selection persistence
```

##### 10. `src/features/nota/composables/useNotaBatchActions.ts`
```typescript
Tests Needed:
- Batch operations
- Progress tracking
- Error handling
- Rollback on failure
```

##### 11. `src/features/nota/composables/useNotaFiltering.ts`
```typescript
Tests Needed:
- Content filtering
- Tag filtering
- Date range filtering
- Combined filters
```

##### 12. `src/features/nota/composables/useNotaPagination.ts`
```typescript
Tests Needed:
- Page navigation
- Items per page
- Total count
- Edge cases
```

##### 13. `src/features/nota/composables/useNotaMetadata.ts`
```typescript
Tests Needed:
- Metadata CRUD
- Validation
- Custom fields
- Bulk updates
```

##### 14. `src/features/nota/composables/useNotaImport.ts`
```typescript
Tests Needed:
- Import different formats
- Validation
- Error handling
- Progress tracking
```

##### 15. `src/features/nota/composables/useQuickNotaCreation.ts`
```typescript
Tests Needed:
- Quick create
- Template application
- Default values
```

##### 16. `src/features/nota/composables/useBlockEditor.ts`
```typescript
Tests Needed:
- Block operations
- Block conversion
- TipTap integration
- Sync logic
```

##### 17. `src/features/nota/composables/useBibTexParser.ts`
```typescript
Tests Needed:
- BibTeX parsing
- Format validation
- Field extraction
- Error handling
```

##### 18. `src/features/nota/composables/useBatchBibTexParser.ts`
```typescript
Tests Needed:
- Batch parsing
- Progress tracking
- Error aggregation
```

##### 19. `src/features/nota/composables/useReferenceDialog.ts`
```typescript
Tests Needed:
- Dialog state
- Form validation
- Save/cancel
```

##### 20. `src/features/nota/composables/useReferenceBatchDialog.ts`
```typescript
Tests Needed:
- Batch reference handling
- Validation
- Progress
```

##### 21. `src/features/nota/composables/useReferenceForm.ts`
```typescript
Tests Needed:
- Form state
- Validation
- Submit
```

##### 22. `src/features/nota/composables/useReferencesSearch.ts`
```typescript
Tests Needed:
- Search functionality
- Filters
- Results
```

##### 23. `src/features/nota/composables/useSaveHandler.ts`
```typescript
Tests Needed:
- Auto-save
- Manual save
- Conflict resolution
- Error handling
```

#### Editor Composables (12 composables)

##### 24. `src/features/editor/composables/useCodeExecution.ts`
```typescript
Tests Needed:
- Execute code
- Cancel execution
- Handle output
- Error handling
- Multiple executions
```

##### 25. `src/features/editor/composables/useOutputManagement.ts`
```typescript
Tests Needed:
- Output storage
- Output retrieval
- Clear output
- Output types
```

##### 26. `src/features/editor/composables/useEnhancedOutputManagement.ts`
```typescript
Tests Needed:
- Enhanced output handling
- Persistence
- Sync with store
```

##### 27. `src/features/editor/composables/useOutputPersistence.ts`
```typescript
Tests Needed:
- Save output
- Load output
- Clear output
- Storage management
```

##### 28. `src/features/editor/composables/useRobustExecution.ts`
```typescript
Tests Needed:
- Retry logic
- Fallback mechanisms
- Error recovery
```

##### 29. `src/features/editor/composables/useSharedSession.ts`
```typescript
Tests Needed:
- Session sharing
- State sync
- Cleanup
```

##### 30. `src/features/editor/composables/useMathJax.ts`
```typescript
Tests Needed:
- MathJax initialization
- Rendering
- Error handling
```

##### 31. `src/features/editor/composables/useEquationCounter.ts`
```typescript
Tests Needed:
- Equation numbering
- Reference resolution
- Updates on add/remove
```

##### 32. `src/features/editor/composables/useCitationPicker.ts`
```typescript
Tests Needed:
- Citation selection
- Formatting
- Insertion
```

##### 33. `src/features/editor/composables/useSubNotaDialog.ts`
```typescript
Tests Needed:
- Dialog state
- Sub-nota selection
- Insertion
```

##### 34-35. `src/features/editor/components/extensions/composables/useSubNotaLinkSuggestion.ts`
```typescript
Tests Needed:
- Suggestion generation
- Selection handling
- Navigation
```

#### AI Composables (14 composables)

##### 36. `src/features/ai/components/composables/useAIActions.ts`
```typescript
Tests Needed:
- Action execution
- Error handling
- Progress tracking
```

##### 37. `src/features/ai/components/composables/useAIProviders.ts`
```typescript
Tests Needed:
- Provider management
- Switching
- Configuration
```

##### 38. `src/features/ai/components/composables/useAIGeneration.ts`
```typescript
Tests Needed:
- Text generation
- Streaming
- Cancellation
```

##### 39. `src/features/ai/components/composables/useConversationManager.ts`
```typescript
Tests Needed:
- Conversation state
- Message handling
- History
```

##### 40. `src/features/ai/components/composables/useConversation.ts`
```typescript
Tests Needed:
- Conversation operations
- Message flow
```

##### 41. `src/features/ai/components/composables/useStreamingMode.ts`
```typescript
Tests Needed:
- Stream handling
- Chunk processing
- Completion detection
```

##### 42. `src/features/ai/components/composables/useChatHistory.ts`
```typescript
Tests Needed:
- History storage
- Retrieval
- Search
```

##### 43. `src/features/ai/components/composables/useMentions.ts`
```typescript
Tests Needed:
- Mention detection
- Suggestions
- Insertion
```

##### 44. `src/features/ai/components/composables/useAIRequest.ts`
```typescript
Tests Needed:
- Request building
- Sending
- Response handling
```

##### 45. `src/features/ai/components/composables/useAIErrorHandling.ts`
```typescript
Tests Needed:
- Error detection
- Error messages
- Recovery suggestions
```

#### Jupyter Composables (2 composables)

##### 46. `src/features/jupyter/composables/useJupyterServers.ts`
```typescript
Tests Needed:
- Server management
- Connection
- Configuration
```

##### 47. `src/features/jupyter/composables/useJupyterSessions.ts`
```typescript
Tests Needed:
- Session management
- Kernel association
- Cleanup
```

#### Settings Composables

##### 48. `src/features/settings/components/ai/composables/useProviderSettings.ts`
```typescript
Tests Needed:
- Provider configuration
- Validation
- Save/load
```

#### BashHub Composables (2 composables)

##### 49. `src/features/bashhub/composables/useHomePreferences.ts`
```typescript
Tests Needed:
- Preference management
- Persistence
```

##### 50. `src/features/bashhub/composables/useNewsletter.ts`
```typescript
Tests Needed:
- Subscription
- Unsubscription
- Validation
```

#### Executable Code Block Composables (8 composables)

##### 51-58. `src/features/editor/components/blocks/executable-code-block/composables/*`
```typescript
Files Needing Tests:
- useCodeBlockCore.ts
- useCodeBlockExecutionSimplified.ts
- core/useCodeExecution.ts
- ui/useCodeBlockUI.ts
- ui/useCodeBlockShortcuts.ts
- ui/useFullscreenCode.ts
- features/useCodeTemplates.ts
- features/useCodeFormatting.ts
- ai/composables/useAIChat.ts
- ai/composables/useAIActions.ts
```

#### Other Block Composables

##### 59-62. Table Block Composables
```typescript
- src/features/editor/components/blocks/table-block/composables/useTableOperations.ts
```

##### 63-66. Pipeline Composables
```typescript
- src/features/editor/components/blocks/pipeline/composables/usePipelineFlow.ts
- src/features/editor/components/blocks/pipeline/composables/usePipelineViewport.ts
- src/features/editor/components/blocks/pipeline/composables/usePipelineFullscreen.ts
- src/features/editor/components/blocks/pipeline/composables/usePipelineNodes.ts
```

---

## Stores Without Tests

**ALL 19 stores need tests (0% coverage)**

### Priority: CRITICAL 🔴

#### 1. `src/stores/settingsStore.ts`
```typescript
Tests Needed:
- Settings CRUD
- Persistence
- Validation
- Migration
- Reset
- Export/import
```

#### 2. `src/features/auth/stores/auth.ts`
```typescript
Tests Needed:
- Login state
- User state
- Session management
- Token handling
- Logout
```

#### 3. `src/features/nota/stores/nota.ts`
```typescript
Tests Needed:
- Nota CRUD
- State management
- Filtering
- Sorting
- Favorites
- Batch operations
```

#### 4. `src/features/editor/stores/codeExecutionStore.ts`
```typescript
Tests Needed:
- Execution state
- Cell management
- Output storage
- Queue management
```

### Priority: HIGH 🟡

#### 5. `src/stores/layoutStore.ts`
```typescript
Tests Needed:
- Layout state
- Pane management
- Split view
- Resize
```

#### 6. `src/stores/tabsStore.ts`
```typescript
Tests Needed:
- Tab operations
- Active tab
- Tab history
```

#### 7. `src/stores/sidebarStore.ts`
```typescript
Tests Needed:
- Sidebar state
- Toggle
- Pin
- Active sidebar
```

#### 8. `src/stores/uiStore.ts`
```typescript
Tests Needed:
- UI state
- Modals
- Dialogs
- Toast notifications
```

#### 9. `src/stores/shortcutsStore.ts`
```typescript
Tests Needed:
- Shortcut registration
- Execution
- Conflicts
- Customization
```

#### 10. `src/features/ai/stores/aiConversationStore.ts`
```typescript
Tests Needed:
- Conversation state
- Messages
- History
```

#### 11. `src/features/ai/stores/aiActionsStore.ts`
```typescript
Tests Needed:
- Action management
- Custom actions
- Execution
```

#### 12. `src/features/ai/stores/aiSettingsStore.ts`
```typescript
Tests Needed:
- Provider settings
- Model settings
- Defaults
```

#### 13. `src/features/jupyter/stores/jupyterStore.ts`
```typescript
Tests Needed:
- Server state
- Kernel state
- Session state
```

#### 14. `src/features/nota/stores/blockStore.ts`
```typescript
Tests Needed:
- Block CRUD
- Block ordering
- Block relationships
```

#### 15. `src/features/nota/stores/favoriteBlocksStore.ts`
```typescript
Tests Needed:
- Favorite operations
- Persistence
```

#### 16. `src/features/editor/stores/editorStore.ts`
```typescript
Tests Needed:
- Editor state
- Content
- Selection
```

#### 17. `src/features/editor/stores/aiActionsStore.ts`
```typescript
Tests Needed:
- AI action state
- Execution tracking
```

#### 18. `src/features/editor/stores/tableStore.ts`
```typescript
Tests Needed:
- Table state
- Cell data
- Operations
```

#### 19. `src/features/editor/stores/citationStore.ts`
```typescript
Tests Needed:
- Citation management
- Bibliography
```

---

## Utils Without Tests

### With Tests ✅
- randomTitleGenerator.ts ✅
- dateUtils.ts ✅
- userTagGenerator.ts ✅

### Without Tests ❌

#### 1. `src/features/editor/utils/jupyterErrorParser.ts`
```typescript
Tests Needed:
- Error parsing
- Stack trace extraction
- Error categorization
```

---

## Component Tests Needed

### Critical Components (Need Integration Tests)

#### Editor Components
1. `src/features/editor/components/ui/UnifiedToolbar.vue`
2. `src/features/editor/components/ui/EditorToolbar.vue`
3. `src/features/editor/components/ui/BlockCommandMenu.vue`
4. `src/features/editor/components/ui/TableOfContents.vue`

#### Block Components (13 blocks)
5. `src/features/editor/components/blocks/executable-code-block/ExecutableCodeBlock.vue`
6. `src/features/editor/components/blocks/table-block/TableBlock.vue`
7. `src/features/editor/components/blocks/math-block/MathBlock.vue`
8. `src/features/editor/components/blocks/pipeline/PipelineBlock.vue`
9-17. Other block components

#### Nota Components
18. `src/features/nota/components/NotaTable.vue`
19. `src/features/nota/components/NotaTree.vue`
20. `src/features/nota/components/AppSidebar.vue`
21. `src/features/nota/components/AppTabs.vue`
22. `src/features/nota/components/SearchModal.vue`

#### AI Components
23. `src/features/ai/components/AIAssistantSidebarContent.vue`
24. `src/features/ai/components/components/ChatList.vue`
25. `src/features/ai/components/components/ConversationInput.vue`

#### Settings Components
26. `src/features/settings/components/SettingsPanel.vue`
27. `src/features/settings/components/ai/UnifiedAISettings.vue`
28. `src/features/settings/components/appearance/UnifiedAppearanceSettings.vue`

---

## Integration Tests Needed

### Feature Integration Tests

1. **Nota Creation Flow**
   - Create → Edit → Save → Load

2. **Code Execution Flow**
   - Write code → Execute → View output → Clear

3. **AI Assistant Flow**
   - Open assistant → Send message → Receive response

4. **Authentication Flow**
   - Register → Login → Use app → Logout

5. **Search Flow**
   - Enter search → Filter → Sort → Open result

6. **Settings Flow**
   - Change setting → Save → Reload → Verify persistence

---

## E2E Tests Needed

### Critical User Journeys

1. **New User Onboarding**
   - Register → Create first nota → Add content → Save

2. **Code Execution Workflow**
   - Open nota → Add code block → Configure Jupyter → Execute → View output

3. **Collaboration Workflow** (when implemented)
   - Share nota → Collaborator edits → See changes

4. **Export Workflow**
   - Create nota → Add content → Export to PDF

---

## Test Implementation Priority

### Week 1-2: Critical Services
- firebase.ts
- auth.ts
- aiService.ts
- jupyterService.ts
- codeExecutionService.ts

### Week 3-4: Critical Composables
- useSettings.ts
- useSidebarManager.ts
- useNotaActions.ts
- useCodeExecution.ts

### Week 5-6: All Stores
- 19 stores (all need tests)

### Week 7-8: High Priority Services
- AI provider services
- Nota services
- Editor services

### Week 9-10: High Priority Composables
- Nota composables
- Editor composables
- AI composables

### Week 11-12: Component Tests
- Critical components
- Block components

### Week 13-14: Integration & E2E
- Feature integration tests
- User journey E2E tests

---

## Testing Standards

### Unit Test Requirements
```typescript
// Every function/method should test:
1. Happy path
2. Error scenarios
3. Edge cases
4. Null/undefined handling
5. Type validation (where applicable)
```

### Store Test Requirements
```typescript
// Every store should test:
1. Initial state
2. All actions/mutations
3. All getters
4. Side effects
5. Persistence (if applicable)
```

### Composable Test Requirements
```typescript
// Every composable should test:
1. Initialization
2. Reactive updates
3. Side effects
4. Cleanup
5. Error handling
```

### Component Test Requirements
```typescript
// Every component should test:
1. Rendering
2. Props handling
3. Events emission
4. User interactions
5. Conditional rendering
6. Accessibility
```

---

## Test Coverage Goals

### Short Term (3 months)
- Services: 80%
- Stores: 100%
- Critical Composables: 80%
- Utils: 100%

### Medium Term (6 months)
- All Composables: 80%
- Critical Components: 60%
- Integration Tests: Basic coverage

### Long Term (12 months)
- Overall Coverage: 80%
- All Components: 60%
- E2E Tests: Critical paths
- Performance Tests: Key operations

---

## Metrics

**Current State:**
- Total Files: 664
- Files With Tests: 11
- Coverage: 1.7%

**Target State (6 months):**
- Files With Tests: 200+
- Coverage: 50%+

**Target State (12 months):**
- Files With Tests: 400+
- Coverage: 80%+

---

**Last Updated:** December 2024
**Based on:** Complete analysis of all 664 source files
