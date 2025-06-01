<template>
  <div class="w-5 h-5 flex items-center justify-center">
    <Folder v-if="file.type === 'directory'" class="w-4 h-4 text-blue-600" />
    <FileText v-else-if="isCSVFile" class="w-4 h-4 text-green-600" />
    <File v-else class="w-4 h-4 text-muted-foreground" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Folder, FileText, File } from 'lucide-vue-next'
import type { JupyterFile } from '@/types/jupyter'

interface Props {
  file: JupyterFile
}

const props = defineProps<Props>()

const isCSVFile = computed(() => {
  return props.file.name.toLowerCase().endsWith('.csv')
})
</script> 