<script setup lang="ts">
import { ref } from 'vue'
import AIAssistantSidebarComponent from './components/AIAssistantSidebar.vue'
import { BrainIcon, X } from 'lucide-vue-next'
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  editor: any
  notaId: string
  hideHeader?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

</script>

<template>
  <Sidebar side="right" class="w-96">
    <SidebarHeader class="border-b">
      <div class="flex items-center justify-between p-3">
        <div class="flex items-center gap-2">
          <BrainIcon class="h-5 w-5" />
          <h2 class="font-semibold">AI Assistant</h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          @click="$emit('close')"
          class="h-8 w-8 p-0"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>
    </SidebarHeader>
    
    <SidebarContent>
      <AIAssistantSidebarComponent 
        :editor="editor" 
        :notaId="notaId"
        :hide-header="true"
        @close="$emit('close')"
      />
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
  </Sidebar>
</template>

<style scoped>
.ai-assistant-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: visible;
  box-sizing: border-box;
}

/* Make sure resize handle is visible outside of the component boundary */
.ai-assistant-wrapper :deep(.absolute) {
  z-index: 100;
}
</style>







