<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import AuthFeedback from '@/features/auth/components/AuthFeedback.vue'

const authStore = useAuthStore()
const router = useRouter()
const password = ref('')
const confirmation = ref('')
const recoveryReady = ref(false)
const localError = ref<string | null>(null)

const valid = computed(() => password.value.length >= 6 && password.value === confirmation.value)
const feedbackError = computed(() => localError.value || authStore.errorMessage)

onMounted(async () => {
  const callbackUrl = new URL(window.location.href)
  if (callbackUrl.searchParams.has('code')) {
    recoveryReady.value = await authStore.completeOAuthCallback(callbackUrl.toString())
  } else {
    recoveryReady.value = authStore.isAuthenticated
    if (!recoveryReady.value) localError.value = 'This password recovery link is missing or expired.'
  }
})

async function submit(): Promise<void> {
  localError.value = null
  authStore.clearError()
  if (!valid.value) {
    localError.value = 'Passwords must match and contain at least six characters.'
    return
  }
  if (await authStore.updatePassword(password.value)) await router.replace('/profile')
}
</script>

<template>
  <main class="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>The recovery link establishes a short-lived Supabase session before the password changes.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="new-password">New password</Label>
          <Input id="new-password" v-model="password" type="password" autocomplete="new-password" :disabled="!recoveryReady" />
        </div>
        <div class="space-y-2">
          <Label for="confirm-password">Confirm password</Label>
          <Input id="confirm-password" v-model="confirmation" type="password" autocomplete="new-password" :disabled="!recoveryReady" />
        </div>
        <AuthFeedback :error="feedbackError" />
      </CardContent>
      <CardFooter>
        <Button class="w-full" :disabled="!recoveryReady || authStore.isLoading" @click="submit">Update password</Button>
      </CardFooter>
    </Card>
  </main>
</template>
