# Auth Feature (`src/features/auth`)

This directory contains all the code related to user authentication and authorization. It follows the feature-sliced design, encapsulating everything needed for the auth feature.

## Subdirectories

-   `components`: Contains Vue components specific to authentication, such as login forms, registration forms, and user profile elements.
-   `services`: Provides services for handling authentication logic, such as communicating with the backend API for login, logout, and user registration.
-   `stores`: Holds Pinia stores for managing authentication state, such as the current user, authentication tokens, and login status.
-   `types`: Defines TypeScript types and interfaces related to the authentication feature, such as the `User` object.
-   `views`: Contains the main page components for authentication-related routes, like `LoginView.vue` and `ProfileView.vue`. 