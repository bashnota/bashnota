<template>
  <div class="block-preview-item">
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-2">
        <Checkbox
          :checked="isSelected"
          @update:checked="$emit('toggleSelection', index)"
          :disabled="!block.metadata.isValid"
        />
        
        <div class="flex items-center gap-2">
          <Badge 
            :variant="getBadgeVariant()"
            class="text-xs"
          >
            {{ block.type }}
          </Badge>
          
          <span class="text-xs text-muted-foreground">
            Lines {{ block.metadata.startLine }}-{{ block.metadata.endLine }}
          </span>
        </div>
      </div>
      
      <div class="flex items-center gap-1">
        <Button
          v-if="!compact"
          variant="ghost"
          size="sm"
          @click="$emit('editBlock', block)"
          class="h-7 w-7 p-0"
        >
          <Edit class="h-3 w-3" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          @click="$emit('toggleSelection', index)"
          :disabled="!block.metadata.isValid"
          class="h-7 w-7 p-0"
        >
          <component :is="isSelected ? CheckCircle : Circle" class="h-3 w-3" />
        </Button>
      </div>
    </div>

    <!-- Content Preview -->
    <div class="mb-3">
      <div class="text-sm font-medium mb-2">Content Preview</div>
      <div class="bg-muted/30 rounded p-3 text-sm font-mono overflow-x-auto">
        <pre class="whitespace-pre-wrap break-words">{{ getContentPreview() }}</pre>
      </div>
    </div>

    <!-- Attributes Preview -->
    <div v-if="!compact && hasAttributes" class="mb-3">
      <div class="text-sm font-medium mb-2">Attributes</div>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div
          v-for="(value, key) in block.attributes"
          :key="key"
          class="flex justify-between p-2 bg-muted/20 rounded"
        >
          <span class="font-medium">{{ key }}:</span>
          <span class="text-muted-foreground truncate ml-2">
            {{ formatAttributeValue(value) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Validation Status -->
    <div class="space-y-2">
      <!-- Errors -->
      <div v-if="block.metadata.errors.length > 0" class="space-y-1">
        <div class="flex items-center gap-2 text-sm text-destructive">
          <XCircle class="h-3 w-3" />
          <span class="font-medium">Errors:</span>
        </div>
        <ul class="list-disc list-inside space-y-1 text-xs text-destructive ml-4">
          <li v-for="error in block.metadata.errors" :key="error">
            {{ error }}
          </li>
        </ul>
      </div>

      <!-- Warnings -->
      <div v-if="block.metadata.warnings.length > 0" class="space-y-1">
        <div class="flex items-center gap-2 text-sm text-yellow-600">
          <AlertTriangle class="h-3 w-3" />
          <span class="font-medium">Warnings:</span>
        </div>
        <ul class="list-disc list-inside space-y-1 text-xs text-yellow-600 ml-4">
          <li v-for="warning in block.metadata.warnings" :key="warning">
            {{ warning }}
          </li>
        </ul>
      </div>

      <!-- Success Status -->
      <div v-if="block.metadata.isValid && block.metadata.errors.length === 0 && block.metadata.warnings.length === 0" class="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle class="h-3 w-3" />
        <span>Block is valid and ready to insert</span>
      </div>
    </div>

    <!-- Compact View Actions -->
    <div v-if="compact" class="flex items-center justify-between mt-3 pt-3 border-t">
      <Button
        variant="ghost"
        size="sm"
        @click="$emit('editBlock', block)"
        class="h-6 px-2 text-xs"
      >
        <Edit class="h-3 w-3 mr-1" />
        Edit
      </Button>
      
      <span class="text-xs text-muted-foreground">
        {{ block.metadata.errors.length }} errors, {{ block.metadata.warnings.length }} warnings
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Edit, 
  CheckCircle, 
  Circle, 
  XCircle, 
  AlertTriangle 
} from 'lucide-vue-next'
import type { ParsedBlock } from '@/features/editor/services/MarkdownParserService'

const props = defineProps<{
  block: ParsedBlock
  index: number
  isSelected: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  toggleSelection: [index: number]
  editBlock: [block: ParsedBlock]
}>()

// Computed
const hasAttributes = computed(() => 
  Object.keys(props.block.attributes).length > 0
)

// Methods
const getBadgeVariant = () => {
  if (!props.block.metadata.isValid) return 'destructive'
  if (props.block.metadata.warnings.length > 0) return 'secondary'
  return 'default'
}

const getContentPreview = () => {
  const content = props.block.content
  const maxLength = props.compact ? 100 : 200
  
  if (content.length <= maxLength) {
    return content
  }
  
  return content.substring(0, maxLength) + '...'
}

const formatAttributeValue = (value: any): string => {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') {
    return value.length > 30 ? value.substring(0, 30) + '...' : value
  }
  if (typeof value === 'object') {
    return JSON.stringify(value).substring(0, 30) + '...'
  }
  return String(value)
}
</script>

<style scoped>
.block-preview-item {
  @apply transition-all duration-200;
}

.block-preview-item:hover {
  @apply shadow-sm;
}
</style>
