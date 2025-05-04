<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { BookIcon, ServerIcon, BrainIcon, Star, Tag } from 'lucide-vue-next'

type SidebarId = 'toc' | 'references' | 'jupyter' | 'ai' | 'metadata' | 'favorites'

const props = defineProps<{
  sidebars: Record<SidebarId, { isOpen: boolean }>
  onToggle: (id: SidebarId) => void
}>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" class="flex items-center gap-2">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="dropdown-content" :class="{ 'dropdown-content-open': true }">
      <DropdownMenuItem @click="onToggle('references')" :class="{ 'bg-muted': sidebars.references.isOpen }">
        <BookIcon class="h-4 w-4 mr-2" />
        <span>References</span>
        <span class="ml-auto text-xs text-muted-foreground">Ctrl+Shift+Alt+R</span>
      </DropdownMenuItem>
      <DropdownMenuItem @click="onToggle('jupyter')" :class="{ 'bg-muted': sidebars.jupyter.isOpen }">
        <ServerIcon class="h-4 w-4 mr-2" />
        <span>Jupyter Servers</span>
        <span class="ml-auto text-xs text-muted-foreground">Ctrl+Shift+Alt+J</span>
      </DropdownMenuItem>
      <DropdownMenuItem @click="onToggle('ai')" :class="{ 'bg-muted': sidebars.ai.isOpen }">
        <BrainIcon class="h-4 w-4 mr-2" />
        <span>AI Assistant</span>
        <span class="ml-auto text-xs text-muted-foreground">Ctrl+Shift+Alt+I</span>
      </DropdownMenuItem>
      <DropdownMenuItem @click="onToggle('metadata')" :class="{ 'bg-muted': sidebars.metadata.isOpen }">
        <Tag class="h-4 w-4 mr-2" />
        <span>Metadata</span>
        <span class="ml-auto text-xs text-muted-foreground">Ctrl+Shift+Alt+L</span>
      </DropdownMenuItem>
      <DropdownMenuItem @click="onToggle('favorites')" :class="{ 'bg-muted': sidebars.favorites.isOpen }">
        <Star class="h-4 w-4 mr-2" />
        <span>Favorite Blocks</span>
        <span class="ml-auto text-xs text-muted-foreground">Ctrl+Shift+Alt+V</span>
      </DropdownMenuItem>
      <DropdownMenuItem @click="onToggle('toc')" :class="{ 'bg-muted': sidebars.toc.isOpen }">
        <svg class="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 12h6M9 16h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Table of Contents</span>
        <span class="ml-auto text-xs text-muted-foreground">Ctrl+Shift+Alt+O</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template> 