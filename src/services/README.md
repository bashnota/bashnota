# Global Services (`src/services`)

This directory contains global, application-wide services that are not specific to any single feature. These services handle cross-cutting concerns like HTTP requests, logging, and core backend integrations.

## Services

-   **`aiService.ts`**: A high-level service for interacting with AI models. Note: Most AI logic is within `src/features/ai`.
-   **`codeExecutionService.ts`**: A service that manages the execution of code, likely by interfacing with a Jupyter kernel.
-   **`cloud/`**: Provides the sole Supabase boundary for auth, data, metrics, newsletter, and storage workflows.
-   **`logger.ts`**: A service for application-wide logging, which can be configured for different environments and log levels.

## Subdirectories

- **`ai/`**: Contains services and providers related to AI functionalities.

## Files

- **`aiConversationService.ts`**: Manages the state and logic for AI conversations.
- **`features/auth/services/supabaseAuth.ts`**: Handles user authentication, registration, and session management.
- **`features/nota/services/communityCommentService.ts`**: Manages all operations related to comments.
- **`jupyterService.ts`**: Handles communication with the Jupyter server API.
- **`notaExtensionService.ts`**: A service for managing 'nota' extensions.
- **`publishNotaUtilities.ts`**: Contains utility functions to help with the process of publishing a 'nota'.
- **`cloud/supabasePublishing.ts`**: Persists and reads publication statistics.
- **`subNotaService.ts`**: Manages operations for 'sub-notas'.
