<template>
  <div class="terminal-error p-4">
    <Alert variant="destructive" class="mb-3">
      <Bot class="h-4 w-4 mr-2" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{{ props.error }}</AlertDescription>
    </Alert>
    <Button @click="emit('retry')" variant="outline" class="mt-2">
      <RefreshCw class="h-4 w-4 mr-2" />
      Try Again
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Bot, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{
  error: string
}>()

const emit = defineEmits<{
  'retry': []
}>()
</script> 