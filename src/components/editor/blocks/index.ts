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
}

// Export a map of all extensions for easier registration
export const blockExtensions = {
  image: ImageExtension,
  subfigure: SubfigureExtension,
}

export default blockExtensions 