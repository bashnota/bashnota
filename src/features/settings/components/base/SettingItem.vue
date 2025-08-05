<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-vue-next'

interface Props {
  label: string
  description?: string
  help?: string
  required?: boolean
  disabled?: boolean
  layout?: 'horizontal' | 'vertical'
}

withDefaults(defineProps<Props>(), {
  layout: 'horizontal',
  required: false,
  disabled: false
})
</script>

<template>
  <div 
    :class="[
      'flex gap-2',
      layout === 'horizontal' ? 'items-center justify-between' : 'flex-col space-y-2',
      disabled && 'opacity-50 pointer-events-none'
    ]"
  >
    <div class="flex items-center gap-2 min-w-0">
      <Label 
        :class="[
          'text-sm font-medium',
          layout === 'vertical' ? 'text-left' : 'text-right',
          required && 'after:content-[\'*\'] after:text-destructive after:ml-1'
        ]"
      >
        {{ label }}
      </Label>
      
      <TooltipProvider v-if="help">
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle class="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p class="max-w-xs">{{ help }}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    
    <div 
      :class="[
        layout === 'horizontal' ? 'flex-shrink-0' : 'w-full'
      ]"
    >
      <slot />
    </div>
    
    <p v-if="description" class="text-xs text-muted-foreground mt-1">
      {{ description }}
    </p>
  </div>
</template>
