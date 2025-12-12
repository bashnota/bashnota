import { EXPORT_STYLES } from '../styles/defaultStyles'

export function buildHtmlPage(title: string, bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <style>
${EXPORT_STYLES}

/* Citation Styles */
.citation-interactive {
    cursor: help;
    color: #4f46e5;
    text-decoration: none;
    border-bottom: 1px dotted #4f46e5;
    transition: color 0.2s;
}
.citation-interactive:hover {
    color: #4338ca;
    border-bottom-style: solid;
}

/* Tooltip Styles */
#citation-tooltip {
    display: none;
    position: absolute;
    z-index: 1000;
    background: white;
    padding: 16px;
    border-radius: 8px;
    width: 300px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e5e7eb;
    font-size: 0.875rem;
    pointer-events: none; /* Prevent tooltip from blocking mouse events */
}

#citation-tooltip.active {
    display: block;
}

.tooltip-title {
    font-weight: 600;
    color: #111827;
    margin-bottom: 4px;
    line-height: 1.4;
}

.tooltip-authors {
    color: #4b5563;
    font-style: italic;
    margin-bottom: 8px;
    font-size: 0.8rem;
}

.tooltip-meta {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    font-size: 0.75rem;
    color: #6b7280;
    border-top: 1px solid #f3f4f6;
    padding-top: 8px;
}

.tooltip-label {
    font-weight: 500;
    color: #374151;
}
    </style>
</head>
<body>
    <article>
        <h1>${title}</h1>
        ${bodyContent}
    </article>

    <!-- Shared Tooltip Element -->
    <div id="citation-tooltip"></div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const tooltip = document.getElementById('citation-tooltip');
            
            // Positioning logic
            function updatePosition(e) {
                if (!tooltip) return;
                const x = e.pageX + 10;
                const y = e.pageY + 10;
                
                const viewportWidth = window.innerWidth;
                const tooltipWidth = 320;
                
                let finalX = x;
                if (x + tooltipWidth > viewportWidth) {
                    finalX = e.pageX - tooltipWidth - 10;
                }
                
                tooltip.style.left = finalX + 'px';
                tooltip.style.top = y + 'px';
            }

            // Event Delegation for Citations
            document.body.addEventListener('mouseover', (e) => {
                const target = e.target.closest('.citation-interactive');
                if (target) {
                    const dataStr = target.getAttribute('data-citation-json');
                    if (!dataStr) return;

                    try {
                        const data = JSON.parse(dataStr);
                        const authors = data.authors ? data.authors.map(a => typeof a === 'string' ? a : \`\${a.given} \${a.family}\`).join(', ') : 'Unknown Author';
                        
                        let metaHtml = '<div class="tooltip-meta">';
                        if (data.year) metaHtml += \`<div class="tooltip-label">Year</div><div>\${data.year}</div>\`;
                        if (data.journal) metaHtml += \`<div class="tooltip-label">Journal</div><div>\${data.journal}</div>\`;
                        metaHtml += '</div>';

                        tooltip.innerHTML = \`
                            <div class="tooltip-title">\${data.title || 'Untitled'}</div>
                            <div class="tooltip-authors">\${authors}</div>
                            \${metaHtml}
                        \`;

                        tooltip.classList.add('active');
                        updatePosition(e);
                    } catch (err) {
                        console.error('Error parsing citation data', err);
                    }
                }
            });

            document.body.addEventListener('mousemove', (e) => {
                if (tooltip && tooltip.classList.contains('active')) {
                    updatePosition(e);
                }
            });

            document.body.addEventListener('mouseout', (e) => {
                const target = e.target.closest('.citation-interactive');
                if (target) {
                    tooltip.classList.remove('active');
                }
            });
        });
    </script>
</body>
</html>`
}
