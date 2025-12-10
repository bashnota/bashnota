# UX/UI Improvements Needed - BashNota

> **Based on actual codebase analysis as of December 2024**
> 
> This document outlines UX/UI improvements needed across BashNota's 449 Vue components and 215 TypeScript files.

## Table of Contents
1. [AI Features](#ai-features)
2. [Editor & Code Execution](#editor--code-execution)
3. [Nota Management](#nota-management)
4. [Settings System](#settings-system)
5. [Navigation & Layout](#navigation--layout)
6. [Block System](#block-system)
7. [Jupyter Integration](#jupyter-integration)
8. [Search & Discovery](#search--discovery)
9. [Authentication & User Management](#authentication--user-management)
10. [Mobile & Accessibility](#mobile--accessibility)

---

## AI Features

### AI Assistant Sidebar (`src/features/ai/components/`)
**Current State:**
- Multiple AI providers: Gemini, Ollama, WebLLM
- Conversation history with streaming responses
- Message components with action bar

**Issues:**
1. No loading skeleton during AI response generation
2. Limited error recovery options when streaming fails
3. Conversation search is missing
4. No way to pin important conversations
5. Image preview missing before upload
6. Token usage not displayed for API providers
7. No conversation export functionality

**Improvements Needed:**
```
Priority: HIGH
- Add loading skeletons for AI responses
- Implement conversation search in ConversationHistory.vue
- Add pin/favorite functionality for conversations
- Show image previews before sending in ConversationInput.vue
- Display token usage indicator (integrate with provider settings)
- Add export conversation feature (MD, JSON, PDF)
- Implement better retry mechanism with exponential backoff
```

### AI Context Menu Actions (`src/features/editor/components/ui/BlockCommandMenu.vue`)
**Current State:**
- Dynamic AI actions from store
- Custom action creation supported
- Icon and color customization

**Issues:**
1. Actions displayed in flat list without categorization
2. No visual feedback during AI processing
3. Cannot preview changes before applying
4. No AI-specific undo/redo
5. Action execution history not tracked

**Improvements Needed:**
```
Priority: MEDIUM
- Group actions by category in BlockCommandMenu.vue
- Add inline loading indicator during AI processing
- Implement preview dialog with accept/reject
- Add AI-specific undo/redo stack in aiActionsStore.ts
- Track action execution history
- Show estimated processing time per action
```

### AI Provider Configuration (`src/features/settings/components/ai/`)
**Current State:**
- UnifiedAISettings.vue with tabbed interface
- AIProviderCard.vue for visual provider management
- Model-specific settings for each provider

**Issues:**
1. API key validation is not real-time
2. Connection test needs implementation in provider cards
3. Error messages too technical for beginners
4. Model selection overwhelming for new users
5. No provider status dashboard

**Improvements Needed:**
```
Priority: HIGH
- Add real-time API key validation in AIProviderCard.vue
- Implement "Test Connection" button per provider
- Simplify error messages in useAIErrorHandling.ts
- Add "Recommended Models" section for beginners
- Create provider status dashboard showing connection state
- Add provider capabilities indicator (streaming, function calling, etc.)
```

---

## Editor & Code Execution

### TipTap Editor (`src/features/editor/`)
**Current State:**
- Rich text editing with TipTap
- Custom blocks: 13 block types (executable-code, math, table, theorem, etc.)
- Block-based database system (README-BLOCK-INTEGRATION.md)
- UnifiedToolbar.vue and EditorToolbar.vue

**Issues:**
1. Toolbar icons lack keyboard shortcut tooltips
2. No floating bubble menu for text selection
3. Table editing cumbersome (in table-block/)
4. No split-screen markdown preview mode
5. Limited editor appearance customization
6. No distraction-free writing mode

**Improvements Needed:**
```
Priority: HIGH
- Add keyboard shortcut tooltips to all toolbar buttons
- Implement floating bubble menu for text selection
- Enhance table-block/components/ with better cell controls
- Add live markdown preview mode (split screen)
- Allow font family customization in settings
- Implement focus/distraction-free mode
- Add collaborative cursor indicators (future)
```

### Executable Code Blocks (`src/features/editor/components/blocks/executable-code-block/`)
**Current State:**
- CodeBlockWithExecution.vue as modular component
- ExecutableCodeBlock.vue as TipTap wrapper
- Recent fixes: EXECUTION_FIX.md, OUTPUT_PERSISTENCE_FIX.md
- Robust execution with auto-discovery
- Enhanced output management

**Issues:**
1. No progress bar for long-running executions
2. Output sections not collapsible
3. Cannot clear all outputs at once
4. Error messages not syntax-highlighted
5. No export results functionality
6. Execution queue not visualized

**Improvements Needed:**
```
Priority: HIGH
- Add progress bar in ExecutionStatus.vue
- Make OutputDisplay.vue collapsible/expandable
- Add "Clear All Outputs" in CodeBlockToolbar.vue
- Syntax-highlight errors in ErrorDisplay.vue
- Add export results (CSV, JSON) in OutputDisplay.vue
- Visualize execution queue in codeExecutionStore.ts
- Display execution time and memory usage
```

### Block System (`src/features/editor/components/blocks/`)
**Block Types:**
- citation-block
- confusion-matrix
- executable-code-block
- math-block
- nota-config
- nota-title
- pipeline
- sub-nota-block
- subfigure-block
- table-block
- theorem-block
- youtube-block

**Issues:**
1. Block handles not obvious to new users
2. Minimal drag-and-drop feedback
3. No bulk operations on blocks
4. Cannot collapse sections
5. No visual hierarchy for nested content
6. No block templates/snippets system

**Improvements Needed:**
```
Priority: MEDIUM
- Add onboarding tour highlighting block features
- Improve drag-and-drop with ghost images
- Implement multi-select in blockStore.ts
- Add collapsible sections/chapters
- Show visual indentation for nested blocks
- Create block templates system
- Implement block versioning in blockStore.ts
```

### Math & Diagrams
**Current State:**
- math-block/ with LaTeX support
- useMathJax.ts composable
- useEquationCounter.ts for numbering

**Issues:**
1. LaTeX editor lacks syntax highlighting
2. Mermaid diagrams no live preview during edit
3. Equation numbering not fully implemented
4. Cannot reference equations easily
5. Limited diagram customization

**Improvements Needed:**
```
Priority: MEDIUM
- Add LaTeX syntax highlighting in math-block
- Implement live Mermaid preview
- Complete equation numbering system
- Add cross-reference system for equations
- Provide diagram templates and themes
- Add export options (SVG, PNG) for diagrams
```

---

## Nota Management

### Nota List & Tree View (`src/features/nota/components/`)
**Current State:**
- NotaTree.vue for hierarchical view
- NotaTable.vue for list view
- NotaBreadcrumb.vue for navigation
- SearchInput.vue and SearchModal.vue

**Issues:**
1. Tree view lacks depth indicators
2. No bulk operations (delete, tag, move)
3. Search results not highlighted
4. No nota preview on hover
5. Limited sorting options
6. Cannot group by custom criteria

**Improvements Needed:**
```
Priority: HIGH
- Add indentation lines in NotaTree.vue
- Implement multi-select in useNotaSelection.ts
- Highlight search terms in SearchModal.vue
- Add hover preview in NotaTable.vue
- Expand sorting in useNotaSorting.ts
- Allow custom grouping in useNotaFilters.ts
- Add drag-and-drop reorganization
- Show statistics (word count, blocks) per nota
```

### Tabs System (`src/features/nota/components/AppTabs.vue`)
**Current State:**
- Tab management with layoutStore
- PaneTabs.vue for pane-specific tabs
- Split view support

**Issues:**
1. No drag-and-drop tab reordering
2. Cannot pin tabs
3. No tab groups/workspaces
4. Tab overflow handling not intuitive
5. Cannot see full title on narrow tabs

**Improvements Needed:**
```
Priority: MEDIUM
- Enable drag-and-drop in AppTabs.vue
- Add pin/unpin in tabsStore.ts
- Implement tab groups/workspaces
- Better overflow with dropdown menu
- Show full title on hover
- Add "Close Others" and "Close All"
- Implement tab history (recently closed)
- Save tab state in layoutStore.ts
```

### Favorites & Blocks (`src/features/nota/stores/favoriteBlocksStore.ts`)
**Current State:**
- FavoriteBlocksSidebarContent.vue
- favoriteBlocksStore.ts for state management
- FavoritesView.vue

**Issues:**
1. Favorites lack organization (no folders)
2. Cannot add from favorites view
3. No visual distinction between types
4. Cannot share collections

**Improvements Needed:**
```
Priority: LOW
- Add folders/categories in favoriteBlocksStore.ts
- Enable favoriting from FavoritesView.vue
- Use icons/colors to distinguish types
- Implement shareable collections
- Add favorite templates
- Show usage statistics
```

### Metadata & Properties (`src/features/nota/components/MetadataSidebarContent.vue`)
**Current State:**
- Metadata sidebar with properties
- useNotaMetadata.ts composable
- Tag filtering with TagFilter.vue

**Issues:**
1. Metadata editing hidden in sidebar
2. No custom properties/fields
3. Tags lack color coding
4. Cannot bulk edit metadata
5. No metadata templates

**Improvements Needed:**
```
Priority: MEDIUM
- Make metadata more discoverable
- Add custom property fields in useNotaMetadata.ts
- Add color coding to TagFilter.vue
- Implement bulk editing in useNotaBatchActions.ts
- Create metadata templates
- Add validation rules
- Show metadata history
```

---

## Settings System

### Settings Architecture (`src/features/settings/`)
**Current State (SETTINGS_REFACTOR_COMPLETION.md):**
- ✅ UnifiedAISettings.vue (completed)
- ✅ UnifiedAppearanceSettings.vue (completed)
- ✅ UnifiedEditorSettings.vue (completed)
- ✅ SettingsCommandPalette.vue (completed)
- ✅ Base components (SettingItem, SettingSwitch, etc.)
- settingsStore.ts with unified state management

**Remaining Issues:**
1. Integration settings not unified
2. Keyboard shortcuts not unified
3. Advanced settings not unified
4. Some legacy components still in use

**Improvements Needed:**
```
Priority: MEDIUM
- Create UnifiedIntegrationSettings.vue
- Create UnifiedKeyboardSettings.vue
- Create UnifiedAdvancedSettings.vue
- Migrate remaining legacy components
- Add settings profiles
- Implement settings export/import in settingsStore.ts
```

### Settings UX (`src/features/settings/components/SettingsPanel.vue`)
**Current State:**
- Modern tabbed interface
- Command palette with Cmd/Ctrl+K
- Search functionality
- Badges for recommended vs legacy

**Issues:**
1. No live preview for visual settings
2. Cannot reset individual settings easily
3. Settings requiring restart not indicated
4. No quick settings panel
5. Mobile view cramped

**Improvements Needed:**
```
Priority: LOW
- Add live preview for themes
- Add reset button per setting
- Show restart requirement indicators
- Create quick settings dropdown
- Improve mobile layout in SettingsPanel.vue
- Add settings profiles system
```

---

## Navigation & Layout

### Sidebar System (`src/ui/sidebars/`, `src/components/`)
**Current State:**
- BaseSidebar.vue base component
- MenubarSidebars.vue for menubar integration
- PinnedSidebars.vue for pinned state
- RightSidebarContainer.vue
- sidebarStore.ts for state

**Issues:**
1. Left sidebar toggle not persistent
2. Right sidebar no resize
3. No keyboard shortcuts documented
4. Multiple sidebars confusing
5. Pinned state not saved

**Improvements Needed:**
```
Priority: HIGH
- Save sidebar state in sidebarStore.ts
- Add resize handles to all sidebars
- Document keyboard shortcuts
- Add focus mode (hide all sidebars)
- Persist pinned state
- Add sidebar stacking
- Implement sidebar search
```

### Split View (`src/features/nota/components/SplitViewContainer.vue`)
**Current State:**
- SplitNotaView.vue with split support
- layoutStore.ts manages panes
- Split resizable with handles

**Issues:**
1. Cannot have more than 2 panes
2. Split ratio not saved
3. No maximize pane temporarily
4. Cannot change orientation
5. No pane focus indicator

**Improvements Needed:**
```
Priority: MEDIUM
- Support 3+ panes in grid
- Save ratios in layoutStore.ts
- Add maximize/restore in SplitViewContainer.vue
- Allow horizontal/vertical splits
- Add clear focus indicators
- Implement pane navigation shortcuts
- Add pane sync options
```

### Command Palette (`src/features/settings/components/SettingsCommandPalette.vue`)
**Current State:**
- Settings command palette implemented
- Keyboard shortcuts (Cmd/Ctrl+K)
- Grouped results

**Issues:**
1. Limited to settings only
2. No global command palette
3. Search not fuzzy
4. Cannot execute with arguments
5. No recent commands

**Improvements Needed:**
```
Priority: HIGH
- Create global command palette (all actions)
- Implement fuzzy search
- Show recently used commands
- Support command arguments
- Display shortcuts in palette
- Add command categories
- Save command history
```

---

## Block System

### Block Types Status
**Implemented (13 types):**
1. ✅ executable-code-block (recently fixed)
2. ✅ math-block
3. ✅ table-block (with layouts)
4. ✅ theorem-block
5. ✅ citation-block
6. ✅ confusion-matrix
7. ✅ youtube-block
8. ✅ sub-nota-block
9. ✅ subfigure-block
10. ✅ nota-config
11. ✅ nota-title
12. ✅ pipeline
13. ✅ Plus TipTap built-in blocks

**Missing Block Types:**
1. ❌ Audio block
2. ❌ Video block (beyond YouTube)
3. ❌ PDF embed block
4. ❌ Drawing/whiteboard block
5. ❌ Gantt chart block
6. ❌ Mind map block
7. ❌ Timeline block
8. ❌ Kanban board block

**Improvements Needed:**
```
Priority: LOW
- Add missing block types
- Create block marketplace/library
- Implement block versioning
- Add block documentation
- Create block testing framework
```

---

## Jupyter Integration

### Server Management (`src/features/jupyter/`)
**Current State:**
- jupyterService.ts for API
- JupyterServersSidebarContent.vue
- ServerInfo.vue and ServerItem.vue
- useJupyterServers.ts composable

**Issues:**
1. Adding servers requires technical knowledge
2. No server status indicators
3. Cannot test before adding
4. Technical error messages

**Improvements Needed:**
```
Priority: MEDIUM
- Add setup wizard in JupyterServersSidebarContent.vue
- Show status indicators in ServerItem.vue
- Implement connection testing
- User-friendly errors in jupyterService.ts
- Add server presets
- Show capabilities
- Health monitoring
```

### Kernel & Session Management
**Current State:**
- KernelsList.vue
- SessionsList.vue
- KernelLanguageBadge.vue
- jupyterStore.ts

**Issues:**
1. Kernel selection not intuitive
2. No kernel status indication
3. Cannot see available kernels easily
4. No restart confirmation
5. Session cleanup needed

**Improvements Needed:**
```
Priority: MEDIUM
- Improve KernelsList.vue UI
- Add status to KernelLanguageBadge.vue
- Better kernel dropdown
- Add restart confirmation
- Implement session cleanup in jupyterStore.ts
- Show resource usage
- Add session history
```

---

## Search & Discovery

### Search System (`src/features/nota/components/SearchModal.vue`)
**Current State:**
- SearchInput.vue
- SearchModal.vue
- Basic search functionality

**Issues:**
1. Search not instant/real-time
2. Cannot filter by block type
3. No advanced operators
4. Results lack context
5. Cannot search code blocks
6. No history

**Improvements Needed:**
```
Priority: HIGH
- Implement instant search with debounce
- Add block type filters
- Support operators (AND, OR, NOT)
- Show context snippets in SearchModal.vue
- Enable code block search
- Save search history
- Add autocomplete
- Implement saved searches
```

### BashHub Discovery (`src/features/bashhub/`)
**Current State:**
- HomeView.vue
- UserPublishedView.vue
- HomeNotaList.vue
- statisticsService.ts

**Issues:**
1. No recommendations
2. Cannot discover related content
3. No trending content
4. Limited integration

**Improvements Needed:**
```
Priority: LOW
- Add recommendations in HomeView.vue
- Implement "Related Notas"
- Show trending in HomeNotaList.vue
- Better BashHub integration
- Add "People to Follow"
- Tag-based discovery
- Show similar notas
```

---

## Authentication & User Management

### Auth System (`src/features/auth/`)
**Current State:**
- LoginView.vue
- RegisterView.vue
- ProfileView.vue
- auth.ts service and store

**Issues:**
1. No social login
2. Password requirements unclear
3. Generic error messages
4. No "remember me"
5. Cannot see password

**Improvements Needed:**
```
Priority: MEDIUM
- Add social auth in auth.ts
- Show password requirements in RegisterView.vue
- Specific errors in LoginView.vue
- Add "remember me"
- Password visibility toggle
- Progressive disclosure in signup
- Email verification status
- Password strength meter
```

### User Profile (`src/features/auth/views/ProfileView.vue`)
**Current State:**
- Basic profile editing
- User tag system (userTagGenerator.ts)

**Issues:**
1. Profile page basic
2. Cannot customize user tag
3. No activity history
4. Limited customization

**Improvements Needed:**
```
Priority: LOW
- Comprehensive profile editor
- Allow custom user tag in ProfileView.vue
- Show activity history
- Add profile picture upload
- Bio and social links
- User statistics
- Privacy settings
- Public profile page
```

---

## Mobile & Accessibility

### Mobile Responsiveness
**Current State:**
- Tailwind responsive classes
- Some mobile optimization

**Issues:**
1. Sidebars not mobile-optimized
2. Touch targets too small
3. No mobile navigation
4. Editor toolbar cramped
5. Cannot access all features

**Improvements Needed:**
```
Priority: HIGH
- Redesign sidebars with drawer pattern
- Increase touch targets (44px minimum)
- Add bottom navigation for mobile
- Mobile toolbar in EditorToolbar.vue
- Ensure feature parity
- Swipe gestures
- Pull-to-refresh
```

### Accessibility
**Current State:**
- Some ARIA labels
- Basic keyboard navigation

**Issues:**
1. Not all elements keyboard accessible
2. Tab order inconsistent
3. No skip navigation
4. Focus indicators weak
5. Cannot access via keyboard only

**Improvements Needed:**
```
Priority: HIGH
- Full keyboard accessibility
- Fix tab order app-wide
- Add skip navigation links
- Clear focus indicators
- Keyboard shortcuts for all actions
- Arrow key navigation
- Keyboard navigation guide
```

### Screen Reader Support
**Issues:**
1. Missing ARIA labels
2. Landmarks not defined
3. Dynamic changes not announced
4. Alt text missing
5. Complex interactions inaccessible

**Improvements Needed:**
```
Priority: HIGH
- Add comprehensive ARIA labels
- Define landmark regions
- Announce dynamic changes
- Add alt text to all images
- Make all interactions accessible
- Add live regions
- Test with screen readers (NVDA, JAWS, VoiceOver)
```

---

## Cross-Cutting Concerns

### Loading States
**Issues:**
1. Inconsistent loading indicators
2. No skeleton screens
3. Long operations lack progress
4. Cannot cancel operations

**Improvements Needed:**
```
Priority: MEDIUM
- Standardize loading indicators
- Skeleton screens for all views
- Progress bars for long operations
- Enable cancellation
- Show estimated time
- Optimistic UI updates
```

### Error Handling
**Issues:**
1. Generic error messages
2. No recovery options
3. Errors can crash UI
4. No reporting mechanism

**Improvements Needed:**
```
Priority: HIGH
- Specific, actionable errors
- Recovery options
- Error boundaries
- User-facing error reporting
- Debug mode with details
- Error logging
- Retry mechanisms
```

### Performance
**Issues:**
1. Large notas load slowly
2. Search can be sluggish
3. Editor lag with many blocks
4. Memory leaks over time

**Improvements Needed:**
```
Priority: HIGH
- Virtual scrolling for lists
- Optimize search with indexing
- Lazy load editor blocks
- Fix memory leaks
- Code splitting
- Performance monitoring
- Bundle optimization
```

---

## Priority Matrix

### Critical (Must Fix)
1. Mobile responsiveness
2. Accessibility improvements
3. Error handling standardization
4. Performance optimization
5. Search improvements

### High Priority (Important)
1. AI features UX improvements
2. Code execution enhancements
3. Nota management improvements
4. Sidebar system fixes
5. Command palette expansion

### Medium Priority (Nice to Have)
1. Settings system completion
2. Jupyter integration improvements
3. Block system enhancements
4. Split view improvements
5. Metadata system

### Low Priority (Future)
1. New block types
2. BashHub discovery
3. Advanced customization
4. Collaboration features
5. Third-party integrations

---

## Implementation Notes

- All improvements should be implemented incrementally
- User testing required for major UX changes
- A11y must be built in from start
- Mobile-first approach for new features
- Performance budgets must be established
- Analytics should track feature usage
- Documentation must be updated alongside code

**Total Components Analyzed:** 449 Vue + 215 TS files
**Documentation Generated:** December 2024
**Based on:** Actual codebase structure and recent fixes
