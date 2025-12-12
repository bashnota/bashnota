import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generateHTML } from '@tiptap/html'
import katex from 'katex'
import { getEditorExtensions } from '@/features/editor/components/extensions'
import { buildHtmlPage } from './export/templates/defaultTemplate'

// --- Types ---
export interface NotaExportContent {
    title: string
    content: any // Tiptap JSON
    citations?: any[] // CitationEntry[]
}

export interface NotaExportOptions {
    title: string
    content: any
    citations?: any[]
    rootNotaId?: string
    fetchNota?: (id: string) => Promise<NotaExportContent | null>
}

interface ExportContext {
    zip: JSZip
    assetsFolder: JSZip | null
    queue: { id: string | 'root', title: string, content: any, citations?: any[] }[]
    processedIds: Set<string>
    fetchNota?: (id: string) => Promise<NotaExportContent | null>
    imgCounter: number // Global counter for images
}

// --- Main Export Function ---
export const exportNotaToHtml = async (options: NotaExportOptions) => {
    const { title, content, citations, rootNotaId, fetchNota } = options
    const zip = new JSZip()
    const assetsFolder = zip.folder('assets')

    const context: ExportContext = {
        zip,
        assetsFolder,
        queue: [],
        processedIds: new Set(),
        fetchNota,
        imgCounter: 0
    }

    // Initialize with root
    const rootId = rootNotaId || 'root'
    context.queue.push({ id: rootId, title, content, citations })
    context.processedIds.add(rootId)

    const extensions = getEditorExtensions()
    const parser = new DOMParser()

    // We process the queue using a simple loop.
    while (context.queue.length > 0) {
        const item = context.queue.shift()!
        const isRoot = item.id === rootId
        const relativePathPrefix = isRoot ? '' : '../' // Pages are in pages/ folder, so assets need ../

        // 1. Generate Raw HTML
        const rawHtml = generateHTML(item.content, extensions)
        const doc = parser.parseFromString(rawHtml, 'text/html')

        // 2. Process Content
        await processLinks(doc, isRoot, context)
        processAssets(doc, relativePathPrefix, context)
        processCustomBlocks(doc)
        processAssets(doc, relativePathPrefix, context)
        processCustomBlocks(doc)
        processCitations(doc, item.citations || [])
        processInlineLatex(doc)

        // 3. Build Final HTML Page
        const finalHtml = buildHtmlPage(item.title, doc.body.innerHTML)
        const fileName = isRoot ? 'index.html' : `pages/${item.id}.html`
        context.zip.file(fileName, finalHtml)
    }

    // Generate Zip
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.zip`)
}

// --- Helpers ---

async function processLinks(doc: Document, isRoot: boolean, ctx: ExportContext) {
    const relativePathPrefix = isRoot ? '' : '../'
    const pagesPrefix = isRoot ? 'pages/' : ''

    // SubNotaLink
    const subNotaLinks = doc.querySelectorAll('span[data-type="sub-nota-link"]')
    for (const el of Array.from(subNotaLinks)) {
        const targetId = el.getAttribute('data-target-nota-id')
        const targetTitle = el.textContent || el.getAttribute('data-target-nota-title') || 'Sub Nota'

        if (targetId) {
            const href = `${relativePathPrefix}${pagesPrefix}${targetId}.html`
            const a = document.createElement('a')
            a.href = href
            a.textContent = targetTitle
            a.className = 'nota-link sub-nota-link'
            el.replaceWith(a)

            await queueNotaIfNeeded(targetId, ctx)
        }
    }

    // PageLink (Internal Links)
    const links = doc.querySelectorAll('a')
    for (const a of Array.from(links)) {
        const href = a.getAttribute('href')
        const internalMatch = href?.match(/\/nota\/([a-zA-Z0-9_-]+)/)
        if (internalMatch && internalMatch[1]) {
            const targetId = internalMatch[1]
            a.setAttribute('href', `${relativePathPrefix}${pagesPrefix}${targetId}.html`)
            await queueNotaIfNeeded(targetId, ctx)
        }
    }
}

async function queueNotaIfNeeded(id: string, ctx: ExportContext) {
    if (ctx.fetchNota && !ctx.processedIds.has(id)) {
        ctx.processedIds.add(id)
        try {
            const fetched = await ctx.fetchNota(id)
            if (fetched) {
                ctx.queue.push({ id, ...fetched })
            }
        } catch (e) {
            console.error(`Failed to fetch sub-nota ${id}`, e)
        }
    }
}

function processAssets(doc: Document, relativePrefix: string, ctx: ExportContext) {
    // Images
    doc.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src')
        if (src && src.startsWith('data:image')) {
            const extension = src.split(';')[0].split('/')[1] || 'png'
            const filename = `image_${ctx.imgCounter++}.${extension}`
            const base64Data = src.split(',')[1]
            if (ctx.assetsFolder) ctx.assetsFolder.file(filename, base64Data, { base64: true })
            img.setAttribute('src', `${relativePrefix}assets/${filename}`)
        }
    })

    // Code Outputs
    doc.querySelectorAll('.export-code-output').forEach((div) => {
        const outputContent = div.getAttribute('data-output')
        if (!outputContent) return

        div.innerHTML = ''
        div.removeAttribute('data-output')
        div.classList.add('output')

        const imgMatch = outputContent.match(/src="(data:image\/[^;]+;base64[^"]+)"/)
        if (imgMatch && imgMatch[1]) {
            const src = imgMatch[1]
            const extension = src.split(';')[0].split('/')[1] || 'png'
            const filename = `output_${ctx.imgCounter++}.${extension}`
            const base64Data = src.split(',')[1]
            if (ctx.assetsFolder) ctx.assetsFolder.file(filename, base64Data, { base64: true })

            const img = document.createElement('img')
            img.setAttribute('src', `${relativePrefix}assets/${filename}`)
            div.appendChild(img)
        } else {
            if (/<[a-z][\s\S]*>/i.test(outputContent)) {
                div.innerHTML = outputContent
            } else {
                const pre = document.createElement('pre')
                pre.textContent = outputContent
                div.appendChild(pre)
            }
        }
    })
}

function processCustomBlocks(doc: Document) {
    // Math
    doc.querySelectorAll('div[data-type="math"]').forEach(div => {
        const latex = div.getAttribute('data-latex') || ''
        try { div.innerHTML = katex.renderToString(latex, { throwOnError: false }) } catch (e) { }
    })

    // Theorem
    doc.querySelectorAll('div[data-type-theorem]').forEach(div => {
        const title = div.getAttribute('data-title') || 'Theorem'
        const content = div.getAttribute('data-content') || ''
        const proof = div.getAttribute('data-proof') || ''
        const type = div.getAttribute('data-theorem-type') || 'theorem'
        const number = div.getAttribute('data-number')

        const container = document.createElement('div')
        container.className = 'theorem'

        const header = document.createElement('div')
        header.className = 'theorem-header'
        header.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)}${number ? ' ' + number : ''}: ${title}`
        container.appendChild(header)

        const contentDiv = document.createElement('div')
        contentDiv.className = 'theorem-content'
        // Handle basic markdown/latex in content if needed, for now just text or innerHTML if safely known
        // Since attributes are strings, we might want to assume they are plain text or simple markdown.
        // But for now let's just use textContent to be safe, or innerHTML if we trust it. 
        // Given it's from the editor, it might contain latex.
        // Let's rely on textContent for now or simple innerHTML replacement if it was rich text.
        // The input is from attributes, so it is likely plain text.
        contentDiv.textContent = content
        container.appendChild(contentDiv)

        if (proof) {
            const proofDiv = document.createElement('div')
            proofDiv.className = 'theorem-proof'
            proofDiv.style.marginTop = '0.5rem'
            proofDiv.innerHTML = `<strong>Proof:</strong> ${proof}`
            container.appendChild(proofDiv)
        }

        div.replaceWith(container)
    })

    // Nota Table
    doc.querySelectorAll('div[data-type="data-table"]').forEach(div => {
        const dataStr = div.getAttribute('data-table-data') || JSON.stringify(div.getAttribute('tableData'))
        if (dataStr && dataStr !== '[object Object]') {
            try {
                const data = JSON.parse(dataStr)
                const table = document.createElement('table')
                table.className = 'nota-data-table'
                const thead = document.createElement('thead')
                const tr = document.createElement('tr')
                data.columns.forEach((col: any) => {
                    const th = document.createElement('th'); th.textContent = col.title; tr.appendChild(th)
                })
                thead.appendChild(tr); table.appendChild(thead)
                const tbody = document.createElement('tbody')
                data.rows.forEach((row: any) => {
                    const r = document.createElement('tr')
                    data.columns.forEach((col: any) => {
                        const td = document.createElement('td'); td.textContent = row.cells[col.id] || ''; r.appendChild(td)
                    })
                    tbody.appendChild(r)
                })
                table.appendChild(tbody)
                div.replaceWith(table)
            } catch (e) { }
        }
    })

    // DrawIO
    doc.querySelectorAll('.drawio-diagram').forEach(div => {
        div.innerHTML = '<div class="drawio-placeholder">Diagram (Interactive Only)</div>'
    })

    // Confusion Matrix
    doc.querySelectorAll('confusion-matrix').forEach(el => {
        const matrixDataStr = el.getAttribute('data-matrix')
        const labelsStr = el.getAttribute('data-labels')
        const title = el.getAttribute('data-title') || 'Confusion Matrix'
        const container = document.createElement('div')
        container.className = 'confusion-matrix-block'
        const h4 = document.createElement('h4'); h4.textContent = title; container.appendChild(h4)
        if (matrixDataStr && labelsStr) {
            try {
                const matrix = JSON.parse(matrixDataStr); const labels = JSON.parse(labelsStr)
                const table = document.createElement('table'); table.className = 'confusion-matrix-table'
                const thead = document.createElement('thead'); const hr = document.createElement('tr'); hr.appendChild(document.createElement('th'))
                labels.forEach((l: string) => { const th = document.createElement('th'); th.textContent = l; hr.appendChild(th) })
                thead.appendChild(hr); table.appendChild(thead)
                const tbody = document.createElement('tbody')
                matrix.forEach((row: number[], i: number) => {
                    const tr = document.createElement('tr')
                    const th = document.createElement('th'); th.textContent = labels[i]; tr.appendChild(th)
                    row.forEach((v: number) => { const td = document.createElement('td'); td.textContent = v.toString(); tr.appendChild(td) })
                    tbody.appendChild(tr)
                })
                table.appendChild(tbody); container.appendChild(table)
            } catch (e) { }
        }
        el.replaceWith(container)
    })

    // Pipeline
    doc.querySelectorAll('div[data-type="pipeline"]').forEach(el => {
        const title = el.getAttribute('title') || 'Execution Pipeline'
        const div = document.createElement('div')
        div.className = 'pipeline-placeholder'
        div.innerHTML = `<h3>${title}</h3><p>Pipeline Visualization (Interactive Only)</p>`
        el.replaceWith(div)
    })

    // Bibliography
    const bibliographyBlock = doc.querySelector('div[data-type="bibliography"]')
    if (bibliographyBlock) {
        const citations = new Map<string, number>()
        doc.querySelectorAll('span[data-type="citation"]').forEach(span => {
            const key = span.getAttribute('data-citation-key')
            const num = span.getAttribute('data-citation-number')
            if (key && num) citations.set(key, parseInt(num))
        })
        const list = document.createElement('ul'); list.className = 'bibliography-list'
        Array.from(citations.entries()).sort((a, b) => a[1] - b[1]).forEach(([key, num]) => {
            const li = document.createElement('li'); li.className = 'bibliography-item'; li.textContent = `[${num}] ${key}`; list.appendChild(li)
        })
        bibliographyBlock.innerHTML = ''; bibliographyBlock.appendChild(list)
    }

    // YouTube
    doc.querySelectorAll('div[data-type="youtube"]').forEach(div => {
        const videoId = div.getAttribute('videoId')
        if (videoId) {
            const iframe = document.createElement('iframe')
            Object.assign(iframe, { width: '100%', height: '400', src: `https://www.youtube.com/embed/${videoId}`, frameBorder: '0', allowFullscreen: true })
            div.replaceWith(iframe)
        }
    })

    // Mermaid
    doc.querySelectorAll('div[data-type="mermaid"]').forEach(el => {
        // Styles handled by CSS class
        el.innerHTML = '<div class="mermaid-placeholder">Mermaid Diagram (Interactive Only)</div>'
    })

}

function processCitations(doc: Document, citations: any[]) {
    // map key -> citation data
    const citationMap = new Map(citations.map(c => [c.key, c]))
    const usedCitations = new Map<string, number>()
    let counter = 1

    // 1. Process inline citations
    doc.querySelectorAll('span[data-type="citation"]').forEach((span) => {
        const key = span.getAttribute('data-citation-key')
        if (key) {
            let num = usedCitations.get(key)
            if (!num) {
                num = counter++
                usedCitations.set(key, num)
            }

            // Update Number and Text
            span.setAttribute('data-citation-number', num.toString())
            span.textContent = `[${num}]`

            // Embed Metadata for Modal
            const data = citationMap.get(key)
            if (data) {
                span.setAttribute('data-citation-json', JSON.stringify(data))
                span.classList.add('citation-interactive')
            }
        }
    })

    // 2. Update Bibliography
    const bibliographyBlock = doc.querySelector('div[data-type="bibliography"]')
    if (bibliographyBlock) {
        if (usedCitations.size === 0) {
            bibliographyBlock.remove()
            return
        }

        const list = document.createElement('ul')
        list.className = 'bibliography-list'

        // Sort by number
        const sorted = Array.from(usedCitations.entries()).sort((a, b) => a[1] - b[1])

        sorted.forEach(([key, num]) => {
            const data = citationMap.get(key)
            const li = document.createElement('li')
            li.className = 'bibliography-item'
            li.id = `ref-${key}`

            let text = `[${num}] ${key}`
            if (data) {
                // Formatting logic (simplified APA-ish)
                const authors = data.authors?.map((a: any) => {
                    if (typeof a === 'string') return a
                    return `${a.family}, ${a.given}`
                }).join(' & ') || 'Unknown Author'
                const title = data.title || 'Untitled'
                const year = data.year || 'n.d.'
                text = `[${num}] ${authors} (${year}). ${title}.`
                if (data.journal) text += ` ${data.journal}`
                if (data.volume) text += `, ${data.volume}`
                if (data.pages) text += `, ${data.pages}`
                text += '.'
            }

            li.textContent = text
            list.appendChild(li)
        })

        bibliographyBlock.innerHTML = ''
        const title = document.createElement('h2')
        title.textContent = 'References'
        bibliographyBlock.appendChild(title)
        bibliographyBlock.appendChild(list)
    }
}


function processInlineLatex(doc: Document) {
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null)
    const nodesToReplace: { node: Text, fragments: DocumentFragment }[] = []

    let currentNode = walker.nextNode()
    while (currentNode) {
        if (currentNode.nodeValue && /\$[^$]+\$/.test(currentNode.nodeValue)) {
            // Found potential latex
            const text = currentNode.nodeValue
            const fragment = document.createDocumentFragment()
            let lastIndex = 0

            // Regex for $...$ (inline) and $$...$$ (display, though usually block)
            // Tiptap MarkdownExtension uses: /\$\$([^$]+)\$\$/g and /\$([^$\n]+)\$/g
            const regex = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g
            let match

            while ((match = regex.exec(text)) !== null) {
                // Add text before match
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
                }

                // Render Latex
                const latex = match[1] || match[2] // match[1] is display, match[2] is inline
                const isDisplay = !!match[1]
                try {
                    const span = document.createElement('span')
                    // Use katex directly or innerHTML if pre-rendered. 
                    // Since exportService imports katex, we render it.
                    span.innerHTML = katex.renderToString(latex, {
                        throwOnError: false,
                        displayMode: isDisplay
                    })
                    if (isDisplay) span.style.display = 'block'
                    fragment.appendChild(span)
                } catch (e) {
                    fragment.appendChild(document.createTextNode(match[0])) // Fallback to raw text
                }

                lastIndex = regex.lastIndex
            }

            // Add remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
            }

            if (fragment.childNodes.length > 0) {
                nodesToReplace.push({ node: currentNode as Text, fragments: fragment })
            }
        }
        currentNode = walker.nextNode()
    }

    // Replace nodes
    nodesToReplace.forEach(({ node, fragments }) => {
        node.parentNode?.replaceChild(fragments, node)
    })
}
