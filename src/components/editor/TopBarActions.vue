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

// Debug function to check if button click is working
const handleShareClick = () => {
  console.log('[DEBUG] Share button clicked');
  console.log('[DEBUG] onShare prop type:', typeof props.onShare);
  
  // Call the provided onShare function
  props.onShare();
  console.log('[DEBUG] onShare function called');
}
</script>

<template>
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="sm" class="flex items-center gap-2" @click="handleShareClick">
      <Share2 class="h-4 w-4" />
      <span>Publish</span>
    </Button>
    <SidebarsDropdown 
      :sidebars="sidebars" 
      :on-toggle="onToggleSidebar"
    />

  </div>
</template>