<template>
  <!-- Single right sidebar that switches content based on active sidebar -->
  <Sidebar 
    v-if="activeSidebar" 
    side="right" 
    collapsible="none"
    variant="sidebar"
    class="h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] overflow-hidden"
  >
    <!-- Dynamic sidebar content based on active sidebar -->
    <template v-if="activeSidebar === 'references'">
      <SidebarHeader class="border-b">
        <div class="flex items-center justify-between p-3">
          <div class="flex items-center gap-2">
            <BookIcon class="h-5 w-5" />
            <h2 class="font-semibold">References</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            @click="closeSidebar('references')"
            class="h-8 w-8 p-0"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>
      
      <SidebarContent class="flex-1 overflow-hidden">
        <div class="h-full overflow-y-auto">
          <ReferencesSidebarContent 
            :editor="editor || undefined" 
            :nota-id="activeNota?.id || ''"
            @close="closeSidebar('references')"
          />
        </div>
      </SidebarContent>
      
    </template>

    <template v-else-if="activeSidebar === 'jupyter'">
      <SidebarHeader class="border-b">
        <div class="flex items-center justify-between p-3">
          <div class="flex items-center gap-2">
            <ServerIcon class="h-5 w-5" />
            <h2 class="font-semibold">Jupyter Servers</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            @click="closeSidebar('jupyter')"
            class="h-8 w-8 p-0"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>
      
      <SidebarContent class="flex-1 overflow-hidden">
        <div class="h-full overflow-y-auto">
          <JupyterServersSidebarContent 
            :nota-id="activeNota?.id || ''"
            @close="closeSidebar('jupyter')"
          />
        </div>
      </SidebarContent>
      
      <SidebarFooter class="border-t">
        <div class="p-2">
          <div class="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Ctrl</kbd>
            <span>+</span>
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Shift</kbd>
            <span>+</span>
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">J</kbd>
            <span class="ml-2">toggle jupyter</span>
          </div>
        </div>
      </SidebarFooter>
    </template>

    <template v-else-if="activeSidebar === 'ai'">
      <SidebarHeader class="border-b">
        <div class="flex items-center justify-between p-3">
          <div class="flex items-center gap-2">
            <BrainIcon class="h-5 w-5" />
            <h2 class="font-semibold">AI Assistant</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            @click="closeSidebar('ai')"
            class="h-8 w-8 p-0"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>
      
      <SidebarContent class="flex-1 overflow-hidden">
        <div class="h-full overflow-y-auto">
          <AIAssistantSidebarContent 
            :editor="editor || undefined"
            :nota-id="activeNota?.id || ''"
            @close="closeSidebar('ai')"
          />
        </div>
      </SidebarContent>
      
      <SidebarFooter class="border-t">
        <div class="p-2">
          <div class="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Ctrl</kbd>
            <span>+</span>
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Shift</kbd>
            <span>+</span>
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Alt</kbd>
            <span>+</span>
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">I</kbd>
            <span class="ml-2">toggle AI Assistant</span>
          </div>
        </div>
      </SidebarFooter>
    </template>

    <template v-else-if="activeSidebar === 'metadata'">
      <SidebarHeader class="border-b">
        <div class="flex items-center justify-between p-3">
          <div class="flex items-center gap-2">
            <FileTextIcon class="h-5 w-5" />
            <h2 class="font-semibold">Metadata</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            @click="closeSidebar('metadata')"
            class="h-8 w-8 p-0"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>
      
      <SidebarContent class="flex-1 overflow-hidden">
        <div class="h-full overflow-y-auto">
          <MetadataSidebarContent 
            :nota-id="activeNota?.id || ''"
            :editor="editor || undefined"
            @close="closeSidebar('metadata')"
          />
        </div>
      </SidebarContent>
      
      <SidebarFooter class="border-t">
        <div class="p-2">
          <div class="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Ctrl</kbd>
            <span>+</span>
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Shift</kbd>
            <span>+</span>
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">M</kbd>
            <span class="ml-2">toggle metadata</span>
          </div>
        </div>
      </SidebarFooter>
    </template>

    <template v-else-if="activeSidebar === 'favorites'">
      <SidebarHeader class="border-b">
        <div class="flex items-center justify-between p-3">
          <div class="flex items-center gap-2">
            <StarIcon class="h-5 w-5" />
            <h2 class="font-semibold">Favorite Blocks</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            @click="closeSidebar('favorites')"
            class="h-8 w-8 p-0"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>
      
      <SidebarContent class="flex-1 overflow-hidden">
        <div class="h-full overflow-y-auto">
          <FavoriteBlocksSidebarContent 
            :editor="editor || undefined"
            @close="closeSidebar('favorites')"
          />
        </div>
      </SidebarContent>
      
      <SidebarFooter class="border-t">
        <div class="p-2">
          <div class="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Ctrl</kbd>
            <span>+</span>
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Shift</kbd>
            <span>+</span>
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">Alt</kbd>
            <span>+</span>
            <kbd class="px-1.5 py-0.5 text-xs bg-muted border rounded">V</kbd>
            <span class="ml-2">toggle favorites</span>
          </div>
        </div>
      </SidebarFooter>
    </template>
  </Sidebar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useSidebarManager } from '@/composables/useSidebarManager'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useRoute } from 'vue-router'
import { cn } from '@/lib/utils'

// Shadcn components
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

// Icons
import { BookIcon, ServerIcon, BrainIcon, FileTextIcon, StarIcon, X } from 'lucide-vue-next'

// Import sidebar content components (we'll create these)
import ReferencesSidebarContent from '@/features/nota/components/ReferencesSidebarContent.vue'
import JupyterServersSidebarContent from '@/features/jupyter/components/JupyterServersSidebarContent.vue'
import AIAssistantSidebarContent from '@/features/ai/components/AIAssistantSidebarContent.vue'
import MetadataSidebarContent from '@/features/nota/components/MetadataSidebarContent.vue'
import FavoriteBlocksSidebarContent from '@/features/nota/components/FavoriteBlocksSidebarContent.vue'

const props = defineProps<{
  editor?: Editor | null
}>()

// Get the sidebar manager
const { sidebarStates, closeSidebar } = useSidebarManager()

// Get current nota
const route = useRoute()
const notaStore = useNotaStore()

const activeNota = computed(() => {
  const notaId = route.params.id as string
  return notaId ? notaStore.getCurrentNota(notaId) : null
})

// Determine which sidebar is currently active (only one at a time)
const activeSidebar = computed(() => {
  if (sidebarStates.references.isOpen) return 'references'
  if (sidebarStates.jupyter.isOpen) return 'jupyter'
  if (sidebarStates.ai.isOpen) return 'ai'
  if (sidebarStates.metadata.isOpen) return 'metadata'
  if (sidebarStates.favorites.isOpen) return 'favorites'
  return null
})
</script>
