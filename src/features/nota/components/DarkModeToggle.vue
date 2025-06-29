<script setup lang="ts">
import { Sun, Moon, Laptop } from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { useTheme } from '@/composables/theme'

const { themeMode, isDark, setThemeMode, toggleDarkMode } = useTheme()

// Function to determine which icon to display
const getIcon = () => {
  if (themeMode.value === 'system') return Laptop
  return isDark.value ? Moon : Sun
}

// Function to get the tooltip text
const getTooltip = () => {
  if (themeMode.value === 'system') return 'System theme (click to change)'
  return isDark.value ? 'Dark theme (click to change)' : 'Light theme (click to change)'
}
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    @click="toggleDarkMode"
    :title="getTooltip()"
    class="h-9 w-9 transition-colors hover:bg-accent hover:text-accent-foreground"
  >
    <component :is="getIcon()" class="h-5 w-5" />
  </Button>
</template>









