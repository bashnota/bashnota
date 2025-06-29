# Auth Services (`src/features/auth/services`)

This directory contains the services responsible for handling the business logic of user authentication.

## Services

-   **`auth.ts`**: This service encapsulates all the logic for user authentication. It communicates with the backend API to handle operations such as logging in, logging out, registering new users, and fetching the current user's information. It works in conjunction with the `auth` store to manage the application's authentication state. 