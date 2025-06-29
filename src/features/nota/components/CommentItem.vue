<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  MoreVertical, 
  Trash2, 
  X
} from 'lucide-vue-next'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ui/dropdown-menu'
import { useAuthStore } from '@/features/auth/stores/auth'
import { commentService } from '@/features/nota/services/commentService'
import { formatDate, toast } from '@/lib/utils'
import { logger } from '@/services/logger'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/ui/dialog'
import CommentForm from './CommentForm.vue'
import type { Comment } from '@/features/nota/types/nota'
import { useRouter } from 'vue-router'

const props = defineProps<{
  comment: Comment
  notaId: string
}>()

const emit = defineEmits<{
  (e: 'comment-deleted'): void
  (e: 'comment-updated'): void
}>()

const router = useRouter()
const authStore = useAuthStore()
const showReplies = ref(false)
const isSubmittingVote = ref(false)
const showReplyForm = ref(false)
const replies = ref<Comment[]>([])
const isLoadingReplies = ref(false)
const confirmDeleteDialog = ref(false)
const isDeleting = ref(false)

// Vote counts
const likeCount = ref(props.comment.likeCount || 0)
const dislikeCount = ref(props.comment.dislikeCount || 0)
const userVote = ref<'like' | 'dislike' | null>(null)

// Get user's vote on this comment
onMounted(async () => {
  if (authStore.isAuthenticated && authStore.currentUser?.uid) {
    try {
      userVote.value = await commentService.getUserVote(props.comment.id, authStore.currentUser.uid)
    } catch (error) {
      logger.error('Error fetching user vote:', error)
    }
  }
})

// Computed property to check if the current user is the comment author
const isAuthor = computed(() => {
  return authStore.isAuthenticated && 
         authStore.currentUser?.uid === props.comment.authorId
})

// Handle voting on comments
const handleVote = async (voteType: 'like' | 'dislike') => {
  // Must be logged in to vote
  if (!authStore.isAuthenticated || !authStore.currentUser?.uid) {
    toast('Please log in to vote', '', 'destructive')
    return
  }
  
  if (isSubmittingVote.value) return
  
  try {
    isSubmittingVote.value = true
    
    // Record the vote
    const result = await commentService.voteOnComment(
      props.comment.id,
      authStore.currentUser.uid,
      voteType
    )
    
    // Update local state with the results
    likeCount.value = result.likeCount
    dislikeCount.value = result.dislikeCount
    userVote.value = result.userVote
  } catch (error) {
    logger.error('Failed to record vote:', error)
    toast('Failed to record your vote', '', 'destructive')
  } finally {
    isSubmittingVote.value = false
  }
}

// Toggle showing replies
const toggleReplies = async () => {
  showReplies.value = !showReplies.value
  
  // If showing replies and we haven't loaded them yet, load them
  if (showReplies.value && replies.value.length === 0 && props.comment.replyCount > 0) {
    await loadReplies()
  }
}

// Load replies for this comment
const loadReplies = async () => {
  if (isLoadingReplies.value) return
  
  try {
    isLoadingReplies.value = true
    replies.value = await commentService.getComments(props.notaId, props.comment.id)
  } catch (error) {
    logger.error('Error loading replies:', error)
    toast('Failed to load replies', '', 'destructive')
  } finally {
    isLoadingReplies.value = false
  }
}

// Show the reply form
const showReply = () => {
  if (!authStore.isAuthenticated) {
    toast('Please log in to reply', '', 'destructive')
    return
  }
  
  showReplyForm.value = true
  // Show replies if they aren't already showing
  if (!showReplies.value && props.comment.replyCount > 0) {
    toggleReplies()
  }
}

// Handle reply added
const handleReplyAdded = async () => {
  showReplyForm.value = false
  
  // Show success message
  toast('Reply added successfully')
  
  // Update comment reply count and reload replies
  props.comment.replyCount++
  
  // Make sure replies are visible
  showReplies.value = true
  
  // Reload replies
  await loadReplies()
  
  // Emit event so parent can update
  emit('comment-updated')
}

// Delete comment
const deleteComment = async () => {
  if (!authStore.isAuthenticated) return
  
  if (isDeleting.value) return
  
  try {
    isDeleting.value = true
    
    const success = await commentService.deleteComment(
      props.comment.id, 
      authStore.currentUser?.uid as string
    )
    
    if (success) {
      confirmDeleteDialog.value = false
      toast('Comment deleted successfully')
      emit('comment-deleted')
    }
  } catch (error) {
    logger.error('Error deleting comment:', error)
    toast('Failed to delete comment', '', 'destructive')
  } finally {
    isDeleting.value = false
  }
}

// Navigate to author profile
const goToAuthorProfile = () => {
  if (props.comment.authorTag) {
    router.push(`/@${props.comment.authorTag}`)
  }
}
</script>

<template>
  <div class="comment-item border border-border rounded-lg p-4 my-3 bg-card">
    <!-- Comment header with author info -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div 
          class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium"
          :title="comment.authorName"
        >
          {{ comment.authorName.charAt(0).toUpperCase() }}
        </div>
        <div>
          <div class="flex items-center gap-1">
            <span 
              class="font-medium cursor-pointer hover:underline"
              @click="goToAuthorProfile"
            >
              {{ comment.authorTag ? `@${comment.authorTag}` : comment.authorName }}
            </span>
            <Badge v-if="isAuthor" variant="outline" class="text-xs">Author</Badge>
          </div>
          <span class="text-xs text-muted-foreground">{{ formatDate(comment.createdAt) }}</span>
        </div>
      </div>
      
      <!-- Comment actions -->
      <DropdownMenu v-if="isAuthor || (authStore.isAuthenticated && authStore.currentUser?.uid)">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" class="h-8 w-8">
            <MoreVertical class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            v-if="isAuthor" 
            @click="confirmDeleteDialog = true"
            class="text-destructive focus:text-destructive cursor-pointer"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    
    <!-- Comment content -->
    <div class="mt-3 text-sm whitespace-pre-wrap">
      {{ comment.content }}
    </div>
    
    <!-- Comment actions bar -->
    <div class="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
      <!-- Like button -->
      <Button 
        variant="ghost" 
        size="sm" 
        class="h-8 px-2 flex items-center gap-1 transition-colors"
        :class="{ 'text-primary': userVote === 'like' }"
        :disabled="isSubmittingVote"
        @click="handleVote('like')"
      >
        <ThumbsUp :class="{ 'fill-current': userVote === 'like' }" class="h-4 w-4" />
        <span>{{ likeCount }}</span>
      </Button>
      
      <!-- Dislike button -->
      <Button 
        variant="ghost" 
        size="sm" 
        class="h-8 px-2 flex items-center gap-1 transition-colors"
        :class="{ 'text-destructive': userVote === 'dislike' }"
        :disabled="isSubmittingVote"
        @click="handleVote('dislike')"
      >
        <ThumbsDown :class="{ 'fill-current': userVote === 'dislike' }" class="h-4 w-4" />
        <span>{{ dislikeCount }}</span>
      </Button>
      
      <!-- Reply button -->
      <Button 
        variant="ghost" 
        size="sm"
        class="h-8 px-2 flex items-center gap-1"
        @click="showReply"
      >
        <MessageSquare class="h-4 w-4" />
        <span>Reply</span>
      </Button>
      
      <!-- Show replies button (only if there are replies) -->
      <Button 
        v-if="comment.replyCount > 0"
        variant="ghost" 
        size="sm"
        class="h-8 px-2 flex items-center gap-1 ml-auto"
        @click="toggleReplies"
      >
        <span>{{ showReplies ? 'Hide' : 'Show' }} {{ comment.replyCount }} {{ comment.replyCount === 1 ? 'reply' : 'replies' }}</span>
      </Button>
    </div>
    
    <!-- Reply form -->
    <div v-if="showReplyForm" class="mt-4 ml-8">
      <CommentForm 
        :nota-id="notaId"
        :parent-id="comment.id"
        placeholder="Write a reply..."
        is-reply
        @comment-added="handleReplyAdded"
        @cancel-reply="showReplyForm = false"
      />
    </div>
    
    <!-- Replies section -->
    <div v-if="showReplies" class="mt-4 ml-8 space-y-4">
      <div v-if="isLoadingReplies" class="flex justify-center p-4">
        <div class="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
      
      <div v-else-if="replies.length === 0" class="text-center text-sm text-muted-foreground p-4">
        No replies yet. Be the first to reply!
      </div>
      
      <template v-else>
        <div v-for="reply in replies" :key="reply.id" class="border-l-2 border-muted pl-4">
          <CommentItem 
            :comment="reply" 
            :nota-id="notaId"
            @comment-deleted="loadReplies"
            @comment-updated="loadReplies"
          />
        </div>
      </template>
    </div>
    
    <!-- Delete confirmation dialog -->
    <Dialog :open="confirmDeleteDialog" @update:open="confirmDeleteDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Comment</DialogTitle>
        </DialogHeader>
        
        <p class="py-4">Are you sure you want to delete this comment? This action cannot be undone.</p>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            @click="confirmDeleteDialog = false"
            :disabled="isDeleting"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            @click="deleteComment"
            :disabled="isDeleting"
          >
            <Trash2 v-if="!isDeleting" class="h-4 w-4 mr-2" />
            <div v-else class="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>







