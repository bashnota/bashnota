<template>
  <NodeViewWrapper class="sub-nota-link-inline">
    <span 
      class="inline-flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
      :class="linkStyleClasses"
      @click="navigateToNota"
      @keydown.enter.prevent="navigateToNota"
      @keydown.space.prevent="navigateToNota"
      role="link"
      tabindex="0"
      :aria-label="`Open sub-nota ${targetNotaTitle}`"
      :title="`Go to: ${targetNotaTitle}`"
    >
      <FileText class="w-3 h-3 text-muted-foreground" />
      <span class="text-sm">{{ displayText || targetNotaTitle }}</span>
    </span>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FileText } from 'lucide-vue-next'
import { NodeViewWrapper } from '@/features/editor/pm'
import { toast } from '@/services/toast'
import { useNotaNavigation } from '@/features/nota/composables/useNotaNavigation'

interface Props {
  node: {
    attrs: {
      targetNotaId: string
      targetNotaTitle: string
      displayText?: string
      linkStyle?: 'inline' | 'button' | 'card'
    }
  }
}

const props = defineProps<Props>()
const { openNota } = useNotaNavigation()

// Computed
const targetNotaId = computed(() => props.node.attrs.targetNotaId)
const targetNotaTitle = computed(() => props.node.attrs.targetNotaTitle)
const displayText = computed(() => props.node.attrs.displayText || props.node.attrs.targetNotaTitle)
const linkStyle = computed(() => props.node.attrs.linkStyle || 'inline')

const linkStyleClasses = computed(() => {
  switch (linkStyle.value) {
    case 'button':
      return 'bg-primary text-primary-foreground hover:bg-primary/90'
    case 'card':
      return 'bg-card text-card-foreground border-2 shadow-sm'
    default:
      return 'bg-background text-foreground'
  }
})

// Methods
const navigateToNota = async () => {
  if (targetNotaId.value) {
    try {
      await openNota(targetNotaId.value)
    } catch (error) {
      toast.error('Unable to open sub-nota', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  } else {
    toast.error('Invalid nota link')
  }
}
</script>

<style scoped>
.sub-nota-link-inline {
  @apply select-none;
}
</style>
