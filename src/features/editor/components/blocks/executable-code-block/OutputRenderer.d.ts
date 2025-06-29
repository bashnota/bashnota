declare module './OutputRenderer.vue' {
  import { DefineComponent } from 'vue'
  
  const OutputRenderer: DefineComponent<{
    content: string
    type?: 'text' | 'html' | 'json' | 'table' | 'image' | 'error'
    showControls?: boolean
    maxHeight?: string
    isCollapsible?: boolean
    isFullscreenable?: boolean
    originalCode?: string
  }, {}, any>
  
  export default OutputRenderer
} 








