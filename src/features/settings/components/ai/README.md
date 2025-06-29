# AI Settings Components (`src/features/settings/components/ai`)

This directory contains components for configuring the AI features of the application.

## Main Components

-   **`BaseProviderSettings.vue`**: A base component that provides a common structure and functionality for the settings of each individual AI provider.
-   **`UnifiedAISettings.vue`**: The main component for all AI-related settings, which likely orchestrates the different provider-specific settings components.

## Subdirectories

-   **`components`**: Contains smaller, reusable UI components used within the AI settings pages.
-   **`composables`**: Holds Vue composables for managing the logic of the AI settings.
-   **`providers`**: Contains the specific settings components for each AI provider (e.g., Gemini, Ollama).

## Files

- **`BaseProviderSettings.vue`**: A base component that likely provides a template and common functionality for individual AI provider settings components.
- **`UnifiedAISettings.vue`**: A component that acts as a container or main page for all AI-related settings. 