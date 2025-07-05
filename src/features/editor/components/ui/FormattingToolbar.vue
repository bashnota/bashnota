<script setup lang="ts">
import EditorToolbar from '@/features/editor/components/ui/EditorToolbar.vue'
import { Separator } from '@/ui/separator'
import { Tooltip } from '@/ui/tooltip'
import { Button } from '@/ui/button'
import { Star, Share2, Download, Save, Clock, Book } from 'lucide-vue-next'
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor: Editor | null
  canRunAll?: boolean
  isExecutingAll?: boolean
  isFavorite?: boolean
}>()

const emit = defineEmits<{
  'run-all': []
  'toggle-favorite': []
  share: []
  'open-config': []
  'export-nota': []
  'save-version': []
  'open-history': []
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Editor Formatting Tools -->
    <EditorToolbar
      v-if="editor"
      :editor="editor"
      class="flex items-center gap-1"
      :can-run-all="canRunAll"
      :is-executing-all="isExecutingAll"
      @run-all="$emit('run-all')"
      :is-favorite="isFavorite"
      @toggle-favorite="$emit('toggle-favorite')"
      @share="$emit('share')"
      @open-config="$emit('open-config')"
      @export-nota="$emit('export-nota')"
    />

    <Separator orientation="vertical" class="h-6" />

    <!-- Document Actions -->
    <div class="flex items-center gap-1">
      <!-- Save Version -->
      <Tooltip content="Save version">
        <Button variant="ghost" size="sm" @click="$emit('save-version')">
          <Save class="h-4 w-4" />
        </Button>
      </Tooltip>

      <!-- Version History -->
      <Tooltip content="Version history">
        <Button variant="ghost" size="sm" @click="$emit('open-history')">
          <Clock class="h-4 w-4" />
        </Button>
      </Tooltip>

      <!-- Favorite -->
      <Tooltip :content="isFavorite ? 'Remove from favorites' : 'Add to favorites'">
        <Button variant="ghost" size="sm" @click="$emit('toggle-favorite')">
          <Star class="h-4 w-4" :class="{ 'text-yellow-400': isFavorite }" />
        </Button>
      </Tooltip>
    </div>

    <Separator orientation="vertical" class="h-6" />

    <!-- Sharing & Export -->
    <div class="flex items-center gap-1">
      <!-- Share -->
      <Tooltip content="Share document">
        <Button variant="ghost" size="sm" @click="$emit('share')">
          <Share2 class="h-4 w-4" />
        </Button>
      </Tooltip>

      <!-- Export -->
      <Tooltip content="Export document">
        <Button variant="ghost" size="sm" @click="$emit('export-nota')">
          <Download class="h-4 w-4" />
        </Button>
      </Tooltip>

      <!-- References -->
      <Tooltip content="Manage references">
        <Button variant="ghost" size="sm" @click="$emit('open-config')">
          <Book class="h-4 w-4" />
        </Button>
      </Tooltip>
    </div>
  </div>
</template> 