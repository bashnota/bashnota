<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/github-dark.css';
import hljs from 'highlight.js';

const props = defineProps<{
  content: string;
  class?: string;
}>();

const htmlContent = ref('');

// Configure marked with highlight.js for code syntax highlighting
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // Enable GitHub Flavored Markdown
});

// Extend marked with a custom renderer for syntax highlighting
marked.use({
  renderer: {
    code(codeObj) {
      const { text: code, lang: language } = codeObj;
      const lang = language || '';
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre><code class="hljs ${lang}">${hljs.highlight(code, { language: lang }).value}</code></pre>`;
        } catch (error) {
          console.error('Highlight error:', error);
        }
      }
      return `<pre><code class="hljs">${hljs.highlightAuto(code).value}</code></pre>`;
    },
  },
});

// Process markdown content
const processContent = async () => {
  try {
    // Convert markdown to HTML
    const rawHtml = await marked.parse(props.content);
    
    // Sanitize HTML to prevent XSS
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
        'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
        'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span', 'img'
      ],
      ALLOWED_ATTR: [
        'href', 'name', 'target', 'class', 'id', 'style', 'alt', 'src'
      ]
    });
    
    htmlContent.value = cleanHtml;
  } catch (error) {
    console.error('Error processing markdown:', error);
    // Fallback to plain text if something goes wrong
    htmlContent.value = `<p>${props.content}</p>`;
  }
};

// Process content initially and when it changes
onMounted(() => {
  processContent();
});

watch(() => props.content, () => {
  processContent();
});
</script>

<template>
  <div 
    class="markdown-content"
    :class="props.class"
    v-html="htmlContent"
  ></div>
</template>

<style>
.markdown-content {
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
}

.markdown-content pre {
  background-color: hsl(var(--muted));
  border-radius: 6px;
  padding: 1em;
  overflow-x: auto;
  position: relative;
  margin: 1em 0;
}

.markdown-content code {
  font-family: 'Courier New', Consolas, monospace;
  font-size: 0.9em;
  background-color: hsl(var(--muted));
  border-radius: 4px;
  padding: 0.2em 0.4em;
}

.markdown-content pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  display: block;
  border-left: 3px solid hsl(var(--primary));
}

.markdown-content ul, .markdown-content ol {
  padding-left: 2em;
  margin: 0.5em 0;
}

.markdown-content ul {
  list-style-type: disc;
}

.markdown-content ol {
  list-style-type: decimal;
}

.markdown-content li {
  margin-bottom: 0.25em;
}

.markdown-content a {
  color: hsl(var(--primary));
  text-decoration: underline;
}

.markdown-content blockquote {
  border-left: 4px solid hsl(var(--primary));
  padding-left: 1em;
  margin-left: 0;
  margin-right: 0;
  font-style: italic;
  color: hsl(var(--muted-foreground));
}

.markdown-content h1, .markdown-content h2, .markdown-content h3, 
.markdown-content h4, .markdown-content h5, .markdown-content h6 {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-content h1 { font-size: 1.5em; }
.markdown-content h2 { font-size: 1.3em; }
.markdown-content h3 { font-size: 1.1em; }
.markdown-content h4 { font-size: 1em; }

.markdown-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-content th, .markdown-content td {
  border: 1px solid hsl(var(--border));
  padding: 0.5em;
  text-align: left;
}

.markdown-content th {
  background-color: hsl(var(--muted));
  font-weight: 600;
}

.markdown-content img {
  max-width: 100%;
  height: auto;
}

.markdown-content hr {
  border: 0;
  border-top: 1px solid hsl(var(--border));
  margin: 1em 0;
}

.markdown-content p {
  margin-bottom: 0.75em;
  line-height: 1.6;
}
</style>








