<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface Props {
  title: string
  description?: string
  icon?: any
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

defineProps<Props>()
</script>

<template>
  <Card class="w-full">
    <CardHeader>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <component v-if="icon" :is="icon" class="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle class="text-lg">{{ title }}</CardTitle>
            <CardDescription v-if="description" class="mt-1">
              {{ description }}
            </CardDescription>
          </div>
        </div>
        <Badge v-if="badge" :variant="badgeVariant || 'secondary'">
          {{ badge }}
        </Badge>
      </div>
    </CardHeader>
    
    <Separator />
    
    <CardContent class="space-y-6 pt-6">
      <slot />
    </CardContent>
  </Card>
</template>
