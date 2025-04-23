<script setup lang="ts">
import { TagsInput } from '@/components/ui/tags-input'
import TagsInputItem from '@/components/ui/tags-input/TagsInputItem.vue'
import TagsInputItemText from '@/components/ui/tags-input/TagsInputItemText.vue'
import TagsInputItemDelete from '@/components/ui/tags-input/TagsInputItemDelete.vue'
import TagsInputInput from '@/components/ui/tags-input/TagsInputInput.vue'
import SaveIndicator from '@/components/ui/SaveIndicator.vue'
import type { Nota } from '@/types/nota'

const props = defineProps<{
  nota: Nota | null
  isSaving: boolean
  showSaved: boolean
}>()

const emit = defineEmits<{
  'update:tags': [tags: string[]]
}>()

/**
 * Handle tag updates
 * @param tags - New tags array
 */
const updateTags = (tags: any[]) => {
  if (props.nota) {
    // Convert tags to strings if they aren't already
    const stringTags = tags.map(tag => typeof tag === 'string' ? tag : String(tag))
    emit('update:tags', stringTags)
  }
}
</script>

<template>
  <div v-if="nota" class="nota-metadata">
    <!-- Tags Input -->
    <TagsInput 
      :model-value="nota.tags" 
      @update:model-value="updateTags"
      class="w-full border-none"
    >
      <TagsInputItem v-for="item in nota.tags" :key="item" :value="item">
        <TagsInputItemText />
        <TagsInputItemDelete />
      </TagsInputItem>
      <TagsInputInput placeholder="Enter Tags..." />
    </TagsInput>
    
    <!-- Save Status Indicator -->
    <SaveIndicator 
      :is-saving="isSaving" 
      :show-saved="showSaved"
      :updated-at="typeof nota.updatedAt === 'string' ? new Date(nota.updatedAt) : nota.updatedAt"
    />
  </div>
</template>

<style scoped>
.nota-metadata {
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 10;
}
</style>