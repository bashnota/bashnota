<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SunIcon, MoonIcon } from '@heroicons/vue/24/solid'
import { Button } from '@/components/ui/button'

const isDark = ref(false)

onMounted(() => {
  // Check system preference and localStorage
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    isDark.value = savedTheme === 'dark'
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  updateTheme()
})

const toggleDarkMode = () => {
  isDark.value = !isDark.value
  updateTheme()
}

const updateTheme = () => {
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    @click="toggleDarkMode"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    class="h-9 w-9 transition-colors hover:bg-accent hover:text-accent-foreground"
  >
    <SunIcon v-if="!isDark" class="h-5 w-5" />
    <MoonIcon v-else class="h-5 w-5" />
  </Button>
</template>
