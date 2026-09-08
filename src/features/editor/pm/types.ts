import type { AppContext, Component } from 'vue'
import type { Mark, Node as ProseMirrorNode, NodeSpec, MarkSpec, Schema } from 'prosemirror-model'
import type { Command, Plugin } from 'prosemirror-state'
import type { EditorView, NodeViewConstructor } from 'prosemirror-view'
import type { Editor } from './editor'

export type JSONContent = {
  type?: string
  attrs?: Record<string, unknown>
  content?: JSONContent[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
}

export type CommandFactory = (...args: any[]) => Command

/** A complete, directly consumable ProseMirror editor contribution. */
export interface EditorConfiguration {
  nodes?: Record<string, NodeSpec>
  marks?: Record<string, MarkSpec>
  commands?: Record<string, CommandFactory>
  plugins?: (schema: Schema, editor: Editor) => Plugin[]
  nodeViews?: (editor: Editor) => Record<string, NodeViewConstructor>
}

/** Props shared by all in-house Vue node views. */
export interface NodeViewProps {
  node: ProseMirrorNode
  view: EditorView
  getPos: () => number | undefined
  selected: boolean
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  editor: Editor
}

export type { AppContext, Component, Mark }
