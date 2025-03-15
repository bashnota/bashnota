import { ref, onMounted, watch } from 'vue'
import 'mathjax/es5/tex-svg'

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
      console.error('Error checking MathJax:', err)
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
          console.error('Error initializing MathJax:', err)
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
      console.error('Error rendering LaTeX:', err)
      element.innerHTML = '<span class="text-destructive">Invalid LaTeX</span>'
      return false
    }
  }

  onMounted(() => {
    try {
      initMathJax()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      console.error('Error in MathJax onMounted:', err)
    }
  })

  return {
    isMathJaxLoaded,
    renderLatex,
    initMathJax,
    error
  }
} 