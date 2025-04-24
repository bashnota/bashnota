<template>
  <div class="space-y-4">
    <h3 class="text-lg font-medium">User Tag</h3>
    <p class="text-sm text-muted-foreground">
      Your user tag is a unique identifier that can be used to share your notes with others.
      It appears in your profile URL: https://bashnota.app/@{{ currentTag || 'yourtag' }}
    </p>

    <div class="flex items-end gap-2">
      <div class="flex-1 space-y-1.5">
        <Label for="userTag">Your tag</Label>
        <div class="relative">
          <Input
            id="userTag"
            :value="tagInput"
            @input="handleInput"
            placeholder="Enter a unique tag"
            :class="{ 'pr-24': tagInput }"
            :disabled="isLoading"
          />
          <span
            v-if="tagInput"
            class="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground"
          >
            .bashnota.app
          </span>
        </div>
        <p v-if="validationMessage" class="text-xs" :class="validationClass">
          {{ validationMessage }}
        </p>
      </div>
      <Button
        @click="updateTag"
        :disabled="!canUpdate || isLoading"
        :class="{ 'opacity-50 cursor-not-allowed': !canUpdate }"
      >
        <RefreshCcw v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
        <span v-else>Update</span>
      </Button>
    </div>

    <div class="flex items-center gap-2 mt-4">
      <Info class="h-4 w-4 text-muted-foreground" />
      <p class="text-xs text-muted-foreground">
        Tags must be 3-30 characters long and can only contain letters, numbers, and underscores.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validateUserTagFormat } from '@/utils/userTagGenerator'
import { Info, RefreshCcw } from 'lucide-vue-next'

const authStore = useAuthStore()

// State
const tagInput = ref('')
const validationMessage = ref('')
const validationStatus = ref<'success' | 'error' | 'warning' | null>(null)
const isValidating = ref(false)
const isLoading = computed(() => authStore.isLoading || isValidating.value)

// Get current tag from the store
const currentTag = computed(() => authStore.currentUser?.userTag || '')

// Set initial value when component mounts
onMounted(() => {
  if (currentTag.value) {
    tagInput.value = currentTag.value
  }
})

// Validation styling
const validationClass = computed(() => {
  switch (validationStatus.value) {
    case 'success':
      return 'text-green-600'
    case 'error':
      return 'text-red-600'
    case 'warning':
      return 'text-amber-600'
    default:
      return 'text-muted-foreground'
  }
})

// Can only update if input is valid and different from current tag
const canUpdate = computed(() => {
  return (
    tagInput.value !== currentTag.value && 
    tagInput.value.length > 0 && 
    validationStatus.value === 'success'
  )
})

// Handle input change
const handleInput = (event: Event) => {
  tagInput.value = (event.target as HTMLInputElement).value
}

// Validate tag when input changes
watch(tagInput, async (newValue) => {
  if (!newValue) {
    validationMessage.value = 'Tag cannot be empty'
    validationStatus.value = 'error'
    return
  }

  // Basic format validation first
  const isValidFormat = validateUserTagFormat(newValue)
  
  if (!isValidFormat) {
    validationMessage.value = 'Tag must be 3-30 characters and contain only letters, numbers, and underscores'
    validationStatus.value = 'error'
    return
  }

  // If same as current, no need to check availability
  if (newValue === currentTag.value) {
    validationMessage.value = 'This is your current tag'
    validationStatus.value = 'warning'
    return
  }

  // Check availability
  isValidating.value = true
  try {
    const { isAvailable, error } = await import('@/utils/userTagGenerator').then(module => 
      module.validateUserTag(newValue)
    )
    
    if (isAvailable) {
      validationMessage.value = 'This tag is available'
      validationStatus.value = 'success'
    } else {
      validationMessage.value = error || 'This tag is not available'
      validationStatus.value = 'error'
    }
  } catch (error) {
    validationMessage.value = 'Error checking tag availability'
    validationStatus.value = 'error'
  } finally {
    isValidating.value = false
  }
}, { flush: 'post' })

// Update user tag
const updateTag = async () => {
  if (!canUpdate.value) return
  
  try {
    const result = await authStore.updateUserTag(tagInput.value)
    if (result) {
      validationMessage.value = 'Tag updated successfully'
      validationStatus.value = 'success'
    }
  } catch (error) {
    validationMessage.value = 'Failed to update tag'
    validationStatus.value = 'error'
  }
}
</script>