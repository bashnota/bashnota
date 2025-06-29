<script setup lang="ts">
import { useTheme, type DarkModeIntensity } from '@/composables/theme'
import { Button } from '@/ui/button'
import { MoonIcon } from 'lucide-vue-next'

const { darkIntensity, setDarkIntensity, darkModeIntensities, isDark, currentIntensityDescription } = useTheme()
</script>

<template>
  <div class="dark-intensity-selector">
    <h3 class="text-sm font-medium mb-3">Dark Mode Intensity</h3>
    <div v-if="isDark" class="space-y-4">
      <div class="grid grid-cols-2 gap-2">
        <Button
          v-for="intensity in darkModeIntensities"
          :key="intensity.value"
          variant="outline"
          size="sm"
          class="flex justify-start items-center gap-2 h-10 transition-all duration-200"
          :class="{ 
            'border-2 border-primary ring-2 ring-primary/20': darkIntensity === intensity.value,
            'hover:border-primary/50': darkIntensity !== intensity.value
          }"
          @click="setDarkIntensity(intensity.value as DarkModeIntensity)"
        >
          <span 
            class="h-5 w-5 rounded-full flex items-center justify-center transition-colors"
            :class="{
              'bg-[#262b36]': intensity.value === 'soft',
              'bg-[#111318]': intensity.value === 'medium',
              'bg-[#050608]': intensity.value === 'deep',
              'bg-black': intensity.value === 'black'
            }"
          >
            <MoonIcon 
              class="h-3 w-3" 
              :class="{
                'text-gray-300': intensity.value === 'soft',
                'text-gray-400': intensity.value === 'medium',
                'text-gray-500': intensity.value === 'deep',
                'text-gray-600': intensity.value === 'black'
              }"
            />
          </span>
          <span class="text-xs font-medium">{{ intensity.label }}</span>
        </Button>
      </div>
      
      <p class="text-xs text-muted-foreground">{{ currentIntensityDescription }}</p>
    </div>
    <div v-else class="text-sm text-muted-foreground">
      Enable dark mode to adjust intensity
    </div>
  </div>
</template>

<style scoped>
.dark-intensity-selector {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>








