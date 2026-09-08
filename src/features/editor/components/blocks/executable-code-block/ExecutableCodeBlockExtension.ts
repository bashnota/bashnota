/**
 * Executable code block — raw ProseMirror schema.
 *
 * The schema is declared once through the in-house PM primitives and the live
 * editor registry pairs it with the Vue node view and native commands.
 */
import { defineNode } from '@/features/editor/pm'
import type { NodeDefinition } from '@/features/editor/pm'

const LANGUAGE_CLASS_PREFIX = 'language-'

function nullableAttribute(element: HTMLElement, name: string): string | null {
  return element.getAttribute(name)
}

function jsonAttribute(element: HTMLElement, name: string): unknown {
  const value = nullableAttribute(element, name)
  if (value == null) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/** The one schema definition used by both raw PM tests and the live editor. */
export const executableCodeBlockNodeDefinition: NodeDefinition = {
  name: 'executableCodeBlock',
  atom: true,
  content: 'text*',
  marks: '',
  group: 'block',
  code: true,
  defining: true,
  attrs: {
    language: {
      default: 'python',
      parseHTML: (element) =>
        [...(element.firstElementChild?.firstElementChild?.classList ?? [])]
          .find((className) => className.startsWith(LANGUAGE_CLASS_PREFIX))
          ?.slice(LANGUAGE_CLASS_PREFIX.length) ?? 'python',
    },
    executable: {
      default: true,
      parseHTML: (element) => element.getAttribute('executable') !== 'false',
    },
    output: {
      default: null,
      parseHTML: (element) => nullableAttribute(element, 'output'),
    },
    kernelName: {
      default: null,
      parseHTML: (element) => nullableAttribute(element, 'kernelName'),
    },
    serverID: {
      default: null,
      parseHTML: (element) => nullableAttribute(element, 'serverID'),
    },
    sessionId: {
      default: null,
      parseHTML: (element) => nullableAttribute(element, 'sessionId'),
    },
    id: {
      default: null,
      parseHTML: (element) => nullableAttribute(element, 'id'),
    },
    isExecuting: {
      default: false,
      parseHTML: (element) => nullableAttribute(element, 'isExecuting') === 'true',
    },
    executionTime: {
      default: null,
      parseHTML: (element) => jsonAttribute(element, 'executionTime'),
    },
    error: {
      default: null,
      parseHTML: (element) => nullableAttribute(element, 'error'),
    },
    kernelPreferences: {
      default: null,
      parseHTML: (element) => jsonAttribute(element, 'kernelPreferences'),
    },
  },
  parseDOM: [{
    tag: 'div[data-type="executableCodeBlock"]',
    preserveWhitespace: 'full',
  }],
  toDOM: (node) => {
    const attrs: Record<string, string> = {
      'data-type': 'executableCodeBlock',
      class: 'code-block',
      language: String(node.attrs.language ?? 'python'),
      executable: String(node.attrs.executable !== false),
    }
    for (const name of ['output', 'kernelName', 'serverID', 'sessionId', 'id', 'error']) {
      const value = node.attrs[name]
      if (value != null) attrs[name] = String(value)
    }
    if (node.attrs.isExecuting) attrs.isExecuting = 'true'
    if (node.attrs.executionTime != null) attrs.executionTime = JSON.stringify(node.attrs.executionTime)
    if (node.attrs.kernelPreferences != null) attrs.kernelPreferences = JSON.stringify(node.attrs.kernelPreferences)

    return [
      'div',
      attrs,
      [
        'pre',
        {},
        [
          'code',
          {
            class: node.attrs.language
              ? `${LANGUAGE_CLASS_PREFIX}${node.attrs.language}`
              : '',
          },
          0,
        ],
      ],
      node.attrs.output
        ? ['div', { class: 'export-code-output', 'data-output': node.attrs.output }]
        : ['div', { style: 'display: none' }],
    ]
  },
}

/** Raw-ProseMirror `{ name, spec }` used directly by the live editor. */
export const executableCodeBlockDefinition = defineNode(
  executableCodeBlockNodeDefinition,
)

/**
 * Compatibility export retained for existing barrels.
 */
export const ExecutableCodeBlockExtension = executableCodeBlockDefinition
