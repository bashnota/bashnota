<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Share2 } from 'lucide-vue-next'
import SidebarsDropdown from './SidebarsDropdown.vue'

type SidebarId = 'toc' | 'references' | 'jupyter' | 'ai' | 'metadata' | 'favorites'

const props = defineProps<{
  sidebars: Record<SidebarId, { isOpen: boolean }>
  onToggleSidebar: (id: SidebarId) => void
  onShare: () => void
}>()

const emit = defineEmits<{
  share: []
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="sm" class="flex items-center gap-2" @click="onShare">
      <Share2 class="h-4 w-4" />
      <span>Share</span>
    </Button>
    <SidebarsDropdown 
      :sidebars="sidebars" 
      :on-toggle="onToggleSidebar"
    />

  </div>
</template> 