<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/ui/button'
import { Textarea } from '@/ui/textarea'
import { Send, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/features/auth/stores/auth'
import { commentService } from '@/features/nota/services/commentService'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'

const props = defineProps<{
  notaId: string
  parentId?: string | null
  placeholder?: string
  isReply?: boolean
}>()

const emit = defineEmits<{
  (e: 'comment-added'): void
  (e: 'cancel-reply'): void
}>()

const commentText = ref('')
const isSubmitting = ref(false)
const authStore = useAuthStore()

// Computed property to control when the submit button is enabled
const canSubmit = computed(() => {
  // Must be authenticated and have text that's not just whitespace
  return authStore.isAuthenticated && commentText.value.trim().length > 0
})

// Maximum comment length
const MAX_COMMENT_LENGTH = 1000

const handleSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return
  
  // Validate comment
  const text = commentText.value.trim()
  if (text.length === 0) {
    toast('Comment cannot be empty')
    return
  }
  
  if (text.length > MAX_COMMENT_LENGTH) {
    toast(`Comment is too long (max ${MAX_COMMENT_LENGTH} characters)`)
    return
  }
  
  isSubmitting.value = true
  
  try {
    // Submit the comment
    await commentService.addComment(
      props.notaId,
      authStore.currentUser?.uid as string,
      authStore.currentUser?.displayName || 'Anonymous',
      authStore.currentUser?.userTag || '',
      text,
      props.parentId || null
    )
    
    // Clear the input and emit an event
    commentText.value = ''
    emit('comment-added')
    
    // Show success toast
    toast(props.isReply ? 'Reply posted' : 'Comment posted')
  } catch (error) {
    logger.error('Error posting comment:', error)
    toast('Failed to post comment. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

// Handle cancel reply
const cancelReply = () => {
  commentText.value = ''
  emit('cancel-reply')
}
</script>

<template>
  <div class="comment-form mt-4 bg-muted/30 rounded-lg p-4">
    <div v-if="!authStore.isAuthenticated" class="text-center p-4">
      <p class="text-muted-foreground">Please <a href="/login" class="text-primary hover:underline">log in</a> to comment</p>
    </div>
    
    <form v-else @submit.prevent="handleSubmit" class="space-y-3">
      <Textarea
        v-model="commentText"
        :placeholder="placeholder || 'Add a comment...'"
        class="min-h-[80px] resize-y"
        :maxlength="MAX_COMMENT_LENGTH"
      />
      
      <div class="flex justify-between items-center text-xs text-muted-foreground">
        <span>{{ commentText.length }}/{{ MAX_COMMENT_LENGTH }}</span>
        
        <div class="flex gap-2">
          <Button 
            v-if="isReply"
            type="button" 
            variant="ghost" 
            size="sm" 
            @click="cancelReply"
          >
            Cancel
          </Button>
          
          <Button 
            type="submit" 
            size="sm"
            :disabled="!canSubmit || isSubmitting"
          >
            <Loader2 v-if="isSubmitting" class="h-4 w-4 mr-1 animate-spin" />
            <Send v-else class="h-4 w-4 mr-1" />
            {{ isReply ? 'Reply' : 'Post Comment' }}
          </Button>
        </div>
      </div>
    </form>
  </div>
</template>







