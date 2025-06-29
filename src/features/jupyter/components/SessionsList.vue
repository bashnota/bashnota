<template>
  <div class="sessions-list">
    <div class="flex items-center justify-between mb-2">
      <h5 class="text-xs font-medium text-muted-foreground">Active Sessions</h5>
      <span class="text-xs text-muted-foreground">{{ sessions.length }}</span>
    </div>
    
    <div class="space-y-2">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="flex items-center justify-between bg-muted/30 p-2 rounded-md hover:bg-muted/50 transition-colors"
      >
        <div class="flex-1 min-w-0">
          <div class="text-xs font-medium truncate">
            {{ session.name || session.id }}
          </div>
          <div class="text-[10px] text-muted-foreground mt-0.5">
            <span>Kernel: {{ session.kernel.name || 'Unknown' }}</span>
            <span v-if="session.kernel.lastActivity" class="ml-2">
              • Last activity: {{ formatLastActivity(session.kernel.lastActivity) }}
            </span>
          </div>
          <div v-if="session.path" class="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
            {{ session.path }}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          class="h-7 px-2 ml-2 shrink-0"
          @click="handleUse(session.id)"
        >
          Use
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/ui/button'
import type { JupyterSession } from '@/features/jupyter/composables/useJupyterSessions'

interface Props {
  sessions: JupyterSession[]
}

interface Emits {
  use: [sessionId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleUse = (sessionId: string) => {
  emit('use', sessionId)
}

const formatLastActivity = (lastActivity: string): string => {
  try {
    const date = new Date(lastActivity)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}d ago`
    }
  } catch {
    return 'Unknown'
  }
}
</script>

<style scoped>
.sessions-list {
  @apply space-y-2;
}
</style> 







