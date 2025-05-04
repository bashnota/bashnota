<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Link2 } from 'lucide-vue-next'

const props = defineProps<{
  sharedSessionMode: boolean
  onToggle: () => void
}>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" class="flex items-center gap-2">
        <Link2 class="h-4 w-4" :class="{ 'text-primary': sharedSessionMode }" />
        <span>Session Mode</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="dropdown-content" :class="{ 'dropdown-content-open': true }">
      <DropdownMenuItem @click="onToggle" :class="{ 'bg-muted': sharedSessionMode }">
        <Link2 class="h-4 w-4 mr-2" :class="{ 'text-primary': sharedSessionMode }" />
        <span>{{ sharedSessionMode ? 'Disable' : 'Enable' }} Shared Session</span>
        <span class="ml-auto text-xs text-muted-foreground">
          {{ sharedSessionMode ? 'All blocks share one session' : 'Each block has its own session' }}
        </span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template> 