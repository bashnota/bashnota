
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportNotaToHtml } from '../exportService'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import katex from 'katex'

// Mock Dependencies
vi.mock('jszip', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            file: vi.fn(),
            folder: vi.fn().mockReturnThis(),
            generateAsync: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'application/zip' }))
        }))
    }
})

vi.mock('file-saver', () => ({
    saveAs: vi.fn()
}))

vi.mock('katex', () => ({
    default: {
        renderToString: vi.fn((latex) => `<span class="katex">${latex}</span>`)
    }
}))

// Mock Extensions
vi.mock('@/features/editor/components/extensions', () => {
    const { Node } = require('@tiptap/core')
    const StarterKit = require('@tiptap/starter-kit').default

    return {
        getEditorExtensions: () => [
            StarterKit,
            Node.create({
                name: 'executableCodeBlock',
                group: 'block',
                addAttributes() { return { output: { default: '' }, language: { default: 'python' } } },
                renderHTML({ node }) {
                    return ['div', { 'data-type': 'executableCodeBlock' },
                        ['pre', {}, ['code', { class: `language-${node.attrs.language}` }, 0]],
                        node.attrs.output ? ['div', { class: 'export-code-output', 'data-output': node.attrs.output }] : ''
                    ]
                }
            }),
            Node.create({
                name: 'math',
                group: 'block',
                atom: true,
                addAttributes() { return { latex: { default: '' } } },
                renderHTML({ node }) {
                    return ['div', { 'data-type': 'math', 'data-latex': node.attrs.latex }]
                }
            }),
            Node.create({
                name: 'citation',
                inline: true,
                group: 'inline',
                atom: true,
                addAttributes() { return { citationKey: { default: '' }, citationNumber: { default: 1 } } },
                renderHTML({ node }) {
                    return ['span', {
                        'data-type': 'citation',
                        'data-citation-key': node.attrs.citationKey,
                        'data-citation-number': node.attrs.citationNumber
                    }, `[${node.attrs.citationNumber}]`]
                }
            }),
            Node.create({
                name: 'theorem',
                group: 'block',
                content: 'block+',
                addAttributes() { return { title: { default: '' }, content: { default: '' } } },
                renderHTML({ node }) {
                    return ['div', { 'data-type-theorem': '', 'data-title': node.attrs.title }, 0]
                }
            }),
            // NEW BLOCKS FOR TDD
            Node.create({
                name: 'subNotaLink',
                group: 'block',
                atom: true,
                addAttributes() { return { targetNotaId: { default: null }, targetNotaTitle: { default: 'Sub Nota' } } },
                renderHTML({ node }) {
                    return ['span', { 'data-type': 'sub-nota-link', 'data-target-nota-id': node.attrs.targetNotaId }, node.attrs.targetNotaTitle]
                }
            }),
            Node.create({
                name: 'notaTable',
                group: 'block',
                atom: true,
                addAttributes() { return { tableData: { default: null } } },
                renderHTML({ node }) {
                    return ['div', { 'data-type': 'data-table', 'data-table-data': JSON.stringify(node.attrs.tableData) }]
                }
            }),
            Node.create({
                name: 'bibliography',
                group: 'block',
                atom: true,
                renderHTML() {
                    return ['div', { 'data-type': 'bibliography' }]
                }
            }),
            Node.create({
                name: 'drawIo',
                group: 'block',
                atom: true,
                renderHTML() {
                    return ['div', { 'class': 'drawio-diagram' }] // Simplified mock
                }
            })
        ]
    }
})

describe('Export Service', () => {
    let zipMock: any

    beforeEach(() => {
        vi.clearAllMocks()
        zipMock = {
            file: vi.fn(),
            folder: vi.fn().mockReturnThis(),
            generateAsync: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'application/zip' }))
        }
            ; (JSZip as any).mockImplementation(() => zipMock)
    })

    // --- Existing Tests (Simplified for brevity but kept essential ones) ---
    it('should export simple text content correctly', async () => {
        const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] }] }
        await exportNotaToHtml({ title: 'Test Doc', content, fetchNota: vi.fn() as any })
        expect(zipMock.file).toHaveBeenCalledWith('index.html', expect.stringContaining('Hello World'))
    })

    // --- New Tests for Recursive Export & Custom Blocks ---

    it('should recursively export sub-notas and rewrite links', async () => {
        // Setup Root content with a link to Child
        const rootContent = {
            type: 'doc',
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Root Page' }] },
                { type: 'subNotaLink', attrs: { targetNotaId: 'child-1', targetNotaTitle: 'Child Page' } }
            ]
        }

        // Setup Child content
        const childContent = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'I am the child' }] }]
        }

        // Mock fetcher
        const fetchNota = vi.fn().mockImplementation(async (id) => {
            if (id === 'child-1') return { title: 'Child Page', content: childContent }
            return null
        })

        await exportNotaToHtml({ title: 'Root Doc', content: rootContent, rootNotaId: 'root', fetchNota })

        // 1. Check Root exported
        expect(zipMock.file).toHaveBeenCalledWith('index.html', expect.stringContaining('Root Page'))

        // 2. Check Child exported (in pages folder)
        expect(zipMock.file).toHaveBeenCalledWith('pages/child-1.html', expect.stringContaining('I am the child'))

        // 3. Check Link Rewritten in Root (index.html)
        // It currently renders as span[data-type=sub-nota-link]... export service should convert it to <a>
        // Note: checking if args passed to 'index.html' call contains the anchor tag
        const indexHtmlCall = zipMock.file.mock.calls.find((c: any) => c[0] === 'index.html')
        expect(indexHtmlCall[1]).toContain('<a href="pages/child-1.html"')
        expect(indexHtmlCall[1]).toContain('Child Page') // Link text
    })

    it('should transform notaTable to HTML table', async () => {
        const tableData = {
            columns: [{ id: 'col1', title: 'Name' }, { id: 'col2', title: 'Age' }],
            rows: [
                { id: 'row1', cells: { col1: 'Alice', col2: '30' } },
                { id: 'row2', cells: { col1: 'Bob', col2: '25' } }
            ]
        }

        const content = {
            type: 'doc',
            content: [
                { type: 'notaTable', attrs: { tableData } }
            ]
        }

        await exportNotaToHtml({ title: 'Table Doc', content, fetchNota: vi.fn() as any })

        const indexHtmlCall = zipMock.file.mock.calls.find((c: any) => c[0] === 'index.html')
        expect(indexHtmlCall[1]).toContain('<table')
        expect(indexHtmlCall[1]).toContain('Alice')
        expect(indexHtmlCall[1]).toContain('30')
        expect(indexHtmlCall[1]).toContain('Name') // Header
    })

    it('should generate bibliography from citations', async () => {
        const content = {
            type: 'doc',
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Cite' }, { type: 'citation', attrs: { citationKey: 'ref1', citationNumber: 1 } }] },
                { type: 'bibliography', attrs: {} }
            ]
        }

        await exportNotaToHtml({ title: 'Bib Doc', content, fetchNota: vi.fn() as any })

        const indexHtmlCall = zipMock.file.mock.calls.find((c: any) => c[0] === 'index.html')
        // We expect the bibliography div to be replaced/filled with a list
        expect(indexHtmlCall[1]).toContain('<ul class="bibliography-list"')
        expect(indexHtmlCall[1]).toContain('[1] ref1') // Should list the citation
        // Ideally it would contain the citation details, but our mock citation doesn't have details in this test setup. 
        // We might need to mock citation details or just check structure.
        // For now, checking that the bibliography block renders *something* structure-wise is good.
    })

})
