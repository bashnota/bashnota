export interface CodeBlockNode {
  attrs: {
    id: string
    executable: boolean
    language: string
    output: string | null
    kernelName: string | null
    serverID: string | null
    sessionId: string | null
  }
  textContent: string
  nodeSize: number
}

export interface CodeBlockProps {
  node: CodeBlockNode
  updateAttributes: (attrs: Partial<CodeBlockNode['attrs']>) => void
  editor: any
  getPos: () => number | undefined
}

export interface KernelPreference {
  name: string
  serverId: string
}

export interface OutputProps {
  content: string
  type?: 'text' | 'html' | 'json' | 'table' | 'image' | 'error'
  showControls?: boolean
  maxHeight?: string
  isFullscreenable?: boolean
  isCollapsible?: boolean
  originalCode?: string
}

export interface CodeEditorProps {
  modelValue: string
  language: string
  readonly?: boolean
  fullScreen?: boolean
  maxHeight?: string
} 