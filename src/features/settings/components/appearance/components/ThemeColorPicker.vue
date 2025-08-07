<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Check } from 'lucide-vue-next'
import type { ThemeColor } from '@/composables/theme'

interface ColorOption {
  value: ThemeColor
  label: string
  description: string
  color: string
}

interface Props {
  currentColor: ThemeColor
  colors: ColorOption[]
}

interface Emits {
  (e: 'color-change', color: ThemeColor): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleColorSelect = (color: ThemeColor) => {
  emit('color-change', color)
}
</script>

<template>
  <div class="space-y-3">
    <Label class="text-sm font-medium">Theme Color</Label>
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      <Button
        v-for="color in colors"
        :key="color.value"
        variant="outline"
        :class="[
          'relative h-16 w-full border-2 transition-all duration-200',
          currentColor === color.value 
            ? 'border-primary ring-2 ring-primary/20' 
            : 'border-border hover:border-primary/50'
        ]"
        @click="handleColorSelect(color.value)"
      >
        <!-- Color Preview -->
        <div 
          class="absolute inset-2 rounded-md"
          :style="{ backgroundColor: color.color }"
        />
        
        <!-- Selected Indicator -->
        <div 
          v-if="currentColor === color.value"
          class="absolute inset-0 flex items-center justify-center bg-black/10 rounded-md"
        >
          <Check class="h-5 w-5 text-white drop-shadow-lg" />
        </div>
        
        <!-- Tooltip Label -->
        <span class="sr-only">{{ color.label }}</span>
      </Button>
    </div>
    
    <!-- Current Color Info -->
    <div class="text-sm text-muted-foreground text-center">
      Current: <span class="font-medium">
        {{ colors.find(c => c.value === currentColor)?.label }}
      </span>
    </div>
  </div>
</template>