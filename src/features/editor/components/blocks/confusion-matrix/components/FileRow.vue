<template>
  <div
    :class="[
      'px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50 last:border-b-0',
      {
        'bg-primary/10 border-primary/30': selected,
        'hover:bg-blue-50 dark:hover:bg-blue-950/20': file.type === 'directory'
      }
    ]"
    @click="$emit('click', file)"
    @dblclick="$emit('double-click', file)"
  >
    <div class="grid grid-cols-12 gap-4 items-center text-sm">
      <!-- Name column -->
      <div class="col-span-6 flex items-center gap-2 min-w-0">
        <FileIcon :file="file" />
        <span class="font-medium truncate">{{ file.name }}</span>
      </div>

      <!-- Size column -->
      <div class="col-span-3 text-muted-foreground">
        <span v-if="file.type === 'file' && file.size">
          {{ formatFileSize(file.size) }}
        </span>
        <span v-else-if="file.type === 'directory'" class="text-xs">—</span>
      </div>

      <!-- Modified column -->
      <div class="col-span-2 text-muted-foreground text-xs">
        <span v-if="file.lastModified">
          {{ formatDate(file.lastModified) }}
        </span>
        <span v-else>—</span>
      </div>

      <!-- Action column -->
      <div class="col-span-1 flex justify-end">
        <Button
          v-if="file.type === 'file'"
          @click.stop="$emit('select', file)"
          :disabled="loading"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
        >
          {{ selected ? 'Selected' : 'Select' }}
        </Button>
        <ChevronRight
          v-else
          class="w-4 h-4 text-muted-foreground"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-vue-next'
import type { JupyterFile } from '@/features/jupyter/types/jupyter'
import FileIcon from './FileIcon.vue'

interface Props {
  file: JupyterFile
  selected: boolean
  loading: boolean
}

interface Emits {
  (e: 'click', file: JupyterFile): void
  (e: 'double-click', file: JupyterFile): void
  (e: 'select', file: JupyterFile): void
}

defineProps<Props>()
defineEmits<Emits>()

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString()
  } catch {
    return dateString
  }
}
</script> 







