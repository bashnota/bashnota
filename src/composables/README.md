# Composables (`src/composables`)

This directory contains reusable Vue Composition API functions, known as composables. These functions encapsulate stateful logic that can be shared across multiple components.

## Files

-   **`theme.ts`**: A composable for managing application-wide themes, such as toggling between light and dark mode.
-   **`useResizableSidebar.ts`**: Provides the logic to make sidebar components resizable by the user.
-   **`useSidebar.ts`**: A generic composable for managing the state of a single sidebar (e.g., open, closed, width).
-   **`useSidebarComposable.ts`**: A more specific or alternative implementation for sidebar state management.
-   **`useSidebarsGroup.ts`**: Manages the state and interactions of a group of sidebars, ensuring they work together correctly.