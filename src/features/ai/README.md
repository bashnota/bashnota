# AI Feature (`src/features/ai`)

This directory contains all the code related to the Artificial Intelligence features of the application, such as the AI Assistant and AI-powered context menu actions.

## Features

### AI Assistant Sidebar
- Multi-provider support (Gemini, Ollama, WebLLM)
- Conversation management with history
- Multimodal input support (text + images)
- Real-time streaming responses

### AI Context Menu Actions
- **Modular AI Actions**: Right-click on any text block to access AI-powered actions
- **Default Actions**: Rewrite, Fix Grammar, Improve Writing, Make Concise, Expand, Translate, Summarize
- **Customizable**: Users can create custom actions with their own prompts
- **Configurable**: Enable/disable actions, reorder by priority, customize icons and colors

## Subdirectories

-   `components`: Contains Vue components for the AI features, like the chat interface, suggestion pop-ups, and configuration settings.
-   `services`: Provides services for interacting with different AI providers (e.g., Gemini, Ollama) and managing conversation state.
-   `stores`: Holds Pinia stores for managing the state of AI-related features, such as conversation history, user settings, and AI actions.
-   `types`: TypeScript type definitions for AI actions and other AI-related data structures.
-   `utils`: Utility functions for icon resolution, color management, and other AI feature helpers.

## Usage

### Using AI Context Menu Actions

1. Right-click on any text block in the editor
2. Select an AI action from the "AI-Powered Actions" section
3. The AI will process the selected text and replace it with the result

### Configuring AI Actions

1. Go to Settings > AI Settings
2. Scroll to the "AI Actions" section
3. Enable/disable actions, reorder them, or create custom actions
4. Click "Add Custom Action" to create your own AI-powered action with a custom prompt

### Creating Custom Actions

1. Click "Add Custom Action" in the AI Actions settings
2. Fill in:
   - **Name**: Display name for the action
   - **Description**: Brief description of what the action does
   - **Icon**: Choose from available icons
   - **Color**: Select a color theme
   - **Prompt**: The AI prompt that will be used (selected text is automatically appended)
3. Click "Create Action" to save

## Technical Details

### Store Architecture
- `aiActionsStore`: Manages AI actions configuration and persistence
- `aiSettingsStore`: Manages AI provider settings and preferences

### Key Components
- `BlockCommandMenu.vue`: Enhanced context menu with dynamic AI actions
- `AIActionsSettings.vue`: Settings panel for managing AI actions
- `useAIActions.ts`: Composable for executing AI actions
- `iconResolver.ts`: Utility for dynamic icon and color resolution 