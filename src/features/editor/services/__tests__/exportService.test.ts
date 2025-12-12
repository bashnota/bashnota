import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportNotaToHtml } from '../exportService'
import { generateHTML } from '@tiptap/html'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

// Mocks
vi.mock('file-saver', () => ({
    saveAs: vi.fn()
}))

vi.mock('@tiptap/html', () => ({
    generateHTML: vi.fn()
}))

vi.mock('@/features/editor/components/extensions', () => ({
    getEditorExtensions: () => []
}))

const mockZipFile = vi.fn()
vi.mock('jszip', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            folder: vi.fn().mockReturnValue({ file: vi.fn() }),
            file: mockZipFile,
            generateAsync: vi.fn().mockResolvedValue(new Blob())
        }))
    }
})

describe('exportService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should process citations correctly in exported HTML', async () => {
        const mockContent = { type: 'doc', content: [] }

        const mockCitations = [
            { key: 'test2023', title: 'Test Citation', authors: ['Doe, John', 'Smith, Bob'], year: 2023 },
            { key: 'another2024', title: 'Another Citation', authors: [{ family: 'Smith', given: 'Jane' }], year: 2024 }
        ]

            ; (generateHTML as any).mockReturnValue(`
      <p>This is a citation <span data-type="citation" data-citation-key="test2023" data-citation-number="?">[?]</span></p>
      <p>Another one <span data-type="citation" data-citation-key="another2024" data-citation-number="?">[?]</span></p>
      <div data-type="bibliography"></div>
    `)

        await exportNotaToHtml({
            title: 'Test Export',
            content: mockContent,
            citations: mockCitations
        })

        expect(mockZipFile).toHaveBeenCalled()

        // Find the index.html file call
        const indexHtmlCall = mockZipFile.mock.calls.find(call => call[0] === 'index.html')
        expect(indexHtmlCall).toBeDefined()
        if (!indexHtmlCall) throw new Error('index.html not found in exported file')
        const html = indexHtmlCall[1]

        // Verify Citations numbering
        expect(html).toContain('data-citation-number="1"')
        expect(html).toContain('[1]')
        expect(html).toContain('data-citation-number="2"')
        expect(html).toContain('[2]')

        // Verify Tooltip elements are injected from defaultTemplate
        // These specific classes and strings must be present for tooltips to function
        expect(html).toContain('citation-tooltip')
        expect(html).toContain('tooltip-title')

        // Verify JS event listeners (checking for key parts of the implementation)
        // We switched to Event Delegation on document.body, so looking for mouseover/mouseout
        expect(html).toContain('document.body.addEventListener(\'mouseover\',')
        expect(html).toContain('document.body.addEventListener(\'mouseout\',')
    })
})
