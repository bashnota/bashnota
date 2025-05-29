/**
 * Format a date for display in the UI
 */
export const formatDate = (date: Date | string): string => {
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== d.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Get relative time from now (e.g., "2m ago", "1h ago")
 */
export const getRelativeTime = (date: Date | string): string => {
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  
  const diffDays = Math.floor(diffMins / 1440)
  return `${diffDays}d ago`
}

/**
 * Get time of day based on current hour
 */
export const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 20) return 'evening'
  return 'night'
}

/**
 * Get greeting based on time of day and user name
 */
export const getGreeting = (name?: string, timeOfDay?: string): string => {
  const displayName = name || 'there'
  const time = timeOfDay || getTimeOfDay()
  
  switch (time) {
    case 'morning': return `Good morning, ${displayName}!`
    case 'afternoon': return `Good afternoon, ${displayName}!`
    case 'evening': return `Good evening, ${displayName}!`
    case 'night': return `Working late, ${displayName}?`
    default: return `Hello, ${displayName}!`
  }
}

/**
 * Format time for display (HH:MM format)
 */
export const formatTime = (date?: Date): string => {
  const d = date || new Date()
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format date for display (e.g., "Mon, Dec 25")
 */
export const formatShortDate = (date?: Date): string => {
  const d = date || new Date()
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
} 