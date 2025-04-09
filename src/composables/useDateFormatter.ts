/**
 * Composable for date formatting utilities
 */
export function useDateFormatter() {
  /**
   * Format a date relative to current date
   * @param date Date to format
   * @returns Formatted date string
   */
  function formatDate(date: string | Date) {
    if (!date) return ''
    
    // Handle string dates
    if (typeof date === 'string') {
      date = new Date(date)
    }
    
    // If date is invalid, return empty string
    if (isNaN(date.getTime())) {
      return ''
    }
    
    // If date is today, return time
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    
    // If date is yesterday, return "Yesterday"
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    
    // Otherwise return date
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  /**
   * Format a date as a simple date string
   * @param date Date to format
   * @returns Formatted date string MM/DD/YYYY
   */
  function formatSimpleDate(date: string | Date) {
    if (!date) return ''
    
    // Handle string dates
    if (typeof date === 'string') {
      date = new Date(date)
    }
    
    // If date is invalid, return empty string
    if (isNaN(date.getTime())) {
      return ''
    }
    
    return date.toLocaleDateString()
  }

  /**
   * Calculate time elapsed since a given date
   * @param date Date to calculate from
   * @returns String representing elapsed time
   */
  function timeElapsed(date: string | Date) {
    if (!date) return ''
    
    // Handle string dates
    if (typeof date === 'string') {
      date = new Date(date)
    }
    
    // If date is invalid, return empty string
    if (isNaN(date.getTime())) {
      return ''
    }
    
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // Convert to seconds
    const seconds = Math.floor(diff / 1000)
    
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`
    }
    
    // Convert to minutes
    const minutes = Math.floor(seconds / 60)
    
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    }
    
    // Convert to hours
    const hours = Math.floor(minutes / 60)
    
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    }
    
    // Convert to days
    const days = Math.floor(hours / 24)
    
    if (days < 30) {
      return `${days} day${days !== 1 ? 's' : ''} ago`
    }
    
    // Convert to months
    const months = Math.floor(days / 30)
    
    if (months < 12) {
      return `${months} month${months !== 1 ? 's' : ''} ago`
    }
    
    // Convert to years
    const years = Math.floor(months / 12)
    
    return `${years} year${years !== 1 ? 's' : ''} ago`
  }

  return {
    formatDate,
    formatSimpleDate,
    timeElapsed
  }
} 