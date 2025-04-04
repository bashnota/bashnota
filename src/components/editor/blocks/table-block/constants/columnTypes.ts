import { Text, Hash, List, Calendar } from 'lucide-vue-next'
import type { ColumnType } from '../composables/useTableOperations'

export const COLUMN_TYPES = [
  { value: 'text' as ColumnType, label: 'Text', icon: Text },
  { value: 'number' as ColumnType, label: 'Number', icon: Hash },
  { value: 'select' as ColumnType, label: 'Select', icon: List },
  { value: 'date' as ColumnType, label: 'Date', icon: Calendar },
] as const

export const getColumnTypeLabel = (type: string): string => {
  return COLUMN_TYPES.find((t) => t.value === type)?.label || type
}

export const getColumnTypeIcon = (type: string) => {
  return COLUMN_TYPES.find((t) => t.value === type)?.icon
} 