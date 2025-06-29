<template>
  <div class="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
    <h1 class="text-6xl font-bold text-gray-800 dark:text-gray-200">404</h1>
    <p class="text-xl text-gray-600 dark:text-gray-400">Page Not Found</p>
    <p class="mt-4 text-gray-500 dark:text-gray-500">
      The page you are looking for does not exist.
    </p>
    <RouterLink to="/" class="mt-8 px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600">
      Go Home
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script> 