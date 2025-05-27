<template>
  <span 
    class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium"
    :class="badgeClasses"
  >
    {{ displayLanguage }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  language: string
}

const props = defineProps<Props>()

const displayLanguage = computed(() => {
  return props.language.charAt(0).toUpperCase() + props.language.slice(1).toLowerCase()
})

const badgeClasses = computed(() => {
  const lang = props.language.toLowerCase()
  
  switch (lang) {
    case 'python':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'r':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    case 'julia':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'scala':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'javascript':
    case 'node':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }
})
</script> 