/**
 * EditorRegistry — the plugin/command registry.
 *
 * Replaces two TipTap surfaces at once:
 * - `addProseMirrorPlugins` — plugins are native ProseMirror already, so we just
 *   collect them and hand the flat list to the EditorState.
 * - `addCommands` — TipTap commands become plain ProseMirror `Command`s
 *   `(state, dispatch?, view?) => boolean`, registered by name and runnable
 *   against a view.
 *
 * Keeping both in one registry gives each block a single place to contribute its
 * behaviour, and gives `useEditor` a single place to read it from.
 */
import type { Command, Plugin } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

export class EditorRegistry {
  private readonly plugins: Plugin[] = []
  private readonly commands = new Map<string, Command>()

  /** Register a single ProseMirror plugin. Order of registration is preserved. */
  addPlugin(plugin: Plugin): this {
    this.plugins.push(plugin)
    return this
  }

  /** Register several plugins at once. */
  addPlugins(plugins: readonly Plugin[]): this {
    for (const plugin of plugins) this.plugins.push(plugin)
    return this
  }

  /** Register a named command. A duplicate name overwrites the previous one. */
  addCommand(name: string, command: Command): this {
    this.commands.set(name, command)
    return this
  }

  /** The registered plugins, in registration order. */
  getPlugins(): readonly Plugin[] {
    return this.plugins
  }

  /** Look up a command by name. */
  getCommand(name: string): Command | undefined {
    return this.commands.get(name)
  }

  /** All registered command names. */
  getCommandNames(): string[] {
    return [...this.commands.keys()]
  }

  /**
   * Run a registered command against a view, dispatching its transaction.
   * Returns the command's boolean (false if the command is unknown or a no-op),
   * matching ProseMirror's own command-return convention.
   */
  runCommand(name: string, view: EditorView): boolean {
    const command = this.commands.get(name)
    if (!command) return false
    return command(view.state, view.dispatch.bind(view), view)
  }
}
