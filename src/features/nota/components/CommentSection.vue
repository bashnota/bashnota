<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { MessageSquare, RefreshCw, Shield } from 'lucide-vue-next'
import { communityCommentService as commentService } from '@/features/nota/services/communityCommentService'
import { toast } from '@/services/toast'
import { logger } from '@/services/logger'
import CommentForm from './CommentForm.vue'
import CommentItem from './CommentItem.vue'
import type { Comment } from '@/features/nota/types/nota'

const props = defineProps<{
  notaId: string
}>()

const comments = ref<Comment[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const commentCount = ref(0)
const itemsPerPage = 20
const hasMore = ref(false)
const nextCursor = ref<string | null>(null)
const isLoadingMore = ref(false)
const showCommentForm = ref(false)
const isPermissionError = ref(false)
let loadGeneration = 0

// Load comments on mount
onMounted(async () => {
  await loadComments()
})

// Watch for nota ID changes
watch(() => props.notaId, async () => {
  if (props.notaId) {
    isLoading.value = true
    error.value = null
    comments.value = []
    nextCursor.value = null
    await loadComments()
  }
})

// Load comments for the current nota
const loadComments = async () => {
  if (!props.notaId) return
  const notaId = props.notaId
  const generation = ++loadGeneration
  
  try {
    isLoading.value = true
    error.value = null
    isPermissionError.value = false
    
    // Get top-level comments (parentId: null)
    const page = await commentService.getComments(
      notaId,
      null,
      itemsPerPage,
      null,
    )

    if (generation !== loadGeneration || notaId !== props.notaId) return
    comments.value = page.items
    commentCount.value = page.totalCount ?? page.items.length
    nextCursor.value = page.nextCursor
    hasMore.value = page.nextCursor !== null
  } catch (err: any) {
    if (generation !== loadGeneration || notaId !== props.notaId) return
    logger.error('Failed to load comments:', err)
    
    if (err && typeof err === 'object' && 'code' in err && err.code === 'forbidden') {
      isPermissionError.value = true
      error.value = 'Comments are not available for this account.'
    } else {
      error.value = 'Failed to load comments. Please try again later.'
    }
  } finally {
    if (generation === loadGeneration) isLoading.value = false
  }
}

// Load more comments
const loadMoreComments = async () => {
  if (isLoadingMore.value || !hasMore.value) return
  const notaId = props.notaId
  const generation = loadGeneration
  
  try {
    isLoadingMore.value = true
    
    const page = await commentService.getComments(
      notaId,
      null,
      itemsPerPage,
      nextCursor.value,
    )

    if (generation !== loadGeneration || notaId !== props.notaId) return
    const deduped = new Map([...comments.value, ...page.items].map(comment => [comment.id, comment]))
    comments.value = [...deduped.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id),
    )
    if (page.totalCount !== undefined) commentCount.value = page.totalCount
    nextCursor.value = page.nextCursor
    hasMore.value = page.nextCursor !== null
  } catch (err) {
    if (generation !== loadGeneration || notaId !== props.notaId) return
    logger.error('Failed to load more comments:', err)
    toast('Failed to load more comments')
  } finally {
    if (generation === loadGeneration) isLoadingMore.value = false
  }
}

// Handle comment added
const handleCommentAdded = async () => {
  // Reload all comments to show the new one at the top
  await loadComments()
  // Reset the comment form state
  showCommentForm.value = false
}

// Handle comment deleted
const handleCommentDeleted = async (index: number) => {
  // Remove the comment from the array
  comments.value.splice(index, 1)
  commentCount.value = Math.max(0, commentCount.value - 1)
  
  // No need to reload all comments, we just updated our local state
}

// Toggle comment form
const toggleCommentForm = () => {
  showCommentForm.value = !showCommentForm.value
}
</script>

<template>
  <section class="comments-section mt-8 pt-6 border-t">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-semibold flex items-center">
        <MessageSquare class="mr-2 h-5 w-5" />
        Comments
        <span v-if="!isLoading" class="ml-2 text-sm font-normal text-muted-foreground">
          ({{ commentCount }})
        </span>
      </h2>
      
      <Button variant="outline" size="sm" @click="loadComments" :disabled="isLoading">
        <RefreshCw :class="{ 'animate-spin': isLoading }" class="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </div>
    
    <!-- Comment form toggler -->
    <Button 
      v-if="!showCommentForm && !isPermissionError" 
      variant="outline" 
      class="w-full justify-center mb-6"
      @click="toggleCommentForm"
    >
      <MessageSquare class="h-4 w-4 mr-2" />
      Write a comment
    </Button>
    
    <!-- Comment form -->
    <CommentForm 
      v-if="showCommentForm && !isPermissionError" 
      :nota-id="notaId"
      @comment-added="handleCommentAdded"
    />
    
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
    
    <!-- Permission error state -->
    <div v-else-if="isPermissionError" class="bg-yellow-50 border border-yellow-200 p-4 rounded-md my-4">
      <div class="flex items-start">
        <Shield class="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
        <div>
          <h3 class="font-medium text-yellow-800">Comments Unavailable</h3>
          <p class="text-yellow-700 mt-1 text-sm">
            Comments are not available for this account at this moment.
          </p>
        </div>
      </div>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error && !isPermissionError" class="bg-destructive/10 text-destructive p-4 rounded-md my-4">
      <p>{{ error }}</p>
      <Button variant="outline" size="sm" class="mt-2" @click="loadComments">
        Try Again
      </Button>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="comments.length === 0 && !isPermissionError" class="text-center py-12 border border-dashed rounded-lg">
      <MessageSquare class="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
      <h3 class="text-lg font-medium mb-2">No comments yet</h3>
      <p class="text-muted-foreground mb-4">Be the first to share your thoughts!</p>
      <Button v-if="!showCommentForm" @click="toggleCommentForm">
        <MessageSquare class="h-4 w-4 mr-2" />
        Add Comment
      </Button>
    </div>
    
    <!-- Comments list -->
    <div v-else-if="!isPermissionError" class="space-y-4 mt-6">
      <CommentItem 
        v-for="(comment, index) in comments" 
        :key="comment.id"
        :comment="comment"
        :nota-id="notaId"
        @comment-deleted="handleCommentDeleted(index)"
        @comment-updated="loadComments"
      />
      
      <!-- Load more button -->
      <div v-if="hasMore" class="flex justify-center mt-6">
        <Button 
          variant="outline"
          @click="loadMoreComments"
          :disabled="isLoadingMore"
          class="min-w-[150px]"
        >
          <div v-if="isLoadingMore" class="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
          <span>{{ isLoadingMore ? 'Loading...' : 'Load More' }}</span>
        </Button>
      </div>
    </div>
  </section>
</template>


