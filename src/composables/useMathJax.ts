import { ref, onMounted, watch } from 'vue'
import 'mathjax/es5/tex-svg'

declare global {
  interface Window {
    MathJax: any
  }
}

export function useMathJax() {
  const isMathJaxLoaded = ref(false)
  
  // Check if MathJax is loaded
  const checkMathJaxLoaded = () => {
    if (window.MathJax) {
      isMathJaxLoaded.value = true
      return true
    }
    return false
  }

  // Initialize MathJax
  const initMathJax = () => {
    return new Promise<boolean>((resolve) => {
      const check = () => {
        if (checkMathJaxLoaded()) {
          resolve(true)
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })
  }

  // Render LaTeX to SVG
  const renderLatex = (latex: string, element: HTMLElement | null, display = true) => {
    if (!element || !latex || !isMathJaxLoaded.value) return false
    
    try {
      const output = window.MathJax.tex2svg(latex, { display })
      element.innerHTML = ''
      element.appendChild(output)
      return true
    } catch (error) {
      console.error('Error rendering LaTeX:', error)
      element.innerHTML = '<span style="color: red;">Invalid LaTeX</span>'
      return false
    }
  }

  onMounted(() => {
    initMathJax()
  })

  return {
    isMathJaxLoaded,
    renderLatex,
    initMathJax
  }
} 