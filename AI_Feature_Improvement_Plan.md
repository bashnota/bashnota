# AI Feature Improvement Plan

This document outlines a plan for improving the existing AI features and adding new capabilities to the application.

## ✅ Completed Features

### Modular AI Context Menu Actions
- **Status:** ✅ Completed
- **Description:** Enhanced the right-click context menu on text blocks with configurable AI-powered actions.
- **Features Implemented:**
  - Modular AI action system with customizable prompts, icons, and colors
  - Default actions: Rewrite, Fix Grammar, Improve Writing, Make Concise, Expand, Translate, Summarize
  - User-configurable actions through settings panel
  - Ability to add custom AI actions with custom prompts
  - Enable/disable individual actions
  - Reorder actions by priority
  - Duplicate and edit existing actions
  - Visual feedback with color-coded actions and processing states

## 1. Enhance Contextual Awareness

The current AI assistant is limited to the context of a single block. We can make it more powerful by providing it with more context.

-   **Feature: Whole-document context:**
    -   **Description:** Allow the AI assistant to access the entire content of the current `nota` to provide more accurate and context-aware responses.
    -   **Implementation Steps:**
        1.  Add a mechanism to pass the content of the current `nota` to the `AIService`.
        2.  Update the `generateText` and `generateTextStream` methods to include the document context in the prompt sent to the AI provider.
        3.  Add a UI element (e.g., a toggle switch) to let the user choose whether to include the full document context in the conversation.

-   **Feature: Cross-document context (RAG):**
    -   **Description:** Implement Retrieval-Augmented Generation (RAG) to allow the assistant to search for and use information from other `notas` in the user's workspace.
    -   **Implementation Steps:**
        1.  Create a service to index the content of all `notas` in the workspace. This could be done using a vector database like `LanceDB` or a library like `MiniSearch`.
        2.  When a user asks a question, use the indexing service to find relevant documents.
        3.  Pass the content of the relevant documents as context to the AI provider.

## 2. Improve User Experience

-   **Feature: Inline AI assistance:**
    -   **Description:** Allow users to invoke AI features directly within the editor, instead of limiting the AI to a sidebar.
    -   **Implementation Steps:**
        1.  Integrate the AI assistant with the Tiptap editor used in the application.
        2.  Add a keybinding (e.g., `Ctrl+K`) that opens a small AI prompt inline.
        3.  Allow users to generate text, fix grammar, or perform other actions on the selected text.

-   **Feature: Pre-defined prompts/commands:**
    -   **Description:** Create a set of pre-defined prompts or commands for common tasks (e.g., "summarize this document", "explain this code", "translate to French").
    -   **Implementation Steps:**
        1.  Add a "slash command" menu to the `ConversationInput.vue` component that appears when the user types `/`.
        2.  Define a list of commands and their corresponding prompts in a configuration file.
        3.  When a user selects a command, pre-fill the input with the corresponding prompt.

## 3. Expand AI Capabilities

-   **Feature: Image Generation:**
    -   **Description:** Add support for generating images using a provider like DALL-E 3 or Stable Diffusion.
    -   **Implementation Steps:**
        1.  Add a new provider for image generation to the `AIService`.
        2.  Add a new UI component to the AI assistant sidebar for entering image generation prompts.
        3.  Display the generated image in the chat and allow the user to save it to their `nota`.

-   **Feature: Code Interpreter:**
    -   **Description:** Leverage the existing Jupyter integration to create a code interpreter.
    -   **Implementation Steps:**
        1.  Allow the AI assistant to generate code in response to user prompts.
        2.  Add a button to execute the generated code using the Jupyter integration.
        3.  Display the output of the code execution in the chat. 