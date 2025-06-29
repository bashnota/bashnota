# Global Services (`src/services`)

This directory contains global, application-wide services that are not specific to any single feature. These services handle cross-cutting concerns like HTTP requests, logging, and core backend integrations.

## Services

-   **`aiService.ts`**: A high-level service for interacting with AI models. Note: Most AI logic is within `src/features/ai`.
-   **`axios.ts`**: Configures the global Axios instance used for making HTTP requests to the backend API.
-   **`codeExecutionService.ts`**: A service that manages the execution of code, likely by interfacing with a Jupyter kernel.
-   **`firebase.ts`**: Initializes and configures the connection to Firebase services.
-   **`logger.ts`**: A service for application-wide logging, which can be configured for different environments and log levels.

## Subdirectories

- **`ai/`**: Contains services and providers related to AI functionalities.

## Files

- **`aiConversationService.ts`**: Manages the state and logic for AI conversations.
- **`auth.ts`**: Handles user authentication, registration, and session management.
- **`commentService.ts`**: Manages all operations related to comments (creating, fetching, deleting).
- **`jupyterService.ts`**: Handles communication with the Jupyter server API.
- **`notaExtensionService.ts`**: A service for managing 'nota' extensions.
- **`publishNotaUtilities.ts`**: Contains utility functions to help with the process of publishing a 'nota'.
- **`statisticsService.ts`**: A service for fetching and processing statistics.
- **`subNotaService.ts`**: Manages operations for 'sub-notas'. 