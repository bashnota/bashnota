/**
 * ProseMirror editor primitives.
 *
 * The in-house application boundary around the ProseMirror engine:
 * - {@link defineNode}   — declarative spec → ProseMirror NodeSpec.
 * - {@link VueNodeView}  — the Vue↔ProseMirror node view bridge.
 * - {@link useEditor}    — EditorView lifecycle composable.
 * - {@link EditorRegistry} — plugin/command registry.
 */
export { defineNode } from './defineNode'
export type { AttrDefinition, DefinedNode, NodeDefinition } from './defineNode'

export { VueNodeView } from './VueNodeView'
export type { VueNodeViewOptions, VueNodeViewProps } from './VueNodeView'

export { VueRenderer } from './VueRenderer'
export type { VueRendererOptions } from './VueRenderer'

export { Editor } from './editor'
export type { EditorOptions, EditorCommands } from './editor'

export { EditorContent } from './EditorContent'
export { NodeViewWrapper } from './NodeViewWrapper'

export { useEditor } from './useEditor'
export type { UseEditorOptions, UseEditorReturn } from './useEditor'

export { EditorRegistry } from './registry'

export type { EditorConfiguration, JSONContent, NodeViewProps } from './types'
