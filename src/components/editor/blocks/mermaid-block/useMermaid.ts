import { ref, watch, nextTick } from 'vue'
import mermaid from 'mermaid'
import type { Ref } from 'vue'

export function useMermaid(content: Ref<string | undefined>) {
  const mermaidRef = ref<HTMLElement | null>(null)

  const renderMermaid = async () => {
    if (!mermaidRef.value || !content.value) return

    try {
      mermaidRef.value.innerHTML = content.value

      mermaid.initialize({ startOnLoad: true })
      await mermaid.run({
        nodes: [mermaidRef.value],
      })
    } catch (error) {
      console.error('Error rendering mermaid diagram:', error)
    }
  }

  watch(content, () => {
    nextTick(() => renderMermaid())
  })

  return {
    mermaidRef,
    renderMermaid
  }
} 