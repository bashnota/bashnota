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
    </style>
</head>
<body>
    <article>
        <h1>${title}</h1>
        ${bodyContent}
    </article>
</body>
</html>`
}
