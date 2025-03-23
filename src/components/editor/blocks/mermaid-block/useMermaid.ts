import { ref, watch, nextTick, computed } from 'vue'
import mermaid from 'mermaid'
import type { Ref } from 'vue'
import type { MermaidTheme } from './types'

export interface UseMermaidOptions {
  theme?: MermaidTheme;
  securityLevel?: 'strict' | 'loose' | 'antiscript';
}

const DEFAULT_OPTIONS: UseMermaidOptions = {
  theme: 'default',
  securityLevel: 'strict'
}

// Helper function to ensure content is a string
function ensureString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'object' && 'diagram' in value) {
    return value.diagram || '';
  }
  
  try {
    return String(value);
  } catch (e) {
    console.error('Could not convert value to string:', e);
    return '';
  }
}

// Extract useful error information from mermaid errors
function extractErrorDetails(error: any): string {
  if (!error) return 'Unknown error';
  
  // Handle different error object formats
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle mermaid's custom error object format
  if (typeof error === 'object') {
    if (error.str) return error.str;
    if (error.message) return error.message;
    if (error.error && error.error.message) return error.error.message;
  }
  
  try {
    return JSON.stringify(error);
  } catch (e) {
    return 'Error rendering diagram';
  }
}

export function useMermaid(content: Ref<string | undefined | any>, options: UseMermaidOptions = DEFAULT_OPTIONS) {
  const mermaidRef = ref<HTMLElement | null>(null)
  const renderError = ref<string | null>(null)
  const isRendering = ref(false)
  
  // Ensure content is always a string
  const safeContent = computed(() => ensureString(content.value))

  // Initialize mermaid with the options
  const initializeMermaid = () => {
    mermaid.initialize({
      startOnLoad: true,
      theme: options.theme || DEFAULT_OPTIONS.theme,
      securityLevel: options.securityLevel || DEFAULT_OPTIONS.securityLevel
    })
  }

  const renderMermaid = async () => {
    if (!mermaidRef.value) return
    
    const diagramCode = safeContent.value
    if (!diagramCode) return

    isRendering.value = true
    renderError.value = null

    try {
      initializeMermaid()
      mermaidRef.value.innerHTML = diagramCode

      await mermaid.run({
        nodes: [mermaidRef.value],
      })
    } catch (error) {
      console.error('Error rendering mermaid diagram:', error)
      renderError.value = extractErrorDetails(error)
    } finally {
      isRendering.value = false
    }
  }

  // Watch for content changes to re-render
  watch(safeContent, () => {
    nextTick(() => renderMermaid())
  }, { immediate: false })

  // Helper function to check if content is valid
  const validateContent = (diagramCode: string): Promise<[boolean, string | null]> => {
    return new Promise((resolve) => {
      try {
        if (!diagramCode) {
          resolve([false, 'Empty diagram code']);
          return;
        }
        
        const safeDiagramCode = ensureString(diagramCode);
        
        try {
          mermaid.parse(safeDiagramCode);
          resolve([true, null]);
        } catch (error) {
          const errorMessage = extractErrorDetails(error);
          resolve([false, errorMessage]);
        }
      } catch (error) {
        const errorMessage = extractErrorDetails(error);
        resolve([false, errorMessage]);
      }
    });
  };

  return {
    mermaidRef,
    renderMermaid,
    renderError,
    isRendering,
    validateContent
  }
} 