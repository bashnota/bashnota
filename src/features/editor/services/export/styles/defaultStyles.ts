export const EXPORT_STYLES = `
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  line-height: 1.6;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
}

pre {
  background: #f4f4f4;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 0.9em;
  background: #f4f4f4;
  padding: 0.2em 0.4em;
  border-radius: 3px;
}

pre code {
  padding: 0;
  background: transparent;
}

.output {
  margin-top: 0.5rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
}

.output img {
  max-width: 100%;
}

blockquote {
  border-left: 4px solid #ddd;
  margin: 0;
  padding-left: 1rem;
  color: #666;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

td, th {
  border: 1px solid #ddd;
  padding: 0.5rem;
  text-align: left;
}

th {
  background: #f9f9f9;
}

.math-block {
  text-align: center;
  margin: 1rem 0;
  overflow-x: auto;
}

h1, h2, h3, h4, h5, h6 {
  margin-top: 2rem;
}

a {
  color: #007bff;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Custom Block Styling */
.theorem {
  border: 1px solid #e2e8f0;
  border-left: 4px solid #3b82f6; /* Blue accent */
  border-radius: 4px;
  padding: 1rem;
  margin: 1.5rem 0;
  background: #f8fafc;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.theorem-header {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.theorem-content {
  font-style: normal; /* Often theorem content is normal text, sometimes italic. Let's stick to normal for readability or follow user preference if known. Defaulting to normal but slightly distinguished. */
  color: #334155;
}


.citation-reference {
  color: #007bff;
  cursor: pointer;
  font-size: 0.8em;
  vertical-align: super;
}

.bibliography-block {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 2px solid #eee;
}

.bibliography-list {
    list-style: none;
    padding: 0;
}

.bibliography-item {
    margin-bottom: 0.5rem;
}

.nota-data-table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

.nota-data-table td, .nota-data-table th {
  border: 1px solid #dddddd;
  text-align: left;
  padding: 8px;
}

.nota-data-table th {
  background-color: #f9f9f9;
}

.confusion-matrix-table {
  border-collapse: collapse;
  margin: 1rem auto;
}

.confusion-matrix-table td, .confusion-matrix-table th {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: center;
}

.confusion-matrix-cell-high {
  background-color: #d1fae5;
}

.confusion-matrix-cell-medium {
  background-color: #fef3c7;
}

.confusion-matrix-cell-low {
  background-color: #fee2e2;
}

.pipeline-placeholder {
    border: 1px dashed #ccc;
    padding: 2rem;
    text-align: center;
    background: #f9f9f9;
    margin: 1rem 0;
    color: #666;
}

.drawio-placeholder {
    border: 1px solid #ccc;
    padding: 1rem;
    background: #f0f0f0;
    text-align: center;
}

.mermaid-placeholder {
    background: #f0f0f8;
    border: 1px solid #d0d0e0;
    padding: 1rem;
    border-radius: 4px;
    text-align: center;
}

/* Syntax Highlighting Helper - simplified */
.hljs-keyword { color: #d73a49; }
.hljs-string { color: #032f62; }
.hljs-title { color: #6f42c1; }
.hljs-comment { color: #6a737d; }

/* Task List */
ul[data-type="taskList"] {
  list-style: none;
  padding: 0;
}
li[data-type="taskItem"] {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}
li[data-type="taskItem"] > label {
  margin-right: 0.5rem;
  user-select: none;
}
li[data-type="taskItem"] > div {
  flex: 1;
}
`
