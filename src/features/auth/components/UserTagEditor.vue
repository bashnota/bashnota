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
        @click="checkAndUpdateTag"
        :disabled="isButtonDisabled"
        :class="{ 'opacity-50 cursor-not-allowed': isButtonDisabled }"
      >
        <RefreshCcw v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
        <span v-else>{{ buttonText }}</span>
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
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth'
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
const hasBeenValidated = ref(false)
const isCheckingAvailability = ref(false)
const isLoading = computed(() => authStore.isLoading || isValidating.value || isCheckingAvailability.value)

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

// Button text changes based on validation state
const buttonText = computed(() => {
  if (isCheckingAvailability.value) return 'Checking...'
  if (hasBeenValidated.value && validationStatus.value === 'success') return 'Update'
  return 'Check Availability'
})

// Button is disabled if input is empty, unchanged, or loading
const isButtonDisabled = computed(() => {
  if (isLoading.value) return true
  if (tagInput.value === currentTag.value) return true
  if (tagInput.value.length === 0) return true
  if (hasBeenValidated.value && validationStatus.value !== 'success') return true
  return false
})

// Basic format validation
const validateFormat = (value: string): boolean => {
  if (!value) {
    validationMessage.value = 'Tag cannot be empty'
    validationStatus.value = 'error'
    return false
  }

  // Basic format validation
  const isValidFormat = validateUserTagFormat(value)
  
  if (!isValidFormat) {
    validationMessage.value = 'Tag must be 3-30 characters and contain only letters, numbers, and underscores'
    validationStatus.value = 'error'
    return false
  }

  // If same as current, no need to check availability
  if (value === currentTag.value) {
    validationMessage.value = 'This is your current tag'
    validationStatus.value = 'warning'
    return false
  }

  return true
}

// Handle input change - only do basic validation, don't check availability yet
const handleInput = (event: Event) => {
  tagInput.value = (event.target as HTMLInputElement).value
  
  // Reset validation state when input changes
  if (hasBeenValidated.value) {
    hasBeenValidated.value = false
  }
  
  // Only do basic format validation
  validateFormat(tagInput.value)
}

// Check availability and then update if available
const checkAndUpdateTag = async () => {
  // If already validated and successful, proceed to update
  if (hasBeenValidated.value && validationStatus.value === 'success') {
    await updateTag()
    return
  }
  
  // Otherwise check availability first
  if (!validateFormat(tagInput.value)) return
  
  validationMessage.value = 'Checking availability...'
  validationStatus.value = 'warning'
  isCheckingAvailability.value = true
  
  try {
    // Import directly instead of dynamic import to avoid potential issues
    const { validateUserTag } = await import('@/utils/userTagGenerator')
    const result = await validateUserTag(tagInput.value)
    
    hasBeenValidated.value = true
    
    if (result.isAvailable) {
      validationMessage.value = 'This tag is available! Click Update to use it.'
      validationStatus.value = 'success'
    } else {
      validationMessage.value = result.error || 'This tag is not available'
      validationStatus.value = 'error'
    }
  } catch (error: any) {
    console.error('Tag validation error:', error)
    validationMessage.value = `Error checking tag availability: ${error?.message || 'Unknown error'}`
    validationStatus.value = 'error'
  } finally {
    isCheckingAvailability.value = false
  }
}

// Update user tag
const updateTag = async () => {
  if (tagInput.value === currentTag.value) return
  
  isValidating.value = true
  try {
    const result = await authStore.updateUserTag(tagInput.value)
    if (result) {
      validationMessage.value = 'Tag updated successfully'
      validationStatus.value = 'success'
    }
  } catch (error) {
    validationMessage.value = 'Failed to update tag'
    validationStatus.value = 'error'
  } finally {
    isValidating.value = false
  }
}
</script>







