// Add logger import at the top
import { logger } from '@/services/logger'

// Database management composable
import { ref } from 'vue'
import { useVibeStore } from '@/stores/vibeStore'
import type { Ref } from 'vue'
import { formatEntryValue } from '../utils'

/**
 * Composable for managing database tables in the Vibe block
 */
export function useDatabase(boardId: Ref<string>) {
  const vibeStore = useVibeStore()
  const databaseTables = ref<any[]>([])
  const expandedTableIds = ref<string[]>([])

  /**
   * Load database tables for the current board
   */
  async function loadDatabaseTables() {
    try {
      if (!boardId.value) {
        logger.log('No board ID available yet')
        return
      }
      
      logger.log('Loading database tables for board:', boardId.value)
      const tables = await vibeStore.getTablesForBoard(boardId.value)
      if (tables && tables.length > 0) {
        databaseTables.value = tables
        
        // Load entries for each table
        for (const table of databaseTables.value) {
          table.entries = await vibeStore.getEntriesForTable(table.id)
        }
        
        logger.log('Loaded database tables:', databaseTables.value)
      } else {
        databaseTables.value = []
      }
    } catch (error) {
      logger.error('Error loading database tables:', error)
      databaseTables.value = []
    }
  }

  /**
   * Toggle table expansion
   */
  function toggleTableExpansion(tableId: string) {
    const index = expandedTableIds.value.indexOf(tableId)
    if (index === -1) {
      expandedTableIds.value.push(tableId)
    } else {
      expandedTableIds.value.splice(index, 1)
    }
  }
  
  /**
   * Format entry value for display
   * This is a convenience wrapper around the utility function
   */
  function formatTableEntryValue(value: any): string {
    return formatEntryValue(value)
  }

  return {
    databaseTables,
    expandedTableIds,
    loadDatabaseTables,
    toggleTableExpansion,
    formatTableEntryValue
  }
} 