import { PluginKey } from 'prosemirror-state'
import type { Plugin } from 'prosemirror-state'
import { Suggestion } from './suggestionPlugin'
import type { Range } from './suggestionPlugin'

export interface SlashCommandsOptions {
  /** The editor handle (the live TipTap editor during this phase). */
  editor: any
  /**
   * The suggestion config (items/render, etc.) contributed by the caller. This
   * is deep-merged over the built-in `{ char: '/', command }` defaults, exactly
   * as TipTap's `SlashCommands.configure({ suggestion })` did.
   */
  suggestion?: Record<string, any>
}

/**
 * Build the slash-commands suggestion plugin.
 *
 * Was a TipTap `Extension.create({ name: 'slashCommands', addProseMirrorPlugins })`
 * wrapping the former suggestion helper. Now a plain ProseMirror plugin factory over the
 * hand-written {@link Suggestion} plugin. The trigger char (`/`) and the command
 * bridge (`props.command({ editor, range })`) are unchanged; the caller-supplied
 * `suggestion` (items + render) is spread on top just as before.
 */
export function slashCommandsPlugin({ editor, suggestion = {} }: SlashCommandsOptions): Plugin {
  return Suggestion({
    pluginKey: new PluginKey('slash-commands'),
    editor,
    char: '/',
    command: ({ editor, range, props }: { editor: any; range: Range; props: any }) => {
      props.command({ editor, range })
    },
    ...suggestion,
  })
}

export default slashCommandsPlugin
