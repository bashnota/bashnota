import { inputRules, textblockTypeInputRule } from 'prosemirror-inputrules'
import { setBlockType } from 'prosemirror-commands'
import { NodeSelection, Plugin } from 'prosemirror-state'
import type { Command } from 'prosemirror-state'
import { v4 as uuidv4 } from 'uuid'
import { getStockExtensions } from '@/features/editor/pm/stockExtensions'
import { VueNodeView } from '@/features/editor/pm/VueNodeView'
import type { EditorConfiguration, JSONContent } from '@/features/editor/pm/types'
import { stableIdPlugin } from '@/features/editor/pm/uniqueId'
import { markdownPastePlugin } from '@/features/editor/pm/markdown'
import { persistedBlockCompatibilityDefinitions } from '@/features/editor/pm/persistedBlockCompatibility'
import { markdownAndKatexPlugin } from './MarkdownExtension'
import { globalDragHandlePlugins } from './DragHandlePlugin'
import { slashCommandsPlugin } from './Commands'
import suggestion from './suggestion'
import { subNotaLinkSlashCommandPlugin } from './SubNotaLinkSlashCommand'

import { executableCodeBlockDefinition } from '../blocks/executable-code-block/ExecutableCodeBlockExtension'
import ExecutableCodeBlock from '../blocks/executable-code-block/ExecutableCodeBlock.vue'
import { pageLinkDefinition } from './PageLinkExtension'
import { notaTableDefinition } from '../blocks/table-block/TableExtension'
import TableBlock from '../blocks/table-block/TableBlock.vue'
import { mathDefinition } from '../blocks/math-block/math-extension'
import MathBlock from '../blocks/math-block/MathBlock.vue'
import { youtubeDefinition } from '../blocks/youtube-block/youtube.node'
import YoutubeBlockView from '../blocks/youtube-block/YoutubeBlockView.vue'
import {
  subfigureDefinition,
  validateGridColumns,
  validateLayout,
  validateObjectFit,
  validateSubfigure,
} from '../blocks/subfigure-block/subfigure-extension'
import type { SubfigureAttributes } from '../blocks/subfigure-block/subfigure-extension'
import SubfigureBlock from '../blocks/subfigure-block/SubfigureBlock.vue'
import { drawIoDefinition, DrawIoBlockView, DEFAULT_DRAWIO_DIAGRAM } from '../blocks/drawio-block/drawio.node'
import { citationDefinition, bibliographyDefinition } from '../blocks/citation-block/CitationExtension'
import Citation from '../blocks/citation-block/Citation.vue'
import Bibliography from '../blocks/citation-block/Bibliography.vue'
import { theoremDefinition } from '../blocks/theorem-block/theorem-extension'
import TheoremBlock from '../blocks/theorem-block/TheoremBlock.vue'
import { confusionMatrixDefinition } from '../blocks/confusion-matrix/ConfusionMatrixExtension'
import ConfusionMatrixBlock from '../blocks/confusion-matrix/ConfusionMatrixBlock.vue'
import { pipelineDefinition } from '../blocks/pipeline/PipelineExtension'
import PipelineNode from '../blocks/pipeline/PipelineNode.vue'
import { subNotaLinkDefinition } from './SubNotaLinkExtension'
import SubNotaBlock from '../blocks/sub-nota-block/SubNotaBlock.vue'
import { notaTitleDefinition } from './NotaTitleExtension'
import NotaTitleComponent from '../blocks/nota-title/NotaTitleComponent.vue'

function insertNode(typeName: string, attrs: Record<string, unknown> = {}, content?: JSONContent[]): Command {
  return (state, dispatch) => {
    const type = state.schema.nodes[typeName]
    if (!type) return false
    let node
    try {
      node = state.schema.nodeFromJSON({ type: typeName, attrs, ...(content ? { content } : {}) })
    } catch {
      return false
    }
    if (dispatch) dispatch(state.tr.replaceSelectionWith(node).scrollIntoView())
    return true
  }
}

function updateSelectedNode(typeName: string, attrs: Record<string, unknown>): Command {
  return (state, dispatch) => {
    if (!(state.selection instanceof NodeSelection) || state.selection.node.type.name !== typeName) return false
    if (dispatch) dispatch(state.tr.setNodeMarkup(state.selection.from, undefined, { ...state.selection.node.attrs, ...attrs }))
    return true
  }
}

function youtubeId(url: string): string | null {
  const match = url.match(/^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/)
  return match && match[7].length === 11 ? match[7] : null
}

function customConfiguration(editable: boolean): EditorConfiguration {
  const definitions = [
    executableCodeBlockDefinition,
    pageLinkDefinition,
    notaTableDefinition,
    mathDefinition,
    youtubeDefinition,
    subfigureDefinition,
    drawIoDefinition,
    citationDefinition,
    bibliographyDefinition,
    theoremDefinition,
    confusionMatrixDefinition,
    pipelineDefinition,
    subNotaLinkDefinition,
    ...persistedBlockCompatibilityDefinitions,
    ...(editable ? [notaTitleDefinition] : []),
  ]

  return {
    nodes: Object.fromEntries(definitions.map(({ name, spec }) => [name, spec])),
    commands: {
      setCodeBlock: (attrs: { language?: string } = {}) => (state, dispatch) => {
        const type = state.schema.nodes.executableCodeBlock
        return type ? setBlockType(type, attrs)(state, dispatch) : false
      },
      toggleCodeBlock: (attrs: { language?: string } = {}) => (state, dispatch) => {
        const active = state.selection.$from.parent.type === state.schema.nodes.executableCodeBlock
        return setBlockType(active ? state.schema.nodes.paragraph : state.schema.nodes.executableCodeBlock, active ? undefined : attrs)(state, dispatch)
      },
      insertNotaTable: (_notaId: string) => {
        const tableId = uuidv4()
        const columnId = uuidv4()
        return insertNode('notaTable', {
          tableData: {
            id: tableId,
            name: 'Untitled',
            columns: [{ id: columnId, title: 'Title', type: 'text' }],
            rows: [{ id: uuidv4(), cells: { [columnId]: '' } }],
          },
        })
      },
      setMath: (attrs: { latex?: string } = {}) => insertNode('math', attrs),
      setYoutube: (url: string) => {
        const videoId = youtubeId(url)
        return videoId ? insertNode('youtube', { url, videoId }) : () => false
      },
      setSubfigure: (options: Partial<SubfigureAttributes> = {}) => insertNode('subfigure', {
        subfigures: Array.isArray(options.subfigures) ? options.subfigures.filter(validateSubfigure) : [],
        layout: validateLayout(options.layout ?? 'horizontal') ? options.layout ?? 'horizontal' : 'horizontal',
        unifiedSize: typeof options.unifiedSize === 'boolean' ? options.unifiedSize : true,
        objectFit: validateObjectFit(options.objectFit ?? 'contain') ? options.objectFit ?? 'contain' : 'contain',
        isLocked: typeof options.isLocked === 'boolean' ? options.isLocked : false,
        caption: typeof options.caption === 'string' ? options.caption : '',
        label: typeof options.label === 'string' ? options.label : '',
        gridColumns: validateGridColumns(options.gridColumns ?? 2) ? options.gridColumns ?? 2 : 2,
      }),
      updateSubfigure: (attrs: Partial<SubfigureAttributes>) => updateSelectedNode('subfigure', attrs),
      insertDrawIo: () => insertNode('drawio', { diagramData: DEFAULT_DRAWIO_DIAGRAM, width: null, height: null }),
      setCitation: (attrs: Record<string, unknown>) => updateSelectedNode('citation', attrs),
      updateCitationNumber: (citationNumber: number) => updateSelectedNode('citation', { citationNumber }),
      updateCitationStyle: (citationStyle: string) => updateSelectedNode('citation', { citationStyle }),
      updateCitationFormat: (citationFormat: string) => updateSelectedNode('citation', { citationFormat }),
      setBibliographyStyle: (style: string) => updateSelectedNode('bibliography', { style }),
      setBibliographyTitle: (title: string) => updateSelectedNode('bibliography', { title }),
      setBibliographySortBy: (sortBy: string) => updateSelectedNode('bibliography', { sortBy }),
      setBibliographyGroupBy: (groupBy: string) => updateSelectedNode('bibliography', { groupBy }),
      setTheorem: (attrs: Record<string, unknown> = {}) => insertNode('theorem', attrs),
      insertConfusionMatrix: (attrs: Record<string, unknown> = {}) => insertNode('confusionMatrix', {
        data: null,
        labels: [],
        title: 'Confusion Matrix',
        source: 'upload',
        filePath: '',
        stats: null,
        ...attrs,
      }),
      insertPipeline: (attrs: Record<string, unknown> = {}) => insertNode('pipeline', {
        id: `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        title: 'Execution Pipeline',
        kernelMode: 'mixed',
        sharedKernelName: '',
        executionOrder: 'topological',
        stopOnError: true,
        ...attrs,
      }),
      setSubNotaLink: (attrs: Record<string, unknown>) => insertNode('subNotaLink', attrs),
      insertSubNotaLink: (attrs: Record<string, unknown>) => insertNode('subNotaLink', attrs),
      convertToSubNotaLink: (attrs: Record<string, unknown>) => insertNode('subNotaLink', attrs),
      setNotaTitle: (title: string) => insertNode('notaTitle', { title }),
      updateNotaTitle: (title: string) => updateSelectedNode('notaTitle', { title }),
    },
    plugins: (schema, editor) => {
      const plugins: Plugin[] = [markdownAndKatexPlugin()]
      if (editable) {
        plugins.push(
          stableIdPlugin({ types: ['executableCodeBlock'] }),
          markdownPastePlugin(),
          inputRules({ rules: [
            textblockTypeInputRule(/^```([a-z]+)?[\s\n]$/, schema.nodes.executableCodeBlock, (match) => ({ language: match[1] ?? 'python' })),
            textblockTypeInputRule(/^~~~([a-z]+)?[\s\n]$/, schema.nodes.executableCodeBlock, (match) => ({ language: match[1] ?? 'python' })),
          ] }),
          slashCommandsPlugin({ editor, suggestion }),
          ...globalDragHandlePlugins({ dragHandleWidth: 24 }),
          subNotaLinkSlashCommandPlugin({ editor }),
        )
      }
      plugins.push(new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) return null
          const tr = newState.tr
          let citationNumber = 1
          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'citation') {
              if (Number(node.attrs.citationNumber) !== citationNumber) tr.setNodeMarkup(pos, undefined, { ...node.attrs, citationNumber })
              citationNumber += 1
            }
          })
          return tr.steps.length ? tr : null
        },
      }))
      return plugins
    },
    nodeViews: (editor) => {
      const components = {
        executableCodeBlock: ExecutableCodeBlock,
        notaTable: TableBlock,
        math: MathBlock,
        youtube: YoutubeBlockView,
        subfigure: SubfigureBlock,
        drawio: DrawIoBlockView,
        citation: Citation,
        bibliography: Bibliography,
        theorem: TheoremBlock,
        confusionMatrix: ConfusionMatrixBlock,
        pipeline: PipelineNode,
        subNotaLink: SubNotaBlock,
        ...(editable ? { notaTitle: NotaTitleComponent } : {}),
      }
      return Object.fromEntries(Object.entries(components).map(([name, component]) => [
        name,
        (node: any, view: any, getPos: any) => new VueNodeView({
          node,
          view,
          getPos,
          component,
          as: name === 'citation' ? 'span' : 'div',
          editor,
          appContext: editor.appContext,
        }),
      ]))
    },
  }
}

export function getEditorExtensions(): EditorConfiguration[] {
  return [
    getStockExtensions({ placeholder: true, resizableTables: true }),
    customConfiguration(true),
  ]
}

export function getViewerExtensions(): EditorConfiguration[] {
  return [
    getStockExtensions({ placeholder: false, resizableTables: false }),
    customConfiguration(false),
  ]
}
