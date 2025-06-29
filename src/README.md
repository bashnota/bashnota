# Source Directory (`src`)

This directory is the heart of the Vue.js application, containing all the client-side source code. The structure is organized to promote modularity, scalability, and maintainability.

## Root Files

-   `App.vue`: The main root component of the Vue application.
-   `main.ts`: The entry point of the application. It initializes Vue, plugins (like Router, Pinia), and mounts the `App` component.
-   `db.ts`: Configures and initializes the local database, likely using IndexedDB via a library like Dexie.js.
-   `shims-vue.d.ts`: A TypeScript declaration file that helps TypeScript understand `.vue` files.

## Subdirectories

-   `assets`: Contains static assets such as images, fonts, and global stylesheets.
-   `components`: Holds globally shared Vue components that are used across different features.
-   `composables`: Stores reusable Vue Composition API functions (custom hooks) to encapsulate and reuse stateful logic.
-   `constants`: Defines application-wide constants, such as configuration values or enums.
-   `features`: Implements the feature-sliced architecture. Each subdirectory within `features` represents a distinct feature of the application, containing its own components, stores, services, and routes.
-   `functions`: This directory might contain serverless function handlers or related utilities that are part of the frontend project setup.
-   `lib`: A place for general-purpose libraries, modules, or helper functions that are not tied to a specific feature.
-   `router`: Contains the Vue Router configuration, defining the application's routes.
-   `services`: Provides singleton services that manage application-wide concerns like API communication, authentication, or data processing.
-   `stores`: Home to Pinia stores for global state management.
-   `types`: Contains global TypeScript type definitions, interfaces, and enums.
-   `ui`: A dedicated directory for base UI components, often from a UI library like shadcn-vue, which are used to build the application's user interface.
-   `utils`: A collection of miscellaneous utility functions that can be used throughout the application. 