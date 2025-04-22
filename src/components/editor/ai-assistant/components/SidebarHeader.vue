<script setup lang="ts">
import { CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles as SparklesIcon, XIcon, LoaderIcon } from 'lucide-vue-next'

const props = defineProps<{
  providerName: string
  isLoading: boolean
}>()

const emit = defineEmits(['close'])
</script>

<template>
  <CardHeader class="border-b px-4 py-3 flex-shrink-0">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <SparklesIcon class="h-4 w-4 text-primary" />
        <CardTitle class="text-sm font-medium">{{ providerName || 'AI' }} Assistant</CardTitle>
        <Badge 
          v-if="isLoading" 
          variant="outline" 
          class="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 text-xs flex items-center gap-1"
        >
          <LoaderIcon class="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        class="h-7 w-7 hover:text-destructive" 
        @click="$emit('close')"
      >
        <XIcon class="h-4 w-4" />
      </Button>
    </div>
  </CardHeader>
</template>