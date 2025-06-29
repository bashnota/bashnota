<template>
  <div class="flex flex-col space-y-4">
    <Label class="text-sm font-medium">Theme Color</Label>
    <div class="grid grid-cols-3 gap-2">
      <Button
        v-for="theme in availableThemes"
        :key="theme.name"
        variant="outline"
        size="sm"
        :class="[
          'justify-start border-2 gap-2 h-10',
          currentTheme === theme.name ? 'border-primary' : 'border-border'
        ]"
        @click="setTheme(theme.name)"
      >
        <span 
          class="flex h-5 w-5 shrink-0 rounded-full"
          :style="{
            background: `linear-gradient(45deg, ${theme.primaryColor}, ${theme.accentColor})`
          }"
        />
        <span class="text-xs truncate">{{ theme.label }}</span>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/ui/button'
import { Label } from '@/ui/label'
import { useTheme } from '@/composables/theme'

const { themeColor: currentTheme, setThemeColor: setTheme } = useTheme()
// Import ThemeColor type or define it here
import type { ThemeColor } from '@/composables/theme' // Make sure this import path is correct

const availableThemes = [
  { name: 'zinc' as ThemeColor, label: 'Zinc', primaryColor: '#71717a', accentColor: '#3f3f46' },
  { name: 'slate' as ThemeColor, label: 'Slate', primaryColor: '#64748b', accentColor: '#475569' },
  { name: 'stone' as ThemeColor, label: 'Stone', primaryColor: '#78716c', accentColor: '#57534e' },
  { name: 'red' as ThemeColor, label: 'Red', primaryColor: '#ef4444', accentColor: '#b91c1c' },
  { name: 'orange' as ThemeColor, label: 'Orange', primaryColor: '#f97316', accentColor: '#c2410c' },
  { name: 'green' as ThemeColor, label: 'Green', primaryColor: '#22c55e', accentColor: '#15803d' },
]
</script>








