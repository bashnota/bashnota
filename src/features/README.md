# Features (`src/features`)

This directory implements the [Feature-Sliced Design](https://feature-sliced.design/) methodology. Each subdirectory represents a distinct business feature of the application, encapsulating all the logic and components related to that feature.

This structure helps to organize the codebase in a modular and scalable way, making it easier to develop, maintain, and understand individual features in isolation.

## Feature Modules

-   `ai`: Contains all components, services, and stores related to Artificial Intelligence features, such as the AI Assistant.
-   `auth`: Handles user authentication, including login, registration, and profile management.
-   `bashhub`: Implements the "BashHub" feature, which likely involves sharing and discovering scripts or notas.
-   `editor`: Contains the core text editor feature, including its blocks, extensions, and UI.
-   `jupyter`: Manages Jupyter integration, including server and session management.
-   `nota`: A core feature, related to creating and managing the main document type, "Notas."
-   `settings`: Provides user-configurable settings for the application and its various features. 