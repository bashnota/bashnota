<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'

interface Props {
  content: string
  type: 'html' | 'dataframe' | 'matplotlib' | 'widget'
  height?: string
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '400px',
  width: '100%'
})

const iframeRef = ref<HTMLIFrameElement | null>(null)
const isLoaded = ref(false)

const updateIframeContent = async () => {
  if (!iframeRef.value || !props.content) return

  try {
    const iframe = iframeRef.value
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    // Create a complete HTML document with basic styling
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Output</title>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #374151;
      background: white;
      overflow-x: auto;
    }
    
    /* Table styling for DataFrames */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 0;
    }
    
    table th,
    table td {
      border: 1px solid #e5e7eb;
      padding: 8px 12px;
      text-align: left;
    }
    
    table th {
      background-color: #f9fafb;
      font-weight: 600;
    }
    
    table tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    /* Image styling */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }
    
    /* Plot styling */
    .plotly-graph-div {
      width: 100% !important;
      height: auto !important;
    }
    
    /* Widget styling */
    .widget-container {
      width: 100%;
      overflow-x: auto;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      body {
        padding: 8px;
        font-size: 12px;
      }
      
      table th,
      table td {
        padding: 4px 8px;
      }
    }
  </style>
</head>
<body>
  ${props.content}
  
  <scr` + `ipt>
    // Auto-resize iframe based on content
    function resizeIframe() {
      try {
        const height = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        );
        
        // Send height to parent window
        if (window.parent) {
          window.parent.postMessage({
            type: 'iframe-resize',
            height: height + 20 // Add some padding
          }, '*');
        }
      } catch (e) {
        console.error('Error resizing iframe:', e);
      }
    }
    
    // Resize on load and when content changes
    window.addEventListener('load', resizeIframe);
    window.addEventListener('resize', resizeIframe);
    
    // Watch for dynamic content changes
    const observer = new MutationObserver(resizeIframe);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    
    // Initial resize
    setTimeout(resizeIframe, 100);
  </scr` + `ipt>
</body>
</html>`

    // Write content to iframe
    doc.open()
    doc.write(htmlContent)
    doc.close()
    
    isLoaded.value = true
  } catch (error) {
    console.error('Error updating iframe content:', error)
  }
}

// Handle iframe resize messages
const handleMessage = (event: MessageEvent) => {
  if (event.data.type === 'iframe-resize' && iframeRef.value) {
    const newHeight = Math.min(event.data.height, 600) // Max height of 600px
    iframeRef.value.style.height = `${newHeight}px`
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
  nextTick(() => {
    updateIframeContent()
  })
})

watch(() => props.content, () => {
  updateIframeContent()
})

watch(() => props.type, () => {
  updateIframeContent()
})
</script>

<template>
  <div class="iframe-output-container">
    <iframe
      ref="iframeRef"
      :width="width"
      :height="height"
      frameborder="0"
      sandbox="allow-scripts allow-same-origin"
      class="output-iframe"
      title="Code execution output"
    ></iframe>
    
    <!-- Loading state -->
    <div v-if="!isLoaded" class="iframe-loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading output...</div>
    </div>
  </div>
</template>

<style scoped>
.iframe-output-container {
  position: relative;
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.output-iframe {
  width: 100%;
  display: block;
  transition: height 0.2s ease;
  min-height: 100px;
}

.iframe-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(249, 250, 251, 0.9);
  backdrop-filter: blur(2px);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

.loading-text {
  font-size: 14px;
  color: #6b7280;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .iframe-output-container {
    border-color: #374151;
    background: #1f2937;
  }
  
  .iframe-loading {
    background: rgba(31, 41, 55, 0.9);
  }
  
  .loading-text {
    color: #9ca3af;
  }
  
  .loading-spinner {
    border-color: #374151;
    border-top-color: #60a5fa;
  }
}
</style> 