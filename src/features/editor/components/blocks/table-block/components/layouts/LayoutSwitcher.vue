<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  BarChart,
  Calendar,
  LayoutGrid,
  GanttChart,
} from 'lucide-vue-next'

export type TableLayout = 'table' | 'chart' | 'calendar' | 'kanban' | 'timeline'

const props = defineProps<{
  currentLayout: TableLayout
}>()

const emit = defineEmits<{
  (e: 'update:layout', layout: TableLayout): void
}>()

const layouts = [
  { id: 'table', label: 'Table', icon: Table },
  { id: 'chart', label: 'Chart', icon: BarChart },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
] as const

const selectedLayout = ref(props.currentLayout)

watch(selectedLayout, (newLayout) => {
  emit('update:layout', newLayout)
})
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" class="gap-2">
        <component :is="layouts.find(l => l.id === selectedLayout)?.icon" class="w-4 h-4" />
        {{ layouts.find(l => l.id === selectedLayout)?.label }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        v-for="layout in layouts"
        :key="layout.id"
        @click="selectedLayout = layout.id"
        class="gap-2"
      >
        <component :is="layout.icon" class="w-4 h-4" />
        {{ layout.label }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template> 








