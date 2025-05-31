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

import TheoremExtension, {
  TheoremBlock,
} from './theorem-block'

import {
  ConfusionMatrixExtension,
  ConfusionMatrixBlock,
  FileUpload,
  JupyterFileBrowser,
  InteractiveMatrix,
  StatsVisualization,
} from './confusion-matrix'

import Citation from './Citation.vue'
import Bibliography from './Bibliography.vue'
import SubNotaDialog from './SubNotaDialog.vue'

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

  // Theorem block components
  TheoremExtension,
  TheoremBlock,
  
  // Citation components
  Citation,
  Bibliography,
  
  // Dialog components
  SubNotaDialog,

  // Confusion Matrix components
  ConfusionMatrixExtension,
  ConfusionMatrixBlock,
  FileUpload,
  JupyterFileBrowser,
  InteractiveMatrix,
  StatsVisualization,
}

// Export a map of all extensions for easier registration
export const blockExtensions = {
  subfigure: SubfigureExtension,
  math: MathExtension,
  theorem: TheoremExtension,
  confusionMatrix: ConfusionMatrixExtension,
}

export default blockExtensions