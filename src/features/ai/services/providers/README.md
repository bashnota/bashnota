# AI Providers (`src/features/ai/services/providers`)

This directory contains the concrete implementations for different AI service providers. Each provider adheres to a common interface, allowing them to be used interchangeably by the `aiService`.

## Providers

-   **`geminiProvider.ts`**: An implementation that connects to Google's Gemini models through their API.
-   **`ollamaProvider.ts`**: An implementation that allows the application to connect to a locally running Ollama instance, giving access to a variety of open-source models.
-   **`webLLMProvider.ts`**: An implementation that utilizes the Web LLM library to run language models directly in the browser, enabling offline capabilities. 