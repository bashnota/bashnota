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
    class="relative overflow-hidden rounded-lg border bg-gradient-to-tr from-slate-100 to-background p-6 dark:from-slate-800"
  >
    <!-- Content -->
    <div class="relative z-10 flex flex-col gap-8">
      <!-- Header Section -->
      <div class="flex items-start justify-between gap-8">
        <div class="space-y-4">
          <div class="space-y-2">
            <div
              class="inline-flex items-center rounded-full border bg-background/95 px-3 py-1 text-sm"
            >
              <SparklesIcon class="mr-2 h-3.5 w-3.5 text-primary" />
              <span class="text-muted-foreground">Welcome to your smart workspace</span>
            </div>
            <h1 class="text-4xl font-bold tracking-tight">
              Welcome to <span class="text-primary">BashNota</span>
            </h1>
          </div>
          <div class="space-y-2">
            <p class="text-xl font-medium text-primary">More Than a Second Brain,</p>
            <p class="text-xl font-medium text-muted-foreground">
              It's a Second Brain Cracked on Code and AI
            </p>
          </div>
        </div>

        <Button @click="$emit('create-nota')" size="lg" class="group relative overflow-hidden">
          <div
            class="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity"
          ></div>
          <PlusIcon class="h-5 w-5 mr-2" />
          New Nota
        </Button>
      </div>

      <!-- Features Section -->
      <div class="grid grid-cols-3 gap-4">
        <Card
          v-for="feature in features"
          :key="feature.text"
          class="border-primary/10 bg-background/60"
        >
          <CardContent class="p-4 flex items-center space-x-3">
            <component :is="feature.icon" class="h-5 w-5 text-primary" />
            <span class="font-medium">{{ feature.text }}</span>
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
