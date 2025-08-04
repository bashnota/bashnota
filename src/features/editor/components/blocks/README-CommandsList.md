# CommandsList Component Improvements

This document outlines the improvements made to the CommandsList component, making it more modular, maintainable, and following best practices.

## Key Improvements

### 1. **Modular Architecture**
- **`useCommandList` composable**: Extracted all command list logic into a reusable composable
- **`CommandListItem` component**: Separated individual command item rendering into its own component
- **`CommandsList` component**: Main component focused purely on layout and composition

### 2. **Shadcn/UI Integration**
- Replaced custom command palette with shadcn `Command` components
- Uses `CommandGroup`, `CommandItem`, `CommandList`, `CommandEmpty`, and `CommandSeparator`
- Proper accessibility support and keyboard navigation
- Consistent styling with the design system

### 3. **Enhanced Features**
- **Keyboard shortcuts display**: Support for showing shortcuts using `CommandShortcut`
- **Item descriptions**: Optional descriptions for command items
- **Disabled states**: Proper handling of disabled commands
- **Better empty states**: Customizable empty messages
- **Improved navigation**: More robust keyboard navigation with proper focus management

### 4. **TypeScript Improvements**
- Stronger typing with dedicated interfaces
- Better type safety throughout the component tree
- Proper event typing for mouse and keyboard events

## Component Structure

```
CommandsList/
├── CommandsList.vue          # Main container component
├── CommandListItem.vue       # Individual command item component
└── useCommandList.ts         # Logic composable
```

## Usage

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Settings, Search } from 'lucide-vue-next'
import CommandsList from '@/features/editor/components/blocks/CommandsList.vue'
import type { CommandItem } from '@/composables/useCommandList'

const commands = ref<CommandItem[]>([
  {
    title: 'Add New Item',
    icon: Plus,
    command: () => console.log('Adding new item'),
    category: 'Actions',
    shortcut: '⌘N',
    description: 'Create a new item in the current context'
  },
  {
    title: 'Open Settings',
    icon: Settings,
    command: () => console.log('Opening settings'),
    category: 'Navigation',
    shortcut: '⌘,',
  },
  {
    title: 'Search',
    icon: Search,
    command: () => console.log('Opening search'),
    category: 'Navigation',
    disabled: true
  }
])

const handleCommand = (item: CommandItem) => {
  item.command()
}
</script>

<template>
  <CommandsList
    :items="commands"
    :command="handleCommand"
    placeholder="Type a command..."
    empty-message="No commands available"
    empty-description="Try refreshing or check your permissions"
    @select="handleCommand"
  />
</template>
```

### Advanced Usage with Custom Styling

```vue
<template>
  <CommandsList
    :items="commands"
    :command="handleCommand"
    class-name="w-96" 
    max-height="400px"
    placeholder="Search commands..."
  />
</template>
```

## CommandItem Interface

```typescript
interface CommandItem {
  title: string           // Display name
  icon: any              // Vue component (e.g., lucide icons)
  command: (props: any) => void  // Function to execute
  category: string       // Group category
  shortcut?: string      // Keyboard shortcut display
  disabled?: boolean     // Whether the command is disabled
  description?: string   // Optional description text
}
```

## Props

### CommandsList Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `CommandItem[]` | `[]` | Array of command items |
| `command` | `(item: CommandItem) => void` | - | Function called when command is executed |
| `placeholder` | `string` | `"Type a command or search..."` | Placeholder text |
| `className` | `string` | - | Additional CSS classes |
| `maxHeight` | `string` | `"320px"` | Maximum height of the command list |
| `emptyMessage` | `string` | `"No commands found"` | Message when no commands available |
| `emptyDescription` | `string` | `"Try a different search term"` | Description for empty state |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `select` | `CommandItem` | Emitted when a command is selected |

## Keyboard Navigation

- **↑/↓ Arrow Keys**: Navigate between commands
- **Enter**: Execute selected command
- **Escape**: Close (handled by parent component)

## Composable API

The `useCommandList` composable provides:

### State
- `selectedIndex`: Currently selected item index
- `groupedItems`: Commands grouped by category
- `flatItems`: Flattened list of enabled items
- `itemToGlobalIndex`: Map of items to their global indices

### Actions
- `selectItem(index)`: Select item by index
- `navigateUp()`: Move selection up
- `navigateDown()`: Move selection down
- `executeSelected()`: Execute currently selected item
- `executeItem(item)`: Execute specific item

### Event Handlers
- `handleKeyDown(event)`: Keyboard event handler
- `handleMouseEnter(item)`: Mouse enter handler
- `handleMouseDown(event)`: Mouse down handler
- `handleMouseUp(event, item)`: Mouse up handler

## Best Practices

1. **Accessibility**: The component includes proper ARIA attributes and keyboard navigation
2. **Performance**: Uses computed properties for efficient reactivity
3. **Modularity**: Logic is separated from presentation for easier testing and reuse
4. **Type Safety**: Strong TypeScript typing throughout
5. **Consistency**: Uses shadcn/ui components for consistent styling
6. **Extensibility**: Easy to extend with new features via the composable pattern

## Migration Guide

If migrating from the old CommandsList component:

1. Update import paths for the new component structure
2. Add category information to your command items
3. Update any custom styling to work with shadcn components
4. Test keyboard navigation to ensure it works as expected

The new component maintains backward compatibility for the core `items` and `command` props.
