<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { ExternalLink, User } from 'lucide-vue-next'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { type PublishedNota } from '@/types/nota'

const route = useRoute()
const router = useRouter()
const notaStore = useNotaStore()
const publishedNotas = ref<PublishedNota[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    isLoading.value = true
    const userId = route.params.userId as string

    if (!userId) {
      error.value = 'No user ID provided'
      return
    }

    const notas = await notaStore.getPublishedNotasByUser(userId)
    publishedNotas.value = notas

    if (notas.length === 0) {
      // This isn't an error, just an empty state
      isLoading.value = false
      return
    }
  } catch (err) {
    console.error('Error loading published notas:', err)
    error.value = 'Failed to load published notas'
  } finally {
    isLoading.value = false
  }
})

const viewNota = (id: string) => {
  router.push(`/p/${id}`)
}
</script>

<template>
  <div class="container mx-auto max-w-6xl py-8 px-4">
    <header class="mb-8">
      <h1 class="text-3xl font-bold flex items-center gap-2">
        <User class="h-8 w-8" />
        Published Notas
      </h1>
      <p class="text-muted-foreground mt-2">All public notas published by this user</p>
    </header>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <LoadingSpinner class="w-10 h-10" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <h2 class="text-red-600 text-xl font-semibold mb-2">{{ error }}</h2>
      <p class="text-gray-600 mb-4">There was an error loading the published notas.</p>
      <Button @click="router.push('/')">Go Home</Button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="publishedNotas.length === 0"
      class="bg-muted/50 border rounded-lg p-8 text-center"
    >
      <h2 class="text-xl font-semibold mb-2">No Published Notas</h2>
      <p class="text-muted-foreground mb-4">This user hasn't published any notas yet.</p>
      <Button @click="router.push('/')">Go Home</Button>
    </div>

    <!-- Content state -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card v-for="nota in publishedNotas" :key="nota.id" class="flex flex-col">
        <CardHeader>
          <CardTitle class="line-clamp-2">{{ nota.title }}</CardTitle>
        </CardHeader>
        <CardContent class="flex-1">
          <p class="text-sm text-muted-foreground">Published: {{ formatDate(nota.publishedAt) }}</p>
          <p class="text-sm text-muted-foreground">
            Last updated: {{ formatDate(nota.updatedAt) }}
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" class="w-full" @click="viewNota(nota.id)">
            <ExternalLink class="mr-2 h-4 w-4" />
            View Nota
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
