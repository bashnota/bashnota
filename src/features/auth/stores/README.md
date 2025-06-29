# Auth Stores (`src/features/auth/stores`)

This directory contains the Pinia stores for managing the global state of the authentication feature.

## Stores

-   **`auth.ts`**: This Pinia store is the single source of truth for the application's authentication state. It holds information such as the currently authenticated user, their permissions, and whether they are logged in. It provides actions to log in, log out, and update user information, and getters to easily access the authentication state from anywhere in the application. 