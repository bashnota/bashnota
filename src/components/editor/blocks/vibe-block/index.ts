// Export all Vibe block components
import VibeBlock from './VibeBlock.vue'
import VibeExtension from '@/components/editor/extensions/VibeExtension'

// Import modular components
import * as VibeComponents from './components'

// Re-export everything
export {
  VibeBlock,
  VibeExtension,
  VibeComponents
}

// Export default extension
export default VibeExtension 