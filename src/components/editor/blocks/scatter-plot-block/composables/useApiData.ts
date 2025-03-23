import { ref } from 'vue'
import type { DataPoint } from '../types'
import { logger } from '@/services/logger'

export function useApiData() {
  const apiUrl = ref('')
  const isLoading = ref(false)
  const apiError = ref('')
  
  const fetchData = async (): Promise<DataPoint[] | null> => {
    if (!apiUrl.value) return null
    
    isLoading.value = true
    apiError.value = ''
    
    try {
      const response = await fetch(apiUrl.value)
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`)
      }
      
      const data = await response.json()
      
      // Process the data - handle different API response formats
      let plotData: DataPoint[] = []
      
      if (Array.isArray(data)) {
        // Try to extract x, y from array of objects
        if (data.length > 0 && typeof data[0] === 'object') {
          // Try to find appropriate fields for x and y
          const firstItem = data[0]
          const keys = Object.keys(firstItem)
          
          const numericKeys = keys.filter(key => 
            !isNaN(Number(firstItem[key])) && 
            firstItem[key] !== null && 
            firstItem[key] !== ''
          )
          
          const nonNumericKeys = keys.filter(key => !numericKeys.includes(key))
          
          if (numericKeys.length >= 2) {
            plotData = data.map(item => ({
              x: Number(item[numericKeys[0]]),
              y: Number(item[numericKeys[1]]),
              label: nonNumericKeys.length > 0 ? String(item[nonNumericKeys[0]]) : undefined
            })).filter(point => !isNaN(point.x) && !isNaN(point.y))
          }
        }
      }
      
      if (plotData.length === 0) {
        throw new Error('Could not parse data from API response')
      }
      
      return plotData
    } catch (error) {
      logger.error('Error fetching data:', error)
      apiError.value = error instanceof Error ? error.message : 'Failed to fetch data'
      return null
    } finally {
      isLoading.value = false
    }
  }
  
  return {
    apiUrl,
    isLoading,
    apiError,
    fetchData
  }
} 