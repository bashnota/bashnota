<script setup lang="ts">
import { useThemeColor, type ThemeColor } from '@/composables/theme'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-vue-next'

const { color: themeColor, setColor: setThemeColor, themeDefinitions } = useThemeColor()

const handleThemeChange = (color: ThemeColor) => {
  setThemeColor(color)
}
</script>

<template>
  <div class="theme-selector">
    <h3 class="text-sm font-medium mb-3">Color Theme</h3>
    <div class="grid grid-cols-4 sm:grid-cols-7 gap-2">
      <Button
        v-for="theme in themeDefinitions"
        :key="theme.value"
        variant="outline"
        size="icon"
        class="relative h-9 w-9 rounded-full p-0 border border-border"
        :class="{ 'ring-2 ring-primary ring-offset-2': themeColor === theme.value }"
        :title="theme.label"
        @click="handleThemeChange(theme.value as ThemeColor)"
      >
        <span 
          class="absolute inset-0.5 rounded-full"
          :style="{ backgroundColor: theme.color }"
        ></span>
        <Check 
          v-if="themeColor === theme.value"
          class="h-4 w-4 text-white absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 z-10"
        />
        <span class="sr-only">{{ theme.label }}</span>
      </Button>
    </div>
  </div>
</template>

<style scoped>
.theme-selector {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>








