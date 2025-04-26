import { ref, onMounted, watch } from 'vue'
import 'mathjax/es5/tex-svg'
import { logger } from '@/services/logger'

declare global {
  interface Window {
    MathJax: any
  }
}

export function useMathJax() {
  const isMathJaxLoaded = ref(false)
  const error = ref<Error | null>(null)
  
  // Check if MathJax is loaded
  const checkMathJaxLoaded = () => {
    try {
      if (window.MathJax) {
        isMathJaxLoaded.value = true
        return true
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      logger.error('Error checking MathJax:', err)
    }
    return false
  }

  // Initialize MathJax
  const initMathJax = () => {
    return new Promise<boolean>((resolve) => {
      const check = () => {
        try {
          if (checkMathJaxLoaded()) {
            resolve(true)
          } else {
            setTimeout(check, 100)
          }
        } catch (err) {
          error.value = err instanceof Error ? err : new Error(String(err))
          logger.error('Error initializing MathJax:', err)
          resolve(false)
        }
      }
      check()
    })
  }

  // Render LaTeX to SVG
  const renderLatex = (latex: string, element: HTMLElement | null, display = true) => {
    if (!element) return false
    if (!latex) {
      // Clear the element if no LaTeX
      if (element) element.innerHTML = ''
      return true
    }
    
    if (!isMathJaxLoaded.value) {
      element.innerHTML = '<span class="text-muted-foreground">Loading math renderer...</span>'
      return false
    }
    
    try {
      const output = window.MathJax.tex2svg(latex, { display })
      element.innerHTML = ''
      element.appendChild(output)
      return true
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
      // Process the string to find and replace LaTeX expressions
      let result = text
      let inlineRegex = /\$([^\$]+)\$/g
      let displayRegex = /\$\$([^\$]+)\$\$/g
      
      // Replace display mode LaTeX ($$...$$)
      result = result.replace(displayRegex, (match, latex) => {
        try {
          const output = window.MathJax.tex2svg(latex, { display: true })
          // Convert the SVG node to a string
          const tempDiv = document.createElement('div')
          tempDiv.appendChild(output.cloneNode(true))
          // Add a wrapper div with proper styling to avoid line breaks
          return `<div class="mathjax-display-wrapper">${tempDiv.innerHTML}</div>`
        } catch (err) {
          logger.error('Error rendering display LaTeX:', err)
          return `<span class="text-destructive">Invalid LaTeX: ${latex}</span>`
        }
      })
      
      // Replace inline mode LaTeX ($...$)
      result = result.replace(inlineRegex, (match, latex) => {
        try {
          const output = window.MathJax.tex2svg(latex, { display: false })
          // Convert the SVG node to a string
          const tempDiv = document.createElement('div')
          tempDiv.appendChild(output.cloneNode(true))
          // Add a span wrapper with proper styling to keep inline math truly inline
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
      return text // Return original text on error
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