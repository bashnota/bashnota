<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Palette } from 'lucide-vue-next'
import { useTheme } from '@/composables/theme'
import ThemeSelector from '@/components/layout/ThemeSelector.vue'
import ThemeModeSelector from '@/components/layout/ThemeModeSelector.vue'
import DarkIntensitySelector from '@/components/layout/DarkIntensitySelector.vue'

const { isDark } = useTheme()
</script>

<template>
  <Card class="border-2 hover:border-primary/50 transition-all">
    <CardHeader class="bg-muted/50">
      <CardTitle class="flex items-center gap-2">
        <Palette class="h-5 w-5 text-primary" />
        Theme & Appearance
      </CardTitle>
      <CardDescription>Customize the look and feel of the application</CardDescription>
    </CardHeader>
    <CardContent class="pt-6">
      <ThemeSelector />
      <div class="mt-6">
        <ThemeModeSelector />
      </div>
      <div class="mt-6" v-if="isDark">
        <DarkIntensitySelector />
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.card {
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style> 