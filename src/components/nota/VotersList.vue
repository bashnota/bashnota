<template>
  <div>
    <Button
      variant="outline"
      size="sm"
      class="flex items-center gap-1"
      @click="showVotersDialog = true"
    >
      <Users class="h-4 w-4" />
      <span>Show Voters</span>
    </Button>

    <Dialog :open="showVotersDialog" @update:open="showVotersDialog = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voters</DialogTitle>
          <DialogDescription>
            Users who voted on this nota
          </DialogDescription>
        </DialogHeader>
        
        <div class="py-4">
          <div v-if="isLoading" class="flex justify-center py-4">
            <LoadingSpinner class="h-8 w-8" />
          </div>
          
          <div v-else-if="voters.length === 0" class="text-center py-4 text-muted-foreground">
            <p>No votes on this nota yet.</p>
          </div>
          
          <div v-else class="space-y-2">
            <div class="mb-2 flex justify-between border-b pb-2">
              <span class="font-medium">User</span>
              <span class="font-medium">Vote</span>
            </div>
            
            <div v-for="voter in voters" :key="voter.userId" class="flex items-center justify-between py-2 border-b border-muted">
              <RouterLink 
                :to="`/@${voter.userTag}`" 
                class="flex items-center gap-2 hover:underline text-primary"
              >
                <UserCircle class="h-5 w-5" />
                <span>@{{ voter.userTag }}</span>
              </RouterLink>
              
              <div>
                <Badge v-if="voter.voteType === 'like'" variant="default" class="flex items-center gap-1">
                  <ThumbsUp class="h-3 w-3" />
                  Liked
                </Badge>
                <Badge v-else variant="outline" class="flex items-center gap-1 bg-muted">
                  <ThumbsDown class="h-3 w-3" />
                  Disliked
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter class="sm:justify-center">
          <Button variant="secondary" @click="showVotersDialog = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { statisticsService } from '@/services/statisticsService'
import { logger } from '@/services/logger'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ThumbsUp, ThumbsDown, Users, UserCircle } from 'lucide-vue-next'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const props = defineProps<{
  notaId: string
}>()

const showVotersDialog = ref(false)
const isLoading = ref(false)
const voters = ref<{ userId: string, userTag: string, voteType: 'like' | 'dislike' }[]>([])

const fetchVoters = async () => {
  try {
    isLoading.value = true
    voters.value = await statisticsService.getVoters(props.notaId)
  } catch (error) {
    logger.error('Failed to fetch voters:', error)
  } finally {
    isLoading.value = false
  }
}

// Load voters when dialog is opened
watch(showVotersDialog, (newValue) => {
  if (newValue) {
    fetchVoters()
  }
})
</script>