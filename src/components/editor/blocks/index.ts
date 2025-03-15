// Export all block components and extensions
import ImageExtension, {
  ImageBlock,
  ImageControls,
  ImageDisplay,
  ImageCaption,
} from './image-block'

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

// Re-export everything
export {
  // Image block components
  ImageExtension,
  ImageBlock,
  ImageControls,
  ImageDisplay,
  ImageCaption,
  
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
}

// Export a map of all extensions for easier registration
export const blockExtensions = {
  image: ImageExtension,
  subfigure: SubfigureExtension,
  math: MathExtension,
}

export default blockExtensions 