<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, Wand2 } from 'lucide-vue-next'

interface Props {
  actionId: string
  actionName: string
  result: string
  isReadOnly?: boolean
}

interface Emits {
  'copy': [text: string, key: string]
  'apply': [result: string]
}

const props = withDefaults(defineProps<Props>(), {
  isReadOnly: false
})

const emit = defineEmits<Emits>()

const isCopied = ref(false)

const formatResult = (result: string) => {
  const parts = result.split(/(```[\w]*\n[\s\S]*?\n```)/g)
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const codeContent = part.match(/```[\w]*\n([\s\S]*?)\n```/)?.[1] || part
      return { type: 'code' as const, content: codeContent.trim() }
    } else if (part.trim()) {
      return { type: 'text' as const, content: part.trim() }
    }
    return null
  }).filter((part): part is { type: 'code' | 'text'; content: string } => part !== null)
}

const handleCopy = async () => {
  emit('copy', props.result, props.actionId)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

const handleApply = () => {
  emit('apply', props.result)
}

const hasCodeContent = () => {
  return props.result.includes('```')
}
</script>

<template>
  <div class="ai-result-item">
    <div class="ai-result-header">
      <Badge variant="secondary" class="ai-result-badge">
        {{ actionName }}
      </Badge>
      <div class="flex items-center gap-1">
        <Button
          @click="handleCopy"
          variant="ghost"
          size="sm"
          class="ai-result-action"
          title="Copy to clipboard"
        >
          <Copy v-if="!isCopied" class="w-4 h-4" />
          <Check v-else class="w-4 h-4" />
        </Button>
        <Button
          v-if="hasCodeContent()"
          @click="handleApply"
          :disabled="isReadOnly"
          variant="outline"
          size="sm"
          class="ai-result-action"
          title="Apply code changes"
        >
          <Wand2 class="w-4 h-4" />
        </Button>
      </div>
    </div>
    
    <div class="ai-result-content">
      <template v-for="(part, index) in formatResult(result)" :key="index">
        <pre v-if="part.type === 'code'" class="ai-code-block">
          <code>{{ part.content }}</code>
        </pre>
        <p v-else class="ai-text-block">{{ part.content }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ai-result-item {
  @apply border rounded-md p-3 space-y-2 transition-all duration-200;
  
  &:hover {
    @apply border-primary/20 shadow-sm;
  }
}

.ai-result-header {
  @apply flex items-center justify-between;
}

.ai-result-badge {
  @apply text-xs;
}

.ai-result-action {
  @apply p-1.5 transition-all duration-200;
  
  &:hover:not(:disabled) {
    @apply scale-105;
  }
}

.ai-result-content {
  @apply space-y-2;
}

.ai-code-block {
  @apply bg-muted p-2 rounded text-xs overflow-x-auto font-mono border-l-2 border-primary/20;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-text-block {
  @apply text-xs text-muted-foreground leading-relaxed;
  line-height: 1.6;
}
</style> 