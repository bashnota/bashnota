<template>
  <div class="space-y-4">
    <h4 class="text-lg font-semibold flex items-center gap-2">
      <Eye class="w-5 h-5 text-primary" />
      File Preview
    </h4>
    
    <Card>
      <CardContent class="p-4 space-y-4">
        <!-- File Info -->
        <div class="grid gap-3 text-sm">
          <div class="flex justify-between">
            <span class="font-medium">File:</span>
            <span class="text-muted-foreground">{{ file.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="font-medium">Path:</span>
            <span class="text-muted-foreground truncate ml-2">{{ file.path }}</span>
          </div>
          <div v-if="parsedData" class="flex justify-between">
            <span class="font-medium">Matrix Size:</span>
            <Badge variant="outline">{{ parsedData.matrix.length }}×{{ parsedData.matrix[0]?.length || 0 }}</Badge>
          </div>
        </div>

        <!-- Content Preview -->
        <div>
          <h5 class="font-medium mb-2 flex items-center gap-2">
            <Code class="w-4 h-4" />
            Raw Content (first 10 lines)
          </h5>
          <div class="bg-muted/30 rounded p-3 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
            <pre>{{ previewText }}</pre>
          </div>
        </div>

        <!-- Use File Button -->
        <div class="flex justify-end pt-2">
          <Button
            @click="$emit('use-file')"
            :disabled="!parsedData || loading"
            class="w-full sm:w-auto"
          >
            <CheckCircle class="w-4 h-4 mr-2" />
            Use This File
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/ui/card'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Eye, Code, CheckCircle } from 'lucide-vue-next'
import type { JupyterFile } from '@/features/jupyter/types/jupyter'
import type { ConfusionMatrixData } from '@/features/editor/components/blocks/confusion-matrix/utils/confusionMatrixUtils'

interface Props {
  file: JupyterFile
  content: string
  parsedData: ConfusionMatrixData | null
  previewText: string
  loading: boolean
}

interface Emits {
  (e: 'use-file'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script> 







