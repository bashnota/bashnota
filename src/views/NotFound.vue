# views/NotFoundView.vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Ghost } from 'lucide-vue-next'

const router = useRouter()
const goBack = () => router.back()
</script>

<template>
  <div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center text-center">
    <Ghost class="h-24 w-24 text-gray-400 dark:text-gray-600" />
    <h1 class="mt-6 text-6xl font-bold text-gray-900 dark:text-gray-100">404</h1>
    <h2 class="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">Page not found</h2>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      The page you're looking for doesn't exist or has been moved.
    </p>
    <div class="mt-6 flex space-x-4">
      <button
        @click="goBack"
        class="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 hover:bg-gray-800 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
      >
        Go Back
      </button>
      <router-link
        to="/"
        class="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        Home
      </router-link>
    </div>
  </div>
</template>
