# Nota Components (`src/features/nota/components`)

This directory contains a wide range of components that build the user interface for the "Nota" feature, from sidebars and navigation to specific content elements like comments.

## Main Application UI
-   **`AppSidebar.vue`**: The main application sidebar, likely containing navigation and access to different features.
-   **`AppTabs.vue`**: A component for tabbed navigation, allowing users to switch between open documents or views.
-   **`BreadcrumbNav.vue`**: Displays a breadcrumb navigation trail to show the user's current location in the application's hierarchy.
-   **`NotFound.vue`**: A component displayed when a requested resource is not found (404 error).

## Sidebars & Panels
-   **`FavoriteBlocksSidebar.vue`**: A sidebar that displays a user's favorite or saved content blocks.
-   **`MetadataSidebar.vue`**: A sidebar for viewing and editing the metadata of the current Nota.
-   **`ReferencesSidebar.vue`**: A sidebar for managing and viewing the list of references for a document.
-   **`SidebarAuthStatus.vue`**: A component within a sidebar that displays the user's current authentication status.
-   **`SidebarNewNotaButton.vue`**: A button, typically in a sidebar, for creating a new Nota.
-   **`SidebarPagination.vue`**: Pagination controls for lists within a sidebar.
-   **`SidebarSearch.vue`**: A search input for filtering content within a sidebar.
-   **`SidebarViewSelector.vue`**: A control to switch between different views or data sources within a sidebar.

## Content & Feature Components
-   **`CitationDialog.vue`**: A dialog for managing citations.
-   **`CommentForm.vue`**: A form for submitting a new comment.
-   **`CommentItem.vue`**: Renders a single comment in a list.
-   **`CommentSection.vue`**: Orchestrates the display of a list of comments and the comment form.
-   **`NotaTree.vue`**: A component that displays a tree-like structure of Notas, showing parent-child relationships.
-   **`VotersList.vue`**: A component that displays a list of users who have voted on a Nota.

## Theme Controls
-   **`DarkModeToggle.vue`**: A simple toggle switch for enabling or disabling dark mode.
-   **`DarkIntensitySelector.vue`**: Allows the user to select the intensity or contrast of the dark mode.
-   **`ThemeModeSelector.vue`**: A control for switching between different theme modes (e.g., light, dark, system).
-   **`ThemeSelector.vue`**: A more general control for selecting different application themes.

## Subdirectories
-   **`references`**: Contains components specifically for the references management feature. 