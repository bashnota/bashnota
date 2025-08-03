# Right Sidebar Migration Guide

This guide explains how to migrate existing BaseSidebar components to use the new shadcn-based RightSidebar component with resizable functionality.

## Overview

The new RightSidebar component provides:
- **Right-side positioning**: Fixed positioning on the right side of the screen
- **Resizable functionality**: Drag handle for resizing the sidebar width
- **Mobile responsive**: Full-width overlay on mobile devices
- **Keyboard shortcuts**: Built-in keyboard shortcut support
- **Persistent state**: Automatically saves open/closed state and width to localStorage
- **shadcn compatibility**: Uses shadcn design system and components

## Migration Steps

### 1. Import the new components

Replace the old imports:
```vue
// Old
import { BaseSidebar, KeyboardShortcut } from '@/ui/sidebars'
import { useSidebarComposable } from '@/composables/useSidebarComposable'

// New
import RightSidebar from '@/components/RightSidebar.vue'
```

### 2. Update the template

Replace the BaseSidebar with RightSidebar:

```vue
<!-- Old -->
<BaseSidebar 
  id="my-sidebar"
  title="My Sidebar"
  :icon="MyIcon"
  position="right" 
  @close="$emit('close')"
>
  <!-- content -->
  <KeyboardShortcut 
    ctrl
    shift
    keyName="M" 
    action="toggle my sidebar"
  />
</BaseSidebar>

<!-- New -->
<RightSidebar 
  id="my-sidebar"
  title="My Sidebar" 
  :icon="MyIcon"
  :resizable="true"
  :default-width="350"
  :min-width="300"
  :max-width="600"
  :keyboard="{
    ctrl: true,
    shift: true,
    key: 'm'
  }"
  @close="$emit('close')"
>
  <!-- content -->
  
  <template #footer>
    <div class="p-2">
      <div class="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Ctrl</kbd>
        <span>+</span>
        <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Shift</kbd>
        <span>+</span>
        <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">M</kbd>
        <span class="ml-2">toggle my sidebar</span>
      </div>
    </div>
  </template>
</RightSidebar>
```

### 3. Remove old composable usage

Remove the useSidebarComposable setup:

```vue
// Remove this
const { } = useSidebarComposable({
  id: 'my-sidebar',
  keyboard: {
    ctrl: true,
    shift: true,
    key: 'm'
  }
})
```

## RightSidebar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | *required* | Unique identifier for the sidebar |
| `title` | `string` | *required* | Title displayed in the header |
| `icon` | `Component` | `undefined` | Icon component to display in header |
| `resizable` | `boolean` | `true` | Whether the sidebar can be resized |
| `defaultWidth` | `number` | `350` | Default width in pixels |
| `minWidth` | `number` | `280` | Minimum width in pixels |
| `maxWidth` | `number` | `600` | Maximum width in pixels |
| `defaultOpen` | `boolean` | `false` | Whether sidebar is initially open |
| `keyboard` | `object` | `undefined` | Keyboard shortcut configuration |

### Keyboard Configuration

```typescript
keyboard: {
  ctrl?: boolean    // Require Ctrl key
  shift?: boolean   // Require Shift key  
  alt?: boolean     // Require Alt key
  key: string       // Key to press (e.g., 'j', 'r', 'm')
}
```

## Template Slots

| Slot | Description |
|------|-------------|
| `default` | Main content area |
| `headerActions` | Action buttons in the header (next to close button) |
| `headerSubtitle` | Subtitle area below the main header |
| `footer` | Footer area at the bottom |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | `void` | Emitted when sidebar is closed |
| `toggle` | `boolean` | Emitted when sidebar open state changes |
| `resize` | `number` | Emitted when sidebar width changes |

## Features

### Resizing
- Drag handle on the left edge of the sidebar
- Respects min/max width constraints
- Smooth resize with visual feedback
- Automatically saves width to localStorage

### Mobile Support
- Full-width overlay on mobile devices (≤768px)
- Backdrop click to close
- No resize handle on mobile

### Keyboard Shortcuts
- Built-in keyboard shortcut handling
- Prevents triggering when typing in inputs
- Configurable key combinations

### State Persistence
- Automatically saves open/closed state
- Remembers sidebar width between sessions
- Uses localStorage with sidebar ID as key

## Examples

### Basic Sidebar
```vue
<RightSidebar 
  id="basic-sidebar"
  title="Basic Sidebar"
  :keyboard="{ ctrl: true, key: 'b' }"
>
  <p>Content goes here</p>
</RightSidebar>
```

### Sidebar with Actions
```vue
<RightSidebar 
  id="advanced-sidebar"
  title="Advanced Sidebar"
  :icon="SettingsIcon"
  :default-width="400"
>
  <template #headerActions>
    <Button size="sm" variant="ghost" @click="doSomething">
      <Plus class="w-4 h-4" />
    </Button>
  </template>
  
  <template #headerSubtitle>
    <p class="text-xs text-muted-foreground">Some subtitle</p>
  </template>
  
  <!-- Main content -->
  <div class="p-4">
    Content here
  </div>
  
  <template #footer>
    <div class="p-2 border-t">
      Footer content
    </div>
  </template>
</RightSidebar>
```

## Migration Checklist

✅ **Completed Migrations:**
- [x] JupyterServersSidebar.vue
- [x] ReferencesSidebar.vue  
- [x] MetadataSidebar.vue
- [x] FavoriteBlocksSidebar.vue
- [x] AIAssistantSidebar.vue

**Migration steps completed for each sidebar:**
- [x] Replace `BaseSidebar` with `RightSidebar`
- [x] Update imports to remove `BaseSidebar`, `KeyboardShortcut`, `useSidebarComposable`
- [x] Add `RightSidebar` import
- [x] Remove `useSidebarComposable()` calls
- [x] Update keyboard shortcut configuration
- [x] Replace `KeyboardShortcut` component with footer slot
- [x] Configure resizable properties
- [x] Test keyboard shortcuts
- [x] Test resizing functionality
- [x] Test mobile responsiveness

## Summary

All right sidebars have been successfully migrated from the custom BaseSidebar to the new shadcn-based RightSidebar component. The new implementation provides:

- **Consistent positioning**: All sidebars now open on the right side with proper z-index layering
- **Resizable functionality**: Users can drag to resize sidebar width with constraints
- **Mobile responsive**: Full-width overlay on mobile devices with backdrop dismiss
- **State persistence**: Open/closed state and width are saved to localStorage
- **Better UX**: Smooth animations and proper keyboard navigation

### Benefits of the Migration

1. **Better Performance**: Uses browser-native positioning instead of custom layout calculations
2. **Consistent Behavior**: All sidebars behave identically for resizing and state management  
3. **Mobile First**: Proper mobile responsive behavior with touch-friendly interactions
4. **Accessibility**: Better keyboard navigation and screen reader support
5. **Future Proof**: Built on shadcn design system for long-term maintainability
