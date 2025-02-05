<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SunIcon, MoonIcon } from '@heroicons/vue/24/outline'

const isDark = ref(false)

const toggleColorScheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark')
  localStorage.setItem('color-scheme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const savedScheme = localStorage.getItem('color-scheme')
  isDark.value = savedScheme === 'dark'
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  }
})
</script>

<template>
  <button class="color-scheme-toggle" @click="toggleColorScheme" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
    <SunIcon v-if="isDark" class="icon" />
    <MoonIcon v-else class="icon" />
  </button>
</template>

<style scoped>
.color-scheme-toggle {
  padding: 0.5rem;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--color-text-light);
  cursor: pointer;
  transition: all 0.2s;
}

.color-scheme-toggle:hover {
  background: var(--color-background-mute);
  color: var(--color-text);
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
}
</style> 