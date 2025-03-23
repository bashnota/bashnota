// Export all block components and extensions
import SubfigureExtension, {
  SubfigureBlock,
  SubfigureControls,
  SubfigureGrid,
  SubfigureItem,
  SubfigureCaption,
} from './subfigure-block'

import MathExtension, {
  MathBlock,
  MathDisplay,
  MathInput,
} from './math-block'

import Citation from './Citation.vue'
import Bibliography from './Bibliography.vue'

// Re-export everything
export {
  // Subfigure block components
  SubfigureExtension,
  SubfigureBlock,
  SubfigureControls,
  SubfigureGrid,
  SubfigureItem,
  SubfigureCaption,

  // Math block components
  MathExtension,
  MathBlock,
  MathDisplay,
  MathInput,
  
  // Citation components
  Citation,
  Bibliography,
}

// Export a map of all extensions for easier registration
export const blockExtensions = {
  subfigure: SubfigureExtension,
  math: MathExtension,
}

export default blockExtensions 