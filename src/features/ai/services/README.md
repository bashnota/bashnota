# AI Services (`src/features/ai/services`)

This directory contains services that handle the business logic for the AI features, acting as a bridge between the UI components and the underlying AI providers.

## Files

-   **`aiConversationService.ts`**: Manages the lifecycle of AI conversations, including creating, retrieving, and updating them.
-   **`aiService.ts`**: The main service for interacting with the AI. It uses a factory to delegate requests to the currently selected AI provider.
-   **`index.ts`**: Exports the services to be used by other parts of the application.
-   **`providerFactory.ts`**: A factory function that creates an instance of an AI provider based on the user's selection.
-   **`types.ts`**: Contains TypeScript types and interfaces related to the AI services and providers.
-   **`utils.ts`**: A collection of utility functions used by the AI services.

## Subdirectories

-   **`providers`**: Contains the specific implementations for each supported AI provider (e.g., Gemini, Ollama). 