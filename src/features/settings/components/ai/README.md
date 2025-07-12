# AI Settings Components

This directory contains comprehensive settings components for AI-powered features in the application.

## Components

### AICodeActionsSettings.vue

A complete settings interface for managing AI code actions, including:

- **Provider Configuration**: Select and configure AI providers
- **Feature Toggles**: Enable/disable specific AI features
- **Custom Actions Management**: Create, edit, and organize custom AI actions
- **Advanced Settings**: Debug information and storage management

## Features

### 🎯 Comprehensive Configuration
- AI provider selection with availability checking
- Generation parameters (max tokens, temperature)
- Feature-specific toggles
- Error handling configuration

### 🔧 Custom Actions Management
- Create custom AI actions with template prompts
- Organize actions by category (Analysis, Transformation, Generation, Debugging)
- Support for different output types (text, code, markdown)
- Built-in action management and testing

### 📊 Advanced Features
- Import/Export functionality for custom actions
- Action testing with sample code
- Real-time settings validation
- Debug information display

### 💾 Data Management
- Automatic settings persistence
- Backup and restore functionality
- Reset to defaults option
- Safe action deletion with confirmation

## Integration

### Adding to Main Settings

To integrate this component into your main settings system:

```vue
<script setup lang="ts">
import { AICodeActionsSettings } from '@/features/settings/components/ai'
</script>

<template>
  <div class="settings-container">
    <!-- Other settings sections -->
    
    <!-- AI Settings Section -->
    <AICodeActionsSettings />
    
    <!-- More settings sections -->
  </div>
</template>
```

### Route Integration

Add to your settings router:

```typescript
{
  path: '/settings/ai',
  name: 'AISettings',
  component: () => import('@/features/settings/components/ai/AICodeActionsSettings.vue')
}
```

### Navigation Menu

Add to your settings navigation:

```vue
<template>
  <nav class="settings-nav">
    <router-link to="/settings/general">General</router-link>
    <router-link to="/settings/ai">AI & Code Actions</router-link>
    <router-link to="/settings/appearance">Appearance</router-link>
  </nav>
</template>
```

## Component Props

The `AICodeActionsSettings` component is self-contained and doesn't require any props. It manages its own state through the `useAIActionsStore` store.

## Store Integration

The component integrates with the `aiActionsStore` which manages:
- Provider settings
- Custom actions
- Error trigger configuration
- Feature toggles

## Styling

The component uses the application's design system components:
- Cards for section organization
- Tabs for different setting categories
- Dialogs for action creation/editing
- Consistent spacing and typography

## Customization

### Theme Integration

The component automatically adapts to your application's theme:
- Dark/light mode support
- Consistent color palette
- Responsive design

### Feature Flags

You can conditionally show/hide features:

```vue
<template>
  <AICodeActionsSettings v-if="features.aiEnabled" />
</template>
```

## Events

The component emits these events for integration:
- Settings changes are automatically persisted
- No manual event handling required

## Best Practices

### User Experience
1. **Progressive Disclosure**: Advanced settings are in separate tabs
2. **Clear Feedback**: Visual indicators for save status and validation
3. **Safe Defaults**: Sensible default values for all settings
4. **Confirmation Dialogs**: For destructive actions like deletions

### Performance
1. **Lazy Loading**: Heavy operations are debounced
2. **Efficient Updates**: Only changed settings are saved
3. **Provider Checking**: Cached availability checks

### Accessibility
1. **Keyboard Navigation**: Full keyboard support
2. **Screen Reader Support**: Proper ARIA labels
3. **Focus Management**: Logical tab order

## Testing

### Unit Tests
```typescript
// Test provider selection
it('should update provider setting', () => {
  // Test implementation
})

// Test custom action creation
it('should create custom action', () => {
  // Test implementation
})
```

### Integration Tests
```typescript
// Test settings persistence
it('should save and load settings', () => {
  // Test implementation
})
```

## Future Enhancements

### Planned Features
- Action templates marketplace
- Collaborative action sharing
- Advanced prompt engineering tools
- Usage analytics and insights

### Extension Points
- Plugin system for custom AI providers
- Action validation and testing framework
- Advanced prompt debugging tools

## Troubleshooting

### Common Issues

**Settings not saving:**
- Check browser localStorage availability
- Verify store initialization

**Provider not available:**
- Check API key configuration
- Verify network connectivity

**Custom actions not working:**
- Validate prompt template syntax
- Check AI provider limits

### Debug Mode

Enable debug mode for troubleshooting:
```typescript
const DEBUG_AI_SETTINGS = true
```

This will show additional debug information in the console and UI. 