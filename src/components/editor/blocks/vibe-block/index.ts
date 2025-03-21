// Export all Vibe block components
import VibeBlock from './VibeBlock.vue'
import VibeTaskBoard from './VibeTaskBoard.vue'
import VibeTask from './VibeTask.vue'
import VibeExtension from '@/components/editor/extensions/VibeExtension'

// Re-export everything
export {
  VibeBlock,
  VibeTaskBoard,
  VibeTask,
  VibeExtension
}

// Export default extension
export default VibeExtension 