# Confusion Matrix Extension for Tiptap

A comprehensive Tiptap extension for visualizing confusion matrices with advanced statistical analysis, interactive visualizations, and dual data source support.

## Features

### 🎯 Core Functionality
- **Interactive Confusion Matrix**: Color-coded matrix with hover effects and tooltips
- **Comprehensive Statistics**: Accuracy, precision, recall, F1-score, specificity, and more
- **Dual Data Sources**: CSV file upload or Jupyter server integration
- **Sample Data**: Built-in sample data for testing and demonstration

### 📊 Visualizations
- **Interactive Matrix Display**: Hover highlighting, percentage/count toggle, normalization options
- **Statistical Charts**: Scatter plots, bar charts, doughnut charts, radar charts
- **Performance Metrics**: Class-wise and overall performance analysis
- **Error Analysis**: Top errors identification and recommendations

### 🔧 Technical Features
- **TypeScript Support**: Full type safety with comprehensive interfaces
- **Vue 3 Composition API**: Modern reactive architecture
- **Chart.js Integration**: Professional data visualizations
- **Modular Design**: Clean separation of concerns
- **Error Handling**: Comprehensive validation and error reporting

## Installation

The extension is already integrated into the project. It's automatically loaded with the editor extensions.

## Usage

### Adding a Confusion Matrix

1. **Via Slash Command**: Type `/confusion` or `/matrix` in the editor
2. **Via Menu**: Use the block insertion menu and select "Confusion Matrix"

### Data Sources

#### 1. CSV File Upload
- Drag and drop CSV files or click to browse
- Supports files up to 10MB
- Automatic validation and parsing
- Expected format: Square matrix with class labels as headers

```csv
,Cat,Dog,Bird
Cat,85,3,2
Dog,4,78,1
Bird,1,2,87
```

#### 2. Jupyter Server Integration
- Connect to local or remote Jupyter servers
- Browse file system and filter CSV files
- Auto-discovery of local Jupyter instances
- Real-time file content preview

#### 3. Sample Data
- Pre-loaded 3-class animal classification example
- Perfect for testing and demonstration
- Includes realistic confusion matrix data

### Interactive Features

#### Matrix Display
- **Color Coding**: Green for correct predictions, red for errors
- **Hover Effects**: Row/column highlighting with detailed tooltips
- **View Options**: Toggle between counts and percentages
- **Normalization**: Row-wise, column-wise, or total normalization

#### Statistics Panel
- **Overview Cards**: Key metrics at a glance
- **Class Metrics Table**: Per-class precision, recall, F1-score
- **Charts Tab**: Multiple visualization types
- **Analysis Tab**: Performance assessment and recommendations

## API Reference

### Extension Commands

```typescript
// Insert a new confusion matrix
editor.commands.insertConfusionMatrix({
  data: number[][],      // Optional: matrix data
  labels: string[],      // Optional: class labels
  title: string,         // Optional: block title
  source: 'upload' | 'jupyter', // Optional: data source
  filePath: string       // Optional: file path for Jupyter source
})
```

### Node Attributes

```typescript
interface ConfusionMatrixAttributes {
  data: number[][] | null        // Matrix data
  labels: string[]               // Class labels
  title: string                  // Block title
  source: 'upload' | 'jupyter' | 'sample' // Data source
  filePath: string               // File path (for Jupyter)
  stats: ConfusionMatrixStats | null // Cached statistics
}
```

### Statistics Interface

```typescript
interface ConfusionMatrixStats {
  accuracy: number
  errorRate: number
  totalSamples: number
  classCount: number
  classMetrics: ClassMetrics[]
  macroAverage: {
    precision: number
    recall: number
    f1Score: number
    specificity: number
  }
  weightedAverage: {
    precision: number
    recall: number
    f1Score: number
    specificity: number
  }
  topErrors: ErrorAnalysis[]
}
```

## File Structure

```
src/components/editor/blocks/confusion-matrix/
├── index.ts                           # Main exports
├── ConfusionMatrixExtension.ts        # Tiptap extension
├── ConfusionMatrixBlock.vue           # Main component
├── README.md                          # This file
├── components/
│   ├── FileUpload.vue                 # CSV upload component
│   ├── JupyterFileBrowser.vue         # Jupyter integration
│   ├── InteractiveMatrix.vue          # Matrix visualization
│   └── StatsVisualization.vue         # Statistics and charts
├── services/
│   └── jupyterService.ts              # Jupyter server management
└── utils/
    └── confusionMatrixUtils.ts        # Utility functions
```

## Component Details

### ConfusionMatrixBlock.vue
Main wrapper component that orchestrates all functionality:
- Data source management
- Settings panel
- Error handling
- State synchronization

### FileUpload.vue
Handles CSV file upload with:
- Drag and drop interface
- File validation (type, size, format)
- Live preview with mini-matrix
- Comprehensive error reporting

### JupyterFileBrowser.vue
Jupyter server integration featuring:
- Server connection management
- File system navigation
- CSV filtering and preview
- Auto-discovery of local servers

### InteractiveMatrix.vue
Advanced matrix visualization with:
- Color-coded cells (green=correct, red=errors)
- Hover effects and tooltips
- Row/column highlighting
- View toggles (counts/percentages, normalization)

### StatsVisualization.vue
Comprehensive statistics display:
- Overview metrics cards
- Detailed class metrics table
- Multiple chart types (scatter, bar, doughnut, radar)
- Performance analysis and recommendations

## Utility Functions

### confusionMatrixUtils.ts
Core utility functions:
- `calculateConfusionMatrixStats()`: Comprehensive metrics calculation
- `parseCSVToMatrix()`: CSV parsing with validation
- `generateSampleConfusionMatrix()`: Sample data generation
- `validateConfusionMatrix()`: Matrix validation
- `formatNumber()`: Number formatting utilities

### jupyterService.ts
Jupyter server management:
- `addJupyterServer()`: Add server configuration
- `testJupyterConnection()`: Test server connectivity
- `browseJupyterFiles()`: File system navigation
- `fetchJupyterFileContent()`: File content retrieval
- `discoverLocalJupyterServers()`: Auto-discovery

## Styling

The extension uses Tailwind CSS for styling with:
- Consistent design system
- Responsive layouts
- Hover and focus states
- Color-coded visualizations
- Professional appearance

## Error Handling

Comprehensive error handling includes:
- File validation errors
- Network connectivity issues
- Data parsing errors
- Matrix validation failures
- User-friendly error messages

## Performance Considerations

- **Lazy Loading**: Components loaded on demand
- **Computed Properties**: Efficient reactive calculations
- **Cached Statistics**: Avoid recalculation when possible
- **Optimized Rendering**: Efficient DOM updates

## Browser Compatibility

- Modern browsers with ES2020 support
- Vue 3 compatible environments
- Chart.js supported browsers
- File API support required for uploads

## Contributing

When contributing to this extension:

1. Follow the existing code style and patterns
2. Add comprehensive TypeScript types
3. Include error handling for all operations
4. Write descriptive commit messages
5. Test with various data sources and edge cases

## License

This extension is part of the Bashnota project and follows the same license terms. 