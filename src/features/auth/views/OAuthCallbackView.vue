<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/features/auth/stores/auth'
import AuthFeedback from '@/features/auth/components/AuthFeedback.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

function safeInternalRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/'
  if (value.includes('\\') || /%5c/i.test(value)) return '/'
  const resolved = new URL(value, window.location.origin)
  if (resolved.origin !== window.location.origin) return '/'
  return `${resolved.pathname}${resolved.search}${resolved.hash}`
}

const localError = ref<string | null>(null)
const errorMessage = computed(() => localError.value || authStore.errorMessage)

onMounted(async () => {
  localError.value = null
  authStore.clearError()
  try {
    const completed = await authStore.completeOAuthCallback(window.location.href)
    if (completed === true) {
      await router.replace(safeInternalRedirect(route.query.redirect))
    } else if (!authStore.errorMessage) {
      localError.value = 'Google sign-in could not be completed. Start again from the sign-in page.'
    }
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Google sign-in could not be completed.'
  }
})
</script>

<template>
  <main class="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
    <div class="max-w-md text-center">
      <Loader2 v-if="!errorMessage" class="mx-auto mb-4 h-8 w-8 animate-spin" aria-hidden="true" />
      <h1 class="text-xl font-semibold">{{ errorMessage ? 'Sign-in could not be completed' : 'Completing sign-in…' }}</h1>
      <AuthFeedback :error="errorMessage" />
    </div>
  </main>
</template>
