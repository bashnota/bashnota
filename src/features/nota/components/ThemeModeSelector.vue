<script setup lang="ts">
import { useTheme, type ThemeMode } from '@/composables/theme'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Laptop } from 'lucide-vue-next'

const { themeMode, setThemeMode } = useTheme()
</script>

<template>
  <div class="theme-mode-selector">
    <h3 class="text-sm font-medium mb-3">Theme Mode</h3>
    <div class="flex items-center space-x-1 rounded-md bg-muted p-1">
      <Button
        size="sm"
        variant="ghost"
        :class="{ 'bg-background shadow-sm': themeMode === 'light' }"
        @click="setThemeMode('light')"
      >
        <Sun class="mr-1 h-4 w-4" />
        Light
      </Button>
      <Button
        size="sm"
        variant="ghost"
        :class="{ 'bg-background shadow-sm': themeMode === 'dark' }"
        @click="setThemeMode('dark')"
      >
        <Moon class="mr-1 h-4 w-4" />
        Dark
      </Button>
      <Button
        size="sm"
        variant="ghost"
        :class="{ 'bg-background shadow-sm': themeMode === 'system' }"
        @click="setThemeMode('system')"
      >
        <Laptop class="mr-1 h-4 w-4" />
        System
      </Button>
    </div>
  </div>
</template>

<style scoped>
.theme-mode-selector {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>








