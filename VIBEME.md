# Vibe-Coding a New Tiptap Extension

This guide is for you, the developer, to help you vibe with the codebase and create new Tiptap extensions for Bashnota with ease. The goal is to follow existing patterns and best practices to maintain a clean and modular codebase.

## The "Vibe Code" Philosophy

"Vibe coding" is about understanding the *feel* and structure of the existing code and using it as an inspiration for your new features. Instead of starting from scratch, you'll be riffing off of what's already here. This guide will help you use a conversational AI coding assistant effectively to build new Tiptap extensions.

## 1. Find Your Inspiration

Before you start coding, take a look at the existing Tiptap extensions. They are located in `src/components/editor/blocks/`.

Pick one that seems similar to what you want to build. Good examples to learn from are:
- `youtube-block`: A simple block with a Vue component and extension logic.
- `theorem-block`: A more complex example with mixed content.
- `confusion-matrix`: A highly interactive and complex block with its own sub-components and services.

**Prompt Idea:**
> "Hey AI, I want to create a new Tiptap extension. Can you show me the files in `src/components/editor/blocks/youtube-block` to get a feel for the structure?"

## 2. The Structure is Key

We like to keep things organized. Every Tiptap extension in this project has its own dedicated folder. When you create a new one, you must follow this pattern.

Your new extension, let's call it `MyNewBlock`, should live in `src/components/editor/blocks/my-new-block/`.

Inside this folder, you'll typically have:

- **`my-new-block-extension.ts`**: This is the core Tiptap extension file. It defines the node, its attributes, how it's parsed, and how it's rendered.
- **`MyNewBlock.vue`**: This is the Vue component that renders your custom node in the editor. It gets passed in `node-view-wrapper`.
- **`index.ts`**: A simple file that exports your extension and any other necessary components. This makes imports cleaner.
- **`composables/`, `utils/`, `services/`, `components/` (optional sub-folders):** For more complex blocks, you can create sub-folders to organize your code.

**Prompt Idea:**
> "Okay, I'm ready. Create a new folder `src/components/editor/blocks/my-new-block/`. Inside it, create `my-new-block-extension.ts`, `MyNewBlock.vue`, and `index.ts`. Follow the general structure of the `youtube-block` extension."

## 3. Building Your Extension

Now you can start building the logic for your extension.

### The Extension File (`*-extension.ts`)

This is where you'll define your Tiptap node. You'll use Tiptap's `Node.create()` method. Key things to define are:
- `name`: A unique name for your node.
- `group`: Usually `'block'`.
- `atom`: `true` if it's an atom (can't be edited inside), `false` otherwise.
- `addAttributes()`: To define the properties of your node (e.g., `src` for a YouTube video).
- `parseHTML()`: To define how to convert HTML into your node.
- `renderHTML()`: To define how your node is rendered as HTML.
- `addNodeView()`: This is where you connect your Vue component.

**Prompt Idea:**
> "In `my-new-block-extension.ts`, create a new Tiptap node named `myNewBlock`. It should be a block-level atom. For now, just give it a `message` attribute. Use a Vue node view with the `MyNewBlock.vue` component."

### The Vue Component (`*.vue`)

This is a standard Vue component. It will receive props from the Tiptap node view, including the `editor` instance and the `node` itself.

Use the `node-view-wrapper` component from Tiptap as the root element of your template. You can access the node's attributes via `props.node.attrs`.

**Prompt Idea:**
> "Now for `MyNewBlock.vue`. Create a simple component that uses `node-view-wrapper`. It should display the `message` attribute from the node."

## 4. Putting It All Together

Once you've created your extension, you need to add it to the editor.

1.  Export your extension from `src/components/editor/blocks/my-new-block/index.ts`.
2.  Import your extension in `src/components/nota-editor/composables/useEditorExtensions.ts` and add it to the list of extensions.

**Prompt Idea:**
> "Now, let's wire this up. Export `MyNewBlockExtension` from `src/components/editor/blocks/my-new-block/index.ts`. Then, open `src/components/nota-editor/composables/useEditorExtensions.ts` and add my new extension to the editor's extensions list."

Happy Vibe Coding! ✨ 