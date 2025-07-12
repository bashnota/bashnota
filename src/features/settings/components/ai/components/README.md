# AI Settings Components

This directory contains modular components for AI provider settings.

## WebLLM Integration Components

### WebLLMConfigurationSection.vue
A compact configuration section for WebLLM that appears inline with other provider configurations. Provides:
- Browser compatibility checking
- Quick model status display
- Minimal model management interface
- Link to full model manager

### WebLLMModelManager.vue
A comprehensive model management interface for WebLLM that appears as a dedicated section when WebLLM is the primary provider. Features:
- Complete model browser with categorization
- Downloaded models management
- Real-time loading progress
- Browser compatibility validation
- Cache management tools

## Integration Points

The WebLLM components are integrated into the main AIProvidersSettings.vue through:

1. **Inline Configuration**: WebLLMConfigurationSection appears within each provider's configuration when WebLLM is detected or selected
2. **Dedicated Section**: WebLLMModelManager appears as a separate card when WebLLM is the primary provider
3. **Dynamic Loading**: Components are conditionally rendered based on provider selection and browser compatibility

## Usage

The components automatically integrate with the existing AI provider system and require no additional configuration. They use the `useAIProviders` composable for WebLLM functionality and maintain their own local state for UI interactions. 