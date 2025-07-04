<script setup lang="ts">
import { useEditorStore } from '@/features/editor/stores/editorStore'
import EditorToolbar from '@/features/editor/components/ui/EditorToolbar.vue'
import { Button } from '@/ui/button'
import {
  BookIcon,
  ServerIcon,
  BrainIcon,
  Tag,
  Star,
  Link2,
  Save,
  Clock,
  PlayCircle,
  Loader2,
  Share2,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next'
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'

type SidebarId = 'toc' | 'references' | 'jupyter' | 'ai' | 'metadata' | 'favorites';

const editorStore = useEditorStore()
const editor = computed(() => editorStore.activeEditor as Editor | null)
const isToolbarCollapsed = computed(() => editorStore.isToolbarCollapsed)

// TODO: These will be wired up later
const props = defineProps<{
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
  'toggle-sidebar': [id: SidebarId]
}>()
</script>

<template>
  <div class="border-b bg-background sticky top-0 z-10 transition-all duration-300">
    <!-- Collapsed View -->
    <div v-if="isToolbarCollapsed" class="flex items-center justify-end">
    </div>

    <!-- Expanded View -->
    <template v-else>
      <EditorToolbar
        :editor="editor"
        class="px-4 py-2"
        :can-run-all="canRunAll"
        :is-executing-all="isExecutingAll"
        @run-all="$emit('run-all')"
        :is-favorite="isFavorite"
        @toggle-favorite="$emit('toggle-favorite')"
        @share="$emit('share')"
        @open-config="$emit('open-config')"
        @export-nota="$emit('export-nota')"
      />
      <div class="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground border-t">
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" class="flex items-center gap-2" @click="$emit('toggle-sidebar', 'references')" title="References">
            <BookIcon class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" class="flex items-center gap-2" @click="$emit('toggle-sidebar', 'jupyter')" title="Jupyter Servers">
            <ServerIcon class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" class="flex items-center gap-2" @click="$emit('toggle-sidebar', 'ai')" title="AI Assistant">
            <BrainIcon class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" class="flex items-center gap-2" @click="$emit('toggle-sidebar', 'metadata')" title="Metadata">
            <Tag class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" class="flex items-center gap-2" @click="$emit('toggle-sidebar', 'favorites')" title="Favorite Blocks">
            <Star class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" class="flex items-center gap-2" @click="$emit('toggle-sidebar', 'toc')" title="Table of Contents">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 12h6M9 16h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </Button>
          <Button variant="ghost" size="sm" class="flex items-center gap-2" title="Shared kernel session">
            <Link2 class="h-4 w-4" />
          </Button>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Save Version" @click="$emit('save-version')">
            <Save class="w-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="History" @click="$emit('open-history')">
            <Clock class="w-4 w-4" />
          </Button>
          <Button v-if="canRunAll" variant="ghost" size="icon" title="Run All" :disabled="isExecutingAll" @click="$emit('run-all')">
            <Loader2 v-if="isExecutingAll" class="w-4 h-4 animate-spin" />
            <PlayCircle v-else class="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Star" @click="$emit('toggle-favorite')" :class="{ 'text-yellow-500': isFavorite }">
            <Star class="w-4 h-4" :fill="isFavorite ? 'currentColor' : 'none'" />
          </Button>
          <Button variant="ghost" size="icon" title="Share" @click="$emit('share')">
            <Share2 class="w-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Export" @click="$emit('export-nota')">
            <Download class="w-4 h-4" />
          </Button>
          <span>0 words</span>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6"
            @click="editorStore.toggleToolbar"
            title="Collapse toolbar"
          >
            <ChevronUp class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </template>
  </div>
</template> 