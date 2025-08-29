import { ref, onMounted, watch } from 'vue'
import { logger } from '@/services/logger'

declare global {
  interface Window {
    MathJax: any
    __MATHJAX_CONFIGURED__?: boolean
    __MATHJAX_LOADING__?: boolean
  }
}

// Initialize MathJax configuration once
if (typeof window !== 'undefined' && !window.__MATHJAX_CONFIGURED__) {
  window.MathJax = window.MathJax || {}
  window.MathJax.tex = window.MathJax.tex || {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
    processEnvironments: true
  }
  window.MathJax.svg = window.MathJax.svg || { fontCache: 'global' }
  window.MathJax.options = window.MathJax.options || {
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process'
  }
  window.MathJax.startup = window.MathJax.startup || {}
  // Only set ready handler if not already set
  if (!window.MathJax.startup.ready) {
    window.MathJax.startup.ready = () => {
      console.log('MathJax is loaded and ready')
      // Guard defaultReady call
      if (window.MathJax?.startup?.defaultReady) {
        window.MathJax.startup.defaultReady()
      }
    }
  }
  window.__MATHJAX_CONFIGURED__ = true
}

export function useMathJax() {
  const isMathJaxLoaded = ref(false)
  const error = ref<Error | null>(null)
  
  // Check if MathJax is loaded
  const checkMathJaxLoaded = () => {
    try {
      if (window.MathJax && (window.MathJax.tex2svg || window.MathJax.startup?.document)) {
        isMathJaxLoaded.value = true
        return true
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      logger.error('Error checking MathJax:', err)
    }
    return false
  }

  // Initialize MathJax (idempotent)
  const initMathJax = () => {
    return new Promise<boolean>((resolve) => {
      try {
        // Already loaded
        if (window.MathJax && window.MathJax.tex2svg) {
          isMathJaxLoaded.value = true
          resolve(true)
          return
        }

        // Already loading: wait until available
        const existing = document.querySelector('script[src*="mathjax@3/es5/tex-svg.js"]') as HTMLScriptElement | null
        if (existing) {
          const waitReady = () => {
            if (window.MathJax && window.MathJax.tex2svg) {
              isMathJaxLoaded.value = true
              resolve(true)
            } else {
              setTimeout(waitReady, 50)
            }
          }
          waitReady()
          return
        }

        if (window.__MATHJAX_LOADING__) {
          const waitReady = () => {
            if (window.MathJax && window.MathJax.tex2svg) {
              isMathJaxLoaded.value = true
              resolve(true)
            } else {
              setTimeout(waitReady, 50)
            }
          }
          waitReady()
          return
        }

        // Dynamically load MathJax once
        window.__MATHJAX_LOADING__ = true
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js'
        script.async = true
        script.onload = () => {
          const checkReady = () => {
            if (window.MathJax && window.MathJax.tex2svg) {
              isMathJaxLoaded.value = true
              window.__MATHJAX_LOADING__ = false
              resolve(true)
            } else {
              setTimeout(checkReady, 50)
            }
          }
          checkReady()
        }
        script.onerror = () => {
          error.value = new Error('Failed to load MathJax')
          logger.error('Failed to load MathJax script')
          window.__MATHJAX_LOADING__ = false
          resolve(false)
        }
        document.head.appendChild(script)
      } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err))
        logger.error('Error initializing MathJax:', err)
        resolve(false)
      }
    })
  }

  // Render LaTeX to SVG
  const renderLatex = (latex: string, element: HTMLElement | null, display = true) => {
    if (!element) return false
    if (!latex) {
      element.innerHTML = ''
      return true
    }
    
    if (!isMathJaxLoaded.value) {
      element.innerHTML = '<span class="text-muted-foreground">Loading math renderer...</span>'
      return false
    }
    
    try {
      const output = window.MathJax.tex2svg(latex, { display })
      if (output) {
        element.innerHTML = ''
        element.appendChild(output)
        return true
      } else {
        throw new Error('MathJax failed to render LaTeX')
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      logger.error('Error rendering LaTeX:', err)
      element.innerHTML = '<span class="text-destructive">Invalid LaTeX</span>'
      return false
    }
  }

  // Render inline LaTeX within a text string
  const renderLatexInline = (text: string) => {
    if (!text) return ''
    if (!isMathJaxLoaded.value) return text
    
    try {
      let result = text
      const inlineRegex = /\$([^\$]+)\$/g
      const displayRegex = /\$\$([^\$]+)\$\$/g
      
      result = result.replace(displayRegex, (match, latex) => {
        try {
          const output = window.MathJax.tex2svg(latex, { display: true })
          const tempDiv = document.createElement('div')
          tempDiv.appendChild(output.cloneNode(true))
          return `<div class="mathjax-display-wrapper">${tempDiv.innerHTML}</div>`
        } catch (err) {
          logger.error('Error rendering display LaTeX:', err)
          return `<span class="text-destructive">Invalid LaTeX: ${latex}</span>`
        }
      })
      
      result = result.replace(inlineRegex, (match, latex) => {
        try {
          const output = window.MathJax.tex2svg(latex, { display: false })
          const tempDiv = document.createElement('div')
          tempDiv.appendChild(output.cloneNode(true))
          return `<span class="mathjax-inline-wrapper" style="display:inline-flex;vertical-align:middle;">${tempDiv.innerHTML}</span>`
        } catch (err) {
          logger.error('Error rendering inline LaTeX:', err)
          return `<span class="text-destructive">Invalid LaTeX: ${latex}</span>`
        }
      })
      
      return result
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      logger.error('Error rendering inline LaTeX:', err)
      return text
    }
  }

  onMounted(() => {
    try {
      initMathJax()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      logger.error('Error in MathJax onMounted:', err)
    }
  })

  return {
    isMathJaxLoaded,
    renderLatex,
    renderLatexInline,
    initMathJax,
    error
  }
}








