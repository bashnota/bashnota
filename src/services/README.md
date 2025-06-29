# Services

This directory contains services that handle business logic, data fetching, and communication with external APIs.

## Subdirectories

- **`ai/`**: Contains services and providers related to AI functionalities.

## Files

- **`aiConversationService.ts`**: Manages the state and logic for AI conversations.
- **`aiService.ts`**: A general service for interacting with AI models.
- **`auth.ts`**: Handles user authentication, registration, and session management.
- **`axios.ts`**: A configuration file for the Axios HTTP client.
- **`codeExecutionService.ts`**: A service for executing code, likely communicating with a Jupyter kernel or other execution backend.
- **`commentService.ts`**: Manages all operations related to comments (creating, fetching, deleting).
- **`firebase.ts`**: Initializes and configures the Firebase application instance.
- **`jupyterService.ts`**: Handles communication with the Jupyter server API.
- **`logger.ts`**: A service for logging application events.
- **`notaExtensionService.ts`**: A service for managing 'nota' extensions.
- **`publishNotaUtilities.ts`**: Contains utility functions to help with the process of publishing a 'nota'.
- **`statisticsService.ts`**: A service for fetching and processing statistics.
- **`subNotaService.ts`**: Manages operations for 'sub-notas'. 