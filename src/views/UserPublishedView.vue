<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { ExternalLink } from 'lucide-vue-next'
import { Avatar, AvatarFallback } from '@/components/ui/avatar' // Import Avatar components
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { type PublishedNota } from '@/types/nota'
import { logger } from '@/services/logger'

const route = useRoute()
const router = useRouter()
const notaStore = useNotaStore()
const publishedNotas = ref<PublishedNota[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

// Computed property to get author name from the first published nota
const authorName = computed(() => {
  if (publishedNotas.value.length > 0) {
    return publishedNotas.value[0].authorName
  }
  return 'Author'
})

// Computed property to generate initials from author name
const authorInitials = computed(() => {
  if (!authorName.value) return ''

  const nameParts = authorName.value.split(' ').filter((part) => part.length > 0)
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
  } else if (nameParts.length === 1) {
    return nameParts[0][0].toUpperCase()
  }
  return ''
})

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
    logger.error('Error loading published notas:', err)
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
      <div class="flex items-center gap-4 mb-4">
        <!-- User Avatar (using initials from author name) -->
        <Avatar class="h-16 w-16">
          <AvatarFallback class="text-lg">
            {{ authorInitials || 'A' }}
          </AvatarFallback>
        </Avatar>

        <!-- User info from publishedNotas -->
        <div>
          <h1 class="text-3xl font-bold">{{ authorName }}'s Notas</h1>
          <p class="text-muted-foreground mt-1">Published documents and notes</p>
        </div>
      </div>
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
