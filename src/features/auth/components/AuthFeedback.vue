<script setup lang="ts">
defineProps<{
  error?: string | null
  success?: string | null
}>()
</script>

<template>
  <div
    v-if="error"
    role="alert"
    aria-live="assertive"
    class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
  >
    <p class="font-medium">We couldn't complete that request.</p>
    <p>{{ error }}</p>
    <p class="mt-1">Check your details and try again. If this keeps happening, contact support.</p>
  </div>
  <p
    v-else-if="success"
    role="status"
    aria-live="polite"
    class="rounded-md border border-green-600/30 bg-green-600/10 p-3 text-sm text-green-700 dark:text-green-300"
  >
    {{ success }}
  </p>
</template>
