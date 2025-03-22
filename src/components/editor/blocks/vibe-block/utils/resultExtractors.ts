// Utility functions for extracting data from task results

/**
 * Get research summary from task result
 */
export function getResearchSummary(task: any): string | null {
  if (task.result && typeof task.result === 'object' && task.result.summary) {
    return task.result.summary
  }
  return null
}

/**
 * Get research key findings from task result
 */
export function getResearchKeyFindings(task: any): string[] | null {
  if (task.result && typeof task.result === 'object' && task.result.keyFindings) {
    return task.result.keyFindings
  }
  return null
}

/**
 * Get research content from task result
 */
export function getResearchContent(task: any): string | null {
  if (task.result && typeof task.result === 'object' && task.result.content) {
    return task.result.content
  }
  return null
}

/**
 * Get analysis summary from task result
 */
export function getAnalysisSummary(task: any): string | null {
  if (task.result && typeof task.result === 'object' && task.result.summary) {
    return task.result.summary
  }
  return null
}

/**
 * Get analysis insights from task result
 */
export function getAnalysisInsights(task: any): string[] | null {
  if (task.result && typeof task.result === 'object' && task.result.insights) {
    return task.result.insights
  }
  return null
}

/**
 * Get analysis visualizations from task result
 */
export function getAnalysisVisualizations(task: any): any[] | null {
  if (task.result && typeof task.result === 'object' && task.result.visualizations) {
    return task.result.visualizations
  }
  return null
}

/**
 * Get coder language from task result
 */
export function getCoderLanguage(task: any): string | null {
  if (task.result && typeof task.result === 'object' && task.result.language) {
    return task.result.language
  }
  return null
}

/**
 * Get coder code from task result
 */
export function getCoderCode(task: any): string | null {
  if (task.result && typeof task.result === 'object' && task.result.code) {
    return task.result.code
  }
  return null
}

/**
 * Get coder execution from task result
 */
export function getCoderExecutionFromResult(task: any): any | null {
  if (task.result && typeof task.result === 'object' && task.result.execution) {
    return task.result.execution
  }
  return null
}

/**
 * Get coder retry info from task result
 */
export function getCoderRetryInfo(task: any): any | null {
  if (task.result && typeof task.result === 'object' && task.result.retryInfo) {
    return task.result.retryInfo
  }
  return null
}

/**
 * Get table columns from data
 */
export function getTableColumns(data: any): string[] {
  if (!data) return []
  
  // If data has a columns property, use that
  if (data.columns) return data.columns
  
  // If data has explicit headers property, use that
  if (data.headers && Array.isArray(data.headers)) return data.headers
  
  // Make sure we have an array to work with
  let rows = data
  
  // If data has rows property that's an array, use that
  if (data.rows && Array.isArray(data.rows)) {
    rows = data.rows
  }
  
  // If data is not an array yet, try to make it one
  if (!Array.isArray(rows)) {
    // If it's an object (but not an array), make it a single-item array
    if (rows && typeof rows === 'object') {
      rows = [rows]
    } else {
      // Can't extract columns from this data
      return []
    }
  }
  
  // If data is an array of objects, get all unique keys
  if (rows.length > 0) {
    const columns = new Set<string>()
    rows.forEach((row: Record<string, unknown>) => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach(key => columns.add(key))
      }
    })
    return Array.from(columns)
  }
  
  return []
}

/**
 * Get planner main goal from task result
 */
export function getPlannerMainGoal(task: any): string | null {
  if (task.result && typeof task.result === 'object' && task.result.plan && task.result.plan.mainGoal) {
    return task.result.plan.mainGoal
  }
  return null
}

/**
 * Get planner tasks from task result
 */
export function getPlannerTasks(task: any): any[] | null {
  if (task.result && typeof task.result === 'object' && task.result.plan && Array.isArray(task.result.plan.tasks)) {
    return task.result.plan.tasks
  }
  return null
}

/**
 * Get plan summary from task result
 */
export function getPlanSummary(task: any): string | null {
  if (task.result && typeof task.result === 'object' && task.result.summary) {
    return task.result.summary
  }
  return null
} 