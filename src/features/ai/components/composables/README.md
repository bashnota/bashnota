# AI Composables (`src/features/ai/components/composables`)

This directory contains Vue composables that provide stateful logic for the AI components.

## Composables

-   **`useAIGeneration.ts`**: Manages the process of generating AI responses, including handling different generation types and states.
-   **`useAIErrorHandling.ts`**: A dedicated composable for handling and displaying errors from AI service interactions.
-   **`useAIProviders.ts`**: Manages the available AI providers and their configurations.
-   **`useAIRequest.ts`**: Encapsulates the logic for making requests to the AI service.
-   **`useChatHistory.ts`**: Handles fetching, storing, and managing the history of conversations.
-   **`useConversation.ts`**: Manages the state of a single, active conversation.
-   **`useConversationManager.ts`**: A higher-level composable to manage multiple conversations.
-   **`useMentions.ts`**: Provides the logic for handling @-mentions within the conversation input.
-   **`useResizableSidebar.ts`**: A composable to make the AI sidebar resizable.
-   **`useStreamingMode.ts`**: Manages the logic for handling streaming AI responses. 