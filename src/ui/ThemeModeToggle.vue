<template>
  <div class="flex flex-col space-y-4">
    <Label class="text-sm font-medium">Theme Mode</Label>
    <div class="flex items-center space-x-1 rounded-md bg-muted p-1">
      <Button
        size="sm"
        variant="ghost"
        :class="{ 'bg-background shadow-sm': themeMode === 'light' }"
        @click="setThemeMode('light')"
      >
        <SunIcon class="mr-1 h-4 w-4" />
        Light
      </Button>
      <Button
        size="sm"
        variant="ghost"
        :class="{ 'bg-background shadow-sm': themeMode === 'dark' }"
        @click="setThemeMode('dark')"
      >
        <MoonIcon class="mr-1 h-4 w-4" />
        Dark
      </Button>
      <Button
        size="sm"
        variant="ghost"
        :class="{ 'bg-background shadow-sm': themeMode === 'system' }"
        @click="setThemeMode('system')"
      >
        <LaptopIcon class="mr-1 h-4 w-4" />
        System
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/ui/button'
import { Label } from '@/ui/label'
import { SunIcon, MoonIcon, LaptopIcon } from 'lucide-vue-next'
import { useTheme } from '@/composables/theme'

const { themeMode, setThemeMode } = useTheme()
</script>








