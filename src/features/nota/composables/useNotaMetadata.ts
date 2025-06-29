import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Nota } from '@/features/nota/types/nota'
import { formatRelativeTime } from '@/lib/utils'

/**
 * Composable for managing nota metadata information
 * Provides computed properties and utility functions for metadata display
 */
export function useNotaMetadata(nota: Nota | null) {
  const route = useRoute()
  const showFullMetadata = ref(false)
  
  /**
   * Format the creation date in a human-readable format
   */
  const formattedCreatedAt = computed(() => {
    if (!nota?.createdAt) return 'Unknown'
    return formatDate(nota.createdAt)
  })
  
  /**
   * Format the last updated time in a relative format (e.g., "2 hours ago")
   */
  const lastUpdatedRelative = computed(() => {
    if (!nota?.updatedAt) return ''
    return formatRelativeTime(nota.updatedAt)
  })
  
  /**
   * Get a shareable link to the current nota
   */
  const shareableLink = computed(() => {
    if (!nota) return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/nota/${nota.id}`
  })
  
  /**
   * Format a date in a user-friendly format
   */
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  /**
   * Toggle the display of full metadata
   */
  const toggleFullMetadata = () => {
    showFullMetadata.value = !showFullMetadata.value
  }
  
  return {
    showFullMetadata,
    formattedCreatedAt,
    lastUpdatedRelative,
    shareableLink,
    formatDate,
    toggleFullMetadata
  }
}







