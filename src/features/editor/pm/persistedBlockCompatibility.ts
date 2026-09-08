import { defineNode } from './defineNode'
import type { NodeDefinition } from './defineNode'

function parseJSONAttribute(element: HTMLElement, name: string): unknown {
  const value = element.getAttribute(name)
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function serializedAttribute(value: unknown): string | null {
  if (value == null) return null
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function withSerializedAttribute(
  attrs: Record<string, string>,
  name: string,
  value: unknown,
): void {
  const serialized = serializedAttribute(value)
  if (serialized != null) attrs[name] = serialized
}

/**
 * Persistence-only nodes for records created by the pre-ProseMirror block
 * store. They deliberately do not add toolbar commands or rich node views:
 * new content still uses the supported live nodes, while old records remain
 * visible and round-trip without being rewritten as an empty document.
 */
export const codeBlockCompatibilityNodeDefinition: NodeDefinition = {
  name: 'codeBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  attrs: {
    language: { default: 'text', parseHTML: (element) => element.getAttribute('data-language') ?? 'text' },
    output: {
      default: null,
      parseHTML: (element) => parseJSONAttribute(element, 'data-output'),
    },
    sessionId: { default: null, parseHTML: (element) => element.getAttribute('data-session-id') },
    isExecuting: {
      default: false,
      parseHTML: (element) => element.getAttribute('data-is-executing') === 'true',
    },
    executionTime: {
      default: null,
      parseHTML: (element) => parseJSONAttribute(element, 'data-execution-time'),
    },
    error: { default: null, parseHTML: (element) => element.getAttribute('data-error') },
  },
  parseDOM: [{ tag: 'pre[data-persisted-block="code"]', preserveWhitespace: 'full' }],
  toDOM: (node) => {
    const attrs: Record<string, string> = {
      'data-persisted-block': 'code',
      'data-language': String(node.attrs.language ?? 'text'),
    }
    withSerializedAttribute(attrs, 'data-output', node.attrs.output)
    withSerializedAttribute(attrs, 'data-execution-time', node.attrs.executionTime)
    if (node.attrs.sessionId != null) attrs['data-session-id'] = String(node.attrs.sessionId)
    if (node.attrs.isExecuting) attrs['data-is-executing'] = 'true'
    if (node.attrs.error != null) attrs['data-error'] = String(node.attrs.error)
    return ['pre', attrs, ['code', { class: `language-${String(node.attrs.language ?? 'text')}` }, 0]]
  },
}

export const aiGenerationCompatibilityNodeDefinition: NodeDefinition = {
  name: 'aiGeneration',
  group: 'block',
  content: 'text*',
  defining: true,
  attrs: {
    prompt: { default: '', parseHTML: (element) => element.getAttribute('data-prompt') ?? '' },
    model: { default: null, parseHTML: (element) => element.getAttribute('data-model') },
    timestamp: {
      default: null,
      parseHTML: (element) => parseJSONAttribute(element, 'data-timestamp'),
    },
  },
  parseDOM: [{ tag: 'div[data-persisted-block="ai-generation"]' }],
  toDOM: (node) => {
    const attrs: Record<string, string> = { 'data-persisted-block': 'ai-generation' }
    if (node.attrs.prompt) attrs['data-prompt'] = String(node.attrs.prompt)
    if (node.attrs.model != null) attrs['data-model'] = String(node.attrs.model)
    withSerializedAttribute(attrs, 'data-timestamp', node.attrs.timestamp)
    return ['div', attrs, 0]
  },
}

export const mermaidCompatibilityNodeDefinition: NodeDefinition = {
  name: 'mermaid',
  group: 'block',
  atom: true,
  defining: true,
  attrs: {
    content: { default: '' },
    title: { default: null, parseHTML: (element) => element.getAttribute('data-title') },
    theme: {
      default: 'default',
      parseHTML: (element) => element.getAttribute('data-theme') ?? 'default',
    },
    config: {
      default: null,
      parseHTML: (element) => parseJSONAttribute(element, 'data-config'),
    },
  },
  parseDOM: [{
    tag: 'pre[data-persisted-block="mermaid"]',
    getAttrs: (element) => ({ content: (element as HTMLElement).textContent ?? '' }),
  }],
  toDOM: (node) => {
    const attrs: Record<string, string> = {
      'data-persisted-block': 'mermaid',
      'data-theme': String(node.attrs.theme ?? 'default'),
    }
    if (node.attrs.title != null) attrs['data-title'] = String(node.attrs.title)
    withSerializedAttribute(attrs, 'data-config', node.attrs.config)
    return ['pre', attrs, String(node.attrs.content ?? '')]
  },
}

export const persistedBlockCompatibilityDefinitions = [
  defineNode(codeBlockCompatibilityNodeDefinition),
  defineNode(aiGenerationCompatibilityNodeDefinition),
  defineNode(mermaidCompatibilityNodeDefinition),
]
