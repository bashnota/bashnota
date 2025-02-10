<script setup lang="ts">
import { computed } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusIcon, FolderIcon } from '@heroicons/vue/24/solid'
import { useRouter } from 'vue-router'

const store = useNotaStore()
const router = useRouter()

// Use rootItems instead of notas
const recentNotas = computed(() => {
  return store.rootItems
    .slice()
    .sort((a, b) => {
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)
      return dateB.getTime() - dateA.getTime()
    })
    .slice(0, 5)
})

const createNewNota = async () => {
  const nota = await store.createItem('Untitled Nota')
  router.push(`/nota/${nota.id}`)
}
</script>

<template>
  <div class="container py-8 space-y-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold tracking-tight">Welcome to BashNota</h1>
      <Button @click="createNewNota" class="gap-2">
        <PlusIcon class="h-4 w-4" />
        New Nota
      </Button>
    </div>

    <!-- Recent Notas -->
    <Card>
      <CardHeader>
        <CardTitle>Recent Notas</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="recentNotas.length === 0" class="text-center py-8">
          <FolderIcon class="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 class="mt-4 text-sm font-semibold">No notas yet</h3>
          <p class="mt-1 text-sm text-muted-foreground">
            Get started by creating a new nota.
          </p>
          <Button @click="createNewNota" variant="outline" class="mt-4 gap-2">
            <PlusIcon class="h-4 w-4" />
            Create Nota
          </Button>
        </div>
        <div v-else class="divide-y">
          <RouterLink
            v-for="nota in recentNotas"
            :key="nota.id"
            :to="`/nota/${nota.id}`"
            class="flex items-center gap-4 py-4 hover:bg-muted/50 px-4 -mx-4 rounded-lg transition-colors"
          >
            <FolderIcon class="h-8 w-8 text-muted-foreground/70" />
            <div>
              <h3 class="font-medium">{{ nota.title }}</h3>
              <p class="text-sm text-muted-foreground">
                Last updated {{ new Date(nota.updatedAt).toLocaleDateString() }}
              </p>
            </div>
          </RouterLink>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
