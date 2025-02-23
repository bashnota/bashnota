<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { PlusIcon, SparklesIcon, CodeBracketIcon, DocumentTextIcon } from '@heroicons/vue/24/solid'
import { Card, CardContent } from '@/components/ui/card'

defineEmits<{
  (e: 'create-nota'): void
}>()

const features = [
  {
    icon: CodeBracketIcon,
    text: 'Code Snippets',
  },
  {
    icon: DocumentTextIcon,
    text: 'Markdown Support',
  },
  {
    icon: SparklesIcon,
    text: 'Smart Organization',
  },
]
</script>

<template>
  <div
    class="relative overflow-hidden rounded-lg border bg-gradient-to-tr from-slate-100 to-background p-4 sm:p-6 dark:from-slate-800"
  >
    <!-- Content -->
    <div class="relative z-10 flex flex-col gap-4 sm:gap-8">
      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-8">
        <div class="space-y-4 min-w-0 flex-1">
          <div class="space-y-2">
            <div
              class="inline-flex items-center rounded-full border bg-background/95 px-3 py-1 text-sm"
            >
              <SparklesIcon class="mr-2 h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span class="text-muted-foreground truncate">Welcome to your smart workspace</span>
            </div>
            <h1 class="text-2xl sm:text-4xl font-bold tracking-tight break-words">
              Welcome to <span class="text-primary">BashNota</span>
            </h1>
          </div>
          <div class="space-y-2">
            <p class="text-lg sm:text-xl font-medium text-primary truncate">More Than a Second Brain,</p>
            <p class="text-lg sm:text-xl font-medium text-muted-foreground truncate">
              It's a Second Brain Cracked on Code and AI
            </p>
          </div>
        </div>

        <Button 
          @click="$emit('create-nota')" 
          size="lg" 
          class="group relative overflow-hidden flex-shrink-0 w-full sm:w-auto"
        >
          <div
            class="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity"
          ></div>
          <PlusIcon class="h-5 w-5 mr-2 flex-shrink-0" />
          New Nota
        </Button>
      </div>

      <!-- Features Section -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card v-for="feature in features" :key="feature.text" class="bg-background/50">
          <CardContent class="p-4 flex items-center gap-3">
            <component :is="feature.icon" class="h-5 w-5 text-primary flex-shrink-0" />
            <span class="font-medium truncate">{{ feature.text }}</span>
          </CardContent>
        </Card>
      </div>

      <!-- Description -->
      <p class="text-muted-foreground max-w-2xl">
        Transform your notes into powerful tools with code snippets execution, markdown and latex support, and seamless
        organization. Built for developers, designed for productivity.
      </p>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 640px) {
  .text-2xl {
    font-size: 1.5rem;
    line-height: 2rem;
  }
  
  .text-lg {
    font-size: 1.125rem;
    line-height: 1.75rem;
  }
}
</style>
