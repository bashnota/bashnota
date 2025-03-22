<template>
  <!-- Database tables list -->
  <div v-if="tables.length === 0" class="text-center p-4 text-muted-foreground">
    No database tables available yet
  </div>
  <div v-else>
    <div v-for="table in tables" :key="table.id" class="mb-4">
      <Card>
        <CardHeader class="p-3 pb-0">
          <div class="flex justify-between items-center">
            <Badge variant="outline">Table</Badge>
            <Badge variant="secondary">{{ table.entries.length }} entries</Badge>
          </div>
          <CardTitle class="text-sm mt-2">{{ table.name }}</CardTitle>
          <p class="text-xs text-muted-foreground mt-1">{{ table.description }}</p>
        </CardHeader>
        
        <CardContent class="p-3 pt-2">
          <!-- Schema info -->
          <div class="text-xs mb-2">
            <span class="font-medium">Schema:</span> 
            <span v-for="(type, field) in table.schema" :key="field" class="ml-1">
              <Badge variant="outline" class="text-xs">{{ field }}: {{ type }}</Badge>
            </span>
          </div>
          
          <!-- Table entries -->
          <Collapsible>
            <CollapsibleTrigger class="w-full" @click="toggleTableExpansion(table.id)">
              <Button variant="outline" size="sm" class="w-full">
                <ChevronDown v-if="expandedTableIds.includes(table.id)" class="h-3 w-3 mr-2" />
                <ChevronRight v-else class="h-3 w-3 mr-2" />
                {{ expandedTableIds.includes(table.id) ? 'Hide' : 'Show' }} Entries
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent :forceMount="expandedTableIds.includes(table.id)">
              <div v-if="table.entries.length === 0" class="text-center p-2 text-xs text-muted-foreground">
                No entries in this table
              </div>
              <div v-else class="mt-2 space-y-2">
                <Card v-for="entry in table.entries" :key="entry.id" class="p-2 text-xs">
                  <div class="flex justify-between mb-1">
                    <Badge variant="secondary">{{ entry.type }}</Badge>
                    <Badge variant="outline">{{ entry.key }}</Badge>
                  </div>
                  <div class="bg-muted p-2 rounded max-h-32 overflow-auto">
                    <pre class="whitespace-pre-wrap text-xs">{{ formatEntryValue(entry.value) }}</pre>
                  </div>
                </Card>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  tables: {
    type: Array,
    default: () => []
  },
  expandedTableIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['toggle-table'])

// Toggle table expansion
function toggleTableExpansion(tableId) {
  emit('toggle-table', tableId)
}

// Format entry value for display
function formatEntryValue(value) {
  if (value === null || value === undefined) return 'null'
  
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  
  return String(value)
}
</script> 