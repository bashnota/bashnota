<script setup lang="ts">
import UnifiedToolbar from '@/features/editor/components/ui/UnifiedToolbar.vue'
import type { Editor } from '@tiptap/vue-3'

// Props - simplified to match UnifiedToolbar
const props = defineProps<{
  editor: Editor | null
  canRunAll?: boolean
  isExecutingAll?: boolean
  isFavorite?: boolean
  wordCount?: number
}>()

// Emit events - pass through to UnifiedToolbar
const emit = defineEmits<{
  'run-all': []
  'toggle-favorite': []
  'share': []
  'open-config': []
  'export-nota': []
  'save-version': []
  'open-history': []
  'toggle-sidebar': [id: string]
}>()

// Type definition for sidebar IDs
type SidebarId = 'toc' | 'references' | 'jupyter' | 'ai' | 'metadata' | 'favorites'

// Handle sidebar toggle with proper typing
const handleSidebarToggle = (id: SidebarId) => {
  emit('toggle-sidebar', id)
}
</script>

<template>
  <UnifiedToolbar
    :can-run-all="canRunAll"
    :is-executing-all="isExecutingAll"
    :is-favorite="isFavorite"
    :word-count="wordCount"
    @run-all="$emit('run-all')"
    @toggle-favorite="$emit('toggle-favorite')"
    @share="$emit('share')"
    @open-config="$emit('open-config')"
    @export-nota="$emit('export-nota')"
    @save-version="$emit('save-version')"
    @open-history="$emit('open-history')"
    @toggle-sidebar="handleSidebarToggle"
  />
</template> 