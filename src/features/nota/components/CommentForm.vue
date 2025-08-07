<script setup lang="ts">
import { ref, computed } from 'vue'
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"
import * as z from "zod"
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from '@/components/ui/textarea'
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

const isSubmitting = ref(false)
const authStore = useAuthStore()

// Maximum comment length
const MAX_COMMENT_LENGTH = 1000

// Form schema
const formSchema = toTypedSchema(z.object({
  comment: z.string()
    .min(1, "Comment cannot be empty")
    .max(MAX_COMMENT_LENGTH, `Comment must be ${MAX_COMMENT_LENGTH} characters or less`)
    .refine((val) => val.trim().length > 0, "Comment cannot be empty")
}))

// Form setup
const { handleSubmit, resetForm, values } = useForm({
  validationSchema: formSchema,
  initialValues: {
    comment: ''
  }
})

// Computed property to control when the submit button is enabled
const canSubmit = computed(() => {
  // Must be authenticated and have text that's not just whitespace
  return authStore.isAuthenticated && values.comment && values.comment.trim().length > 0
})

const onSubmit = handleSubmit(async (formValues) => {
  if (!canSubmit.value || isSubmitting.value) return
  
  isSubmitting.value = true
  
  try {
    // Submit the comment
    await commentService.addComment(
      props.notaId,
      authStore.currentUser?.uid as string,
      authStore.currentUser?.displayName || 'Anonymous',
      authStore.currentUser?.userTag || '',
      formValues.comment.trim(),
      props.parentId || null
    )
    
    // Clear the input and emit an event
    resetForm()
    emit('comment-added')
    
    // Show success toast
    toast(props.isReply ? 'Reply posted' : 'Comment posted')
  } catch (error) {
    logger.error('Error posting comment:', error)
    toast('Failed to post comment. Please try again.')
  } finally {
    isSubmitting.value = false
  }
})

// Handle cancel reply
const cancelReply = () => {
  resetForm()
  emit('cancel-reply')
}
</script>

<template>
  <div class="comment-form mt-4 bg-muted/30 rounded-lg p-4">
    <div v-if="!authStore.isAuthenticated" class="text-center p-4">
      <p class="text-muted-foreground">Please <a href="/login" class="text-primary hover:underline">log in</a> to comment</p>
    </div>
    
    <form v-else @submit="onSubmit" class="space-y-3">
      <FormField v-slot="{ componentField }" name="comment">
        <FormItem>
          <FormControl>
            <Textarea
              :placeholder="placeholder || 'Add a comment...'"
              class="min-h-[80px] resize-y"
              v-bind="componentField"
            />
          </FormControl>
          <FormDescription class="flex justify-between items-center">
            <span>{{ values.comment?.length || 0 }}/{{ MAX_COMMENT_LENGTH }}</span>
            <span class="text-xs">Share your thoughts respectfully</span>
          </FormDescription>
          <FormMessage />
        </FormItem>
      </FormField>
      
      <div class="flex justify-end gap-2">
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
    </form>
  </div>
</template>







