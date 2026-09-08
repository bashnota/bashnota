import { defineComponent, h, onBeforeUnmount } from 'vue'
import { defineNode } from '@/features/editor/pm/defineNode'
import type { NodeDefinition } from '@/features/editor/pm/defineNode'

export const DRAWIO_URL =
  'https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&modified=unsavedChanges&proto=json'
export const DRAWIO_ORIGIN = new URL(DRAWIO_URL).origin

/** A valid, editable diagrams.net XML document used for a fresh block. */
export const DEFAULT_DRAWIO_DIAGRAM =
  '<mxfile host="app.diagrams.net" modified="2026-08-13T00:00:00.000Z" agent="bashnota"><diagram id="bashnota-seed" name="Page-1"><mxGraphModel dx="800" dy="600" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="850" pageHeight="1100"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Draw.io diagram" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="280" y="220" width="160" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'

const DEFAULT_DRAWIO_PREVIEW =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"%3E%3Crect width="320" height="180" fill="%23f8fafc" stroke="%2394a3b8"/%3E%3Ctext x="160" y="95" text-anchor="middle" fill="%23334155" font-family="sans-serif" font-size="18"%3EDraw.io diagram%3C/text%3E%3C/svg%3E'

/** XML is editable but cannot be rendered by an img; use a local preview until export returns XMLPNG. */
export function drawIoImageSource(diagramData: unknown): string {
  const value = typeof diagramData === 'string' ? diagramData : ''
  return value.startsWith('data:image/') ? value : DEFAULT_DRAWIO_PREVIEW
}

interface DrawIoMessageHandlerOptions {
  iframeWindow: Window | null
  diagramData: () => string
  updateDiagram: (diagramData: string) => void
  close: () => void
}

/**
 * Handle messages only from the diagrams.net iframe. The previous package
 * accepted messages from every window and posted to `*`; diagrams contain user
 * documents, so both source and origin are now checked explicitly.
 */
export function createDrawIoMessageHandler(options: DrawIoMessageHandlerOptions) {
  return (event: MessageEvent) => {
    if (event.origin !== DRAWIO_ORIGIN || event.source !== options.iframeWindow) return
    if (typeof event.data !== 'string' || event.data.length === 0) return

    let message: { event?: string; data?: string }
    try {
      message = JSON.parse(event.data)
    } catch {
      return
    }

    switch (message.event) {
      case 'init':
        options.iframeWindow?.postMessage(
          // diagrams.net's `xml` field accepts both our editable `<mxfile>`
          // seed and data returned by a later export; `xmlpng` is only for
          // encoded PNG payloads and rejects a raw XML document.
          JSON.stringify({ action: 'load', xml: options.diagramData() }),
          DRAWIO_ORIGIN,
        )
        break
      case 'save':
        options.iframeWindow?.postMessage(
          JSON.stringify({ action: 'export', format: 'xmlpng', spinKey: 'saving' }),
          DRAWIO_ORIGIN,
        )
        break
      case 'export':
        if (message.data) options.updateDiagram(message.data)
        break
      case 'exit':
        options.close()
        break
    }
  }
}

export const DrawIoBlockView = defineComponent({
  name: 'DrawIoBlockView',
  props: {
    node: { type: Object, required: true },
    updateAttributes: { type: Function, required: true },
  },
  setup(props) {
    let dialog: HTMLDialogElement | null = null
    let receive: ((event: MessageEvent) => void) | null = null

    const closeDialog = () => {
      if (receive) window.removeEventListener('message', receive)
      receive = null
      if (dialog?.isConnected) dialog.remove()
      dialog = null
    }

    const openDialog = () => {
      if (dialog) return
      dialog = document.createElement('dialog')
      dialog.style.border = '0'
      dialog.style.padding = '0'
      dialog.addEventListener('close', closeDialog, { once: true })

      const iframe = document.createElement('iframe')
      iframe.setAttribute('frameborder', '0')
      iframe.src = DRAWIO_URL
      iframe.style.width = '99vw'
      iframe.style.height = '99vh'
      dialog.appendChild(iframe)
      document.body.appendChild(dialog)

      receive = createDrawIoMessageHandler({
        iframeWindow: iframe.contentWindow,
        diagramData: () => String(props.node.attrs.diagramData ?? ''),
        updateDiagram: (diagramData) => props.updateAttributes({ diagramData }),
        close: () => dialog?.close(),
      })
      window.addEventListener('message', receive)
      dialog.showModal()
    }

    onBeforeUnmount(closeDialog)

    return () =>
      h('img', {
        src: drawIoImageSource(props.node.attrs.diagramData),
        width: props.node.attrs.width ?? undefined,
        height: props.node.attrs.height ?? undefined,
        'data-type': 'drawio',
        class: 'drawio-diagram',
        onDblclick: openDialog,
      })
  },
})

export const drawIoNodeDefinition: NodeDefinition = {
  // This must match the existing block-store/useBlockEditor persistence type.
  name: 'drawio',
  group: 'block',
  atom: true,
  draggable: true,
  attrs: {
    diagramData: {
      default: DEFAULT_DRAWIO_DIAGRAM,
      parseHTML: (element) =>
        element.getAttribute('data-diagram-data') || element.getAttribute('src') || DEFAULT_DRAWIO_DIAGRAM,
    },
    width: {
      default: null,
      parseHTML: (element) => element.getAttribute('width'),
      renderHTML: (value) => value == null ? null : { width: String(value) },
    },
    height: {
      default: null,
      parseHTML: (element) => element.getAttribute('height'),
      renderHTML: (value) => value == null ? null : { height: String(value) },
    },
  },
  parseDOM: [{ tag: 'img[data-type="drawio"]' }, { tag: 'img[data-type="drawIoExtension"]' }],
  toDOM: (node) => [
    'img',
    {
      src: drawIoImageSource(node.attrs.diagramData),
      'data-diagram-data': String(node.attrs.diagramData ?? ''),
      ...(node.attrs.width == null ? {} : { width: String(node.attrs.width) }),
      ...(node.attrs.height == null ? {} : { height: String(node.attrs.height) }),
      'data-type': 'drawio',
      class: 'drawio-diagram',
    },
  ],
}

/** Raw-ProseMirror `{ name, spec }` used by tests and the eventual PM editor. */
export const drawIoDefinition = defineNode(drawIoNodeDefinition)

/** Local ProseMirror-backed Draw.io block. */
export const DrawIo = drawIoDefinition
