<script setup lang="ts">
import { computed } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Clock, Star } from 'lucide-vue-next'
import { formatDate } from '@/lib/utils'

const store = useNotaStore()

const favoriteNotas = computed(() => {
  return store.items
    .filter((nota) => nota.favorite)
    .sort((a, b) => {
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)
      return dateB.getTime() - dateA.getTime()
    })
})
</script>

<template>
  <div class="container py-8 space-y-8">
    <div class="space-y-4">
      <h1 class="text-4xl font-bold tracking-tight flex items-center gap-2">
        <Star class="h-8 w-8 text-yellow-400" />
        Favorite Notas
      </h1>
      <p class="text-muted-foreground">Your starred notas for quick access</p>
    </div>

    <Card>
      <CardContent class="pt-6">
        <div
          v-if="favoriteNotas.length === 0"
          class="flex flex-col items-center justify-center p-12 text-center"
        >
          <Star class="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 class="text-lg font-semibold mb-2">No Favorites Yet</h3>
          <p class="text-muted-foreground">Star your important notas for quick access</p>
        </div>
        <div v-else class="space-y-4">
          <div v-for="nota in favoriteNotas" :key="nota.id" class="group">
            <RouterLink :to="`/nota/${nota.id}`">
              <Card class="hover:shadow-md transition-all">
                <CardHeader>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <FileText class="h-4 w-4 text-muted-foreground" />
                      <CardTitle>{{ nota.title }}</CardTitle>
                    </div>
                    <div class="flex items-center text-sm text-muted-foreground">
                      <Clock class="h-4 w-4 mr-1" />
                      {{ formatDate(nota.updatedAt) }}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </RouterLink>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
