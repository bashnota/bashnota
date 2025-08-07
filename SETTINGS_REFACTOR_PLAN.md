# Settings Component Refactor Plan

## Current Issues Identified

### 1. **Code Duplication & Inconsistency**

#### **localStorage Management**
- Every settings component has duplicate `loadSettings()` and `saveSettings()` functions
- Different localStorage key naming patterns: `'editor-settings'`, `'theme-settings'`, `'code-editor-settings'`, etc.
- Inconsistent error handling for localStorage operations
- No type safety for stored settings

#### **State Management**
- Mix of local reactive state vs store-based state (AI settings use store, others use local state)
- Inconsistent pattern for reactive updates
- Duplicate reset functionality across components
- No unified validation or schema enforcement

#### **UI Patterns**
- Repetitive Card/CardHeader/CardContent structure
- Similar Switch, Button, Input layouts across components
- Inconsistent spacing and styling
- Manual event dispatching for settings changes

### 2. **Architecture Problems**

#### **No Unified Settings Store**
- AI settings use `aiSettingsStore` but other settings use localStorage directly
- No central settings management or type definitions
- Missing settings synchronization across components
- No settings validation or migration support

#### **Component Structure**
- Large components with mixed concerns (UI + business logic)
- No reusable setting components (SettingGroup, SettingItem, etc.)
- Hardcoded configurations instead of data-driven approach

#### **Missing Abstractions**
- No shared composables for common settings operations
- No base setting component or interface
- No consistent event system for settings changes

### 3. **UX/UI Issues**

#### **shadcn/ui Underutilization**
- Not using newer shadcn components like `Tabs`, `Accordion`, `Collapsible`
- Missing consistent loading states and error handling
- No use of `Form` components for validation
- Limited use of `Tooltip` for help text

#### **Poor User Experience**
- No search within individual setting categories
- No keyboard navigation support
- Missing setting descriptions and help text
- No indication of default values or reset states

## Proposed Solutions

### Phase 1: Foundation & Infrastructure (Priority: High)

#### 1.1 Create Unified Settings Store
```typescript
// src/stores/settingsStore.ts
interface SettingsStore {
  editor: EditorSettings
  appearance: AppearanceSettings
  ai: AISettings
  keyboard: KeyboardSettings
  integrations: IntegrationSettings
  advanced: AdvancedSettings
}
```

#### 1.2 Create Base Settings Composable
```typescript
// src/composables/useSettings.ts
export function useSettings<T>(
  key: string, 
  defaultValues: T,
  schema?: ZodSchema<T>
) {
  // Unified localStorage management
  // Type-safe operations
  // Validation support
  // Event emission
}
```

#### 1.3 Create Reusable Setting Components
```typescript
// Base components for consistent UI
- SettingSection.vue
- SettingGroup.vue  
- SettingItem.vue
- SettingSwitch.vue
- SettingSlider.vue
- SettingSelect.vue
- SettingInput.vue
```

### Phase 2: Component Refactoring (Priority: High)

#### 2.1 Refactor AI Settings
- [ ] Consolidate `AIProvidersSettings`, `AIActionsSettings`, `AICodeActionsSettings`, `AIGenerationSettings`
- [ ] Use unified store pattern
- [ ] Implement proper error boundaries
- [ ] Add loading states and connection testing

#### 2.2 Refactor Editor Settings
- [ ] Merge `TextEditingSettings`, `CodeEditingSettings`, `FormattingSettings` into data-driven approach
- [ ] Use unified localStorage pattern
- [ ] Add real-time preview functionality
- [ ] Implement proper validation

#### 2.3 Refactor Appearance Settings  
- [ ] Consolidate `ThemeSettings` and `InterfaceSettings`
- [ ] Better theme color management
- [ ] Add theme preview functionality
- [ ] Implement accessibility features

### Phase 3: Enhanced UX/UI (Priority: Medium)

#### 3.1 Implement shadcn/ui Components
- [ ] Replace manual tabs with `Tabs` component
- [ ] Use `Accordion` for collapsible sections
- [ ] Implement `Form` components with validation
- [ ] Add `Tooltip` components for help text
- [ ] Use `Dialog` for complex settings modals
- [ ] Implement `Command` palette for settings search

#### 3.2 Enhanced User Experience
- [ ] Add keyboard navigation support
- [ ] Implement setting search within categories
- [ ] Add contextual help and documentation links
- [ ] Show default values and change indicators
- [ ] Add import/export settings functionality

#### 3.3 Responsive Design
- [ ] Mobile-friendly settings interface
- [ ] Collapsible sidebar on smaller screens
- [ ] Touch-friendly controls

### Phase 4: Advanced Features (Priority: Low)

#### 4.1 Settings Synchronization
- [ ] Cloud settings sync (if applicable)
- [ ] Settings versioning and migration
- [ ] Backup and restore functionality

#### 4.2 Developer Experience
- [ ] Settings schema validation
- [ ] Type-safe settings access
- [ ] Development tools for settings debugging

## Implementation Strategy

### Week 1: Foundation
1. Create unified settings store structure
2. Implement base `useSettings` composable
3. Create reusable setting UI components
4. Set up proper TypeScript types

### Week 2: AI Settings Refactor
1. Consolidate AI settings components
2. Implement proper loading/error states
3. Add connection testing functionality
4. Improve provider management UX

### Week 3: Editor & Appearance Settings
1. Refactor editor settings to use unified pattern
2. Merge appearance settings
3. Add real-time preview functionality
4. Implement proper validation

### Week 4: UX Enhancements
1. Implement shadcn/ui components
2. Add keyboard navigation
3. Implement settings search
4. Add contextual help

## Files to Modify

### New Files to Create:
```
src/stores/settingsStore.ts
src/composables/useSettings.ts
src/features/settings/components/base/
├── SettingSection.vue
├── SettingGroup.vue
├── SettingItem.vue
├── SettingSwitch.vue
├── SettingSlider.vue
├── SettingSelect.vue
└── SettingInput.vue

src/features/settings/types/
├── index.ts
├── editor.ts
├── appearance.ts
├── ai.ts
├── keyboard.ts
├── integrations.ts
└── advanced.ts

src/features/settings/schemas/
└── settings.schemas.ts (Zod schemas)
```

### Files to Refactor:
```
src/features/settings/views/SettingsView.vue
src/features/settings/components/SettingsPanel.vue

# AI Settings
src/features/settings/components/ai/AIProvidersSettings.vue
src/features/settings/components/ai/AIActionsSettings.vue
src/features/settings/components/ai/AICodeActionsSettings.vue
src/features/settings/components/ai/AIGenerationSettings.vue

# Editor Settings  
src/features/settings/components/editor/TextEditingSettings.vue
src/features/settings/components/editor/CodeEditingSettings.vue
src/features/settings/components/editor/FormattingSettings.vue

# Appearance Settings
src/features/settings/components/appearance/ThemeSettings.vue
src/features/settings/components/appearance/InterfaceSettings.vue

# Keyboard Settings
src/features/settings/components/keyboard/EditorShortcutsSettings.vue
src/features/settings/components/keyboard/NavigationShortcutsSettings.vue
src/features/settings/components/keyboard/GlobalShortcutsSettings.vue
```

## Expected Benefits

### Code Quality
- **80% reduction** in code duplication
- **Type-safe** settings management
- **Consistent** patterns across all settings
- **Better** error handling and validation

### User Experience  
- **Faster** settings loading and saving
- **Better** visual feedback and loading states
- **Consistent** UI/UX across all settings
- **Enhanced** accessibility and keyboard navigation

### Developer Experience
- **Easier** to add new settings
- **Better** debugging and development tools
- **Consistent** API for settings access
- **Improved** maintainability

## Risk Assessment

### Low Risk
- Creating reusable components
- Adding new composables
- Enhancing UI with shadcn components

### Medium Risk  
- Migrating localStorage to unified store
- Refactoring existing settings components
- Changing settings data structure

### High Risk
- Breaking changes to existing settings
- Data migration for existing users
- Performance impact of unified store

## Migration Strategy

1. **Backward Compatibility**: Ensure existing localStorage keys continue to work
2. **Gradual Migration**: Migrate one settings category at a time
3. **Data Migration**: Provide migration scripts for existing settings
4. **Feature Flags**: Use feature flags to enable new settings UI gradually
5. **Testing**: Comprehensive testing of settings persistence and migration

## Success Metrics

- [ ] Reduce settings component LOC by 60%
- [ ] Achieve 100% type safety for settings
- [ ] Zero localStorage-related bugs
- [ ] Consistent 95%+ user satisfaction with settings UX
- [ ] Sub-100ms settings load times
- [ ] Zero data loss during migration

---

This plan provides a comprehensive roadmap for refactoring the settings system to be more maintainable, consistent, and user-friendly while leveraging modern Vue.js patterns and shadcn/ui components.
