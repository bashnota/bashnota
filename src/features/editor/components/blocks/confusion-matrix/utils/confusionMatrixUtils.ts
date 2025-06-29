export interface ConfusionMatrixStats {
  accuracy: number
  precision: number[]
  recall: number[]
  f1Score: number[]
  specificity: number[]
  classMetrics: {
    className: string
    precision: number
    recall: number
    f1Score: number
    specificity: number
    truePositives: number
    falsePositives: number
    trueNegatives: number
    falseNegatives: number
    support: number
  }[]
  macroAvg: {
    precision: number
    recall: number
    f1Score: number
    specificity: number
  }
  weightedAvg: {
    precision: number
    recall: number
    f1Score: number
    specificity: number
  }
  totalSamples: number
  errorRate: number
}

export interface ConfusionMatrixData {
  matrix: number[][]
  labels: string[]
  title?: string
}

/**
 * Calculate comprehensive statistics from a confusion matrix
 */
export function calculateConfusionMatrixStats(
  matrix: number[][],
  labels: string[]
): ConfusionMatrixStats {
  const numClasses = matrix.length
  const classMetrics: ConfusionMatrixStats['classMetrics'] = []
  
  // Calculate per-class metrics
  for (let i = 0; i < numClasses; i++) {
    const className = labels[i] || `Class ${i}`
    
    // True positives: diagonal element
    const truePositives = matrix[i][i]
    
    // False positives: sum of column i excluding diagonal
    const falsePositives = matrix.reduce((sum, row, rowIndex) => 
      rowIndex !== i ? sum + row[i] : sum, 0
    )
    
    // False negatives: sum of row i excluding diagonal
    const falseNegatives = matrix[i].reduce((sum, value, colIndex) => 
      colIndex !== i ? sum + value : sum, 0
    )
    
    // True negatives: total - tp - fp - fn
    const totalSamples = matrix.reduce((sum, row) => 
      sum + row.reduce((rowSum, val) => rowSum + val, 0), 0
    )
    const trueNegatives = totalSamples - truePositives - falsePositives - falseNegatives
    
    // Support: actual instances of this class
    const support = truePositives + falseNegatives
    
    // Calculate metrics
    const precision = truePositives + falsePositives > 0 
      ? truePositives / (truePositives + falsePositives) 
      : 0
    
    const recall = truePositives + falseNegatives > 0 
      ? truePositives / (truePositives + falseNegatives) 
      : 0
    
    const f1Score = precision + recall > 0 
      ? 2 * (precision * recall) / (precision + recall) 
      : 0
    
    const specificity = trueNegatives + falsePositives > 0 
      ? trueNegatives / (trueNegatives + falsePositives) 
      : 0
    
    classMetrics.push({
      className,
      precision,
      recall,
      f1Score,
      specificity,
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      support,
    })
  }
  
  // Calculate overall accuracy
  const totalCorrect = matrix.reduce((sum, row, i) => sum + row[i], 0)
  const totalSamples = matrix.reduce((sum, row) => 
    sum + row.reduce((rowSum, val) => rowSum + val, 0), 0
  )
  const accuracy = totalSamples > 0 ? totalCorrect / totalSamples : 0
  const errorRate = 1 - accuracy
  
  // Calculate macro averages (unweighted)
  const macroAvg = {
    precision: classMetrics.reduce((sum, m) => sum + m.precision, 0) / numClasses,
    recall: classMetrics.reduce((sum, m) => sum + m.recall, 0) / numClasses,
    f1Score: classMetrics.reduce((sum, m) => sum + m.f1Score, 0) / numClasses,
    specificity: classMetrics.reduce((sum, m) => sum + m.specificity, 0) / numClasses,
  }
  
  // Calculate weighted averages (weighted by support)
  const totalSupport = classMetrics.reduce((sum, m) => sum + m.support, 0)
  const weightedAvg = {
    precision: totalSupport > 0 
      ? classMetrics.reduce((sum, m) => sum + m.precision * m.support, 0) / totalSupport 
      : 0,
    recall: totalSupport > 0 
      ? classMetrics.reduce((sum, m) => sum + m.recall * m.support, 0) / totalSupport 
      : 0,
    f1Score: totalSupport > 0 
      ? classMetrics.reduce((sum, m) => sum + m.f1Score * m.support, 0) / totalSupport 
      : 0,
    specificity: totalSupport > 0 
      ? classMetrics.reduce((sum, m) => sum + m.specificity * m.support, 0) / totalSupport 
      : 0,
  }
  
  return {
    accuracy,
    precision: classMetrics.map(m => m.precision),
    recall: classMetrics.map(m => m.recall),
    f1Score: classMetrics.map(m => m.f1Score),
    specificity: classMetrics.map(m => m.specificity),
    classMetrics,
    macroAvg,
    weightedAvg,
    totalSamples,
    errorRate,
  }
}

/**
 * Parse CSV file content and extract confusion matrix data
 */
export function parseConfusionMatrixCSV(csvContent: string): ConfusionMatrixData {
  const lines = csvContent.trim().split('\n')
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least 2 lines (header + data)')
  }
  
  // Parse header to get class labels
  const headerLine = lines[0]
  const labels = headerLine.split(',').map(label => label.trim().replace(/['"]/g, ''))
  
  // Remove the first column if it's row labels (same as header)
  const isFirstColumnLabels = lines[1].split(',')[0].trim().replace(/['"]/g, '') === labels[0]
  
  // Parse data rows
  const matrix: number[][] = []
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',')
    const startIndex = isFirstColumnLabels ? 1 : 0
    const matrixRow = row.slice(startIndex).map(val => {
      const num = parseFloat(val.trim())
      if (isNaN(num)) {
        throw new Error(`Invalid number '${val.trim()}' at row ${i}, column ${row.indexOf(val)}`)
      }
      return num
    })
    
    if (matrixRow.length !== labels.length) {
      throw new Error(`Row ${i} has ${matrixRow.length} values but expected ${labels.length}`)
    }
    
    matrix.push(matrixRow)
  }
  
  if (matrix.length !== labels.length) {
    throw new Error(`Matrix has ${matrix.length} rows but expected ${labels.length}`)
  }
  
  return {
    matrix,
    labels: isFirstColumnLabels ? labels.slice(1) : labels,
  }
}

/**
 * Generate a sample confusion matrix for demonstration
 */
export function generateSampleConfusionMatrix(): ConfusionMatrixData {
  return {
    matrix: [
      [50, 3, 2],
      [5, 45, 1],
      [2, 1, 48],
    ],
    labels: ['Cat', 'Dog', 'Bird'],
    title: 'Sample Animal Classification',
  }
}

/**
 * Validate confusion matrix data
 */
export function validateConfusionMatrix(matrix: number[][], labels: string[]): string[] {
  const errors: string[] = []
  
  if (!matrix || matrix.length === 0) {
    errors.push('Matrix cannot be empty')
    return errors
  }
  
  if (!labels || labels.length === 0) {
    errors.push('Labels cannot be empty')
    return errors
  }
  
  if (matrix.length !== labels.length) {
    errors.push(`Matrix dimensions (${matrix.length}x${matrix[0]?.length || 0}) don't match number of labels (${labels.length})`)
  }
  
  for (let i = 0; i < matrix.length; i++) {
    if (!Array.isArray(matrix[i])) {
      errors.push(`Row ${i} is not an array`)
      continue
    }
    
    if (matrix[i].length !== labels.length) {
      errors.push(`Row ${i} has ${matrix[i].length} columns but expected ${labels.length}`)
    }
    
    for (let j = 0; j < matrix[i].length; j++) {
      if (typeof matrix[i][j] !== 'number' || isNaN(matrix[i][j])) {
        errors.push(`Invalid value at position [${i}, ${j}]: ${matrix[i][j]}`)
      } else if (matrix[i][j] < 0) {
        errors.push(`Negative value at position [${i}, ${j}]: ${matrix[i][j]}`)
      }
    }
  }
  
  return errors
}

/**
 * Format number for display
 */
export function formatNumber(num: number, decimals: number = 3): string {
  if (Number.isInteger(num)) {
    return num.toString()
  }
  return num.toFixed(decimals)
}

/**
 * Get color for confusion matrix cells based on value
 */
export function getCellColor(value: number, max: number, isCorrect: boolean): string {
  const intensity = max > 0 ? value / max : 0
  
  if (isCorrect) {
    // Green scale for correct predictions (diagonal)
    return `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`
  } else {
    // Red scale for incorrect predictions (off-diagonal)
    return `rgba(239, 68, 68, ${0.1 + intensity * 0.5})`
  }
} 








