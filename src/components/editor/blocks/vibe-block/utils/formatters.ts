// Utility functions for formatting data in VibeBlock components

/**
 * Format date string to locale-specific format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * Calculate and format duration between two dates
 */
export function calculateDuration(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const durationMs = endDate.getTime() - startDate.getTime()
  
  // Format as minutes and seconds
  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Format task result for display
 */
export function formatTaskResult(result: any): string {
  if (typeof result === 'string') {
    return result
  } else if (typeof result === 'object') {
    return JSON.stringify(result, null, 2)
  }
  return 'Result format not recognized'
}

/**
 * Format entry value for display
 */
export function formatEntryValue(value: any): string {
  if (value === null || value === undefined) return 'null'
  
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  
  return String(value)
}

/**
 * Get a preview of the task result (truncated)
 */
export function getResultPreview(result: any): string {
  if (!result) return 'No result available'
  
  if (typeof result === 'string') {
    return result.length > 100 ? result.substring(0, 100) + '...' : result
  }
  
  if (typeof result === 'object') {
    // Handle different result types
    if (result.content) return result.content.substring(0, 100) + '...'
    return JSON.stringify(result).substring(0, 100) + '...'
  }
  
  return 'Result available'
}

/**
 * Get formatted execution result summary
 */
export function getExecutionSummary(execution: any): string {
  if (!execution) return 'No execution data available';
  
  // Start with execution status
  let summary = execution.success 
    ? '✅ Execution completed successfully\n\n' 
    : '❌ Execution failed\n\n';
  
  // Add error if available
  if (execution.error) {
    summary += `Error: ${execution.error}\n\n`;
  }
  
  // Add output
  if (execution.output) {
    summary += execution.output;
  } else {
    summary += 'No output generated';
  }
  
  return summary;
} 