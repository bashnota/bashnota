<script setup lang="ts">
import { Button } from '@/ui/button'
import { Tooltip } from '@/ui/tooltip'
import { Separator } from '@/ui/separator'
import {
  BookIcon,
  ServerIcon,
  BrainIcon,
  Tag,
  Star,
  Menu,
} from 'lucide-vue-next'
import { useSidebarManager } from '@/composables/useSidebarManager'

const {
  pinnedSidebars,
  toggleSidebar,
  isNotaView,
} = useSidebarManager()

// Icon mapping
const iconMap = {
  Menu,
  BookIcon,
  ServerIcon,
  BrainIcon,
  Tag,
  Star,
}

// Get icon component
const getIcon = (iconName: string) => {
  return iconMap[iconName as keyof typeof iconMap] || Menu
}
</script>

<template>
  <div v-if="isNotaView && pinnedSidebars.length > 0" class="flex items-center gap-1">
    <Separator orientation="vertical" class="h-6" />
    
    <div class="flex items-center gap-1">
      <Tooltip 
        v-for="sidebar in pinnedSidebars" 
        :key="sidebar.id" 
        :content="`${sidebar.title} (Pinned)`"
      >
        <Button
          variant="ghost"
          size="icon"
          @click="toggleSidebar(sidebar.id)"
          :class="{ 'bg-muted': sidebar.isOpen }"
          class="relative"
        >
          <component :is="getIcon(sidebar.icon)" class="h-4 w-4" />
          <!-- Pin indicator -->
          <div class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full"></div>
        </Button>
      </Tooltip>
    </div>
  </div>
</template> 