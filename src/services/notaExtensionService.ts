import { type Editor } from '@tiptap/core'

/**
 * Unified service for interacting with Nota editor extensions
 * This service acts as an abstraction layer between actors and editor extensions
 */
export class NotaExtensionService {
  private editor: Editor | null = null

  /**
   * Initialize the service with an editor instance
   * @param editor The editor instance
   */
  public setEditor(editor: Editor): void {
    this.editor = editor
  }

  /**
   * Clear the editor reference
   */
  public clearEditor(): void {
    this.editor = null
  }

  /**
   * Check if an editor instance is available
   * @returns True if an editor is available, false otherwise
   */
  public hasEditor(): boolean {
    return this.editor !== null
  }

  /**
   * Check if an editor is available
   * @throws Error if no editor is available
   */
  private ensureEditor(): void {
    if (!this.editor) {
      throw new Error('No editor instance available. Extensions cannot be used without an editor.')
    }
  }

  /**
   * Insert content at the current cursor position
   * @param content The content to insert
   * @returns Success status
   */
  public insertContent(content: any): boolean {
    this.ensureEditor()
    return this.editor!.commands.insertContent(content)
  }

  /**
   * Insert a code block with the specified language and code
   * @param language The programming language
   * @param code The code to insert
   * @returns Success status
   */
  public insertCodeBlock(language: string, code: string): boolean {
    this.ensureEditor()
    return this.editor!.commands.insertContent({
      type: 'executableCodeBlock',
      attrs: {
        language,
        executeable: true,
      },
      content: [{ type: 'text', text: code }],
    })
  }

  /**
   * Insert a math block with the specified LaTeX
   * @param latex The LaTeX code
   * @returns Success status
   */
  public insertMathBlock(latex: string): boolean {
    this.ensureEditor()
    return this.editor!.commands.insertContent({
      type: 'mathBlock',
      attrs: {
        latex,
      },
    })
  }

  /**
   * Insert a mermaid diagram
   * @param content The mermaid diagram syntax
   * @returns Success status
   */
  public insertMermaid(content: string): boolean {
    this.ensureEditor()
    return this.editor!.commands.insertContent({
      type: 'mermaid',
      attrs: {
        content,
      },
    })
  }

  /**
   * Insert a scatter plot
   * @param title The plot title
   * @param data The scatter plot data
   * @returns Success status
   */
  public insertScatterPlot(title: string, data: any): boolean {
    this.ensureEditor()
    return this.editor!.commands.insertContent({
      type: 'scatterPlot',
      attrs: {
        title,
        apiData: data,
      },
    })
  }

  /**
   * Insert a table with the specified dimensions
   * @param rows Number of rows
   * @param cols Number of columns
   * @returns Success status
   */
  public insertTable(rows: number, cols: number): boolean {
    this.ensureEditor()
    return this.editor!.commands.insertTable({ rows, cols })
  }

  /**
   * Insert an image with the specified URL
   * @param src The image URL
   * @param alt Alt text for the image
   * @returns Success status
   */
  public insertImage(src: string, alt?: string): boolean {
    this.ensureEditor()
    return this.editor!.commands.insertContent({
      type: 'image',
      attrs: {
        src,
        alt: alt || '',
        title: alt || '',
      },
    })
  }

  /**
   * Insert a Vibe block
   * @param query Initial query for the Vibe block
   * @returns Success status
   */
  public insertVibe(query: string = ''): boolean {
    this.ensureEditor()
    return this.editor!.commands.insertContent({
      type: 'vibe',
      attrs: {
        query,
        isActive: false,
      },
    })
  }

  /**
   * Update a Vibe block
   * @param attrs Attributes to update
   * @returns Success status
   */
  public updateVibe(attrs: Record<string, any>): boolean {
    this.ensureEditor()
    return this.editor!.commands.updateAttributes('vibe', attrs)
  }

  /**
   * Set the current selection to heading of specified level
   * @param level Heading level (1-6)
   * @returns Success status
   */
  public setHeading(level: 1 | 2 | 3 | 4 | 5 | 6): boolean {
    this.ensureEditor()
    return this.editor!.commands.setHeading({ level })
  }

  /**
   * Set the current selection to paragraph
   * @returns Success status
   */
  public setParagraph(): boolean {
    this.ensureEditor()
    return this.editor!.commands.setParagraph()
  }

  /**
   * Toggle bullet list at the current selection
   * @returns Success status
   */
  public toggleBulletList(): boolean {
    this.ensureEditor()
    return this.editor!.commands.toggleBulletList()
  }

  /**
   * Enter a new line
   * @returns Success status
   */
  public enter(): boolean {
    this.ensureEditor()
    return this.editor!.commands.enter()
  }

  /**
   * Lift the current list item
   * @param listType The type of list item
   * @returns Success status
   */
  public liftListItem(listType: string): boolean {
    this.ensureEditor()
    return this.editor!.commands.liftListItem(listType)
  }

  /**
   * Generic method to execute any editor command
   * @param commandName The name of the command to execute
   * @param params Parameters to pass to the command
   * @returns Result of the command execution
   */
  public executeCommand<T = boolean>(commandName: string, params: any = {}): T {
    this.ensureEditor()
    
    // Access the command using type assertion
    const commandMethod = (this.editor!.commands as any)[commandName]
    if (!commandMethod) {
      throw new Error(`Editor command '${commandName}' not found`)
    }
    
    return commandMethod(params) as T
  }
}

// Create a singleton instance
export const notaExtensionService = new NotaExtensionService() 